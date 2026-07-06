from __future__ import annotations

import tempfile
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, cm
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
OUTPUT_DIR = BASE_DIR / "presentation_output"
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "CADRO_HR_English_Buyout_Presentation.pdf"
ASSET_ROOT = Path("/Users/turgaybozkus/Desktop/cadro-app-screenshots-webp/english/main")
FONT_PATH = Path("/Library/Fonts/Arial Unicode.ttf")
FONT_NAME = "CADROEnglishUnicode"

if FONT_PATH.exists():
    pdfmetrics.registerFont(TTFont(FONT_NAME, str(FONT_PATH)))
else:
    FONT_NAME = "Helvetica"

PAGE_W, PAGE_H = landscape((13.333 * inch, 7.5 * inch))
MARGIN_X = 0.5 * inch
MARGIN_Y = 0.38 * inch
CONTENT_W = PAGE_W - (2 * MARGIN_X)
CONTENT_H = PAGE_H - (2 * MARGIN_Y)

BRAND = colors.HexColor("#0D9EDF")
NAVY = colors.HexColor("#15213A")
INK = colors.HexColor("#1B1F2A")
MUTED = colors.HexColor("#5E6678")
SOFT = colors.HexColor("#F4F7FB")
SOFT2 = colors.HexColor("#EAF6FD")
BORDER = colors.HexColor("#D7E3EF")
GREEN = colors.HexColor("#0F9D58")
GOLD = colors.HexColor("#C89B3C")
RED = colors.HexColor("#D64545")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleXL", parent=styles["Heading1"], fontName=FONT_NAME, fontSize=26, leading=30, textColor=NAVY, alignment=TA_LEFT, spaceAfter=4))
styles.add(ParagraphStyle(name="Subtitle", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=11, leading=14, textColor=MUTED, alignment=TA_LEFT, spaceAfter=8))
styles.add(ParagraphStyle(name="Body", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=9.5, leading=12, textColor=INK, alignment=TA_LEFT, spaceAfter=4))
styles.add(ParagraphStyle(name="DeckBullet", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=9.5, leading=12, leftIndent=12, firstLineIndent=-7, textColor=INK, spaceAfter=3))
styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=8.2, leading=10, textColor=MUTED, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Heading1"], fontName=FONT_NAME, fontSize=30, leading=34, textColor=NAVY, alignment=TA_LEFT, spaceAfter=6))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=13, leading=17, textColor=MUTED, alignment=TA_LEFT, spaceAfter=14))
styles.add(ParagraphStyle(name="NoteHeader", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=8.4, leading=10, textColor=colors.white, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="NoteText", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=7.8, leading=9.2, textColor=INK, alignment=TA_LEFT, spaceAfter=1))
styles.add(ParagraphStyle(name="CardTitle", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=8.5, leading=10, textColor=NAVY, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="Caption", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=7.5, leading=9, textColor=MUTED, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="TableHead", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=8.5, leading=10, textColor=colors.white, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="TableCell", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=8.2, leading=10, textColor=INK, alignment=TA_LEFT))


def fit_image(source: Path, target_w: float, target_h: float, cache_dir: Path) -> Path:
    out = cache_dir / f"{source.stem}_{int(target_w)}x{int(target_h)}.png"
    if out.exists():
        return out
    with PILImage.open(source) as img:
        img = img.convert("RGB")
        ratio = min(target_w / img.width, target_h / img.height)
        new_size = (max(1, int(img.width * ratio)), max(1, int(img.height * ratio)))
        resized = img.resize(new_size, PILImage.LANCZOS)
        canvas = PILImage.new("RGB", (int(target_w), int(target_h)), (255, 255, 255))
        x = (canvas.width - resized.width) // 2
        y = (canvas.height - resized.height) // 2
        canvas.paste(resized, (x, y))
        canvas.save(out, format="PNG", optimize=True)
    return out


CACHE_DIR = Path(tempfile.mkdtemp(prefix="cadro_buyout_assets_"))


def image_card(image_path: Path, caption: str, box_w: float = 3.55 * inch, box_h: float = 2.05 * inch):
    target = fit_image(image_path, int(box_w), int(box_h), CACHE_DIR)
    img = Image(str(target), width=box_w, height=box_h)
    card = Table(
        [[img], [Paragraph(caption, styles["CardTitle"])]] ,
        colWidths=[box_w],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        ),
    )
    return card


def notes_box(lines: list[str]):
    rows = [[Paragraph("Speaker Notes", styles["NoteHeader"])]]
    for line in lines:
        rows.append([Paragraph(line, styles["NoteText"])])
    box = Table(
        rows,
        colWidths=[CONTENT_W],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("BACKGROUND", (0, 1), (-1, -1), SOFT),
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        ),
    )
    return box


