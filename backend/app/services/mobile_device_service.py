from datetime import datetime

from sqlalchemy.orm import Session

from app.models.mobile_device import MobileDevice


def bind_mobile_device_to_employee(
    db: Session,
    *,
    company_id: int,
    employee_id: int,
    device_id: str,
    device_name: str | None = None,
    device_platform: str | None = None,
    push_token: str | None = None,
) -> tuple[MobileDevice, int]:
    now = datetime.utcnow()
    normalized_device_id = device_id.strip()
    normalized_platform = (device_platform or "unknown").strip().lower() or "unknown"
    normalized_name = device_name.strip() if isinstance(device_name, str) and device_name.strip() else None

    deactivated_device_count = db.query(MobileDevice).filter(
        MobileDevice.employee_id == employee_id,
        MobileDevice.device_id != normalized_device_id,
        MobileDevice.is_active.is_(True),
    ).update(
        {
            MobileDevice.is_active: False,
            MobileDevice.push_token: None,
            MobileDevice.updated_at: now,
        },
        synchronize_session=False,
    )

    device = db.query(MobileDevice).filter(
        MobileDevice.device_id == normalized_device_id,
    ).first()

    if device:
        device.company_id = company_id
        device.employee_id = employee_id
        device.device_name = normalized_name
        device.device_platform = normalized_platform
        device.push_token = push_token
        device.is_active = True
        device.last_login_at = now
        device.updated_at = now
        return device, deactivated_device_count

    device = MobileDevice(
        company_id=company_id,
        employee_id=employee_id,
        device_id=normalized_device_id,
        device_name=normalized_name,
        device_platform=normalized_platform,
        push_token=push_token,
        is_active=True,
        last_login_at=now,
        updated_at=now,
    )
    db.add(device)
    db.flush()
    return device, deactivated_device_count