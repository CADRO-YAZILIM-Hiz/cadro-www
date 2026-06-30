#!/usr/bin/env python3
"""Daily blog publisher for static CADRO site.

What it does on each run:
1. Picks due posts from a JSON queue (default: 1 post/run).
2. Creates article HTML files if missing.
3. Inserts article cards into blog.html between auto markers.
4. Adds article URLs to sitemap.xml.
5. Marks posts as published in the queue file.
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Publish scheduled blog posts")
    parser.add_argument("--root", default=".", help="Site root path")
    parser.add_argument(
        "--schedule",
        default="scripts/blog_schedule_tr_30.json",
        help="Schedule JSON path (relative to root)",
    )
    parser.add_argument(
        "--date",
        default=dt.date.today().isoformat(),
        help="Publish date in YYYY-MM-DD",
    )
    parser.add_argument(
        "--max-per-run",
        type=int,
        default=1,
        help="Max number of posts to publish in one run",
    )
    parser.add_argument("--base-url", default="https://www.cadro.io")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def format_tr_date(date_iso: str) -> str:
    date_obj = dt.date.fromisoformat(date_iso)
    months = [
        "Ocak",
        "Şubat",
        "Mart",
        "Nisan",
        "Mayıs",
        "Haziran",
        "Temmuz",
        "Ağustos",
        "Eylül",
        "Ekim",
        "Kasım",
        "Aralık",
    ]
    return f"{date_obj.day:02d} {months[date_obj.month - 1]} {date_obj.year}"


def sanitize(text: str) -> str:
    return html.escape(text, quote=True)


def default_sections(post: dict) -> list[dict]:
    title = post["title"].strip()
    excerpt = post["excerpt"].strip()
    keywords = post.get("keywords", [])
    k1 = keywords[0] if keywords else "ik yazılımı"
    k2 = keywords[1] if len(keywords) > 1 else "operasyonel verimlilik"
    return [
        {
            "heading": "Kapsam ve hedef",
            "paragraphs": [
                f"{excerpt} Bu içerik {title} başlığını uygulanabilir adımlarla açıklar.",
                f"Hedef, {k1} ve {k2} alanlarında hızlı kazanım yaratıp 90 günde ölçülebilir çıktı elde etmektir.",
            ],
        },
        {
            "heading": "90 günlük uygulama planı",
            "paragraphs": [
                "1-30. gün: mevcut süreçler haritalanır, veri kalite sorunları temizlenir, sorumluluk matrisi oluşturulur.",
                "31-60. gün: pilot ekipte test ve eğitim tamamlanır, raporlama metrikleri doğrulanır.",
                "61-90. gün: tüm ekiplerde yaygınlaştırma yapılır ve haftalık KPI takibi ile süreç oturtulur.",
            ],
        },
        {
            "heading": "ROI ölçümü",
            "paragraphs": [
                "Aylık net fayda; zaman tasarrufu, hata azalımı ve çalışan devir oranındaki iyileşmenin toplam etkisi ile hesaplanır.",
                "Geri ödeme süresi, toplam yazılım maliyetinin aylık net faydaya bölünmesiyle bulunur ve en az iki senaryo ile test edilir.",
            ],
        },
        {
            "heading": "Riskler ve önlemler",
            "paragraphs": [
                "Tüm modülleri tek seferde açmak, rol bazlı yetkiyi geciktirmek ve veri sahipliğini belirsiz bırakmak en sık görülen risklerdir.",
                "Bunları azaltmak için UAT onayı, kontrol listesi ve haftalık durum toplantısı standardize edilmelidir.",
            ],
        },
        {
            "heading": "Aksiyon listesi",
            "paragraphs": [
                "Başlangıçta mevcut süreci saat bazında ölçün, ardından pilot kapsamı ve kabul kriterlerini yazılı hale getirin.",
                "Canlıya geçiş sonrası panel KPI trendlerini aylık izleyip çeyreklik optimizasyon döngüsü çalıştırın.",
            ],
        },
    ]


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


def render_sections(sections: list[dict]) -> str:
    blocks = []
    for sec in sections:
        head = sanitize(sec.get("heading", "Başlık"))
        paragraphs = sec.get("paragraphs")
        if isinstance(paragraphs, list) and paragraphs:
            body = "".join(f"<p>{sanitize(str(p))}</p>" for p in paragraphs if str(p).strip())
        else:
            text = str(sec.get("text", "")).strip()
            if not text:
                continue
            body = f"<p>{sanitize(text)}</p>"

        if body:
            blocks.append(f"<h2>{head}</h2>{body}")
    return "\n".join(blocks)


def build_article_html(post: dict, base_url: str) -> str:
    title = post["title"].strip()
    excerpt = post["excerpt"].strip()
    category = post.get("category", "İK Rehberi").strip()
    publish_date = post["publish_date"]
    slug = post["slug"].strip()
    canonical = f"{base_url}/{slug}"
    keywords = post.get("keywords", [])
    keyword_line = ", ".join(keywords) if keywords else "İK yazılımı, insan kaynakları"

    sections = post.get("sections") or default_sections(post)
    section_html = render_sections(sections)
    if not section_html:
        section_html = render_sections(default_sections(post))

    word_count = len(excerpt.split()) + len(re.sub(r'<[^>]+>', '', section_html).split())
    reading_time = max(3, round(word_count / 200))

    tags = ""
    for kw in keywords[:5]:
        tags += f'\n      <span class="tag">{sanitize(kw)}</span>'

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
        "url": canonical,
        "mainEntityOfPage": canonical,
    }, ensure_ascii=False)

    breadcrumb_json = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Ana Sayfa",
             "item": "https://www.cadro.io/"},
            {"@type": "ListItem", "position": 2, "name": "Blog",
             "item": "https://www.cadro.io/blog.html"},
            {"@type": "ListItem", "position": 3, "name": title,
             "item": canonical},
        ],
    }, ensure_ascii=False)

    return f"""<!DOCTYPE html><html lang="tr" dir="ltr"><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>{sanitize(title)} | CADRO Blog</title>
