import json, re, os
from pathlib import Path
from datetime import datetime, timezone

root = Path("/var/www/html")
langs = [("tr", root, ""), ("en", root / "en", "../"), ("de", root / "de", "../"), ("ar", root / "ar", "../")]

for lang, folder, prefix in langs:
    blog_path = folder / "blog.html"
    if not blog_path.exists():
        continue

    text = blog_path.read_text(encoding="utf-8")
    articles = sorted(folder.glob("makale-*.html")) + sorted(folder.glob("vaka-calismasi-*.html"))

    items = []
    for art in articles:
        slug = art.name.replace(".html", "")
        html = art.read_text(encoding="utf-8")
        m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
        if not m:
            m = re.search(r'<title>(.*?)</title>', html, re.DOTALL)
        title = m.group(1) if m else slug
        title = re.sub(r'<[^>]+>', '', title).strip()
        url = f"https://www.cadro.io/{prefix}{slug}"
        items.append({"@type": "ListItem", "position": len(items) + 1, "url": url, "name": title})

    label = "Contents" if lang != "tr" else "Icerikleri"
    new_blog_json = json.dumps({
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": f"CADRO Blog | {folder.name.upper() if lang != 'tr' else 'TR'} Blog",
        "description": f"CADRO Blog - {folder.name.upper() if lang != 'tr' else 'TR'}",
        "url": f"https://www.cadro.io/{prefix}blog.html",
        "inLanguage": lang
    }, ensure_ascii=False)

    new_itemlist_json = json.dumps({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": f"CADRO Blog {label}",
        "itemListElement": items
    }, ensure_ascii=False)

    new_breadcrumb_json = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Ana Sayfa" if lang == "tr" else ("Home" if lang == "en" else ("Startseite" if lang == "de" else "الرئيسية")), "item": f"https://www.cadro.io/{'en/' if lang == 'en' else 'de/' if lang == 'de' else 'ar/' if lang == 'ar' else ''}"},
            {"@type": "ListItem", "position": 2, "name": "Blog", "item": f"https://www.cadro.io/{prefix}blog.html"}
        ]
    }, ensure_ascii=False)

    # Replace JSON-LD blocks
    pattern = r"<script[^>]*type=\"application/ld\+json\"[^>]*>(.*?)</script>"

    def replace_jsonld(m):
        block = m.group(1)
        if '"@type":"Blog"' in block or '"@type": "Blog"' in block or '"@type":"CollectionPage"' in block:
            return f'<script type="application/ld+json">{new_blog_json}</script>'
        elif '"@type":"ItemList"' in block or '"@type": "ItemList"' in block:
            return f'<script type="application/ld+json">{new_itemlist_json}</script>'
        elif '"@type":"BreadcrumbList"' in block or '"@type": "BreadcrumbList"' in block:
            return f'<script type="application/ld+json">{new_breadcrumb_json}</script>'
        return m.group(0)

    updated = re.sub(pattern, replace_jsonld, text, flags=re.DOTALL)
    blog_path.write_text(updated, encoding="utf-8")
    print(f"{lang}: {len(items)} articles in ItemList")

print("\nDone")
