from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.work_schedule import (
    DepartmentWorkSchedule,
    EmployeeWorkScheduleOverride,
    WorkSchedule,
)


def resolve_effective_schedule(
    db: Session,
    employee: Employee,
    target_date: date,
) -> tuple[Optional[WorkSchedule], Optional[str]]:
    override = (
        db.query(EmployeeWorkScheduleOverride)
        .join(WorkSchedule, EmployeeWorkScheduleOverride.work_schedule_id == WorkSchedule.id)
        .filter(
            EmployeeWorkScheduleOverride.employee_id == employee.id,
            EmployeeWorkScheduleOverride.is_active.is_(True),
            EmployeeWorkScheduleOverride.effective_from <= target_date,
            WorkSchedule.is_active.is_(True),
        )
        .filter(
            (EmployeeWorkScheduleOverride.effective_to.is_(None))
            | (EmployeeWorkScheduleOverride.effective_to >= target_date)
        )
        .order_by(EmployeeWorkScheduleOverride.effective_from.desc())
        .first()
    )
    if override:
        return override.work_schedule, "EMPLOYEE_OVERRIDE"

    if employee.department_id:
        dept_assignment = (
            db.query(DepartmentWorkSchedule)
            .join(WorkSchedule, DepartmentWorkSchedule.work_schedule_id == WorkSchedule.id)
            .filter(
                DepartmentWorkSchedule.department_id == employee.department_id,
                DepartmentWorkSchedule.company_id == employee.company_id,
                DepartmentWorkSchedule.is_active.is_(True),
                WorkSchedule.is_active.is_(True),
            )
            .first()
        )
        if dept_assignment:
            return dept_assignment.work_schedule, "DEPARTMENT_DEFAULT"

    return None, None


def _combine_schedule_dt(target_date: date, hour_value, crosses_midnight: bool, is_end: bool) -> datetime:
    combined = datetime.combine(target_date, hour_value)
    if is_end and crosses_midnight:
        combined += timedelta(days=1)
    return combined


def evaluate_attendance_record(attendance: Attendance, schedule: Optional[WorkSchedule]) -> dict:
    result = {
        "schedule_name": None,
        "schedule_type": None,
        "scheduled_start": None,
        "scheduled_end": None,
        "late_minutes": 0,
        "early_leave_minutes": 0,
        "overtime_minutes": 0,
        "violation_code": "NONE",
    }

    if not schedule:
        return result

    scheduled_start = _combine_schedule_dt(attendance.date, schedule.start_time, schedule.crosses_midnight, False)
    scheduled_end = _combine_schedule_dt(attendance.date, schedule.end_time, schedule.crosses_midnight, True)

    result["schedule_name"] = schedule.name
    result["schedule_type"] = schedule.schedule_type
    result["scheduled_start"] = scheduled_start
    result["scheduled_end"] = scheduled_end

    if attendance.check_in:
        reference_start = scheduled_start
        if schedule.schedule_type == "FLEX" and schedule.core_start_time:
            reference_start = _combine_schedule_dt(attendance.date, schedule.core_start_time, schedule.crosses_midnight, False)

        late_threshold = reference_start + timedelta(minutes=(schedule.grace_in_minutes or 0) + (schedule.late_after_minutes or 0))
        if attendance.check_in > late_threshold:
            result["late_minutes"] = max(0, int((attendance.check_in - late_threshold).total_seconds() // 60))

    if attendance.check_out:
        reference_end = scheduled_end
        if schedule.schedule_type == "FLEX" and schedule.core_end_time:
            reference_end = _combine_schedule_dt(attendance.date, schedule.core_end_time, schedule.crosses_midnight, True)

        early_threshold = reference_end - timedelta(minutes=(schedule.grace_out_minutes or 0) + (schedule.early_leave_after_minutes or 0))
        if attendance.check_out < early_threshold:
            result["early_leave_minutes"] = max(0, int((early_threshold - attendance.check_out).total_seconds() // 60))

        overtime_threshold = scheduled_end + timedelta(minutes=schedule.overtime_after_minutes or 0)
        if attendance.check_out > overtime_threshold:
            result["overtime_minutes"] = max(0, int((attendance.check_out - overtime_threshold).total_seconds() // 60))

    if attendance.check_in and not attendance.check_out:
        result["violation_code"] = "MISSING_CLOCK_OUT"
    elif not attendance.check_in and attendance.check_out:
        result["violation_code"] = "MISSING_CLOCK_IN"
    elif result["late_minutes"] > 0 and result["early_leave_minutes"] > 0:
        result["violation_code"] = "LATE_IN_EARLY_OUT"
    elif result["late_minutes"] > 0:
        result["violation_code"] = "LATE_IN"
    elif result["early_leave_minutes"] > 0:
        result["violation_code"] = "EARLY_OUT"

    return result
