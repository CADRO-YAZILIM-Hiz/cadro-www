# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterRequest(BaseModel):
    # Kullanıcı Bilgileri
    username: str = Field(..., min_length=3)
    email: EmailStr
    password: str = Field(..., min_length=6)
    
    # Şirket Bilgileri (company_id yerine artık isim alıyoruz, id'yi biz oluşturacağız)
    company_name: str = Field(..., min_length=2)
    
    # Ödeme / Kart Bilgileri (Simüle edilmiş veya Iyzico/Stripe Token'ı)
    card_holder: str
    card_number: str # Frontend'de maskelenmiş veya tokenize edilmiş veri
    expiry: str      # AA/YY
    cvc: str
    
    # Opsiyonel Alanlar
    phone: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"