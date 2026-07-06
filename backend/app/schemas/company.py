from pydantic import BaseModel
from typing import Optional

class CompanyUpdate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None