def pill(text: str, bg=SOFT2, fg=NAVY):
    return Table(
        [[Paragraph(f"<b>{text}</b>", ParagraphStyle("pill", fontName=FONT_NAME, fontSize=8.4, leading=9, alignment=TA_CENTER, textColor=fg))]],
        colWidths=[1.95 * inch],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), bg),
                ("BOX", (0, 0), (-1, -1), 0.5, bg),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        ),
    )


def metric_box(value: str, label: str, accent=BRAND):
    return Table(
        [
            [Paragraph(f"<b>{value}</b>", ParagraphStyle("metric_value", fontName=FONT_NAME, fontSize=18, leading=19, alignment=TA_CENTER, textColor=accent))],
            [Paragraph(label, ParagraphStyle("metric_label", fontName=FONT_NAME, fontSize=7.8, leading=9, alignment=TA_CENTER, textColor=MUTED))],
        ],
        colWidths=[1.55 * inch],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        ),
    )


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.line(MARGIN_X, 0.34 * inch, PAGE_W - MARGIN_X, 0.34 * inch)
    canvas.setFont(FONT_NAME, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN_X, 0.18 * inch, "CADRO HR | External / Redacted | English Buyout Presentation")
    canvas.drawRightString(PAGE_W - MARGIN_X, 0.18 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_header(title: str, subtitle: str):
    return [
        Paragraph(title, styles["TitleXL"]),
        Paragraph(subtitle, styles["Subtitle"]),
    ]


def two_column(left, right, left_w=6.0 * inch, right_w=6.0 * inch):
    return Table(
        [[left, right]],
        colWidths=[left_w, right_w],
        style=TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        ),
    )


def slide_cover():
    hero_image = image_card(ASSET_ROOT / "dashboard.webp", "Live product cockpit", box_w=5.5 * inch, box_h=3.0 * inch)
    left = [
        *build_header(
            "CADRO HR",
            "A multilingual, mobile-first HR platform built for SME operations and strategic scale-up.",
        ),
        Spacer(1, 0.08 * inch),
        Paragraph("What the buyer gets:", styles["Body"]),
        Paragraph("• A working product base", styles["DeckBullet"]),
        Paragraph("• A clear revenue engine", styles["DeckBullet"]),
        Paragraph("• A fast market expansion path", styles["DeckBullet"]),
        Spacer(1, 0.12 * inch),
        Table(
            [[pill("Buyout-ready"), pill("TR / EN / AR"), pill("Live website"), pill("SEO-friendly")]],
            colWidths=[1.35 * inch] * 4,
            style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]),
        ),
        Spacer(1, 0.14 * inch),
        metric_box("Ready", "Commercially structured"),
        Spacer(1, 0.05 * inch),
        metric_box("Live", "Public web presence"),
    ]
    right = hero_image
    return [two_column(left, right), Spacer(1, 0.12 * inch), notes_box([
        "Open with a simple acquisition thesis: this is not an idea, it is a working product and a market-ready asset.",
        "The buyer is not purchasing a blank sheet; they are buying time, traction, and a clearer path to revenue.",
        "Keep the tone strategic and commercial from the first sentence.",
    ])]


def slide_problem():
    left = [
        *build_header("Why the market still hurts", "SMEs still lose time and control by running HR in spreadsheets and disconnected tools."),
        Paragraph("The pain is not only feature gaps; it is operational friction.", styles["Body"]),
        Paragraph("• Manual approvals create delays", styles["DeckBullet"]),
        Paragraph("• Fragmented tools create errors", styles["DeckBullet"]),
        Paragraph("• Global products often miss local language and workflow needs", styles["DeckBullet"]),
        Spacer(1, 0.08 * inch),
        Table(
            [
                [metric_box("Manual", "workload"), metric_box("Slow", "decision cycles"), metric_box("Local", "fit matters")]
            ],
            colWidths=[1.8 * inch] * 3,
            style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]),
        ),
    ]
    right = image_card(ASSET_ROOT / "employees.webp", "People operations at a glance", box_w=5.55 * inch, box_h=2.95 * inch)
    return [two_column(left, right), Spacer(1, 0.12 * inch), notes_box([
        "Make the problem concrete: the buyer is not escaping a lack of software, but a lack of fit and simplicity.",
        "This slide should feel familiar to anyone managing headcount, approvals, and reporting manually.",
        "Do not over-explain the product yet; stay on pain and urgency.",
    ])]


