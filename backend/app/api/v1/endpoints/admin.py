from fastapi import APIRouter

router = APIRouter()

# -------------------------------------------------------------------
# 🧹 TEMİZLİK BİLGİSİ: 
# Eskiden burada bulunan "PayrollTypes (Bordro Oranları)" rotaları,
# sistemin Core HR (Sadece İK) yapısına geçmesi nedeniyle silinmiştir.
#
# İleride Şirket İzin Kotaları, Çalışma Saatleri veya Sistem Ayarları
# gibi genel admin fonksiyonları buraya eklenebilir.
# -------------------------------------------------------------------

@router.get("/status", summary="Admin API Durumu")
def admin_status():
    return {"status": "success", "message": "Admin API aktif ve Core HR modunda çalışıyor."}