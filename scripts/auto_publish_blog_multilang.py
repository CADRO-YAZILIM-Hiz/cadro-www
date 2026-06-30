#!/usr/bin/env python3
"""Daily multilingual blog publisher for static CADRO site.

Supported languages: tr, en, de, ar

Behavior:
- Publishes due posts from a language-specific JSON queue.
- Creates article HTML file if missing.
- Injects a blog card between AUTO markers in <lang>/blog.html (or root blog.html for TR).
- Appends URL to sitemap.xml.
- Marks queue item as published.

Queue item fields:
- publish_date (YYYY-MM-DD)
- slug
- title
- excerpt
- category
- keywords (optional list)
- published (bool)
- ready (optional bool, default true)
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
from pathlib import Path

AUTO_START = "<!-- AUTO_BLOG_CARDS_START -->"
AUTO_END = "<!-- AUTO_BLOG_CARDS_END -->"
FALLBACK_SNIPPETS = (
    "Bu içerik CADRO editör ekibi tarafından güncellenecektir.",
    "This content will be updated by the CADRO editorial team.",
    "Dieser Inhalt wird vom CADRO-Redaktionsteam aktualisiert.",
    "سيتم تحديث هذا المحتوى بواسطة فريق تحرير CADRO.",
)

LANG_CFG = {
    "tr": {
        "dir": "",
        "html_lang": "tr",
        "dir_attr": "ltr",
        "month_names": [
            "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
            "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
        ],
        "read_more": "Makaleyi Oku →",
        "back_blog": "Blog'a Dön",
        "cta": "İK ROI Hesaplama Aracını Aç",
        "nav_home": "Ana Sayfa",
        "nav_blog": "Blog",
        "nav_software": "İK Yazılımı",
        "nav_solutions": "Çözümler",
        "nav_compare": "Neden Cadro?",
        "nav_pricing": "Fiyatlar",
        "nav_resources": "Kaynaklar",
        "btn_login": "Giriş Yap",
        "btn_start_subscription": "Aboneliğinizi Başlatın",
        "default_category": "İK Rehberi",
        "reading_time": "{min} dk okuma",
        "cta_heading": "İK Süreçlerinizi Dijitalleştirin",
        "cta_text": "CADRO ile puantaj, izin, bordro ve İK süreçlerinizi tek platformda yönetin.",
        "cta_button1": "Puantaj Modülünü Keşfet",
        "cta_button1_url": "puantaj-ve-vardiya-yazilimi.html",
        "cta_button2": "14 Gün Ücretsiz Dene",
        "cta_button2_url": "pricing.html",
        "related_title": "İlgili makaleler:",
        "breadcrumb_home": "Ana Sayfa",
        "breadcrumb_blog": "Blog",
        "blog_url": "blog.html",
        "home_url": "/",
        "og_image": "https://www.cadro.io/assets/screenshots/phase2/tr/dashboard.webp",
        "logo_url": "./Cadro Logo.png",
        "related_links": [
            ("İK Dijital Dönüşüm 2026", "makale-ik-dijital-donusum-2026.html"),
            ("Puantaj & Vardiya Yazılımı", "puantaj-ve-vardiya-yazilimi.html"),
            ("İK ROI Hesaplama Rehberi", "makale-ik-roi-hesaplama-formulu.html"),
        ],
    },
    "en": {
        "dir": "en",
        "html_lang": "en",
        "dir_attr": "ltr",
        "month_names": [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ],
        "read_more": "Read article →",
        "back_blog": "Back to Blog",
        "cta": "Open HR ROI Calculator",
        "nav_home": "Home",
        "nav_blog": "Blog",
        "nav_software": "HR Software",
        "nav_solutions": "Solutions",
        "nav_compare": "Why Cadro?",
        "nav_pricing": "Pricing",
        "nav_resources": "Resources",
        "btn_login": "Log In",
        "btn_start_subscription": "Start Your Subscription",
        "default_category": "HR Guide",
        "reading_time": "{min} min read",
        "cta_heading": "Digitize Your HR Processes",
        "cta_text": "Manage time tracking, leave, payroll and HR processes on a single platform with CADRO.",
        "cta_button1": "Explore Time Tracking",
        "cta_button1_url": "puantaj-ve-vardiya-yazilimi.html",
        "cta_button2": "14-Day Free Trial",
        "cta_button2_url": "pricing.html",
        "related_title": "Related articles:",
        "breadcrumb_home": "Home",
        "breadcrumb_blog": "Blog",
        "blog_url": "blog.html",
        "home_url": "../",
        "og_image": "https://www.cadro.io/assets/screenshots/phase2/en/dashboard.webp",
        "logo_url": "../Cadro Logo.png",
        "related_links": [
            ("HR Digital Transformation 2026", "makale-ik-dijital-donusum-2026.html"),
            ("Time & Attendance Software", "puantaj-ve-vardiya-yazilimi.html"),
            ("HR ROI Calculator Guide", "makale-ik-roi-hesaplama-formulu.html"),
        ],
    },
    "de": {
        "dir": "de",
        "html_lang": "de",
        "dir_attr": "ltr",
        "month_names": [
            "Januar", "Februar", "Maerz", "April", "Mai", "Juni",
            "Juli", "August", "September", "Oktober", "November", "Dezember",
        ],
        "read_more": "Artikel lesen →",
        "back_blog": "Zurueck zum Blog",
        "cta": "HR-ROI-Rechner oeffnen",
        "nav_home": "Startseite",
        "nav_blog": "Blog",
        "nav_software": "HR-Software",
        "nav_solutions": "Loesungen",
        "nav_compare": "Warum Cadro?",
        "nav_pricing": "Preise",
        "nav_resources": "Ressourcen",
        "btn_login": "Anmelden",
        "btn_start_subscription": "Abonnement starten",
        "default_category": "HR Leitfaden",
        "reading_time": "{min} Min. Lesezeit",
        "cta_heading": "Digitalisieren Sie Ihre HR-Prozesse",
        "cta_text": "Verwalten Sie Zeiterfassung, Urlaub, Gehaltsabrechnung und HR-Prozesse auf einer einzigen Plattform mit CADRO.",
        "cta_button1": "Zeiterfassung entdecken",
        "cta_button1_url": "puantaj-ve-vardiya-yazilimi.html",
        "cta_button2": "14 Tage kostenlos testen",
        "cta_button2_url": "pricing.html",
        "related_title": "Verwandte Artikel:",
        "breadcrumb_home": "Startseite",
        "breadcrumb_blog": "Blog",
        "blog_url": "blog.html",
        "home_url": "../",
        "og_image": "https://www.cadro.io/assets/screenshots/phase2/de/dashboard.webp",
        "logo_url": "../Cadro Logo.png",
        "related_links": [
            ("HR-Digitalisierung 2026", "makale-ik-dijital-donusum-2026.html"),
            ("Zeit- & Anwesenheitssoftware", "puantaj-ve-vardiya-yazilimi.html"),
            ("HR-ROI-Rechner Leitfaden", "makale-ik-roi-hesaplama-formulu.html"),
        ],
    },
    "ar": {
        "dir": "ar",
        "html_lang": "ar",
        "dir_attr": "rtl",
        "month_names": [
            "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
        ],
        "read_more": "اقرأ المقال →",
        "back_blog": "العودة إلى المدونة",
        "cta": "افتح حاسبة ROI للموارد البشرية",
        "nav_home": "الرئيسية",
        "nav_blog": "المدونة",
        "nav_software": "برنامج الموارد البشرية",
        "nav_solutions": "الحلول",
        "nav_compare": "لماذا كادرو؟",
        "nav_pricing": "الأسعار",
        "nav_resources": "الموارد",
        "btn_login": "تسجيل الدخول",
        "btn_start_subscription": "ابدأ اشتراكك",
        "default_category": "دليل الموارد البشرية",
        "reading_time": "{min} دقائق قراءة",
        "cta_heading": "قم برقمنة عمليات الموارد البشرية لديك",
        "cta_text": "قم بإدارة تتبع الوقت والإجازات وكشوف الرواتب وعمليات الموارد البشرية على منصة واحدة مع كادرو.",
        "cta_button1": "اكتشف وحدة الحضور",
        "cta_button1_url": "puantaj-ve-vardiya-yazilimi.html",
        "cta_button2": "نسخة تجريبية مجانية لمدة 14 يوما",
        "cta_button2_url": "pricing.html",
        "related_title": "مقالات ذات صلة:",
        "breadcrumb_home": "الرئيسية",
        "breadcrumb_blog": "المدونة",
        "blog_url": "blog.html",
        "home_url": "../",
        "og_image": "https://www.cadro.io/assets/screenshots/phase2/ar/dashboard.webp",
        "logo_url": "../Cadro Logo.png",
        "related_links": [
            ("التحول الرقمي للموارد البشرية 2026", "makale-ik-dijital-donusum-2026.html"),
            ("برنامج الحضور والانصراف", "puantaj-ve-vardiya-yazilimi.html"),
            ("دليل حاسبة ROI للموارد البشرية", "makale-ik-roi-hesaplama-formulu.html"),
        ],
    },
}

ARTICLE_CSS = """  .article-container{max-width:800px;margin:0 auto;padding:40px 24px;}
  .article-header{margin-bottom:32px;}
  .article-meta{font-size:0.85rem;opacity:0.65;margin-bottom:12px;}
  .article-title{font-size:2.2rem;font-weight:800;line-height:1.2;margin:0 0 16px;}
  .article-content h2{font-size:1.45rem;font-weight:700;margin:36px 0 12px;border-left:3px solid var(--cyan);padding-left:12px;}
  .article-content h3{font-size:1.1rem;font-weight:700;margin:24px 0 8px;}
  .article-content p{line-height:1.85;opacity:0.88;margin-bottom:14px;}
  .article-content ul,.article-content ol{line-height:1.85;opacity:0.88;padding-left:20px;margin-bottom:14px;}
  .article-content li{margin-bottom:6px;}
  .info-box{background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.22);border-radius:10px;padding:18px 20px;margin:24px 0;}
  .info-box strong{color:var(--cyan);}
  .warn-box{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.22);border-radius:10px;padding:18px 20px;margin:24px 0;}
  .warn-box strong{color:#f59e0b;}
  .article-cta{background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.3);border-radius:14px;padding:32px;text-align:center;margin:48px 0 24px;}
  .article-cta h2{font-size:1.5rem;margin-bottom:10px;}
  .tag-list{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;}
  .tag{padding:4px 12px;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.2);border-radius:999px;font-size:0.78rem;color:var(--cyan);}
  .data-table{width:100%;border-collapse:collapse;margin:20px 0;font-size:0.9rem;}
  .data-table th{background:rgba(6,182,212,0.12);color:var(--cyan);font-weight:700;padding:10px 14px;text-align:left;border-bottom:1px solid rgba(6,182,212,0.25);}
  .data-table td{padding:10px 14px;border-bottom:1px solid rgba(148,163,184,0.1);}
  .brand-logo-img{display:block;height:42px;width:auto;}.footer .brand-logo-img{height:56px;margin-bottom:1rem;}"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Publish scheduled posts by language")
    parser.add_argument("--root", default=".", help="Site root path")
    parser.add_argument("--lang", required=True, choices=sorted(LANG_CFG.keys()))
    parser.add_argument("--schedule", default="", help="Schedule JSON path relative to root")
    parser.add_argument("--date", default=dt.date.today().isoformat(), help="YYYY-MM-DD")
    parser.add_argument("--max-per-run", type=int, default=1)
    parser.add_argument("--base-url", default="https://www.cadro.io")
    parser.add_argument(
        "--rebuild-slugs",
        default="",
        help="Comma-separated slugs to rebuild even if already published",
    )
    parser.add_argument(
        "--repair-fallback",
        action="store_true",
        help="Rebuild existing articles that still contain fallback placeholder text",
    )
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def esc(text: str) -> str:
    return html.escape(text, quote=True)


