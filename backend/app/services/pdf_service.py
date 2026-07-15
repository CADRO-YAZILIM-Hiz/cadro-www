from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from io import BytesIO
import bleach
from app.core.i18n import TRANSLATIONS

def create_payroll_pdf(data: dict, lang: str = "tr"):
    # XSS koruması
    def sanitize(value):
        if isinstance(value, str):
            return bleach.clean(value, tags=[], strip=True)
        return value
    
    data = {k: sanitize(v) for k, v in data.items()}
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    elements = []
    strings = TRANSLATIONS.get(lang, TRANSLATIONS["tr"])

    def tr(key: str, **kwargs):
        raw = strings.get(key, TRANSLATIONS["tr"].get(key, key))
        return raw.format(**kwargs) if kwargs else raw
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18, alignment=1, spaceAfter=20)
    normal_style = styles['Normal']
    
    # YENİ: İzin bilgisi için özel bir stil oluşturuyoruz (Hafif koyu mavi ve eğik)
    info_style = ParagraphStyle(
        'InfoStyle', 
        parent=styles['Normal'], 
        fontSize=10, 
        textColor=colors.HexColor("#003366"), 
        spaceBefore=10
    )

    # --- 1. Başlık ve Logo Alanı ---
    elements.append(Paragraph(f"<b>{tr('payroll_pdf_title')}</b>", title_style))
    elements.append(Paragraph(f"{tr('payroll_pdf_period_label')} {data['month']}/{data['year']}", normal_style))
    elements.append(Paragraph(f"{tr('payroll_pdf_company_label')} {data.get('company_name', 'KKTC SaaS Ltd.')}", normal_style))
    elements.append(Spacer(1, 20))

    # --- 2. Personel Bilgileri ---
    elements.append(Paragraph(f"<b>{tr('payroll_pdf_employee_name_label')}</b> {data['employee_name']}", normal_style))
    elements.append(Paragraph(f"<b>{tr('payroll_pdf_identity_no_label')}</b> {data.get('id_no', '---')}", normal_style))
    elements.append(Spacer(1, 20))

    # --- 3. Maaş Detay Tablosu ---
    table_data = [
        [tr('payroll_pdf_col_description'), tr('payroll_pdf_col_amount')],
        [tr('payroll_pdf_row_base_salary'), f"{data['base_gross_salary']:,.2f}"],
        [tr('payroll_pdf_row_overtime'), f"{data['overtime_total_pay']:,.2f}"],
        [tr('payroll_pdf_row_other_earnings'), f"{data.get('other_earnings', 0):,.2f}"],
        [tr('payroll_pdf_row_total_gross'), f"{data['total_gross']:,.2f}"],
        ['', ''], # Boşluk satırı
        [tr('payroll_pdf_row_social_security'), f"-{data['social_security_deduction']:,.2f}"],
        [tr('payroll_pdf_row_provident_fund'), f"-{data.get('provident_fund_deduction', 0):,.2f}"],
        [tr('payroll_pdf_row_income_tax'), f"-{data.get('income_tax', 0):,.2f}"],
        [tr('payroll_pdf_row_net_paid'), f"{data['net_salary']:,.2f}"]
    ]

    t = Table(table_data, colWidths=[300, 150])

    # --- 4. Tablo Stili ---
    style = TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.whitesmoke),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.black),
        ('ALIGN', (0, 0), (1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (1, 0), 12),
        ('GRID', (0, 0), (1, -1), 0.5, colors.grey),
        # Toplam Brüt Satırını Boya
        ('BACKGROUND', (0, 4), (1, 4), colors.lightgreen),
        # Net Ödenen Satırını Boya
        ('BACKGROUND', (0, -1), (1, -1), colors.lightblue),
        ('FONTNAME', (0, -1), (1, -1), 'Helvetica-Bold'),
    ])
    t.setStyle(style)
    elements.append(t)

    # --- 4.5. İzin Bilgisi Alanı (YENİ EKLENDİ) ---
    elements.append(Spacer(1, 15))
    remaining_leave = data.get('remaining_leave', 0)
    elements.append(Paragraph(tr('payroll_pdf_remaining_leave', days=remaining_leave), info_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
