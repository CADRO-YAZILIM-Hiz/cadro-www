from pydantic import BaseModel
from datetime import date
from typing import Optional, List

# --- YENİ ENVANTER SİSTEMİ ŞEMALARI ---

class AssetBase(BaseModel):
    asset_name: str
    category: str = "Elektronik Cihazlar"
    serial_no: Optional[str] = None
    condition_on_assign: str = "Sıfır"
    description: Optional[str] = None

class AssetCreate(AssetBase):
    company_id: int
    employee_id: Optional[int] = None # Depoda durabilmesi için Optional
    given_date: Optional[date] = None

class AssetOut(AssetBase):
    id: int
    company_id: int
    employee_id: Optional[int]
    status: str
    given_date: Optional[date]
    return_date: Optional[date]
    is_returned: bool

    class Config:
        from_attributes = True

# --- 🚀 İŞTE EKSİK OLAN KAHRAMAN: ÇOKLU EKLEME ŞEMASI ---
class AssetBulkCreate(BaseModel):
    company_id: Optional[int] = None # 🎯 DÜZELTME: Backend'in bunu token'dan otomatik bulması için zorunluluğu kaldırdık
    employee_id: Optional[int] = None
    asset_name: str
    category: str
    condition_on_assign: str = "Sıfır"
    description: Optional[str] = None
    given_date: Optional[date] = None
    
    # Excel'den yapıştırılan seri numaraları listesi
    serial_numbers: Optional[List[str]] = []
    # Eğer seri numarası yoksa sadece adet belirtilir
    quantity: int = 1
    
# --- HARCAMA ŞEMASI (Mevcut olanı koruyoruz) ---
class ExpenseCreate(BaseModel):
    employee_id: int
    amount: float
    category: str
    description: Optional[str] = None
    expense_date: Optional[date] = None