def slide_product_proof():
    left_cards = Table(
        [[
            image_card(ASSET_ROOT / "dashboard.webp", "Cockpit / dashboard", box_w=3.58 * inch, box_h=1.95 * inch),
            image_card(ASSET_ROOT / "employees.webp", "Employee management", box_w=3.58 * inch, box_h=1.95 * inch),
        ]],
        colWidths=[3.65 * inch, 3.65 * inch],
        style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]),
    )
    right_cards = Table(
        [[
            image_card(ASSET_ROOT / "03F0827B-FCED-463E-98BF-574012397AC0_1_201_a.webp", "Applicant tracking (ATS)", box_w=3.58 * inch, box_h=1.95 * inch),
            image_card(ASSET_ROOT / "leaves.webp", "Leave management", box_w=3.58 * inch, box_h=1.95 * inch),
        ]],
        colWidths=[3.65 * inch, 3.65 * inch],
        style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]),
    )
    left = [
        *build_header("What you are buying", "The product is already real, visible, and structured for daily operations."),
        Paragraph("The buyer receives a functioning base that can be branded, extended, or integrated.", styles["Body"]),
        Paragraph("• Core HR workflows are productized", styles["DeckBullet"]),
        Paragraph("• Billing and subscription logic are in place", styles["DeckBullet"]),
        Paragraph("• Screens prove the product breadth", styles["DeckBullet"]),
    ]
    right = [left_cards, Spacer(1, 0.08 * inch), right_cards]
    return [two_column(left, right), Spacer(1, 0.10 * inch), notes_box([
        "Use the screenshots as proof of execution, not as a technical walkthrough.",
        "Keep pointing back to the fact that the buyer is acquiring a working base, not a promise.",
        "This is the strongest anti-risk slide in the deck.",
    ])]


def slide_operational_breadth():
    left_cards = Table(
        [[
            image_card(ASSET_ROOT / "performance.webp", "Performance & talent", box_w=3.58 * inch, box_h=1.95 * inch),
            image_card(ASSET_ROOT / "settings.webp", "System & company settings", box_w=3.58 * inch, box_h=1.95 * inch),
        ]],
        colWidths=[3.65 * inch, 3.65 * inch],
        style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]),
    )
    right_cards = Table(
        [[
            image_card(ASSET_ROOT / "knowledge-base.webp", "Knowledge base", box_w=3.58 * inch, box_h=1.95 * inch),
            image_card(ASSET_ROOT / "support-center.webp", "Support center", box_w=3.58 * inch, box_h=1.95 * inch),
        ]],
        colWidths=[3.65 * inch, 3.65 * inch],
        style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]),
    )
    left = [
        *build_header("Breadth across the employee lifecycle", "CADRO covers operations from onboarding to performance and support."),
        Paragraph("The value is not one module. It is platform footprint.", styles["Body"]),
        Paragraph("• Time and attendance", styles["DeckBullet"]),
        Paragraph("• Leave approval", styles["DeckBullet"]),
        Paragraph("• Performance and talent", styles["DeckBullet"]),
        Paragraph("• Knowledge, requests, and support", styles["DeckBullet"]),
    ]
    right = [left_cards, Spacer(1, 0.08 * inch), right_cards]
    return [two_column(left, right), Spacer(1, 0.10 * inch), notes_box([
        "This slide widens the commercial narrative: the buyer is not purchasing a niche tool, but a platform with room to expand.",
        "Show that the product touches multiple operational teams, which increases stickiness and monetization potential.",
        "Do not describe internal wiring; focus on breadth and business value.",
    ])]


def slide_market_presence():
    left = [
        *build_header("Already live, already searchable", "cadro.io is live in production and already exposes public product content."),
        Paragraph("The website is an existing marketing and acquisition asset, not a placeholder.", styles["Body"]),
        Paragraph("• Live public pages are already published", styles["DeckBullet"]),
        Paragraph("• Content architecture is SEO-friendly and modular", styles["DeckBullet"]),
        Paragraph("• The glossary / content layer can expand to new countries quickly", styles["DeckBullet"]),
        Paragraph("• Localization changes content depth, not the core product base", styles["DeckBullet"]),
        Spacer(1, 0.08 * inch),
        Table(
            [[metric_box("Live", "cadro.io"), metric_box("SEO-ready", "Public pages"), metric_box("Fast", "country rollout")]],
            colWidths=[1.8 * inch] * 3,
            style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]),
        ),
    ]
    right = [
        Table(
            [[
                pill("English"), pill("Turkish"), pill("Arabic"),
            ]],
            colWidths=[1.7 * inch] * 3,
            style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]),
        ),
        Spacer(1, 0.10 * inch),
        image_card(ASSET_ROOT / "purchase-requests.webp", "A public modular page architecture already exists", box_w=5.55 * inch, box_h=2.9 * inch),
    ]
    return [two_column(left, right), Spacer(1, 0.10 * inch), notes_box([
        "Say the site is live and the content system is already doing commercial work.",
        "Avoid claiming a numeric SEO score unless you have an external audit; instead emphasize SEO-ready architecture and live public pages.",
        "Highlight how localization can expand into more countries without rewriting the core product.",
    ])]