def format_date(date_iso: str, lang: str) -> str:
    d = dt.date.fromisoformat(date_iso)
    months = LANG_CFG[lang]["month_names"]
    if lang == "en":
        return f"{months[d.month - 1]} {d.day:02d}, {d.year}"
    if lang == "ar":
        return f"{d.day:02d} {months[d.month - 1]} {d.year}"
    return f"{d.day:02d} {months[d.month - 1]} {d.year}"


def get_paths(root: Path, lang: str, schedule_arg: str) -> tuple[Path, Path, Path, str, str]:
    lang_dir = LANG_CFG[lang]["dir"]
    if schedule_arg:
        schedule = root / schedule_arg
    else:
        schedule = root / f"scripts/blog_schedule_{lang}_30.json"

    if lang == "tr":
        blog = root / "blog.html"
        article_prefix = ""
        css_prefix = "./"
    else:
        blog = root / lang_dir / "blog.html"
        article_prefix = f"{lang_dir}/"
        css_prefix = "../"

    sitemap = root / "sitemap.xml"
    return schedule, blog, sitemap, article_prefix, css_prefix


def default_sections(post: dict, lang: str) -> list[dict]:
    title = post["title"].strip()
    excerpt = post["excerpt"].strip()
    keywords = post.get("keywords", [])

    if lang == "tr":
        k1 = keywords[0] if keywords else "ik yazılımı"
        k2 = keywords[1] if len(keywords) > 1 else "operasyonel verimlilik"
        return [
            {
                "heading": "Kapsam ve hedef",
                "paragraphs": [
                    f"{excerpt} Bu yazıda {title} konusu pratik bir uygulama planı ile ele alınır.",
                    f"Amaç; {k1} ve {k2} tarafında hızlı kazanım noktalarını belirleyip 90 günde ölçülebilir sonuç üretmektir.",
                ],
            },
            {
                "heading": "90 günlük uygulama planı",
                "paragraphs": [
                    "1-30. gün: veri temizliği, mevcut süreç haritası ve sorumluluk matrisi netleştirilir.",
                    "31-60. gün: pilot ekip ile test yapılır, rapor setleri doğrulanır, eğitim ve geçiş planı tamamlanır.",
                    "61-90. gün: yaygınlaştırma başlatılır, haftalık performans göstergeleri ile süreç stabil hale getirilir.",
                ],
            },
            {
                "heading": "Ölçüm modeli ve ROI mantığı",
                "paragraphs": [
                    "Aylık net kazanç; zaman tasarrufu + hata azalımı + devir düşüş etkisi bileşenleriyle hesaplanır.",
                    "Geri ödeme süresi için toplam yazılım maliyeti aylık net kazanca bölünür; yönetim raporunda hem iyimser hem temkinli senaryo birlikte sunulur.",
                ],
            },
            {
                "heading": "Sık yapılan hatalar",
                "paragraphs": [
                    "Tek seferde tüm modülleri açmak, rol bazlı yetkiyi geciktirmek ve veri sahipliğini belirsiz bırakmak en yaygın üç risktir.",
                    "Bu riskler için kontrol listesi, haftalık durum toplantısı ve canlıya geçiş öncesi UAT onayı standart hale getirilmelidir.",
                ],
            },
            {
                "heading": "Sonuç ve aksiyon listesi",
                "paragraphs": [
                    "İlk adım olarak mevcut süreci saat bazında ölçün, ardından pilot kapsamı ve başarı kriterlerini yazılı hale getirin.",
                    "Uygulama tamamlandığında KPI paneli üzerinden aylık trendi izleyin ve her çeyrekte optimizasyon döngüsü çalıştırın.",
                ],
            },
        ]

    if lang == "en":
        k1 = "HR software"
        k2 = "operational efficiency"
        return [
            {
                "heading": "Scope and business target",
                "paragraphs": [
                    f"{excerpt} This guide explains {title} with a practical execution model.",
                    f"The objective is to capture quick wins in {k1} and {k2}, then turn them into measurable outcomes within 90 days.",
                ],
            },
            {
                "heading": "90-day execution roadmap",
                "paragraphs": [
                    "Days 1-30: clean source data, map current workflow, and assign process ownership.",
                    "Days 31-60: run a pilot, validate dashboards, and finalize enablement for HR and managers.",
                    "Days 61-90: roll out broadly and track adoption with weekly checkpoints and KPI reviews.",
                ],
            },
            {
                "heading": "ROI framework",
                "paragraphs": [
                    "Monthly net benefit is modeled as time savings + error reduction + retention impact.",
                    "Payback period is calculated by dividing total software cost by monthly net benefit, then stress-tested with conservative and optimistic scenarios.",
                ],
            },
            {
                "heading": "Common implementation risks",
                "paragraphs": [
                    "Teams usually struggle when every module is launched at once, access roles are not finalized, or process ownership is unclear.",
                    "Mitigate risk with a short governance cadence, clear owners per metric, and UAT approval before go-live.",
                ],
            },
            {
                "heading": "Action plan",
                "paragraphs": [
                    "Start with a baseline measurement of current effort and error rates, then define pilot scope and acceptance criteria.",
                    "After launch, review monthly KPI trends and run quarterly optimization cycles to keep ROI growing.",
                ],
            },
        ]

    if lang == "de":
        k1 = "HR-Software"
        k2 = "Betriebseffizienz"
        return [
            {
                "heading": "Rahmen und Zielbild",
                "paragraphs": [
                    f"{excerpt} Dieser Leitfaden zeigt {title} als umsetzbares Vorgehensmodell.",
                    f"Ziel ist es, schnelle Effekte bei {k1} und {k2} sichtbar zu machen und in 90 Tagen messbar zu skalieren.",
                ],
            },
            {
                "heading": "90-Tage-Umsetzungsplan",
                "paragraphs": [
                    "Tag 1-30: Datenbasis bereinigen, Ist-Prozess dokumentieren und Verantwortlichkeiten festlegen.",
                    "Tag 31-60: Pilot durchfuehren, Reporting validieren und Schulung fuer HR und Fachbereiche abschliessen.",
                    "Tag 61-90: Rollout erweitern und Nutzung ueber woechentliche KPI-Reviews stabilisieren.",
                ],
            },
            {
                "heading": "ROI-Logik",
                "paragraphs": [
                    "Der monatliche Nettoeffekt ergibt sich aus Zeitersparnis, Fehlerreduktion und Bindungseffekt.",
                    "Die Amortisationszeit wird als Gesamtinvestition geteilt durch monatlichen Nettoeffekt berechnet und mit mehreren Szenarien abgesichert.",
                ],
            },
            {
                "heading": "Typische Stolpersteine",
                "paragraphs": [
                    "Risiko entsteht oft durch gleichzeitige Komplett-Einfuehrung, unklare Rollenrechte oder fehlende Dateneigentuemer.",
                    "Ein klares Governance-Format mit UAT-Freigabe vor Go-live reduziert Fehler und beschleunigt die Stabilisierung.",
                ],
            },
            {
                "heading": "Naechste Schritte",
                "paragraphs": [
                    "Erfassen Sie zuerst den Ist-Zustand mit Aufwand und Fehlerraten, danach definieren Sie Pilotumfang und Erfolgskriterien.",
                    "Nach dem Rollout sollten KPI-Trends monatlich geprueft und die Prozesse quartalsweise optimiert werden.",
                ],
            },
        ]

    k1 = "برنامج الموارد البشرية"
    k2 = "الكفاءة التشغيلية"
    return [
        {
            "heading": "النطاق والهدف",
            "paragraphs": [
                f"{excerpt} يشرح هذا الدليل موضوع {title} بخطة تنفيذ عملية.",
                f"الهدف هو تحقيق نتائج سريعة في {k1} و{k2} ثم تحويلها إلى نتائج قابلة للقياس خلال 90 يوما.",
            ],
        },
        {
            "heading": "خطة تنفيذ لمدة 90 يوما",
            "paragraphs": [
                "الأيام 1-30: تنظيف البيانات، توثيق العمليات الحالية، وتحديد المسؤوليات.",
                "الأيام 31-60: تنفيذ تجربة Pilot، التحقق من التقارير، واستكمال التدريب.",
                "الأيام 61-90: التعميم التدريجي ومتابعة مؤشرات الأداء أسبوعيا.",
            ],
        },
        {
            "heading": "منهجية ROI",
            "paragraphs": [
                "صافي العائد الشهري يحسب من: توفير الوقت + تقليل الأخطاء + أثر الاحتفاظ بالموظفين.",
                "فترة الاسترداد تحسب بقسمة إجمالي تكلفة النظام على صافي العائد الشهري مع مقارنة سيناريو متحفظ وآخر متفائل.",
            ],
        },
        {
            "heading": "أخطاء شائعة يجب تجنبها",
            "paragraphs": [
                "من أكثر الأخطاء شيوعا تشغيل جميع الوحدات دفعة واحدة أو تأخير صلاحيات الوصول أو غياب مالك واضح للبيانات.",
                "يجب اعتماد دورة متابعة قصيرة وقائمة تحقق قبل الإطلاق لتقليل المخاطر.",
            ],
        },
        {
            "heading": "خطوات عملية",
            "paragraphs": [
                "ابدأ بقياس الوضع الحالي من حيث الوقت والأخطاء، ثم حدد نطاق التجربة ومعايير النجاح.",
                "بعد الإطلاق تابع مؤشرات الأداء شهريا ونفذ تحسينات ربع سنوية لرفع العائد.",
            ],
        },
    ]


