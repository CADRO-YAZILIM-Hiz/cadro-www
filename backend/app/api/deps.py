"""
⚠️ GERİYE DÖNÜK UYUMLULUK KATMANI

Bu dosya eskiden bağımsız token çözümleme mantığı içeriyordu.
Artık uygulamadaki tek doğru dependency kaynağı:
    app.core.dependencies

Burayı silmiyoruz; çünkü projede veya eski modüllerde hala
`from app.api.deps import ...` şeklinde import edilmiş olabilir.

Böylece kazanılmış yetenekleri bozmadan tek merkezli auth/dependency
yapısına geçiyoruz.
"""

from app.core.dependencies import (
    oauth2_scheme,
    get_current_user,
    RoleChecker,
    role_required,
)

__all__ = [
    "oauth2_scheme",
    "get_current_user",
    "RoleChecker",
    "role_required",
]
