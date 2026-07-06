from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Boolean, Numeric, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import date, datetime
from app.core.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

    asset_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    serial_number = Column(String, nullable=True)
    serial_no = Column(String, nullable=True)
    condition_on_assign = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    issue_date = Column(Date, default=date.today)
    given_date = Column(Date, nullable=True)
    return_date = Column(Date, nullable=True)

    status = Column(String, default="ASSIGNED")
    is_acknowledged = Column(Boolean, default=False)
    is_returned = Column(Boolean, default=False)

    company = relationship("Company", back_populates="assets")
    employee = relationship("Employee", back_populates="assets")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="TRY")
    category = Column(String, nullable=False)
    description = Column(String, nullable=True)
    expense_date = Column(Date, nullable=False)

    receipt_url = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    is_paid = Column(Boolean, default=False)

    company = relationship("Company", back_populates="expenses")
    employee = relationship("Employee", back_populates="expenses")


class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    finance_approver_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)

    item_name = Column(String, nullable=False)
    item_url = Column(String, nullable=True)
    vendor_name = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="TRY")
    justification = Column(Text, nullable=True)
    needed_by = Column(Date, nullable=True)
    status = Column(String, default="PENDING")
    rejection_reason = Column(Text, nullable=True)
    converted_expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", foreign_keys=[company_id])
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="purchase_requests")
    finance_approver = relationship("Employee", foreign_keys=[finance_approver_id])


class PurchaseRequestActionLog(Base):
    __tablename__ = "purchase_request_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    purchase_request_id = Column(Integer, ForeignKey("purchase_requests.id"), nullable=False)
    actor_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

    action = Column(String, nullable=False)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    detail = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
