from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.models.company import Company, SubscriptionStatus

router = APIRouter()

# Frontend'den gelecek verinin şeması
class CompanyInitRequest(BaseModel):
    company_name: str
    email: EmailStr
    plan_code: str = "PRO"

@router.post("/init-checkout", status_code=status.HTTP_201_CREATED)
def init_checkout_company(request: CompanyInitRequest, db: Session = Depends(get_db)):
    """
    Ödeme adımına geçmeden hemen önce çalıştırılır.
    Veritabanında PENDING (TRIAL/inaktif) statüsünde bir şirket açar 
    ve Paddle custom_data'ya gömülecek ID'yi döner.
    """
    
    # Şirket adı daha önce alınmış mı kontrolü
    existing_company = db.query(Company).filter(Company.name == request.company_name).first()
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Bu şirket adı zaten kullanılıyor."
        )

    # Yeni şirketi oluştur (Varsayılan olarak is_active=False bırakıyoruz)
    new_company = Company(
        name=request.company_name,
        email=request.email,
        plan_code=request.plan_code,
        subscription_status=SubscriptionStatus.TRIAL,
        is_active=False 
    )
    
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    
    return {
        "status": "success", 
        "company_id": new_company.id,
        "message": "Şirket ön kaydı oluşturuldu, ödeme bekleniyor."
    }