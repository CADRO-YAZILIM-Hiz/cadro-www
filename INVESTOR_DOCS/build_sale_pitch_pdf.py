from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "presentation_output"
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "CADRO_HR_Sale_Pitch.pdf"

FONT_PATH = Path("/Library/Fonts/Arial Unicode.ttf")
FONT_NAME = "CADROUnicodeSale"
if FONT_PATH.exists():
    pdfmetrics.registerFont(TTFont(FONT_NAME, str(FONT_PATH)))
else:
    FONT_NAME = "Helvetica"

WIDTH, HEIGHT = landscape(A4)
MARGIN_X = 1.2 * cm
MARGIN_Y = 1.0 * cm

BRAND = colors.HexColor("#0D9EDF")
NAVY = colors.HexColor("#1E3A5F")
INK = colors.HexColor("#1A1A1A")
MUTED = colors.HexColor("#6B7280")
PALE = colors.HexColor("#EAF6FD")
BORDER = colors.HexColor("#D9EAF7")
GREEN = colors.HexColor("#0F9D58")
GOLD = colors.HexColor("#C89B3C")
RED = colors.HexColor("#D64545")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleBig", parent=styles["Heading1"], fontName=FONT_NAME, fontSize=24, leading=28, textColor=NAVY, alignment=TA_LEFT, spaceAfter=8))
styles.add(ParagraphStyle(name="Sub", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=11, leading=14, textColor=MUTED, alignment=TA_LEFT, spaceAfter=10))
styles.add(ParagraphStyle(name="Body", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=10, leading=13, textColor=INK, alignment=TA_LEFT, spaceAfter=5))
styles.add(ParagraphStyle(name="SaleBullet", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=10, leading=13, leftIndent=14, firstLineIndent=-8, textColor=INK, spaceAfter=4))
styles.add(ParagraphStyle(name="Hero", parent=styles["Heading1"], fontName=FONT_NAME, fontSize=30, leading=34, textColor=NAVY, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="HeroSub", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=14, leading=18, textColor=MUTED, alignment=TA_CENTER))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.line(MARGIN_X, 0.65 * cm, WIDTH - MARGIN_X, 0.65 * cm)
    canvas.setFont(FONT_NAME, 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN_X, 0.28 * cm, "CADRO HR Sale Pitch")
    canvas.drawRightString(WIDTH - MARGIN_X, 0.28 * cm, f"Page {doc.page}")
    canvas.restoreState()


