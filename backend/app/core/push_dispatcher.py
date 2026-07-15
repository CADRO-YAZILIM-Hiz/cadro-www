import logging
import os
from dataclasses import dataclass

import requests
from sqlalchemy.orm import Session

from app.core.push_events import PushEventType, get_push_event_definition
from app.models.mobile_device import MobileDevice

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PushMessage:
    token: str
    title: str
    body: str
    deep_link: str
    event_key: str
    entity_type: str
    entity_id: str
    platform: str
    priority: str


class BasePushAdapter:
    name = "base"

    def can_handle(self, platform: str) -> bool:
        return False

    def send(self, messages: list[PushMessage]) -> int:
        return 0


class FcmPushAdapter(BasePushAdapter):
    name = "fcm"

    def __init__(self):
        self.server_key = os.getenv("FCM_SERVER_KEY", "").strip()

    def can_handle(self, platform: str) -> bool:
        return platform.lower() in {"android", "web", "macos", "windows", "linux", "fuchsia"}

    def send(self, messages: list[PushMessage]) -> int:
        if not messages:
            return 0
        if not self.server_key:
            logger.info("FCM disabled: FCM_SERVER_KEY missing")
            return 0

        headers = {
            "Authorization": f"key={self.server_key}",
            "Content-Type": "application/json",
        }
        delivered = 0
        for message in messages:
            payload = {
                "to": message.token,
                "priority": "high" if message.priority == "high" else "normal",
                "notification": {
                    "title": message.title,
                    "body": message.body,
                },
                "data": {
                    "event_key": message.event_key,
                    "entity_type": message.entity_type,
                    "entity_id": str(message.entity_id),
                    "deep_link": message.deep_link,
                },
            }
            try:
                response = requests.post(
                    "https://fcm.googleapis.com/fcm/send",
                    json=payload,
                    headers=headers,
                    timeout=8,
                )
                if response.ok:
                    delivered += 1
                else:
                    logger.warning("FCM send failed: %s %s", response.status_code, response.text[:300])
            except Exception as exc:
                logger.warning("FCM send exception: %s", exc)
        return delivered


class ApnsPushAdapter(BasePushAdapter):
    name = "apns"

    def __init__(self):
        self.bundle_id = os.getenv("APNS_BUNDLE_ID", "").strip()
        self.bearer_token = os.getenv("APNS_BEARER_TOKEN", "").strip()
        self.host = os.getenv("APNS_HOST", "https://api.push.apple.com").strip()

    def can_handle(self, platform: str) -> bool:
        return platform.lower() == "ios"

    def send(self, messages: list[PushMessage]) -> int:
        if not messages:
            return 0
        if not self.bundle_id or not self.bearer_token:
            logger.info("APNS disabled: APNS_BUNDLE_ID or APNS_BEARER_TOKEN missing")
            return 0

        delivered = 0
        headers = {
            "apns-topic": self.bundle_id,
            "authorization": f"bearer {self.bearer_token}",
        }
        for message in messages:
            payload = {
                "aps": {
                    "alert": {
                        "title": message.title,
                        "body": message.body,
                    },
                    "sound": "default",
                },
                "event_key": message.event_key,
                "entity_type": message.entity_type,
                "entity_id": str(message.entity_id),
                "deep_link": message.deep_link,
            }
            try:
                response = requests.post(
                    f"{self.host}/3/device/{message.token}",
                    json=payload,
                    headers=headers,
                    timeout=8,
                )
                if response.ok:
                    delivered += 1
                else:
                    logger.warning("APNS send failed: %s %s", response.status_code, response.text[:300])
            except Exception as exc:
                logger.warning("APNS send exception: %s", exc)
        return delivered