def render_sections(sections: list[dict], lang: str) -> str:
    blocks = []
    for sec in sections:
        heading = esc(sec.get("heading", "Section"))
        paragraph_list = sec.get("paragraphs")
        if isinstance(paragraph_list, list) and paragraph_list:
            body = "".join(f"<p>{esc(str(p))}</p>" for p in paragraph_list if str(p).strip())
        else:
            text = str(sec.get("text", "")).strip()
            if not text:
                continue
            body = f"<p>{esc(text)}</p>"

        if body:
            blocks.append(f"<h2>{heading}</h2>{body}")
    return "\n".join(blocks)


def _build_header(cfg: dict, css_prefix: str) -> str:
    home = cfg["home_url"]
    return f"""<div class="top-logo"><img alt="CADRO" class="top-logo-img" src="{css_prefix}Cadro Logo.png"></div>
<header class="topbar">
<button aria-expanded="false" class="nav-toggle" data-i18n-key="nav_menu">{esc(cfg['nav_blog'])}</button>
<nav class="nav">
<a data-i18n-key="nav_home" href="{home}">{esc(cfg['nav_home'])}</a>
<a data-i18n-key="nav_software" href="{css_prefix}ik-yazilimi.html">{esc(cfg['nav_software'])}</a>
<a data-i18n-key="nav_solutions" href="{home}#solutions">{esc(cfg['nav_solutions'])}</a>
<a data-i18n-key="nav_compare" href="{home}#compare">{esc(cfg['nav_compare'])}</a>
<a data-i18n-key="nav_pricing" href="{css_prefix}pricing.html">{esc(cfg['nav_pricing'])}</a>
<a href="{css_prefix}{cfg['blog_url']}">{esc(cfg['nav_blog'])}</a>
</nav>
<div class="topbar-actions">
<select aria-label="Language" class="lang-switch" id="lang-switch">
<option value="tr"{" selected" if cfg['html_lang'] == 'tr' else ""}>TR</option>
<option value="en"{" selected" if cfg['html_lang'] == 'en' else ""}>EN</option>
<option value="de"{" selected" if cfg['html_lang'] == 'de' else ""}>DE</option>
<option value="ar"{" selected" if cfg['html_lang'] == 'ar' else ""}>AR</option>
</select>
<a class="ghost-button" href="https://app.cadro.io" data-i18n-key="btn_login">{esc(cfg['btn_login'])}</a>
<a class="primary-button" href="{css_prefix}{cfg['cta_button2_url']}" data-i18n-key="btn_start_subscription">{esc(cfg['btn_start_subscription'])}</a>
</div>
</header>"""


