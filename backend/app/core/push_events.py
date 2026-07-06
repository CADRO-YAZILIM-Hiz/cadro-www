from dataclasses import dataclass


@dataclass(frozen=True)
class PushEventDefinition:
    key: str
    audience: str
    priority: str
    module: str
    description: str


class PushEventType:
    LEAVE_CREATED = "leave.created"
    LEAVE_APPROVED = "leave.approved"
    LEAVE_REJECTED = "leave.rejected"

    EXPENSE_CREATED = "expense.created"
    EXPENSE_APPROVED = "expense.approved"
    EXPENSE_REJECTED = "expense.rejected"
    EXPENSE_PAID = "expense.paid"

    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_APPROVED = "document.approved"
    DOCUMENT_REJECTED = "document.rejected"

    HELPDESK_CREATED = "helpdesk.created"
    HELPDESK_REPLY = "helpdesk.reply"
    HELPDESK_STATUS_CHANGED = "helpdesk.status_changed"

    TRAINING_ASSIGNED = "training.assigned"
    TRAINING_CANCELLED = "training.cancelled"

    ATTENDANCE_CLOCK_IN_SUCCESS = "attendance.clock_in.success"
    ATTENDANCE_CLOCK_OUT_SUCCESS = "attendance.clock_out.success"
    ATTENDANCE_APPROVAL_DECISION = "attendance.approval.decision"

    AUTH_LOGIN_SUCCESS = "auth.login.success"
    AUTH_MFA_SUCCESS = "auth.mfa.success"


PUSH_EVENT_CATALOG = {
    PushEventType.LEAVE_CREATED: PushEventDefinition(
        key=PushEventType.LEAVE_CREATED,
        audience="approver",
        priority="normal",
        module="leave",
        description="Employee created a leave request; company approvers should be notified.",
    ),
    PushEventType.LEAVE_APPROVED: PushEventDefinition(
        key=PushEventType.LEAVE_APPROVED,
        audience="actor_employee",
        priority="high",
        module="leave",
        description="Leave request was approved; requesting employee should be notified.",
    ),
    PushEventType.LEAVE_REJECTED: PushEventDefinition(
        key=PushEventType.LEAVE_REJECTED,
        audience="actor_employee",
        priority="high",
        module="leave",
        description="Leave request was rejected; requesting employee should be notified.",
    ),
    PushEventType.EXPENSE_CREATED: PushEventDefinition(
        key=PushEventType.EXPENSE_CREATED,
        audience="approver",
        priority="normal",
        module="expense",
        description="Employee submitted an expense claim; approvers should be notified.",
    ),
    PushEventType.EXPENSE_APPROVED: PushEventDefinition(
        key=PushEventType.EXPENSE_APPROVED,
        audience="actor_employee",
        priority="high",
        module="expense",
        description="Expense claim approved; claimant should be notified.",
    ),
    PushEventType.EXPENSE_REJECTED: PushEventDefinition(
        key=PushEventType.EXPENSE_REJECTED,
        audience="actor_employee",
        priority="high",
        module="expense",
        description="Expense claim rejected; claimant should be notified.",
    ),
    PushEventType.EXPENSE_PAID: PushEventDefinition(
        key=PushEventType.EXPENSE_PAID,
        audience="actor_employee",
        priority="high",
        module="expense",
        description="Approved expense has been marked as paid; claimant should be notified.",
    ),
    PushEventType.DOCUMENT_UPLOADED: PushEventDefinition(
        key=PushEventType.DOCUMENT_UPLOADED,
        audience="approver",
        priority="normal",
        module="document",
        description="Employee uploaded a dossier document; approvers should be notified.",
    ),
    PushEventType.DOCUMENT_APPROVED: PushEventDefinition(
        key=PushEventType.DOCUMENT_APPROVED,
        audience="actor_employee",
        priority="high",
        module="document",
        description="Employee dossier document approved; employee should be notified.",
    ),
    PushEventType.DOCUMENT_REJECTED: PushEventDefinition(
        key=PushEventType.DOCUMENT_REJECTED,
        audience="actor_employee",
        priority="high",
        module="document",
        description="Employee dossier document rejected; employee should be notified.",
    ),
    PushEventType.HELPDESK_CREATED: PushEventDefinition(
        key=PushEventType.HELPDESK_CREATED,
        audience="helpdesk_responsible",
        priority="normal",
        module="helpdesk",
        description="New helpdesk ticket opened; responsible team should be notified.",
    ),
    PushEventType.HELPDESK_REPLY: PushEventDefinition(
        key=PushEventType.HELPDESK_REPLY,
        audience="ticket_participants",
        priority="normal",
        module="helpdesk",
        description="New helpdesk reply added; other ticket participants should be notified.",
    ),
    PushEventType.HELPDESK_STATUS_CHANGED: PushEventDefinition(
        key=PushEventType.HELPDESK_STATUS_CHANGED,
        audience="ticket_creator",
        priority="normal",
        module="helpdesk",
        description="Helpdesk ticket status changed; ticket owner should be notified.",
    ),
    PushEventType.TRAINING_ASSIGNED: PushEventDefinition(
        key=PushEventType.TRAINING_ASSIGNED,
        audience="actor_employee",
        priority="normal",
        module="training",
        description="Employee assigned to a training; employee should be notified.",
    ),
    PushEventType.TRAINING_CANCELLED: PushEventDefinition(
        key=PushEventType.TRAINING_CANCELLED,
        audience="actor_employee",
        priority="normal",
        module="training",
        description="Assigned training was cancelled; participant should be notified.",
    ),
    PushEventType.ATTENDANCE_CLOCK_IN_SUCCESS: PushEventDefinition(
        key=PushEventType.ATTENDANCE_CLOCK_IN_SUCCESS,
        audience="actor_employee",
        priority="low",
        module="attendance",
        description="Clock-in succeeded; employee can receive optional confirmation.",
    ),
    PushEventType.ATTENDANCE_CLOCK_OUT_SUCCESS: PushEventDefinition(
        key=PushEventType.ATTENDANCE_CLOCK_OUT_SUCCESS,
        audience="actor_employee",
        priority="low",
        module="attendance",
        description="Clock-out succeeded; employee can receive optional confirmation.",
    ),
    PushEventType.ATTENDANCE_APPROVAL_DECISION: PushEventDefinition(
        key=PushEventType.ATTENDANCE_APPROVAL_DECISION,
        audience="actor_employee",
        priority="normal",
        module="attendance",
        description="Manual attendance approval was approved or rejected; employee should be notified.",
    ),
    PushEventType.AUTH_LOGIN_SUCCESS: PushEventDefinition(
        key=PushEventType.AUTH_LOGIN_SUCCESS,
        audience="actor_employee",
        priority="low",
        module="auth",
        description="Optional login success security notice.",
    ),
    PushEventType.AUTH_MFA_SUCCESS: PushEventDefinition(
        key=PushEventType.AUTH_MFA_SUCCESS,
        audience="actor_employee",
        priority="low",
        module="auth",
        description="Optional MFA success security notice.",
    ),
}


def get_push_event_definition(event_key: str) -> PushEventDefinition | None:
    return PUSH_EVENT_CATALOG.get(event_key)

