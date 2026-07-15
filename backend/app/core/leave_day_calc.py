from datetime import timedelta
from app.models.leave_policy import LeavePolicy

def get_official_holidays(db, company_id, start_date, end_date):
    # Resmi tatil modulu su an urun disi. Canli riskini azaltmak icin
    # hesaplamada tatil listesi bos kabul edilir.
    return []

def calculate_net_leave_days(db, company_id, start_date, end_date):
    policy = db.query(LeavePolicy).filter(LeavePolicy.company_id == company_id).first()
    
    # Eğer politika yoksa varsayılan KKTC standartlarını (Hafta sonu/Tatil düşmez) kullan
    weekend_counts = policy.weekend_counts if policy else False
    holidays_count = policy.holidays_count if policy else False
    
    official_holidays = get_official_holidays(db, company_id, start_date, end_date)
    
    net_days = 0
    current_date = start_date
    while current_date <= end_date:
        is_weekend = current_date.weekday() >= 5 # 5: Cumartesi, 6: Pazar
        is_holiday = current_date in official_holidays
        
        day_counts = True
        if is_weekend and not weekend_counts:
            day_counts = False
        if is_holiday and not holidays_count:
            day_counts = False
            
        if day_counts:
            net_days += 1
        current_date += timedelta(days=1)
        
    return net_days
