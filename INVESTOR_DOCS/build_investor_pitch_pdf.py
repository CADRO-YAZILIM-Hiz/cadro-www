from __future__ import annotations

from pathlib import Path
from math import ceil

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "presentation_output"
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "CADRO_HR_Investor_Pitch.pdf"

UNICODE_FONT_PATH = Path("/Library/Fonts/Arial Unicode.ttf")
UNICODE_FONT_NAME = "CADROUnicode"


def register_unicode_font() -> str:
    if UNICODE_FONT_PATH.exists():
        pdfmetrics.registerFont(TTFont(UNICODE_FONT_NAME, str(UNICODE_FONT_PATH)))
        return UNICODE_FONT_NAME
    return "Helvetica"

WIDTH, HEIGHT = landscape(A4)
MARGIN_X = 1.2 * cm
MARGIN_Y = 1.0 * cm

BRAND = colors.HexColor("#0D9EDF")
NAVY = colors.HexColor("#1E3A5F")
INK = colors.HexColor("#1A1A1A")
MUTED = colors.HexColor("#6B7280")
LIGHT = colors.HexColor("#F5FAFF")
PALE = colors.HexColor("#EAF6FD")
GOLD = colors.HexColor("#C89B3C")
GREEN = colors.HexColor("#0F9D58")
RED = colors.HexColor("#D64545")

FONT_BODY = register_unicode_font()
FONT_BOLD = FONT_BODY

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="SlideTitle",
        parent=styles["Heading1"],
        fontName=FONT_BOLD,
        fontSize=24,
        leading=28,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="SlideSubtitle",
        parent=styles["BodyText"],
        fontName=FONT_BODY,
        fontSize=11,
        leading=14,
        textColor=MUTED,
        alignment=TA_LEFT,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        name="BodySlide",
        parent=styles["BodyText"],
        fontName=FONT_BODY,
        fontSize=10,
        leading=13,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="BulletSlide",
        parent=styles["BodyText"],
        fontName=FONT_BODY,
        fontSize=10,
        leading=13,
        leftIndent=14,
        firstLineIndent=-8,
        textColor=INK,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        name="CenterHero",
        parent=styles["Heading1"],
        fontName=FONT_BOLD,
        fontSize=30,
        leading=34,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        name="CenterSub",
        parent=styles["BodyText"],
        fontName=FONT_BODY,
        fontSize=14,
        leading=18,
        textColor=MUTED,
        alignment=TA_CENTER,
    )
)


def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D9EAF7"))
    canvas.line(MARGIN_X, 0.65 * cm, WIDTH - MARGIN_X, 0.65 * cm)
    canvas.setFont(FONT_BODY, 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN_X, 0.28 * cm, "CADRO HR Investor Pitch")
    canvas.drawRightString(WIDTH - MARGIN_X, 0.28 * cm, f"Page {doc.page}")
    canvas.restoreState()


def box_table(title: str, body: str, accent=BRAND):
    data = [[Paragraph(f"<b>{title}</b>", styles["BodySlide"])], [Paragraph(body, styles["BodySlide"])]]
    t = Table(data, colWidths=[7.8 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), accent),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, 1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.8, accent),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDEAF4")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return t


def section_slide(title: str, subtitle: str, left_flowables, right_flowables=None, wide=False):
    story = [Paragraph(title, styles["SlideTitle"]), Paragraph(subtitle, styles["SlideSubtitle"])]
    if wide or right_flowables is None:
        story.extend(left_flowables)
        return story

    grid = Table(
        [[left_flowables, right_flowables]],
        colWidths=[9.4 * cm, 9.4 * cm],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]),
    )
    story.append(grid)
    return story


def pill(text, bg=PALE, fg=NAVY):
    return Table(
        [[Paragraph(f"<b>{text}</b>", ParagraphStyle("pill", fontName=FONT_BOLD, fontSize=9, leading=11, alignment=TA_CENTER, textColor=fg))]],
        colWidths=[3.1 * cm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("BOX", (0, 0), (-1, -1), 0.6, bg),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ])
    )