def _build_breadcrumb(cfg: dict, title: str) -> str:
    blog_url = cfg["blog_url"]
    home_url = cfg["home_url"]
    short_title = esc(title[:40])
    return f"""<nav aria-label="Breadcrumb" style="font-size:0.82rem;opacity:0.65;margin-bottom:16px;">
<a href="{home_url}" style="color:inherit;">{esc(cfg['breadcrumb_home'])}</a> &rsaquo; <a href="{blog_url}" style="color:inherit;">{esc(cfg['breadcrumb_blog'])}</a> &rsaquo; {short_title}
</nav>"""


def _build_related(cfg: dict, css_prefix: str) -> str:
    links = cfg.get("related_links", [])
    if not links:
        return ""
    items = "".join(
        f'<a href="{css_prefix}{url}" style="padding:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(148,163,184,0.12);border-radius:10px;text-decoration:none;color:inherit;font-size:0.88rem;font-weight:600;">{esc(text)} &rarr;</a>\n'
        for text, url in links
    )
    return f"""<div style="border-top:1px solid rgba(148,163,184,0.15);padding-top:24px;margin-top:16px;">
<p style="font-size:0.85rem;opacity:0.6;margin-bottom:16px;">{esc(cfg['related_title'])}</p>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
{items}</div>
</div>"""