def slide_financials():
    left = [
        *build_header("The revenue engine is already modeled", "The buyer gets a pricing system, ROI logic, and a clear path to payback."),
        Paragraph("The commercial model is subscription-based with expansion paths.", styles["Body"]),
        Paragraph("• BASIC / PRO / ENTERPRISE pricing", styles["DeckBullet"]),
        Paragraph("• Upsell paths for payroll, AI, and integrations", styles["DeckBullet"]),
        Paragraph("• 25K USD increment ROI model already prepared", styles["DeckBullet"]),
        Spacer(1, 0.08 * inch),
        Table(
            [[metric_box("10.2 mo", "base payback"), metric_box("5.2 mo", "aggressive case"), metric_box("80%+", "gross margin target")]],
            colWidths=[1.8 * inch] * 3,
            style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]),
        ),
    ]
    right = Table(
        [
            [Paragraph("ROI snapshot", styles["TableHead"]), Paragraph("Value", styles["TableHead"]), Paragraph("Meaning", styles["TableHead"])],
            [Paragraph("Base scenario", styles["TableCell"]), Paragraph("~10.2 months", styles["TableCell"]), Paragraph("Balanced operating case", styles["TableCell"])],
            [Paragraph("Conservative scenario", styles["TableCell"]), Paragraph("~18.4 months", styles["TableCell"]), Paragraph("Lower sales efficiency case", styles["TableCell"])],
            [Paragraph("Aggressive scenario", styles["TableCell"]), Paragraph("~5.2 months", styles["TableCell"]), Paragraph("Strong execution / upsell case", styles["TableCell"])],
            [Paragraph("Strategy", styles["TableCell"]), Paragraph("Revenue scale-up", styles["TableCell"]), Paragraph("Buy or back a growth engine", styles["TableCell"])],
        ],
        colWidths=[1.4 * inch, 1.45 * inch, 2.75 * inch],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.45, BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        ),
    )
    return [two_column(left, right), Spacer(1, 0.08 * inch), notes_box([
        "Use the ROI slide to show that the buyer is not only purchasing product capability but a measurable commercial engine.",
        "The goal is confidence, not hype: the model should feel disciplined and realistic.",
        "Anchor on the base case, then show the upside band.",
    ])]


def slide_ip_safe():
    left = [
        *build_header("External deck, protected core", "The presentation is intentionally redacted to protect implementation IP and licensing value."),
        Paragraph("This deck is designed for buyer evaluation without exposing source-level detail.", styles["Body"]),
        Paragraph("• No endpoint inventory", styles["DeckBullet"]),
        Paragraph("• No source-level implementation map", styles["DeckBullet"]),
        Paragraph("• No deployment coordinates or secrets", styles["DeckBullet"]),
        Paragraph("• Controlled due diligence can follow under NDA", styles["DeckBullet"]),
    ]
    right = Table(
        [
            [Paragraph("What is shared", styles["TableHead"]), Paragraph("What remains private", styles["TableHead"])],
            [Paragraph("Product value proposition", styles["TableCell"]), Paragraph("Source code and internal wiring", styles["TableCell"])],
            [Paragraph("Commercial model", styles["TableCell"]), Paragraph("Operational hardening details", styles["TableCell"])],
            [Paragraph("Live UI proof", styles["TableCell"]), Paragraph("Service map and internal controls", styles["TableCell"])],
            [Paragraph("Buyer next step", styles["TableCell"]), Paragraph("NDA-based technical deep dive", styles["TableCell"])],
        ],
        colWidths=[2.2 * inch, 3.2 * inch],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), RED),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.45, BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        ),
    )
    return [two_column(left, right), Spacer(1, 0.08 * inch), notes_box([
        "This slide reassures the buyer that the deck is safe to circulate while preserving strategic IP.",
        "Frame the redaction as a professional diligence boundary, not as a lack of substance.",
        "Offer a deeper NDA-based session if the buyer moves forward.",
    ])]