def slide_1():
    story = [Spacer(1, 2.5 * cm)]
    story.append(Paragraph("CADRO HR", styles["CenterHero"]))
    story.append(Paragraph("KOBİ ve orta ölçekli işletmeler için çok dilli, mobil öncelikli İK platformu", styles["CenterSub"]))
    story.append(Spacer(1, 0.9 * cm))
    meta = Table(
        [[
            pill("B2B SaaS"),
            pill("TR / EN / AR"),
            pill("Web + Flutter"),
            pill("Paddle MoR"),
        ]],
        colWidths=[4.2 * cm] * 4,
        style=TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]),
    )
    story.append(meta)
    story.append(Spacer(1, 0.9 * cm))
    story.append(box_table("Yatırım Tezi", "Tek ürünle İnsan Kaynakları, bordro, performans, ATS, izin, demirbaş ve çalışan deneyimini aynı platformda birleştiren, yerel mevzuat uyumlu bir SaaS altyapısı."))
    return story


def slide_2():
    left = [
        Paragraph("<b>Problem</b>: KOBİ'ler dağınık Excel, e-posta ve manuel süreçlerle çalışıyor.", styles["BulletSlide"]),
        Paragraph("<b>Sonuç</b>: Hata, zaman kaybı, denetim eksikliği ve kurumsal hafıza kaybı.", styles["BulletSlide"]),
        Paragraph("<b>Bölgesel boşluk</b>: Türkçe + Arapça + RTL destekli, mobil öncelikli, tek ürün nadir.", styles["BulletSlide"]),
        Paragraph("<b>Fırsat</b>: Yerel mevzuat, çoklu dil ve çalışan self-servis beklentisi birleşiyor.", styles["BulletSlide"]),
    ]
    right = [
        box_table("Hedef Müşteri", "5-200 çalışan aralığında, bordro ve operasyonu tek yerde toplamak isteyen işletmeler."),
        Spacer(1, 0.2 * cm),
        box_table("Neden Şimdi?", "Uzaktan/hibrit çalışma, mobil check-in, e-dosya ve dijital onay kültürü artık standart hale geliyor."),
    ]
    return section_slide("Pazar Problemi", "Büyük kurumsal sistemler KOBİ için pahalı ve ağır; küçük çözümler ise parçalı.", left, right)


def slide_3():
    left = [
        Paragraph("<b>Temel modüller</b>: Personel, izin, devam, demirbaş, e-özlük, dashboard, portal.", styles["BulletSlide"]),
        Paragraph("<b>Operasyon</b>: ATS, harcama, satın alma, talep formları, lokasyon, bilgi bankası.", styles["BulletSlide"]),
        Paragraph("<b>Enterprise</b>: performans, eğitim, executive console, gelişmiş raporlama.", styles["BulletSlide"]),
        Paragraph("<b>Fark</b>: Mobil uygulama, çoklu dil, i18n, plan-kilit yapısı ve Paddle entegrasyonu.", styles["BulletSlide"]),
    ]
    right = [
        box_table("Platform Özeti", "FastAPI backend, React web, Flutter mobil ve PostgreSQL üzerine kurulmuş çok kiracılı bir HR işletim sistemi."),
        Spacer(1, 0.2 * cm),
        box_table("Ticari Avantaj", "Aynı kod tabanı hem self-servis KOBİ hem de daha büyük hesaplara ölçeklenebiliyor."),
    ]
    return section_slide("Ürün Özeti", "CADRO, temel İK süreçlerini operasyon ve çalışan deneyimiyle birleştirir.", left, right)


def slide_4():
    left = [
        Paragraph("<b>Teknik yığın</b>: FastAPI, React, Tailwind, Flutter, PostgreSQL, Docker.", styles["BulletSlide"]),
        Paragraph("<b>Güvenlik</b>: JWT, RBAC, plan-feature guard, webhook doğrulama, tenant izolasyonu.", styles["BulletSlide"]),
        Paragraph("<b>Entegrasyonlar</b>: Paddle, FCM/APNS, SMTP, Gemini, HR Agent mikroservisi.", styles["BulletSlide"]),
        Paragraph("<b>Yerelleştirme</b>: TR / EN / AR ve RTL desteği hazır.", styles["BulletSlide"]),
    ]
    right = [
        box_table("Mimari Omurga", "Her tenant için company_id izolasyonu; API katmanı, dosya depolama ve bildirim altyapısı tek platformda çalışıyor."),
        Spacer(1, 0.2 * cm),
        box_table("Ölçekleme", "Şu anki yapı 0→500 müşteri için yeterli; dosya depolama ve cache eklenerek kolayca büyütülebilir."),
    ]
    return section_slide("Teknik Mimari", "Sistem doğrudan ürün ve gelir modelini destekleyen modüler bir SaaS omurgasıdır.", left, right)


