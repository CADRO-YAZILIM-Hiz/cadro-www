from sqlalchemy import Column, Integer, String
from app.core.database import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False) # Örn: "it_responsible"
    value = Column(String, nullable=True)                         # Örn: "102" (Personel ID)
    description = Column(String, nullable=True)                   # Örn: "Help Desk Sorumlusu"