def _build_footer(cfg: dict, css_prefix: str) -> str:
    return f"""<footer class="footer">
<div>
<img alt="CADRO" class="brand-logo-img" src="{css_prefix}Cadro Logo.png">
<p data-i18n-key="footer_text">{esc(cfg['nav_home'])} platformu.</p>
</div>
<p class="footer-copy" data-i18n-key="footer_copy">&copy; 2026 CADRO. Tum haklari saklidir.</p>
</footer>"""


def build_article(post: dict, lang: str, canonical_url: str, css_prefix: str) -> str:
    cfg = LANG_CFG[lang]
    title = post["title"].strip()
    excerpt = post["excerpt"].strip()
    category = post.get("category", cfg["default_category"]).strip()
    publish_date = post["publish_date"]
    keywords = post.get("keywords", [])
    keyword_line = ", ".join(keywords) if keywords else "ik yazilimi"

    sections = post.get("sections") or default_sections(post, lang)
    section_block = render_sections(sections, lang)
    if not section_block:
        section_block = render_sections(default_sections(post, lang), lang)

    word_count = len(excerpt.split()) + len(re.sub(r'<[^>]+>', '', section_block).split())
    reading_time = max(3, round(word_count / 200))

    tags = ""
    for kw in keywords[:5]:
        tags += f'\n      <span class="tag">{esc(kw)}</span>'

    article_json = json.dumps({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": excerpt,
        "datePublished": publish_date,
        "dateModified": publish_date,
        "author": {"@type": "Organization", "name": "CADRO", "url": "https://www.cadro.io/"},
        "publisher": {"@type": "Organization", "name": "CADRO", "url": "https://www.cadro.io/",
                     "logo": {"@type": "ImageObject", "url": "https://www.cadro.io/Cadro%20Logo.png"}},
        "url": canonical_url,
        "mainEntityOfPage": canonical_url,
        "inLanguage": cfg["html_lang"],
    }, ensure_ascii=False)

    breadcrumb_json = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": cfg["breadcrumb_home"],
             "item": f"https://www.cadro.io{cfg['home_url']}"},
            {"@type": "ListItem", "position": 2, "name": cfg["breadcrumb_blog"],
             "item": f"https://www.cadro.io/{cfg['blog_url'].lstrip('/')}"},
            {"@type": "ListItem", "position": 3, "name": title,
             "item": canonical_url},
        ],
    }, ensure_ascii=False)

    slug = post["slug"].strip()
    hreflang = ""
    for code in ("tr", "en", "de", "ar"):
        l = LANG_CFG[code]
        prefix = f"{l['dir']}/" if l["dir"] else ""
        alt_url = f"https://www.cadro.io/{prefix}{slug}"
        hreflang += f'<link rel="alternate" hreflang="{code}" href="{alt_url}">\n'
        if code == lang:
            hreflang += f'<link rel="alternate" hreflang="x-default" href="{alt_url}">\n'

    meta_locale = "tr_TR" if lang == "tr" else ("en_US" if lang == "en" else ("de_DE" if lang == "de" else "ar_AR"))

    return f"""<!DOCTYPE html><html lang="{cfg['html_lang']}" dir="{cfg['dir_attr']}"><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>{esc(title)} | CADRO Blog</title>
<meta name="description" content="{esc(excerpt)}">
<meta name="keywords" content="{esc(keyword_line)}">
<link href="{esc(canonical_url)}" rel="canonical">
{hreflang}<meta content="index, follow, max-image-preview:large" name="robots">
<meta content="article" property="og:type">
<meta content="{esc(title)} | CADRO Blog" property="og:title">
<meta content="{esc(excerpt)}" property="og:description">
<meta content="{esc(canonical_url)}" property="og:url">
<meta content="{cfg['og_image']}" property="og:image">
<meta content="summary_large_image" name="twitter:card">
<meta content="{esc(title)} | CADRO Blog" name="twitter:title">
<meta content="{esc(excerpt)}" name="twitter:description">
<meta content="{cfg['og_image']}" name="twitter:image">
<script type="application/ld+json">{article_json}</script>
<script type="application/ld+json">{breadcrumb_json}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="{css_prefix}styles.css" rel="stylesheet">
<style>ARTICLE_CSS_PLACEHOLDER</style>
<meta property="og:locale" content="{meta_locale}">
<meta name="google-site-verification" content="L40TNWo8QOpNjjkkh2WN2YZS4SjqOPeCrKisyNLR-YI">
<link rel="icon" href="{css_prefix}Cadro Logo.png" type="image/png">
<link rel="apple-touch-icon" href="{css_prefix}Cadro Logo.png">
</head>
<body data-page="article" dir="{cfg['dir_attr']}">
<div class="site-shell">
{_build_header(cfg, css_prefix)}
<main>
<div class="article-container">
  <div class="article-header">
    {_build_breadcrumb(cfg, title)}
    <div class="article-meta">{esc(format_date(publish_date, lang))} &bull; {esc(category)} &bull; {cfg['reading_time'].format(min=reading_time)}</div>
    <h1 class="article-title">{esc(title)}</h1>
    <div class="tag-list">{tags}
    </div>
  </div>
  <div class="article-content">
    <p>{esc(excerpt)}</p>
    {section_block}
  </div>
  <div class="article-cta">
    <h2>{esc(cfg['cta_heading'])}</h2>
    <p>{esc(cfg['cta_text'])}</p>
    <a href="{css_prefix}{cfg['cta_button1_url']}" class="primary-button" style="margin-right:12px;">{esc(cfg['cta_button1'])}</a>
    <a href="{css_prefix}{cfg['cta_button2_url']}" class="ghost-button">{esc(cfg['cta_button2'])}</a>
  </div>
  {_build_related(cfg, css_prefix)}
</div>
</main>
{_build_footer(cfg, css_prefix)}
</div>
<script src="{css_prefix}site-config.js"></script>
<script src="{css_prefix}page-content-{lang}.js"></script>

    <script src="../lang-all.js"></script><script src="{css_prefix}app.js"></script>
</body></html>""".replace("ARTICLE_CSS_PLACEHOLDER", ARTICLE_CSS)