def slide_5():
    left = [
        Paragraph("<b>Google Gemini</b>: CV tarama ve performans analizi için kullanılıyor.", styles["BulletSlide"]),
        Paragraph("<b>HR Agent</b>: Ayrı mikroservis; CV değerlendirme gibi AI işlerini izole ediyor.", styles["BulletSlide"]),
        Paragraph("<b>Paddle</b>: Merchant of Record; vergi ve ödeme süreçlerini sadeleştiriyor.", styles["BulletSlide"]),
        Paragraph("<b>FCM + APNS</b>: Mobil bildirimler ve çalışan etkileşimi için.", styles["BulletSlide"]),
    ]
    right = [
        box_table("Gelir Motoru", "Abonelik, plan yükseltme ve yıllık peşin ödeme ile nakit akışı güçleniyor."),
        Spacer(1, 0.2 * cm),
        box_table("Yatırımcı Açısından", "Teknoloji, operasyon maliyetini aşağı çekiyor; lokalizasyon ise pazara giriş bariyeri oluşturuyor."),
    ]
    return section_slide("Entegrasyonlar & AI", "Ürünün fark yaratan katmanı, yalnızca UI değil iş akışına gömülü entegrasyonlardır.", left, right)


def slide_6():
    left = [
        Paragraph("<b>Öncelikli eksikler</b>: Bordro, audit log, work schedule, rapor builder, tatil, duyuru yönetimi.", styles["BulletSlide"]),
        Paragraph("<b>Durum</b>: Birçoğunun backend'i hazır, ancak frontend ekranı eksik.", styles["BulletSlide"]),
        Paragraph("<b>Helpdesk</b>: Frontend var, backend tarafı yeniden etkinleştirme bekliyor.", styles["BulletSlide"]),
        Paragraph("<b>Sonuç</b>: Bu boşluklar, yatırım sonrası hızlı ürün genişleme alanı sağlıyor.", styles["BulletSlide"]),
    ]
    right = [
        box_table("Faz 1", "Bordro UI/API, iş programı yönetimi, audit log ekranı."),
        Spacer(1, 0.2 * cm),
        box_table("Faz 2", "Tatil takvimi, duyuru yönetimi, çalışan refahı ve gelişmiş raporlar."),
    ]
    return section_slide("Geliştirme Fırsatları", "Backend'de var olan modüller, yatırım sonrası hızlı ürün genişletme için hazır bekliyor.", left, right)


def slide_7():
    left = [
        Paragraph("<b>BASIC</b>: $6/kullanıcı/ay, 10 personel limiti.", styles["BulletSlide"]),
        Paragraph("<b>PRO</b>: $12/kullanıcı/ay, 50 personel limiti.", styles["BulletSlide"]),
        Paragraph("<b>ENTERPRISE</b>: $20/kullanıcı/ay, sınırsız personel.", styles["BulletSlide"]),
        Paragraph("<b>Yıllık ödeme</b>: 2 ay ücretsiz, yaklaşık %16,7 indirim.", styles["BulletSlide"]),
    ]
    right = [
        box_table("Konumlandırma", "BambooHR'dan daha ucuz, SAP ve Workday'den çok daha erişilebilir; yerel mevzuat ve Arapça RTL ile farklılaşıyor."),
        Spacer(1, 0.2 * cm),
        box_table("MRR Etkisi", "Per-seat model, müşteri büyüdükçe doğal ARPU artışı yaratır."),
    ]
    return section_slide("Fiyatlandırma", "Basit, ölçeklenebilir ve KOBİ'nin kabul edebileceği bir per-seat yapı.", left, right)


def slide_8():
    left = [
        Paragraph("<b>İdeal müşteri</b>: 5-200 çalışanlı, manuel süreçten çıkmak isteyen işletmeler.", styles["BulletSlide"]),
        Paragraph("<b>İlk odak</b>: Türkiye, Kuzey Kıbrıs, Körfez ve çok dilli operasyonlar.", styles["BulletSlide"]),
        Paragraph("<b>Satış modeli</b>: Outbound, referans, partner satış ve demo odaklı.", styles["BulletSlide"]),
        Paragraph("<b>Koruyucu hendek</b>: Lokalizasyon, mevzuat ve çok modüllü ürün kapsamı.", styles["BulletSlide"]),
    ]
    right = [
        box_table("Gelir Potansiyeli", "Ölçekli hesaplarda up-sell alanı: bordro, entegrasyonlar, AI analitik ve white-label paketler."),
        Spacer(1, 0.2 * cm),
        box_table("Büyüme Mantığı", "İlk 12 ayda ürün- pazar uyumu; sonrasında kanal ortaklıkları ve ülke genişlemesi."),
    ]
    return section_slide("Go-to-Market", "CADRO, yatay büyümekten önce bölgesel derinleşme stratejisiyle ilerler.", left, right)


