from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re

# Ortak özellikler
class UserBase(BaseModel):
    username: str
    email: EmailStr
    is_active: Optional[bool] = True

# Kayıt ve Şifre Değişiminde kullanılacak Güçlü Şifre Kuralı
class UserCreate(UserBase):
    password: str
    company_id: int

    @field_validator('password')
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Şifre en az 8 karakter olmalıdır.')
        if not re.search(r"[A-Z]", v):
            raise ValueError('Şifre en az bir büyük harf içermelidir.')
        if not re.search(r"[a-z]", v):
            raise ValueError('Şifre en az bir küçük harf içermelidir.')
        if not re.search(r"\d", v):
            raise ValueError('Şifre en az bir rakam içermelidir.')
        if not re.search(r"[@$!%*?&]", v):
            raise ValueError('Şifre en az bir özel karakter içermelidir (@$!%*?&).')
        return v

# --- 🛡️ YENİ GÜVENLİK ŞEMALARI ---

# Şifremi Unuttum İsteği
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# OTP Doğrulama (Login sonrası veya şifre sıfırlama anında)
class VerifyOTP(BaseModel):
    email: EmailStr
    otp_code: str

# Yeni Şifre Belirleme (OTP doğrulandıktan sonra)
class ResetPasswordConfirm(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str

# E-posta Değiştirme İsteği
class EmailChangeRequest(BaseModel):
    new_email: EmailStr

# ---------------------------------

class UserOut(UserBase):
    id: int
    company_id: int
    mfa_enabled: bool
    require_password_change: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    # MFA aşamasında mıyız yoksa giriş tamam mı?
    mfa_required: bool = False 

class TokenData(BaseModel):
    email: Optional[str] = None
    company_id: Optional[int] = None