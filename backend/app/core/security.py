import os
import bcrypt 
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt
from dotenv import load_dotenv
from app.core.config import settings # Config dosyanı import ettik

load_dotenv()

# Ayarlar
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480)) # 8 Saat
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is required.")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Girilen şifre ile veritabanındaki hash'lenmiş şifreyi karşılaştırır."""
    pwd_bytes = plain_password.encode('utf-8')[:72]
    hash_bytes = hashed_password.encode('utf-8')
    
    return bcrypt.checkpw(pwd_bytes, hash_bytes)

def hash_password(password: str) -> str:
    """Şifreyi veritabanına kaydetmeden önce güvenli bir şekilde hash'ler."""
    pwd_bytes = password.encode('utf-8')[:72]
    
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    
    return hashed_password.decode('utf-8')

def _create_token(subject: Union[str, Any], token_type: str, expires_delta: Optional[timedelta]) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        if token_type == "refresh":
            expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "token_type": token_type}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Kullanıcı için bir JWT erişim token'ı oluşturur."""
    return _create_token(subject=subject, token_type="access", expires_delta=expires_delta)


def create_refresh_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Kullanıcı için bir JWT refresh token'ı oluşturur."""
    return _create_token(subject=subject, token_type="refresh", expires_delta=expires_delta)

# ==============================================================
# 🛡️ PADDLE WEBHOOK GÜVENLİK DOĞRULAMASI
# ==============================================================
def verify_paddle_signature(signature_header: str, raw_body: str) -> bool:
    """
    Paddle Billing Webhook imzasını HMAC-SHA256 kullanarak doğrular.
    """
    if not signature_header or not settings.PADDLE_WEBHOOK_SECRET:
        return False

    try:
        # 1. Başlıktaki değerleri ayrıştır (ts=...;h1=...)
        parts = dict(part.split('=') for part in signature_header.split(';'))
        ts = parts.get('ts')
        h1 = parts.get('h1')

        if not ts or not h1:
            return False

        # 2. Paddle'ın beklediği formattaki mesajı oluştur: ts + ":" + raw_body
        signed_payload = f"{ts}:{raw_body}"

        # 3. Kendi gizli anahtarımızla HMAC-SHA256 üret
        secret_key = settings.PADDLE_WEBHOOK_SECRET.encode('utf-8')
        hmac_obj = hmac.new(secret_key, signed_payload.encode('utf-8'), hashlib.sha256)
        expected_signature = hmac_obj.hexdigest()

        # 4. Ürettiğimiz imza, h1'deki imza ile eşleşiyor mu?
        return hmac.compare_digest(expected_signature, h1)

    except Exception as e:
        print(f"Paddle Signature Verification Error: {e}")
        return False
