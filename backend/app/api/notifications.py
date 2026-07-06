"""
⚠️ LEGACY NOTIFICATIONS WRAPPER

Projede aktif kullanılan bildirim endpoint'i:
    app.api.notification

Bu dosya geçmişte farklı bir isimle kullanılmış olabilir.
Silmek yerine uyumluluk katmanı olarak bırakıyoruz.
"""

from app.api.notification import router

__all__ = ["router"]