def slide_expansion():
    left = [
        *build_header("Why this should be in the market now", "The buyer gains a platform that can expand by language, content, and country without starting over."),
        Paragraph("The opportunity is not just software; it is regional reach.", styles["Body"]),
        Paragraph("• Multilingual support creates a regional advantage", styles["DeckBullet"]),
        Paragraph("• Glossary / dictionary structure can be extended quickly", styles["DeckBullet"]),
        Paragraph("• Adding countries is a content-and-localization exercise, not a rebuild", styles["DeckBullet"]),
        Paragraph("• The buyer can accelerate growth instead of bootstrapping from scratch", styles["DeckBullet"]),
    ]
    right = Table(
        [
            [metric_box("TR", "Home market"), metric_box("EN", "International base"), metric_box("AR", "MENA bridge")],
            [metric_box("Add", "More languages"), metric_box("Add", "More countries"), metric_box("Add", "More content")],
        ],
        colWidths=[1.8 * inch] * 3,
        style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 4)]),
    )
    return [two_column(left, right), Spacer(1, 0.08 * inch), notes_box([
        "This is the market-expansion slide: language is not a cosmetic feature; it is a growth multiplier.",
        "The buyer should understand that adding countries is much cheaper when the localization structure already exists.",
        "The line to remember is: content scales; core product stays intact.",
    ])]


def slide_deal():
    left = [
        *build_header("How the deal can be structured", "Keep the commercial path flexible while preserving the buyer’s ability to own or control the asset."),
        Paragraph("Possible structures can include full acquisition, exclusive license, or a strategic partnership with white-label potential.", styles["Body"]),
        Paragraph("• Full acquisition if strategic fit is clear", styles["DeckBullet"]),
        Paragraph("• Exclusive license if the buyer wants control without immediate transfer", styles["DeckBullet"]),
        Paragraph("• Partnership / white-label if they want to test the market first", styles["DeckBullet"]),
    ]
    right = Table(
        [
            [Paragraph("Structure option", styles["TableHead"]), Paragraph("Buyer benefit", styles["TableHead"])],
            [Paragraph("Full acquisition", styles["TableCell"]), Paragraph("Complete ownership and strategic control", styles["TableCell"])],
            [Paragraph("Exclusive license", styles["TableCell"]), Paragraph("Control of commercialization with lower upfront commitment", styles["TableCell"])],
            [Paragraph("Strategic partnership", styles["TableCell"]), Paragraph("Test market fit before a broader commitment", styles["TableCell"])],
        ],
        colWidths=[2.1 * inch, 3.25 * inch],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.45, BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        ),
    )
    return [two_column(left, right), Spacer(1, 0.08 * inch), notes_box([
        "Be explicit that the buyer can buy the company / program outright if they want full ownership.",
        "If they are not ready for full ownership, offer flexible commercialization structures.",
        "This slide reduces friction by making the transaction feel adaptable rather than forced.",
    ])]


def slide_close():
    story = [
        *build_header("The takeaway", "CADRO is a ready-to-scale HR platform with live product proof, market presence, and commercial upside."),
        Spacer(1, 0.06 * inch),
        Table(
            [[Paragraph("The buyer gets speed, focus, and reduced execution risk.", ParagraphStyle("close", fontName=FONT_NAME, fontSize=14, leading=18, textColor=NAVY, alignment=TA_CENTER))]],
            colWidths=[CONTENT_W],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), SOFT2),
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]),
        ),
        Spacer(1, 0.1 * inch),
        Paragraph("Next step: review the data room, validate the commercial model, and discuss structure.", styles["Body"]),
    ]
    return story + [Spacer(1, 0.08 * inch), notes_box([
        "Close by repeating the acquisition thesis: they are buying speed, control, and a de-risked base.",
        "End with a clear next step rather than a long recap.",
        "The tone should feel like a strategic purchase discussion, not a product demo.",
    ])]


SLIDES = [
    slide_cover,
    slide_problem,
    slide_product_proof,
    slide_operational_breadth,
    slide_market_presence,
    slide_financials,
    slide_ip_safe,
    slide_expansion,
    slide_deal,
    slide_close,
]


def build_pdf():
    doc = BaseDocTemplate(
        str(OUTPUT_FILE),
        pagesize=landscape((PAGE_W, PAGE_H)),
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_Y,
        bottomMargin=MARGIN_Y,
        title="CADRO HR English Buyout Presentation",
        author="GitHub Copilot",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="slide", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="deck", frames=[frame], onPage=page_footer)])

    story = []
    for idx, slide_fn in enumerate(SLIDES):
        story.extend(slide_fn())
        if idx != len(SLIDES) - 1:
            story.append(PageBreak())
    doc.build(story)
    print(f"Created {OUTPUT_FILE}")


if __name__ == "__main__":
    build_pdf()
