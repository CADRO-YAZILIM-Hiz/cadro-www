from datetime import date, time
from typing import List, Optional

from pydantic import BaseModel


class WorkScheduleCreate(BaseModel):
    name: str
    schedule_type: str = "FIXED"
    start_time: time
    end_time: time
    break_minutes: int = 60
    grace_in_minutes: int = 0
    grace_out_minutes: int = 0
    late_after_minutes: int = 0
    early_leave_after_minutes: int = 0
    overtime_after_minutes: int = 0
    core_start_time: Optional[time] = None
    core_end_time: Optional[time] = None
    crosses_midnight: bool = False
    is_active: bool = True


class WorkScheduleUpdate(BaseModel):
    name: Optional[str] = None
    schedule_type: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    break_minutes: Optional[int] = None
    grace_in_minutes: Optional[int] = None
    grace_out_minutes: Optional[int] = None
    late_after_minutes: Optional[int] = None
    early_leave_after_minutes: Optional[int] = None
    overtime_after_minutes: Optional[int] = None
    core_start_time: Optional[time] = None
    core_end_time: Optional[time] = None
    crosses_midnight: Optional[bool] = None
    is_active: Optional[bool] = None


class WorkScheduleOut(BaseModel):
    id: int
    company_id: int
    name: str
    schedule_type: str
    start_time: time
    end_time: time
    break_minutes: int
    grace_in_minutes: int
    grace_out_minutes: int
    late_after_minutes: int
    early_leave_after_minutes: int
    overtime_after_minutes: int
    core_start_time: Optional[time] = None
    core_end_time: Optional[time] = None
    crosses_midnight: bool
    is_active: bool

    class Config:
        from_attributes = True


class DepartmentScheduleAssignmentItem(BaseModel):
    department_id: int
    work_schedule_id: int


class DepartmentScheduleBulkAssign(BaseModel):
    assignments: List[DepartmentScheduleAssignmentItem]


class EmployeeScheduleBulkAssign(BaseModel):
    employee_ids: List[int]
    work_schedule_id: int
    effective_from: date
    effective_to: Optional[date] = None
    reason: Optional[str] = None


class EmployeeScheduleClear(BaseModel):
    employee_ids: List[int]
