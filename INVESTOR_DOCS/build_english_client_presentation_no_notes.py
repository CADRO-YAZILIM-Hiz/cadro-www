from __future__ import annotations

import math
import re
import tempfile
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

BASE_DIR = Path(__file__).resolve().parent
SHOT_ROOT = Path("/Users/turgaybozkus/Desktop/cadro-app-screenshots-webp/english")
MAIN_DIR = SHOT_ROOT / "main"
STATE_DIR = SHOT_ROOT / "states"
OUT_DIR = BASE_DIR / "presentation_output"
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "CADRO_HR_English_Client_Presentation_No_Notes.pdf"

FONT_PATH = Path("/Library/Fonts/Arial Unicode.ttf")
FONT_NAME = "CADROClientEN"
if FONT_PATH.exists():
    pdfmetrics.registerFont(TTFont(FONT_NAME, str(FONT_PATH)))
else:
    FONT_NAME = "Helvetica"

PAGE_W, PAGE_H = landscape((13.333 * inch, 7.5 * inch))
MARGIN = 0.45 * inch
CONTENT_W = PAGE_W - 2 * MARGIN

BRAND = colors.HexColor("#0D9EDF")
NAVY = colors.HexColor("#15213A")
INK = colors.HexColor("#1C2230")
MUTED = colors.HexColor("#5B6478")
SOFT = colors.HexColor("#F4F7FB")
BORDER = colors.HexColor("#D8E4F1")
GREEN = colors.HexColor("#0F9D58")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="DeckTitle", parent=styles["Heading1"], fontName=FONT_NAME, fontSize=26, leading=30, textColor=NAVY, alignment=TA_LEFT, spaceAfter=5))
styles.add(ParagraphStyle(name="Sub", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=11, leading=14, textColor=MUTED, alignment=TA_LEFT, spaceAfter=8))
styles.add(ParagraphStyle(name="Body", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=9.4, leading=12, textColor=INK, alignment=TA_LEFT, spaceAfter=4))
styles.add(ParagraphStyle(name="DeckBullet", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=9.4, leading=12, leftIndent=12, firstLineIndent=-7, textColor=INK, spaceAfter=3))
styles.add(ParagraphStyle(name="CardCap", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=7.8, leading=9.4, textColor=MUTED, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="Hero", parent=styles["Heading1"], fontName=FONT_NAME, fontSize=32, leading=35, textColor=NAVY, alignment=TA_LEFT, spaceAfter=10))

TMP_DIR = Path(tempfile.mkdtemp(prefix="cadro_en_no_notes_"))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.line(MARGIN, 0.32 * inch, PAGE_W - MARGIN, 0.32 * inch)
    canvas.setFont(FONT_NAME, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN, 0.17 * inch, "CADRO HR | English Client Presentation | No Notes")
    canvas.drawRightString(PAGE_W - MARGIN, 0.17 * inch, f"Page {doc.page}")
    canvas.restoreState()


def slug_to_title(name: str) -> str:
    name = name.replace(".webp", "")
    name = re.sub(r"_[0-9a-fA-F-]+$", "", name)
    name = name.replace("--", " | ").replace("-", " ")
    return " ".join(w.capitalize() for w in name.split())


def fit_image(src: Path, box_w: int, box_h: int) -> Path:
    out = TMP_DIR / f"{src.stem}_{box_w}x{box_h}.png"
    if out.exists():
        return out
    with PILImage.open(src) as img:
        img = img.convert("RGB")
        r = min(box_w / img.width, box_h / img.height)
        new_w, new_h = max(1, int(img.width * r)), max(1, int(img.height * r))
        resized = img.resize((new_w, new_h), PILImage.LANCZOS)
        canvas = PILImage.new("RGB", (box_w, box_h), (255, 255, 255))
        canvas.paste(resized, ((box_w - new_w) // 2, (box_h - new_h) // 2))
        canvas.save(out, format="PNG", optimize=True)
    return out


def image_card(path: Path, cap: str, w: float = 3.0 * inch, h: float = 1.72 * inch):
    png = fit_image(path, int(w), int(h))
    img = Image(str(png), width=w, height=h)
    t = Table(
        [[img], [Paragraph(cap, styles["CardCap"])]] ,
        colWidths=[w],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]),
    )
    return t


def header(title: str, sub: str):
    return [Paragraph(title, styles["DeckTitle"]), Paragraph(sub, styles["Sub"])]


def cover_slide():
    return [
        Paragraph("CADRO HR", styles["Hero"]),
        Paragraph("English Product Presentation (IP-Safe, Client-Facing)", styles["Sub"]),
        Spacer(1, 0.1 * inch),
        Paragraph("Why this platform matters:", styles["Body"]),
        Paragraph("• Working HR platform with broad module coverage", styles["DeckBullet"]),
        Paragraph("• Live web presence at cadro.io with SEO-ready content structure", styles["DeckBullet"]),
        Paragraph("• Multilingual capability (TR / EN / AR) with fast dictionary expansion potential", styles["DeckBullet"]),
        Paragraph("• Clear commercial model and ROI scenarios", styles["DeckBullet"]),
        Spacer(1, 0.2 * inch),
        Table(
            [[Paragraph("Built to be adopted quickly, expanded globally, and protected commercially.", ParagraphStyle("strap", fontName=FONT_NAME, fontSize=12, leading=15, alignment=TA_CENTER, textColor=NAVY))]],
            colWidths=[CONTENT_W],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), SOFT),
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ])
        )
    ]