class PushDispatcher:
    def __init__(self, db: Session):
        self.db = db
        self.adapters: list[BasePushAdapter] = [ApnsPushAdapter(), FcmPushAdapter()]

    def dispatch(self, event_key: str, context: dict) -> int:
        definition = get_push_event_definition(event_key)
        if not definition:
            logger.info("Unknown push event skipped: %s", event_key)
            return 0

        company_id = context.get("company_id")
        if not company_id:
            logger.info("Push event skipped, company_id missing: %s", event_key)
            return 0

        recipient_ids = self._resolve_recipient_ids(definition.audience, context)
        if not recipient_ids:
            return 0

        devices = self._load_devices(company_id, recipient_ids)
        if not devices:
            return 0

        messages = [
            self._build_message(event_key, definition.priority, context, device)
            for device in devices
        ]

        delivered = 0
        for adapter in self.adapters:
            adapter_messages = [
                message for message in messages if adapter.can_handle(message.platform)
            ]
            delivered += adapter.send(adapter_messages)
        return delivered

    def _resolve_recipient_ids(self, audience: str, context: dict) -> list[int]:
        actor_id = context.get("actor_employee_id")

        if audience == "approver":
            return _unique_ids(context.get("approver_employee_ids", []))

        if audience == "actor_employee":
            return _unique_ids([context.get("subject_employee_id") or actor_id])

        if audience == "helpdesk_responsible":
            return _unique_ids(context.get("responsible_employee_ids", []))

        if audience == "ticket_participants":
            ids = _unique_ids([
                context.get("ticket_creator_id"),
                context.get("assigned_employee_id"),
                *context.get("ticket_participant_ids", []),
            ])
            return [value for value in ids if value != actor_id]

        if audience == "ticket_creator":
            creator_id = context.get("ticket_creator_id")
            return [] if creator_id == actor_id else _unique_ids([creator_id])

        return []

    def _load_devices(self, company_id: int, employee_ids: list[int]) -> list[MobileDevice]:
        if not employee_ids:
            return []

        devices = self.db.query(MobileDevice).filter(
            MobileDevice.company_id == company_id,
            MobileDevice.employee_id.in_(employee_ids),
            MobileDevice.is_active.is_(True),
            MobileDevice.push_token.isnot(None),
        ).all()

        unique_tokens = set()
        result = []
        for device in devices:
            token = (device.push_token or "").strip()
            if not token or token in unique_tokens:
                continue
            unique_tokens.add(token)
            result.append(device)
        return result

    def _build_message(
        self,
        event_key: str,
        priority: str,
        context: dict,
        device: MobileDevice,
    ) -> PushMessage:
        title, body = _build_notification_copy(event_key, context)
        deep_link = _resolve_deep_link(event_key, context)
        entity_type = context.get("entity_type", event_key.split(".", 1)[0])
        entity_id = str(context.get("entity_id", ""))

        return PushMessage(
            token=(device.push_token or "").strip(),
            title=title,
            body=body,
            deep_link=deep_link,
            event_key=event_key,
            entity_type=entity_type,
            entity_id=entity_id,
            platform=(device.device_platform or "unknown").lower(),
            priority=priority,
        )


def dispatch_push_event(db: Session, event_key: str, context: dict) -> int:
    try:
        dispatcher = PushDispatcher(db)
        return dispatcher.dispatch(event_key, context)
    except Exception as exc:
        logger.warning("Push dispatch failed for %s: %s", event_key, exc)
        return 0


def _resolve_deep_link(event_key: str, context: dict) -> str:
    if event_key.startswith("leave."):
        return "/admin-queue/leaves" if event_key == PushEventType.LEAVE_CREATED else "/leave"
    if event_key.startswith("expense."):
        return "/admin-queue/expenses" if event_key == PushEventType.EXPENSE_CREATED else "/expenses"
    if event_key.startswith("document."):
        return "/admin-queue/documents" if event_key == PushEventType.DOCUMENT_UPLOADED else "/documents"
    if event_key.startswith("helpdesk."):
        return context.get("deep_link") or "/helpdesk"
    return context.get("deep_link") or "/home"


def _build_notification_copy(event_key: str, context: dict) -> tuple[str, str]:
    employee_name = context.get("subject_employee_name") or context.get("actor_employee_name") or "Personel"
    subject = context.get("ticket_subject") or context.get("subject") or "Kayıt"
    amount = context.get("amount_label") or "Yeni kayıt"

    if event_key == PushEventType.LEAVE_CREATED:
        return "Yeni İzin Talebi", f"{employee_name} için yeni izin talebi onay bekliyor."
    if event_key == PushEventType.LEAVE_APPROVED:
        return "İzin Onaylandı", "İzin talebiniz onaylandı."
    if event_key == PushEventType.LEAVE_REJECTED:
        return "İzin Reddedildi", "İzin talebiniz reddedildi."
    if event_key == PushEventType.EXPENSE_CREATED:
        return "Yeni Masraf Talebi", f"{employee_name} için {amount} tutarında masraf onay bekliyor."
    if event_key == PushEventType.EXPENSE_APPROVED:
        return "Masraf Onaylandı", "Masraf talebiniz onaylandı."
    if event_key == PushEventType.EXPENSE_REJECTED:
        return "Masraf Reddedildi", "Masraf talebiniz reddedildi."
    if event_key == PushEventType.EXPENSE_PAID:
        return "Masraf Ödendi", "Onaylı masrafınız ödendi olarak işaretlendi."
    if event_key == PushEventType.DOCUMENT_UPLOADED:
        return "Yeni Evrak Yüklendi", f"{employee_name} için yeni evrak onay bekliyor."
    if event_key == PushEventType.DOCUMENT_APPROVED:
        return "Evrak Onaylandı", "Yüklediğiniz evrak onaylandı."
    if event_key == PushEventType.DOCUMENT_REJECTED:
        return "Evrak Reddedildi", "Yüklediğiniz evrak reddedildi."
    if event_key == PushEventType.HELPDESK_CREATED:
        return "Yeni Helpdesk Talebi", f"\"{subject}\" başlıklı yeni destek talebi açıldı."
    if event_key == PushEventType.HELPDESK_REPLY:
        return "Helpdesk Yanıtı", f"\"{subject}\" talebine yeni mesaj eklendi."
    if event_key == PushEventType.HELPDESK_STATUS_CHANGED:
        return "Talep Durumu Güncellendi", f"\"{subject}\" talebinizin durumu güncellendi."
    return "Yeni Bildirim", "Yeni bir mobil bildirim var."


def _unique_ids(values: list | tuple) -> list[int]:
    result: list[int] = []
    seen = set()
    for value in values:
        if value in (None, "", 0):
            continue
        normalized = int(value)
        if normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result