def slide_9():
    left = [
        Paragraph("<b>Yıl 1</b>: 25 şirket, ~$54k ARR.", styles["BulletSlide"]),
        Paragraph("<b>Yıl 2</b>: 80 şirket, ~$230k ARR.", styles["BulletSlide"]),
        Paragraph("<b>Yıl 3</b>: 200 şirket, ~$749k ARR.", styles["BulletSlide"]),
        Paragraph("<b>Yatırım destekli senaryo</b>: 3 yılda ~$3M ARR seviyesine çıkma potansiyeli.", styles["BulletSlide"]),
    ]
    right = [
        box_table("Birime Ekonomisi", "Brüt marj hedefi ~%82; CAC/LTV oranı güçlü kaldığında ölçekleme verimli olur."),
        Spacer(1, 0.2 * cm),
        box_table("Öncelik", "Önce müşteri başına değer, sonra pazarlama verimliliği; bu yapı erken aşamada daha güvenli."),
    ]
    return section_slide("Gelir Projeksiyonu", "Abonelik ve modül eklemeleriyle gelir doğal olarak yukarı ölçeklenir.", left, right)


def slide_10():
    left = [
        Paragraph("<b>Faz 1</b>: Bordro, iş programı, audit log, helpdesk stabilizasyonu.", styles["BulletSlide"]),
        Paragraph("<b>Faz 2</b>: Duyuru, tatil, mood/social ve gelişmiş raporlar.", styles["BulletSlide"]),
        Paragraph("<b>Faz 3</b>: White-label, entegrasyon marketplace, API erişimi.", styles["BulletSlide"]),
        Paragraph("<b>Faz 4</b>: Ülke genişlemesi ve daha büyük kurumsal segment.", styles["BulletSlide"]),
    ]
    right = [
        box_table("Kısa Vadeli Hedef", "Satışa hazır, ince ayarlanmış bir ürün ve net bir yatırım hikayesi."),
        Spacer(1, 0.2 * cm),
        box_table("Sunum Sonu", "Bu PDF, daha detaylı finansal model ve demo ile desteklenmeye hazırdır."),
    ]
    return section_slide("Roadmap", "Teknik borç kapatılırken aynı anda gelir üreten özellikler öne alınır.", left, right)


def slide_11():
    story = [
        Paragraph("Neden CADRO?", styles["SlideTitle"]),
        Paragraph("Tek cümlelik yatırım tezi: Yerel uyumlu, çok dilli ve mobil öncelikli HR SaaS; KOBİ segmentinde dağınık süreçleri tek platformda topluyor.", styles["SlideSubtitle"]),
        Spacer(1, 0.4 * cm),
    ]
    rows = [
        ["Güçlü taraf", "Detay"],
        ["Ürün kapsamı", "Temel HR + operasyon + enterprise katmanları tek kod tabanında."],
        ["Teknoloji", "FastAPI, React, Flutter, PostgreSQL, Paddle ve Gemini hazır."],
        ["Pazar", "TR / MENA odaklı, çok dilli ve RTL destekli niş konum."],
        ["Ticari model", "Per-seat abonelik + upsell + yıllık ödeme avantajı."],
    ]
    table = Table(rows, colWidths=[4.5 * cm, 13.5 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#DDEAF4")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("Bir sonraki adım: finansal model ve demo akışıyla birlikte bu PDF'i sunum formatında sonlandırmak.", styles["BodySlide"]))
    return story


slides = [slide_1, slide_2, slide_3, slide_4, slide_5, slide_6, slide_7, slide_8, slide_9, slide_10, slide_11]


def build_pdf():
    doc = BaseDocTemplate(
        str(OUTPUT_FILE),
        pagesize=landscape(A4),
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=1.35 * cm,
        bottomMargin=1.05 * cm,
        title="CADRO HR Investor Pitch",
        author="GitHub Copilot",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="normal",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id="pitch", frames=[frame], onPage=add_footer)])

    story = []
    for idx, slide in enumerate(slides):
        story.extend(slide())
        if idx != len(slides) - 1:
            story.append(PageBreak())
    doc.build(story)
    print(f"Created {OUTPUT_FILE}")


if __name__ == "__main__":
    build_pdf()