def strategy_slide():
    left = [
        *header("Why CADRO should be in the market", "Operational need + language reach + scalable product footprint"),
        Paragraph("• SMEs need integrated HR operations, not fragmented tools", styles["DeckBullet"]),
        Paragraph("• CADRO already delivers core HR flows in one platform", styles["DeckBullet"]),
        Paragraph("• Multilingual support enables immediate regional relevance", styles["DeckBullet"]),
        Paragraph("• Dictionary/glossary structure can be expanded fast for new countries", styles["DeckBullet"]),
        Paragraph("• cadro.io is live and supports SEO-driven demand capture", styles["DeckBullet"]),
    ]
    right = [
        Table([
            [Paragraph("ROI anchor", styles["Body"]), Paragraph("Base: ~10.2 months payback", styles["Body"])],
            [Paragraph("Upside", styles["Body"]), Paragraph("Aggressive: ~5.2 months payback", styles["Body"])],
            [Paragraph("Business model", styles["Body"]), Paragraph("Subscription + module upsell", styles["Body"])],
            [Paragraph("Go-global path", styles["Body"]), Paragraph("Language expansion over existing core", styles["Body"])],
        ], colWidths=[1.8 * inch, 3.8 * inch], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF6FD")),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])),
        Spacer(1, 0.12 * inch),
        Paragraph("IP Safety: This presentation is intentionally high-level. Internal architecture and source-level mechanics are excluded.", styles["Body"]),
    ]
    return [Table([[left, right]], colWidths=[6.0 * inch, 6.3 * inch], style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))]


def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def image_grid_slide(title: str, subtitle: str, images: list[Path]):
    elements = [*header(title, subtitle)]
    rows = []
    row = []
    for idx, img in enumerate(images, 1):
        row.append(image_card(img, slug_to_title(img.name)))
        if len(row) == 4:
            rows.append(row)
            row = []
    if row:
        while len(row) < 4:
            row.append(Paragraph("", styles["Body"]))
        rows.append(row)

    grid = Table(
        rows,
        colWidths=[3.08 * inch] * 4,
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ])
    )
    elements.append(grid)
    return elements


def close_slide():
    return [
        *header("Why buy / adopt / scale CADRO", "A balanced proposition: strong commercial upside without unnecessary IP exposure"),
        Paragraph("• Proven module coverage across HR operations", styles["DeckBullet"]),
        Paragraph("• High-quality UI evidence across modules and workflow states", styles["DeckBullet"]),
        Paragraph("• Live market presence and SEO-ready site structure", styles["DeckBullet"]),
        Paragraph("• Multilingual growth path with fast dictionary expansion", styles["DeckBullet"]),
        Paragraph("• Modeled ROI and clear commercialization options", styles["DeckBullet"]),
        Spacer(1, 0.18 * inch),
        Table(
            [[Paragraph("Next step: commercial due diligence and buyout / partnership structure discussion.", ParagraphStyle("cta", fontName=FONT_NAME, fontSize=12, leading=15, alignment=TA_CENTER, textColor=colors.white))]],
            colWidths=[CONTENT_W],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), GREEN),
                ("BOX", (0, 0), (-1, -1), 0.8, GREEN),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ])
        )
    ]


def build():
    main_images = sorted([p for p in MAIN_DIR.glob("*.webp") if p.name != ".DS_Store"])
    state_images = sorted([p for p in STATE_DIR.glob("*.webp") if p.name != ".DS_Store"])

    slides = [cover_slide(), strategy_slide()]

    for i, chunk in enumerate(chunked(main_images, 8), 1):
        slides.append(image_grid_slide(
            f"Module Screens ({i}/{math.ceil(len(main_images)/8)})",
            "High-resolution English module views",
            chunk,
        ))

    for i, chunk in enumerate(chunked(state_images, 8), 1):
        slides.append(image_grid_slide(
            f"Workflow States ({i}/{math.ceil(len(state_images)/8)})",
            "High-resolution English state/modal views",
            chunk,
        ))

    slides.append(close_slide())

    doc = BaseDocTemplate(
        str(OUT_FILE),
        pagesize=landscape((PAGE_W, PAGE_H)),
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title="CADRO HR English Client Presentation (No Notes)",
        author="GitHub Copilot",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=footer)])

    story = []
    for idx, slide in enumerate(slides):
        story.extend(slide)
        if idx != len(slides) - 1:
            story.append(PageBreak())

    doc.build(story)
    print(f"Created {OUT_FILE}")
    print(f"Main images: {len(main_images)}, State images: {len(state_images)}")


if __name__ == "__main__":
    build()