<meta name="description" content="{sanitize(excerpt)}">
<meta name="keywords" content="{sanitize(keyword_line)}">
<link href="{sanitize(canonical)}" rel="canonical">
<link rel="alternate" hreflang="tr" href="{sanitize(canonical)}">
<link rel="alternate" hreflang="x-default" href="{sanitize(canonical)}">
<meta content="index, follow, max-image-preview:large" name="robots">
<meta content="article" property="og:type">
<meta content="{sanitize(title)} | CADRO Blog" property="og:title">
<meta content="{sanitize(excerpt)}" property="og:description">
<meta content="{sanitize(canonical)}" property="og:url">
<meta content="https://www.cadro.io/assets/screenshots/phase2/tr/dashboard.webp" property="og:image">
<meta content="summary_large_image" name="twitter:card">
<meta content="{sanitize(title)} | CADRO Blog" name="twitter:title">
<meta content="{sanitize(excerpt)}" name="twitter:description">
<meta content="https://www.cadro.io/assets/screenshots/phase2/tr/dashboard.webp" name="twitter:image">
<script type="application/ld+json">{article_json}</script>
<script type="application/ld+json">{breadcrumb_json}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="./styles.css" rel="stylesheet">
<style>{ARTICLE_CSS}</style>
<meta property="og:locale" content="tr_TR">
<meta name="google-site-verification" content="L40TNWo8QOpNjjkkh2WN2YZS4SjqOPeCrKisyNLR-YI">
<link rel="icon" href="./Cadro Logo.png" type="image/png">
<link rel="apple-touch-icon" href="./Cadro Logo.png">
</head>
<body data-page="article" dir="ltr">
<div class="site-shell">
<div class="top-logo"><img alt="CADRO" class="top-logo-img" src="./Cadro Logo.png"></div>
<header class="topbar">
<button aria-expanded="false" class="nav-toggle" data-i18n-key="nav_menu">Menü</button>
<nav class="nav">
<a data-i18n-key="nav_home" href="/">Ana Sayfa</a>
<a data-i18n-key="nav_software" href="ik-yazilimi.html">İK Yazılımı</a>
<a data-i18n-key="nav_solutions" href="/#solutions">Çözümler</a>
<a data-i18n-key="nav_compare" href="/#compare">Neden Cadro?</a>
<a data-i18n-key="nav_pricing" href="pricing.html">Fiyatlar</a>
<a href="blog.html">Blog</a>
</nav>
<div class="topbar-actions">
<select aria-label="Language" class="lang-switch" id="lang-switch">
<option value="tr" selected>TR</option>
<option value="en">EN</option>
<option value="de">DE</option>
<option value="ar">AR</option>
</select>
<a class="ghost-button" href="https://app.cadro.io" data-i18n-key="btn_login">Giriş Yap</a>
<a class="primary-button" href="pricing.html" data-i18n-key="btn_start_subscription">Aboneliğinizi Başlatın</a>
</div>
</header>
<main>
<div class="article-container">
  <div class="article-header">
    <nav aria-label="Breadcrumb" style="font-size:0.82rem;opacity:0.65;margin-bottom:16px;">
      <a href="/" style="color:inherit;">Ana Sayfa</a> &rsaquo; <a href="blog.html" style="color:inherit;">Blog</a> &rsaquo; {sanitize(title[:40])}
    </nav>
    <div class="article-meta">{sanitize(format_tr_date(publish_date))} &bull; {sanitize(category)} &bull; {reading_time} dk okuma</div>
    <h1 class="article-title">{sanitize(title)}</h1>
    <div class="tag-list">{tags}
    </div>
  </div>
  <div class="article-content">
    <p>{sanitize(excerpt)}</p>
    {section_html}
  </div>
  <div class="article-cta">
    <h2>İK Süreçlerinizi Dijitalleştirin</h2>
    <p>CADRO ile puantaj, izin, bordro ve İK süreçlerinizi tek platformda yönetin.</p>
    <a href="puantaj-ve-vardiya-yazilimi.html" class="primary-button" style="margin-right:12px;">Puantaj Modülünü Keşfet</a>
    <a href="pricing.html" class="ghost-button">14 Gün Ücretsiz Dene</a>
  </div>
  <div style="border-top:1px solid rgba(148,163,184,0.15);padding-top:24px;margin-top:16px;">
    <p style="font-size:0.85rem;opacity:0.6;margin-bottom:16px;">İlgili makaleler:</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
      <a href="makale-ik-dijital-donusum-2026.html" style="padding:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(148,163,184,0.12);border-radius:10px;text-decoration:none;color:inherit;font-size:0.88rem;font-weight:600;">İK Dijital Dönüşüm 2026 →</a>
      <a href="puantaj-ve-vardiya-yazilimi.html" style="padding:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(148,163,184,0.12);border-radius:10px;text-decoration:none;color:inherit;font-size:0.88rem;font-weight:600;">Puantaj &amp; Vardiya Yazılımı →</a>
      <a href="makale-ik-roi-hesaplama-formulu.html" style="padding:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(148,163,184,0.12);border-radius:10px;text-decoration:none;color:inherit;font-size:0.88rem;font-weight:600;">İK ROI Hesaplama →</a>
    </div>
  </div>