def build_card(post: dict, lang: str) -> str:
    cfg = LANG_CFG[lang]
    date_text = format_date(post["publish_date"], lang)
    category = esc(post.get("category", cfg["default_category"]))
    title = esc(post["title"])
    excerpt = esc(post["excerpt"])
    slug = esc(post["slug"])
    return (
        "\n"
        "            <article class=\"blog-card\" style=\"border-left: 4px solid var(--cyan);\">\n"
        f"              <div class=\"blog-meta\">{date_text} • {category}</div>\n"
        f"              <h3>{title}</h3>\n"
        f"              <p>{excerpt}</p>\n"
        f"              <a href=\"{slug}\" class=\"read-more\">{esc(cfg['read_more'])}</a>\n"
        "            </article>\n"
    )


def _inject_itemlist_entry(text: str, post: dict, base_url: str, article_prefix: str) -> str:
    import json as _json
    slug = post["slug"].strip()
    url = f"{base_url}/{article_prefix}{slug}" if article_prefix else f"{base_url}/{slug}"
    name = post["title"].strip()
    new_entry = f'{{"@type":"ListItem","position":999,"url":"{esc(url)}","name":"{esc(name)}"}}'
    
    pattern = re.compile(
        r'("itemListElement"\s*:\s*\[)(.*?)(\])',
        re.DOTALL
    )
    m = pattern.search(text)
    if not m:
        return text
    
    existing = m.group(2).strip()
    if slug in existing:
        return text
    
    entries = _json.loads(f'[{existing}]') if existing.strip() else []
    max_pos = max((e.get("position", 0) for e in entries), default=0)
    existing_slugs = {e.get("url", "").split("/")[-1].replace(".html", "") for e in entries}
    if slug in existing_slugs:
        return text
    
    new_entry_obj = {"@type": "ListItem", "position": max_pos + 1, "url": url, "name": name}
    entries.append(new_entry_obj)
    updated_json = _json.dumps(entries, ensure_ascii=False)
    return text[:m.start(1)] + f'"itemListElement":{updated_json}' + text[m.end(3):]


