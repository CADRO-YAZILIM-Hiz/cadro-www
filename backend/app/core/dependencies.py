import json
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.security import SECRET_KEY, ALGORITHM
from app.core.i18n import _  # 🌍 Çeviri motoru eklendi

# ==========================================
# 🔐 TEK DOĞRU TOKEN GİRİŞ KAPISI
# ==========================================
# Uygulamadaki tüm aktif endpoint'ler buradan beslenmeli.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ==========================================
# 🛡️ YARDIMCI HATA ÜRETİCİLER
# ==========================================
def raise_invalid_token(request: Request):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=_("err_invalid_token", request),
        headers={"WWW-Authenticate": "Bearer"},
    )


def raise_expired_or_invalid_token(request: Request):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=_("err_token_expired", request),
        headers={"WWW-Authenticate": "Bearer"},
    )


# ==========================================
# 🧠 TOKEN ÇÖZÜMLEYİCİ
# ==========================================
def parse_token_payload(payload: dict, request: Request) -> dict:
    """
    Token içeriğini hem yeni hem eski formatlarla geriye dönük uyumlu çözer.
    
    Desteklenen formatlar:
    1. Yeni format:
       {
         "sub": "{\"user_id\":1,\"company_id\":1,\"role\":\"ADMIN\"}",
         "exp": ...
       }

    2. Eski düz format:
       {
         "user_id": 1,
         "company_id": 1,
         "role": "ADMIN",
         "exp": ...
       }
    """
    sub_data = payload.get("sub")

    user_id = None
    company_id = None
    role = None
    email = None
    company_plan = None

    if sub_data and isinstance(sub_data, str):
        if sub_data.startswith("{"):
            try:
                token_dict = json.loads(sub_data)
            except json.JSONDecodeError:
                raise_invalid_token(request)

            user_id = int(token_dict.get("user_id")) if token_dict.get("user_id") else None
            company_id = int(token_dict.get("company_id")) if token_dict.get("company_id") else None
            role = token_dict.get("role")
            email = token_dict.get("sub") or token_dict.get("email")
            company_plan = token_dict.get("company_plan")
        else:
            # Bazı eski tokenlarda sub doğrudan e-posta olabilir.
            email = sub_data

    if user_id is None:
        user_id = payload.get("user_id")
    if company_id is None:
        company_id = payload.get("company_id")
    if role is None:
        role = payload.get("role")
    if email is None:
        email = payload.get("email")
    if company_plan is None:
        company_plan = payload.get("company_plan")

    if user_id is None:
        raise_invalid_token(request)

    return {
        "user_id": int(user_id),
        "company_id": int(company_id) if company_id is not None else None,
        "role": role,
        "email": email,
        "company_plan": company_plan,
    }


# ==========================================
# 👤 AKTİF KULLANICI ÇÖZÜMLEYİCİ
# ==========================================
def get_current_user(request: Request, token: str = Depends(oauth2_scheme)):
    """Token'ı doğrular ve içindeki kullanıcı, şirket ve rol bilgilerini güvenle çözer."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("token_type", "access") != "access":
            raise_invalid_token(request)
        return parse_token_payload(payload, request)

    except HTTPException:
        raise
    except JWTError:
        raise_expired_or_invalid_token(request)
    except Exception:
        raise_expired_or_invalid_token(request)


# ==========================================
# 🛡️ YENİ NESİL TURNİKE (ROLE CHECKER)
# ==========================================
class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, request: Request, current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=_("err_unauthorized_role", request)
            )
        return current_user


# ==========================================
# 🧱 GERİYE DÖNÜK UYUMLU FONKSİYONEL TURNİKE
# ==========================================
def role_required(allowed_roles: list):
    """
    Eski endpoint'lerde closure tabanlı kullanım için korundu.
    Yeni geliştirmelerde RoleChecker tercih edilebilir.
    """
    checker = RoleChecker(allowed_roles)

    def role_checker(request: Request, current_user: dict = Depends(get_current_user)):
        return checker(request, current_user)

    return role_checker
