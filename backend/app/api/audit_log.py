from datetime import datetime, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.i18n import _
from app.core.permissions import ensure_permission
from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.employee import Department, Employee

router = APIRouter()


@router.get("/")
def get_audit_logs(
    request: Request,
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    start_time: Optional[str] = Query(default=None),
    end_time: Optional[str] = Query(default=None),
    action_type: Optional[str] = Query(default=None),
    employee_id: Optional[int] = Query(default=None),
    department_id: Optional[int] = Query(default=None),
    company_id: Optional[int] = Query(default=None),
    resource_type: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "audit.view_tenant", request)

    query = db.query(AuditLog)

    if start_date:
      try:
          start_dt = datetime.combine(datetime.strptime(start_date, "%Y-%m-%d").date(), time.min)
      except ValueError:
          raise HTTPException(status_code=400, detail="Invalid start_date format")
      if start_time:
          try:
              parsed_start_time = datetime.strptime(start_time, "%H:%M").time()
              start_dt = datetime.combine(start_dt.date(), parsed_start_time)
          except ValueError:
              raise HTTPException(status_code=400, detail="Invalid start_time format")
      query = query.filter(AuditLog.created_at >= start_dt)

    if end_date:
      try:
          end_dt = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d").date(), time.max)
      except ValueError:
          raise HTTPException(status_code=400, detail="Invalid end_date format")
      if end_time:
          try:
              parsed_end_time = datetime.strptime(end_time, "%H:%M").time()
              end_dt = datetime.combine(end_dt.date(), parsed_end_time)
          except ValueError:
              raise HTTPException(status_code=400, detail="Invalid end_time format")
      query = query.filter(AuditLog.created_at <= end_dt)

    if action_type:
        query = query.filter(AuditLog.action_type == action_type)

    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    if company_id:
        query = query.filter(AuditLog.company_id == company_id)

    if employee_id:
        query = query.filter(AuditLog.actor_employee_id == employee_id)

    if department_id:
        query = query.filter(AuditLog.actor_department_id == department_id)

    logs = query.order_by(AuditLog.created_at.desc()).limit(1000).all()

    return {
        "logs": [
            {
                "id": log.id,
                "company_id": log.company_id,
                "company_name": log.company_name,
                "actor_employee_id": log.actor_employee_id,
                "actor_name": log.actor_name,
                "actor_role": log.actor_role,
                "actor_department_id": log.actor_department_id,
                "actor_department_name": log.actor_department_name,
                "action_type": log.action_type,
                "resource_type": log.resource_type,
                "http_method": log.http_method,
                "path": log.path,
                "query_string": log.query_string,
                "status_code": log.status_code,
                "ip_address": log.ip_address,
                "detail": log.detail,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ]
    }


@router.get("/filters")
def get_audit_log_filters(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_permission(current_user, "audit.view_tenant", request)

    employees = db.query(Employee).order_by(Employee.first_name.asc(), Employee.last_name.asc()).all()
    departments = db.query(Department).join(
        Employee, Employee.department_id == Department.id
    ).distinct().order_by(Department.name.asc()).all()
    companies = db.query(Company).order_by(Company.name.asc()).all()
    action_types = [
        row[0]
        for row in db.query(AuditLog.action_type)
        .distinct()
        .order_by(AuditLog.action_type.asc())
        .all()
        if row[0]
    ]
    resource_types = [
        row[0]
        for row in db.query(AuditLog.resource_type)
        .distinct()
        .order_by(AuditLog.resource_type.asc())
        .all()
        if row[0]
    ]

    return {
        "employees": [
            {
                "id": employee.id,
                "name": f"{employee.first_name} {employee.last_name}",
            }
            for employee in employees
        ],
        "companies": [
            {
                "id": company.id,
                "name": company.name,
            }
            for company in companies
        ],
        "departments": [
            {
                "id": department.id,
                "name": department.name,
            }
            for department in departments
        ],
        "action_types": action_types,
        "resource_types": resource_types,
    }