def inject_card(blog_path: Path, card_html: str, slug: str, post: dict, base_url: str, article_prefix: str, dry_run: bool) -> bool:
    text = blog_path.read_text(encoding="utf-8")
    if f'href="{slug}"' in text:
        return False

    pattern = re.compile(rf"({re.escape(AUTO_START)})(.*)({re.escape(AUTO_END)})", re.DOTALL)
    m = pattern.search(text)
    if not m:
        raise RuntimeError(f"AUTO markers not found in {blog_path}")

    updated = text[: m.start()] + m.group(1) + card_html + m.group(2) + m.group(3) + text[m.end() :]
    updated = _inject_itemlist_entry(updated, post, base_url, article_prefix)
    if not dry_run:
        blog_path.write_text(updated, encoding="utf-8")
    return True


def update_sitemap(sitemap_path: Path, loc: str, lastmod: str, dry_run: bool) -> bool:
    text = sitemap_path.read_text(encoding="utf-8")
    if loc in text:
        return False

    url_block = (
        "\n  <url>\n"
        f"    <loc>{loc}</loc>\n"
        f"    <lastmod>{lastmod}</lastmod>\n"
        "    <changefreq>monthly</changefreq>\n"
        "    <priority>0.72</priority>\n"
        "  </url>\n"
    )
    updated = text.replace("</urlset>", url_block + "</urlset>")
    if not dry_run:
        sitemap_path.write_text(updated, encoding="utf-8")
    return True


