# backend/app/schemas/location.py
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class LocationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: Decimal
    longitude: Decimal
    allowed_radius: int = 100

class LocationOut(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    latitude: Decimal
    longitude: Decimal
    allowed_radius: int
    qr_token: str
    is_active: bool

    class Config:
        from_attributes = True