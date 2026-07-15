from app.models.document import DocumentActionLog


def log_document_action(
    db,
    *,
    company_id: int,
    employee_id: int,
    document_id: int | None,
    actor_employee_id: int | None,
    action: str,
    previous_status: str | None = None,
    new_status: str | None = None,
    document_type: str | None = None,
    file_name: str | None = None,
    detail: str | None = None,
):
    db.add(
        DocumentActionLog(
            company_id=company_id,
            employee_id=employee_id,
            document_id=document_id,
            actor_employee_id=actor_employee_id,
            action=action,
            previous_status=previous_status,
            new_status=new_status,
            document_type=document_type,
            file_name=file_name,
            detail=detail,
        )
    )