def box(title: str, body: str, accent=BRAND):
    t = Table([[Paragraph(f"<b>{title}</b>", styles["Body"])] ,[Paragraph(body, styles["Body"])]], colWidths=[8.0 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), accent),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 1), (-1, 1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.8, accent),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def slide(title: str, subtitle: str, left, right=None):
    story = [Paragraph(title, styles["TitleBig"]), Paragraph(subtitle, styles["Sub"])]
    if right is None:
        story.extend(left)
        return story
    grid = Table([[left, right]], colWidths=[9.4 * cm, 9.4 * cm], style=TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(grid)
    return story


def pill(text, bg=PALE, fg=NAVY):
    return Table([[Paragraph(f"<b>{text}</b>", ParagraphStyle("pill", fontName=FONT_NAME, fontSize=9, leading=11, alignment=TA_CENTER, textColor=fg))]], colWidths=[3.3 * cm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.5, bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))


def cover():
    story = [Spacer(1, 2.5 * cm)]
    story.append(Paragraph("CADRO HR", styles["Hero"]))
    story.append(Paragraph("Satın almaya veya hızlandırmaya uygun, çok dilli ve mobil öncelikli HR SaaS", styles["HeroSub"]))
    story.append(Spacer(1, 0.9 * cm))
    meta = Table([[pill("Buy-side deck"), pill("TR / EN / AR"), pill("Web + Flutter"), pill("Paddle MoR")]], colWidths=[4.2 * cm] * 4, style=TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    story.append(meta)
    story.append(Spacer(1, 0.9 * cm))
    story.append(box("Tek cümle", "CADRO, KOBİ ve orta ölçekli işletmeler için İK operasyonlarını tek platformda birleştiren, satışa hazır, teknik riski düşük ve büyüme potansiyeli net bir SaaS varlığıdır."))
    return story


def s2():
    left = [
        Paragraph("<b>Problem</b>: Dağınık süreçler, yüksek manuel iş yükü ve düşük görünürlük.", styles["Bullet"]),
        Paragraph("<b>Alıcı açısından anlamı</b>: Sıfırdan geliştirme yerine hazır çekirdeği satın almak zaman ve risk kazandırır.", styles["Bullet"]),
        Paragraph("<b>Pazar boşluğu</b>: TR / MENA odaklı, çok dilli ve mobil öncelikli HR SaaS az.", styles["Bullet"]),
    ]
    right = [
        box("Kime çözüm", "5-200 çalışanlı şirketler, saha ekipleri, çok dilli operasyonlar ve KOBİ'lerin İK ekipleri."),
        Spacer(1, 0.2 * cm),
        box("Satın alma nedeni", "Ürün çekirdeği ve iş akışları zaten inşa edilmiş; alıcı yalnızca hız ve dağıtımı satın alır."),
    ]
    return slide("Neden Bu Varlık?", "Alıcı için en değerli şey, riskin ve geliştirme süresinin azalmasıdır.", left, right)


def s3():
    left = [
        Paragraph("<b>Çözüm</b>: Çalışan, izin, devam, ATS, doküman, performans, eğitim, harcama ve talep akışları tek yerde.", styles["Bullet"]),
        Paragraph("<b>Deneyim</b>: Web + Flutter mobil + self-servis portallar.", styles["Bullet"]),
        Paragraph("<b>Fark</b>: TR / EN / AR ve RTL desteği ile bölgesel uyum.", styles["Bullet"]),
    ]
    right = [
        box("Ürün omurgası", "FastAPI, React, Flutter ve PostgreSQL ile kurulan çok kiracılı mimari."),
        Spacer(1, 0.2 * cm),
        box("Alıcı değeri", "Hazır teknoloji yığını, yeniden inşa etme maliyetini ortadan kaldırır."),
    ]
    return slide("Çözüm", "CADRO, bir özellik listesinden çok operasyonel bir sistemdir.", left, right)


def s4():
    left = [
        Paragraph("<b>Hazır olan</b>: Çekirdek HR modülleri, billing, dashboard, portal ve mobil kullanım akışları.", styles["Bullet"]),
        Paragraph("<b>Hazır ama büyümeye açık</b>: Bordro, audit log, work schedule, raporlama, duyuru ve tatil yönetimi.", styles["Bullet"]),
        Paragraph("<b>Yatırım / satın alma sonrası</b>: Hızlı ürün genişlemesi ve gelir artırıcı modüller.", styles["Bullet"]),
    ]
    right = [
        box("Teknik risk", "Düşük - mimari, plan kilidi ve gelir akışı belirlenmiş durumda."),
        Spacer(1, 0.2 * cm),
        box("Stratejik opsiyon", "Alıcı, ürünü sadece satın almaz; aynı zamanda satışa hazır bir büyüme makinesi alır."),
    ]
    return slide("Ürün Durumu", "Bu varlıkın en büyük gücü, sıfırdan değil hazır bir çekirdekten başlamasıdır.", left, right)


def s5():
    left = [
        Paragraph("<b>Model</b>: Per-seat SaaS aboneliği.", styles["Bullet"]),
        Paragraph("<b>Paketler</b>: BASIC / PRO / ENTERPRISE.", styles["Bullet"]),
        Paragraph("<b>Upsell</b>: Bordro, AI analitik, white-label ve entegrasyon gelirleri.", styles["Bullet"]),
    ]
    right = [
        box("Kârlılık mantığı", "Brüt marj %80+; CAC hedefi <$500; LTV / CAC hedefi 8x+."),
        Spacer(1, 0.2 * cm),
        box("Alıcı için avantaj", "Mevcut gelir modeli, satın alma sonrası nakit üretme kapasitesini görünür kılar."),
    ]
    return slide("İş Modeli", "Gelir mimarisi sade, ölçeklenebilir ve ek modüllerle büyüyebilir.", left, right)


def s6():
    left = [
        Paragraph("<b>ROI çerçevesi</b>: 25 bin USD artışlı muhafazakâr / baz / agresif payback modeli hazır.", styles["Bullet"]),
        Paragraph("<b>Baz senaryo</b>: yaklaşık 10.2 ay payback.", styles["Bullet"]),
        Paragraph("<b>Agresif senaryo</b>: yaklaşık 5.2 ay payback.", styles["Bullet"]),
    ]
    right = [
        box("Nakit akışı", "Yatırımın veya satın almanın geri dönüşü, müşteri edinim verimliliği ve upsell ile hızlanır."),
        Spacer(1, 0.2 * cm),
        box("Satıcı argümanı", "Bu varlık, yalnızca kod değil; gelir akışı ve büyüme potansiyeli olan bir iş modelidir."),
    ]
    return slide("Finansal Mantık", "Alıcıya satılan şey teknoloji değil, hızlandırılmış nakit üretim kapasitesidir.", left, right)


def s7():
    left = [
        Paragraph("<b>Satın alma nedenleri</b>:", styles["Body"]),
        Paragraph("- Sıfırdan ürün geliştirme süresini kısaltmak", styles["Bullet"]),
        Paragraph("- Teknik ve ürün riskini azaltmak", styles["Bullet"]),
        Paragraph("- TR / MENA pazarı için hazır bir çekirdek elde etmek", styles["Bullet"]),
        Paragraph("- Hızlı satış ve upsell ile değer yaratmak", styles["Bullet"]),
    ]
    right = [
        box("Alıcı profili", "SaaS portföyü büyütmek isteyen stratejik alıcılar, HRTech oyuncuları, ERP / muhasebe yazılım şirketleri, sistem entegratörleri."),
        Spacer(1, 0.2 * cm),
        box("Kapanış cümlesi", "CADRO, satın alındığında yeniden inşa edilmesi gerekmeyen; direkt ölçeklenebilen bir varlıktır."),
    ]
    return slide("Neden Satın Almalı?", "Karar verici için temel soru: neden şimdi ve neden bu varlık?", left, right)


def s8():
    left = [
        Paragraph("<b>İlk 90 gün</b>: satış ritmi, müşteri kazanımı ve kritik modül kapanışları.", styles["Bullet"]),
        Paragraph("<b>İlk 6 ay</b>: bordro, audit log, work schedule, report builder.", styles["Bullet"]),
        Paragraph("<b>12 ay</b>: white-label, entegrasyon ve bölgesel genişleme.", styles["Bullet"]),
    ]
    right = [
        box("Büyüme yönü", "Mevcut çekirdek üzerine ek modüller inşa edilerek gelir artışı sağlanır."),
        Spacer(1, 0.2 * cm),
        box("Alıcının kazanımı", "Süre değil; hazır yol haritası, hazır ürün ve hazır değer önerisi satın alınır."),
    ]
    return slide("Büyüme Planı", "Satın alma sonrası en yakın değer yaratma alanları net olarak tanımlı.", left, right)


def s9():
    story = [Paragraph("Sonuç", styles["TitleBig"]), Paragraph("CADRO HR, sıfırdan yapılacak bir proje değil; satın alınabilecek, hızlandırılabilecek ve monetizasyonu artırılabilecek bir iş varlığıdır.", styles["Sub"])]
    data = [["Bir sonraki adım", "Teknik ve ticari inceleme + data room paylaşımı + teklif süreci"]]
    t = Table(data, colWidths=[4.5 * cm, 13.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Kısa mesaj: CADRO'yu satın almak, yeniden kurmak değil; ölçeklemek demektir.", styles["Body"]))
    return story

slides = [cover, s2, s3, s4, s5, s6, s7, s8, s9]


def build():
    doc = BaseDocTemplate(str(OUTPUT_FILE), pagesize=landscape(A4), leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=1.25 * cm, bottomMargin=1.0 * cm, title="CADRO HR Sale Pitch", author="GitHub Copilot")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="pitch", frames=[frame], onPage=footer)])
    story = []
    for idx, fn in enumerate(slides):
        story.extend(fn())
        if idx != len(slides) - 1:
            story.append(PageBreak())
    doc.build(story)
    print(f"Created {OUTPUT_FILE}")


if __name__ == "__main__":
    build()
