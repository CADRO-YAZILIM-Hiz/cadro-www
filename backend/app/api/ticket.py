"""
⚠️ LEGACY TICKET WRAPPER

Bu dosya geçmişte ayrı bir ticket modülüydü.
Projede aktif kullanılan destek/ticket sistemi artık:
    app.api.helpdesk

Bu nedenle bu dosyayı silmek yerine uyumluluk katmanı olarak bırakıyoruz.
Böylece eski import zincirleri kırılmadan, tek doğru iş mantığına yönlenmiş oluyor.
"""

from app.api.helpdesk import (
    router,
    TicketCreate,
    TicketUpdate,
    MessageCreate,
)

__all__ = [
    "router",
    "TicketCreate",
    "TicketUpdate",
    "MessageCreate",
]
