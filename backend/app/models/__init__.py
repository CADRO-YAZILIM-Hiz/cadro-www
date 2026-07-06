from app.core.database import Base
from .user import User
from .company import Company, SubscriptionStatus
from .employee import Employee
from .document import EmployeeDocument, DocumentActionLog
from .attendance import Attendance
from .asset_expense import Asset, Expense, PurchaseRequest, PurchaseRequestActionLog
from .leave import LeaveRequest
from .helpdesk import Ticket, TicketMessage, TicketActionLog  # 🎯 YENİ EKLENDİ
from .generic_request import GenericRequest, GenericRequestMessage, GenericRequestActionLog
from .work_schedule import WorkSchedule, DepartmentWorkSchedule, EmployeeWorkScheduleOverride
from .audit_log import AuditLog
from .mobile_device import MobileDevice
from .knowledge_base import KnowledgeArticle, KnowledgeArticleReceipt, KnowledgeArticleVersion, KnowledgeArticleReceiptLog
from .checklist import LifecycleChecklistTemplate, LifecycleChecklistCompletion
from .kpi import KpiMetric
from .subscription import Subscription
from .paddle_event import PaddleWebhookEvent

__all__ = [
    "Base", "User", "Company", "Employee", "Attendance", 
    "Asset", "Expense", "PurchaseRequest", "PurchaseRequestActionLog",
    "LeaveRequest", "LeavePolicy", "LeaveBalance",
    "Ticket", "TicketMessage", "TicketActionLog",
    "GenericRequest", "GenericRequestMessage", "GenericRequestActionLog",
    "WorkSchedule", "DepartmentWorkSchedule", "EmployeeWorkScheduleOverride",
    "AuditLog", "MobileDevice",
    "KnowledgeArticle", "KnowledgeArticleReceipt", "KnowledgeArticleVersion", "KnowledgeArticleReceiptLog",
    "LifecycleChecklistTemplate", "LifecycleChecklistCompletion",
    "KpiMetric", "EmployeeDocument", "DocumentActionLog", "Subscription", "PaddleWebhookEvent",
]
