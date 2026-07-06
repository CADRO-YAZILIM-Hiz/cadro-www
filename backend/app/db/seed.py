# backend/app/db/seed.py
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base

# SQLAlchemy'nin tabloları oluşturabilmesi ve ilişkileri çözebilmesi için 
# tüm modelleri buraya import ediyoruz.
from app.models.payroll import PayrollType, Payroll
from app.models.employee import Employee
from app.models.company import Company
from app.models.user import User

def seed_payroll_types(db: Session):
    # Eğer tablo zaten doluysa tekrar ekleme yapma
    if db.query(PayrollType).first():
        print("Bordro tipleri zaten mevcut, seed işlemi atlanıyor.")
        return

    print("KKTC Mevzuatına uygun bordro tipleri yükleniyor...")
    
    payroll_data = [
        {"code": "D1", "name": "Hizmet akdi ile çalışan KKTC vatandaşları", "emp_ss": 9.0, "empr_ss": 11.0, "emp_pf": 5.0, "empr_pf": 5.0},
        {"code": "D2", "name": "Hizmet akdi ile çalışma izinli çalışanlar", "emp_ss": 9.0, "empr_ss": 11.0, "emp_pf": 5.0, "empr_pf": 5.0},
        {"code": "D3", "name": "3. Ülke vatandaşı sigortalılar (Yaşlılık aylığı almayan)", "emp_ss": 13.0, "empr_ss": 9.75, "emp_pf": 5.0, "empr_pf": 5.0, "gov_cont": 1.25},
        {"code": "E2", "name": "3. Ülke vatandaşı olup yaşlılık aylığı alan çalışanlar", "emp_ss": 13.0, "empr_ss": 11.0, "emp_pf": 5.0, "empr_pf": 5.0},
        {"code": "H2", "name": "3. Ülke vatandaşı iş kurma izinli", "emp_ss": 22.75, "empr_ss": 0.0, "emp_pf": 5.0, "empr_pf": 5.0, "gov_cont": 1.25},
        {"code": "E1", "name": "D1 statüsünde çalışıp yaşlılık maaşı alanlar", "emp_ss": 9.0, "empr_ss": 11.0, "emp_pf": 0.0, "empr_pf": 0.0},
        {"code": "H1", "name": "İşverenler", "emp_ss": 14.0, "empr_ss": 0.0, "emp_pf": 5.0, "empr_pf": 5.0},
        {"code": "L1", "name": "Tehlike primi", "emp_ss": 0.0, "empr_ss": 0.0, "hazard": 1.0},
    ]

    for data in payroll_data:
        new_type = PayrollType(
            code=data["code"],
            name=data["name"],
            employee_sgk_rate=data.get("emp_ss", 9.0),
            employee_provident_rate=data.get("emp_pf", 5.0),
            employer_sgk_rate=data.get("empr_ss", 11.0),
            employer_provident_rate=data.get("empr_pf", 5.0),
            employer_hazard_rate=data.get("hazard", 0.0),
            government_contribution_rate=data.get("gov_cont", 0.0)
        )
        db.add(new_type)
    
    try:
        db.commit()
        print("✅ KKTC Bordro Tipleri başarıyla veritabanına işlendi.")
    except Exception as e:
        db.rollback()
        print(f"❌ Hata oluştu: {e}")

if __name__ == "__main__":
    # Bu satırlar 4 boşluk içeride olmalı!
    print("Veritabanı tabloları kontrol ediliyor ve oluşturuluyor...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        seed_payroll_types(db)
    finally:
        db.close()