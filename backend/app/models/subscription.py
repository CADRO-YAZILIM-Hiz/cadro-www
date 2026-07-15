from sqlalchemy import Column, Integer, String, Date, ForeignKey
from app.core.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    plan = Column(String, default="Pro")  # Pro Plan
    max_users = Column(Integer, default=20)
    
    start_date = Column(Date)
    expiry_date = Column(Date)

    status = Column(String, default="Active")  # Active / Expired