</div>
</main>
<footer class="footer">
<div>
<img alt="CADRO" class="brand-logo-img" src="./Cadro Logo.png">
<p data-i18n-key="footer_text">Şirketlerin insan kaynakları operasyonlarını hızlandıran ve kolaylaştıran modern bulut platformu.</p>
</div>
<p class="footer-copy" data-i18n-key="footer_copy">&copy; 2026 CADRO. Tüm hakları saklıdır.</p>
</footer>
</div>
<script src="./site-config.js"></script>
<script src="./page-content-tr.js"></script>

    <script src="../lang-all.js"></script><script src="./app.js"></script>
</body></html>"""


def build_card_html(post: dict) -> str:
    date_text = format_tr_date(post["publish_date"])
    category = sanitize(post.get("category", "İK Rehberi"))
    title = sanitize(post["title"])
    excerpt = sanitize(post["excerpt"])
    slug = sanitize(post["slug"])
    return (
        "\n"
        "            <article class=\"blog-card\" style=\"border-left: 4px solid var(--cyan);\">\n"
        f"              <div class=\"blog-meta\">{date_text} • {category}</div>\n"
        f"              <h3>{title}</h3>\n"
        f"              <p>{excerpt}</p>\n"
        f"              <a href=\"{slug}\" class=\"read-more\">Makaleyi Oku →</a>\n"
        "            </article>\n"
    )


def insert_card_into_blog(blog_path: Path, card_html: str, slug: str, dry_run: bool) -> bool:
    original = blog_path.read_text(encoding="utf-8")
    if f'href="{slug}"' in original:
        return False

    pattern = re.compile(
        rf"({re.escape(AUTO_START)})(.*)({re.escape(AUTO_END)})",
        flags=re.DOTALL,
    )
    match = pattern.search(original)
    if not match:
        raise RuntimeError("Auto markers not found in blog.html")

    before, block, after = match.groups()
    new_block = card_html + block
    updated = original[: match.start()] + before + new_block + after + original[match.end() :]

    if not dry_run:
        blog_path.write_text(updated, encoding="utf-8")
    return True


def update_sitemap(sitemap_path: Path, slug: str, date_iso: str, base_url: str, dry_run: bool) -> bool:
    content = sitemap_path.read_text(encoding="utf-8")
    loc = f"{base_url}/{slug}"
    if loc in content:
        return False

    url_block = (
        "\n  <url>\n"
        f"    <loc>{loc}</loc>\n"
        f"    <lastmod>{date_iso}</lastmod>\n"
        "    <changefreq>monthly</changefreq>\n"
        "    <priority>0.72</priority>\n"
        "  </url>\n"
    )

    updated = content.replace("</urlset>", url_block + "</urlset>")
    if not dry_run:
        sitemap_path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    schedule_path = (root / args.schedule).resolve()
    blog_path = root / "blog.html"
    sitemap_path = root / "sitemap.xml"

    run_date = dt.date.fromisoformat(args.date)
    queue = load_json(schedule_path)

    due_posts = [
        p
        for p in queue
        if not p.get("published") and dt.date.fromisoformat(p["publish_date"]) <= run_date
    ]
    due_posts = sorted(due_posts, key=lambda p: p["publish_date"])[: max(args.max_per_run, 1)]

    if not due_posts:
        print("No due posts to publish.")
        return 0

    published_count = 0
    for post in due_posts:
        slug = post["slug"].strip()
        article_path = root / slug

        if not article_path.exists():
            article_html = build_article_html(post, args.base_url)
            if not args.dry_run:
                article_path.write_text(article_html, encoding="utf-8")
            print(f"Created article: {slug}")
        else:
            print(f"Article already exists: {slug}")

        card_added = insert_card_into_blog(blog_path, build_card_html(post), slug, args.dry_run)
        if card_added:
            print(f"Inserted blog card: {slug}")
        else:
            print(f"Blog card already exists: {slug}")

        sitemap_added = update_sitemap(sitemap_path, slug, post["publish_date"], args.base_url, args.dry_run)
        if sitemap_added:
            print(f"Added sitemap url: {slug}")
        else:
            print(f"Sitemap url already exists: {slug}")

        post["published"] = True
        post["published_at"] = run_date.isoformat()
        published_count += 1

    if not args.dry_run:
        save_json(schedule_path, queue)

    print(f"Published posts in this run: {published_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
