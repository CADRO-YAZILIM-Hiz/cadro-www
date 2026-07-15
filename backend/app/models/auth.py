"""
⚠️ LEGACY AUTH WRAPPER

Bu dosya geçmişte bağımsız bir auth router içeriyordu.
Ancak artık projedeki tek aktif ve güncel auth implementasyonu:
    app.api.auth

Bu dosyayı tamamen silmiyoruz; çünkü eski import zincirlerinde
`app.models.auth.router` gibi referanslar kalmış olabilir.
Böylece kazanılmış yetenekleri bozmadan gerçek router'a yönlendiriyoruz.
"""

from app.api.auth import (
    router,
    RegisterRequest,
    VerifyMFARequest,
    ForgotPasswordRequest,
    ResetPasswordConfirm,
)

__all__ = [
    "router",
    "RegisterRequest",
    "VerifyMFARequest",
    "ForgotPasswordRequest",
    "ResetPasswordConfirm",
]
