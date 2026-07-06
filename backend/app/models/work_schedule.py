from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String, Time
from sqlalchemy.orm import relationship

from app.core.database import Base


# ==========================================
# 🕒 MESAİ ŞABLONLARI
# Departman varsayılanı + personel istisnası
# hibrit yapı için temel tablo.
# ==========================================
class WorkSchedule(Base):
    __tablename__ = "work_schedules"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)

    name = Column(String(120), nullable=False)
    schedule_type = Column(String(20), default="FIXED", nullable=False)  # FIXED, FLEX

    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    break_minutes = Column(Integer, default=60, nullable=False)

    grace_in_minutes = Column(Integer, default=0, nullable=False)
    grace_out_minutes = Column(Integer, default=0, nullable=False)
    late_after_minutes = Column(Integer, default=0, nullable=False)
    early_leave_after_minutes = Column(Integer, default=0, nullable=False)
    overtime_after_minutes = Column(Integer, default=0, nullable=False)

    core_start_time = Column(Time, nullable=True)
    core_end_time = Column(Time, nullable=True)
    crosses_midnight = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


# ==========================================
# 🏢 DEPARTMAN VARSAYILAN MESAİSİ
# Her departmanın hızlı toplu kullanım için
# bir varsayılan planı olabilir.
# ==========================================
class DepartmentWorkSchedule(Base):
    __tablename__ = "department_work_schedules"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    work_schedule_id = Column(Integer, ForeignKey("work_schedules.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    department = relationship("Department")
    work_schedule = relationship("WorkSchedule")


# ==========================================
# 👤 PERSONEL MESAİ İSTİSNASI
# Departman varsayılanını bozmadan sadece
# ihtiyaç halinde kişiye özel plan tanımlar.
# ==========================================
class EmployeeWorkScheduleOverride(Base):
    __tablename__ = "employee_work_schedule_overrides"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    work_schedule_id = Column(Integer, ForeignKey("work_schedules.id"), nullable=False, index=True)

    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    reason = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    employee = relationship("Employee")
    work_schedule = relationship("WorkSchedule")
