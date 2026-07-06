import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.helpdesk import TicketActionLog


def log_ticket_action(
    db: Session,
    *,
    ticket_id: int,
    company_id: int,
    actor_employee_id: int | None,
    action_type: str,
    action_note: str | None = None,
    metadata: dict[str, Any] | None = None,
):
    db.add(
        TicketActionLog(
            ticket_id=ticket_id,
            company_id=company_id,
            actor_employee_id=actor_employee_id,
            action_type=action_type,
            action_note=action_note,
            metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
        )
    )
