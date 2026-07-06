from fastapi import APIRouter, Depends, Request  # 🎯 YENİ: Request eklendi
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.i18n import _ # 🌍 YENİ: Çeviri motorumuz eklendi
from app.models.settings import SystemSetting

router = APIRouter()

# 1. Pydantic Şeması
class RoutingSettings(BaseModel):
    it_responsible: Optional[str] = ""
    hr_responsible: Optional[str] = ""
    admin_responsible: Optional[str] = ""

# 2. Ayarları Getir (GET)
@router.get("/routing", response_model=RoutingSettings)
def get_routing_settings(db: Session = Depends(get_db)):
    # Not: GET rotasında kullanıcıya bir mesaj dönmediğimiz için Request'e şu an teknik olarak gerek yok 
    # ancak tutarlılık için eklenebilir. Mevcut yapıyı bozmamak adına sade bıraktım.
    keys = ["it_responsible", "hr_responsible", "admin_responsible"]
    settings = db.query(SystemSetting).filter(SystemSetting.key.in_(keys)).all()
    
    result = RoutingSettings()
    for s in settings:
        if s.key == "it_responsible": result.it_responsible = s.value
        elif s.key == "hr_responsible": result.hr_responsible = s.value
        elif s.key == "admin_responsible": result.admin_responsible = s.value
        
    return result

# 3. Ayarları Kaydet (POST)
@router.post("/routing")
def update_routing_settings(
    settings: RoutingSettings, 
    request: Request, # 🌍 YENİ: Dil tespiti için eklendi
    db: Session = Depends(get_db)
):
    settings_dict = settings.model_dump()
    
    for key, value in settings_dict.items():
        db_setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if db_setting:
            db_setting.value = value
        else:
            new_setting = SystemSetting(key=key, value=value)
            db.add(new_setting)
            
    db.commit()
    return {
        "message": _("settings_updated_success", request), 
        "status": "success"
    }