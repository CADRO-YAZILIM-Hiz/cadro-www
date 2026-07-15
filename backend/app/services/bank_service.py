import pandas as pd
from io import BytesIO
from sqlalchemy.orm import Session
from app.models.payroll import Payroll
from app.models.employee import Employee

def generate_bank_transfer_list(db: Session, company_id: int, year: int, month: int):
    """Hesaplanan maaşları banka formatında Excel dosyasına dönüştürür."""
    
    # Bordroları personellerle join yaparak çekiyoruz (IBAN bilgisi için)
    data = db.query(
        Employee.first_name,
        Employee.last_name,
        Employee.iban,
        Payroll.net_salary
    ).join(Payroll, Employee.id == Payroll.employee_id)\
     .filter(Payroll.company_id == company_id, Payroll.year == year, Payroll.month == month).all()

    if not data:
        return None

    # Veriyi DataFrame'e çeviriyoruz
    df = pd.DataFrame(data, columns=["Ad", "Soyad", "IBAN", "Net Ödenen"])
    
    # Bankaların genelde istediği "Açıklama" kolonunu ekleyelim
    df["Açıklama"] = f"{month}/{year} Maasi Ödemesi"

    # Excel dosyasını memory'de (RAM) oluşturuyoruz (Dosya sistemini kirletmeden)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Maas_Listesi')
    
    output.seek(0)
    return output