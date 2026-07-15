from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Training(Base):
    __tablename__ = "trainings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    instructor = Column(String(255))
    location = Column(String(255)) 
    training_date = Column(Date, nullable=False)
    training_time = Column(Time, nullable=False)
    status = Column(String(50), default="SCHEDULED") # SCHEDULED, COMPLETED, CANCELLED

    # İlişkiler
    participants = relationship("TrainingParticipant", back_populates="training", cascade="all, delete-orphan")

class TrainingParticipant(Base):
    __tablename__ = "training_participants"

    id = Column(Integer, primary_key=True, index=True)
    training_id = Column(Integer, ForeignKey("trainings.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    attendance_status = Column(String(50), default="BEKLİYOR") # BEKLİYOR, KATILDI, KATILMADI

    # İlişkiler
    training = relationship("Training", back_populates="participants")
    employee = relationship("Employee")