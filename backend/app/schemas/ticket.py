from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# --- MESAJ ŞEMALARI ---
class TicketMessageCreate(BaseModel):
    message: str

class TicketMessageOut(BaseModel):
    id: int
    sender_id: int
    sender_name: Optional[str] = "Sistem"
    message: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- DESTEK TALEBİ (TICKET) ŞEMALARI ---
class TicketCreate(BaseModel):
    subject: str
    category: str
    priority: Optional[str] = "NORMAL"
    message: str # 🎯 initial_message yerine 'message' yapıldı çünkü arıza paneli böyle yolluyor.
    related_asset_id: Optional[int] = None # 🎯 Zimmet arızası için opsiyonel ID eklendi

class TicketUpdateStatus(BaseModel):
    status: str # AÇIK, İŞLEMDE, ÇÖZÜLDÜ

class TicketOut(BaseModel):
    id: int
    employee_id: int
    subject: str
    category: str
    priority: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class TicketDetailOut(TicketOut):
    messages: List[TicketMessageOut] = []