def repair_fallback_articles(
    root: Path,
    queue: list[dict],
    lang: str,
    article_prefix: str,
    css_prefix: str,
    base_url: str,
    dry_run: bool,
) -> int:
    repaired = 0
    for post in queue:
        slug = post.get("slug", "").strip()
        if not slug:
            continue

        article_path = root / (article_prefix + slug)
        if not article_path.exists():
            continue

        current = article_path.read_text(encoding="utf-8")
        if not any(snippet in current for snippet in FALLBACK_SNIPPETS):
            continue

        canonical = f"{base_url}/{article_prefix}{slug}" if article_prefix else f"{base_url}/{slug}"
        rebuilt = build_article(post, lang, canonical, css_prefix)
        if not dry_run:
            article_path.write_text(rebuilt, encoding="utf-8")
        print(f"Rebuilt fallback article: {article_prefix}{slug}")
        repaired += 1
    return repaired


def rebuild_selected_articles(
    root: Path,
    queue: list[dict],
    lang: str,
    article_prefix: str,
    css_prefix: str,
    base_url: str,
    selected_slugs: set[str],
    dry_run: bool,
) -> int:
    rebuilt = 0
    for post in queue:
        slug = post.get("slug", "").strip()
        if not slug or slug not in selected_slugs:
            continue

        article_path = root / (article_prefix + slug)
        canonical = f"{base_url}/{article_prefix}{slug}" if article_prefix else f"{base_url}/{slug}"
        html_text = build_article(post, lang, canonical, css_prefix)
        if not dry_run:
            article_path.parent.mkdir(parents=True, exist_ok=True)
            article_path.write_text(html_text, encoding="utf-8")
        print(f"Rebuilt selected article: {article_prefix}{slug}")
        rebuilt += 1
    return rebuilt


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    schedule_path, blog_path, sitemap_path, article_prefix, css_prefix = get_paths(root, args.lang, args.schedule)

    if not schedule_path.exists():
        print(f"Schedule file not found: {schedule_path}")
        return 1

    run_date = dt.date.fromisoformat(args.date)
    queue = read_json(schedule_path)

    selected_slugs = {s.strip() for s in args.rebuild_slugs.split(",") if s.strip()}
    if selected_slugs:
        rebuilt = rebuild_selected_articles(
            root=root,
            queue=queue,
            lang=args.lang,
            article_prefix=article_prefix,
            css_prefix=css_prefix,
            base_url=args.base_url,
            selected_slugs=selected_slugs,
            dry_run=args.dry_run,
        )
        print(f"Rebuilt selected articles (lang={args.lang}): {rebuilt}")

    if args.repair_fallback:
        repaired = repair_fallback_articles(
            root=root,
            queue=queue,
            lang=args.lang,
            article_prefix=article_prefix,
            css_prefix=css_prefix,
            base_url=args.base_url,
            dry_run=args.dry_run,
        )
        print(f"Repaired fallback articles (lang={args.lang}): {repaired}")

    due = [
        p
        for p in queue
        if (not p.get("published"))
        and p.get("ready", True)
        and dt.date.fromisoformat(p["publish_date"]) <= run_date
    ]
    due = sorted(due, key=lambda x: x["publish_date"])[: max(args.max_per_run, 1)]

    if not due:
        print(f"No due posts for lang={args.lang}")
        return 0

    count = 0
    for post in due:
        slug = post["slug"].strip()
        article_path = root / (article_prefix + slug)
        canonical = f"{args.base_url}/{article_prefix}{slug}" if article_prefix else f"{args.base_url}/{slug}"

        if not article_path.exists():
            article_path.parent.mkdir(parents=True, exist_ok=True)
            html_text = build_article(post, args.lang, canonical, css_prefix)
            if not args.dry_run:
                article_path.write_text(html_text, encoding="utf-8")
            print(f"Created article: {article_prefix}{slug}")
        else:
            print(f"Article already exists: {article_prefix}{slug}")

        if inject_card(blog_path, build_card(post, args.lang), slug, post, args.base_url, article_prefix, args.dry_run):
            print(f"Inserted blog card: {article_prefix}{slug}")
        else:
            print(f"Blog card already exists: {article_prefix}{slug}")

        if update_sitemap(sitemap_path, canonical, post["publish_date"], args.dry_run):
            print(f"Added sitemap url: {canonical}")
        else:
            print(f"Sitemap url already exists: {canonical}")

        post["published"] = True
        post["published_at"] = run_date.isoformat()
        count += 1

    if not args.dry_run:
        write_json(schedule_path, queue)

    print(f"Published posts in this run (lang={args.lang}): {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
