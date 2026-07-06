from sqlalchemy.orm import Session
from sqlalchemy import extract
from app.models.asset_expense import Expense

def get_approved_expenses_sum(db: Session, emp_id: int, month: int, year: int):
    """
    Personelin o ay içindeki onaylanmış (APPROVED) masraflarının toplamını döner.
    Bu tutar maaş hesaplanırken 'other_earnings' kısmına eklenecektir.
    """
    expenses = db.query(Expense).filter(
        Expense.employee_id == emp_id,
        Expense.status == "APPROVED",
        extract('month', Expense.expense_date) == month,
        extract('year', Expense.expense_date) == year
    ).all()
    
    return sum(e.amount for e in expenses)