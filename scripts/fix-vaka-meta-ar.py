import re, os

base = "/Users/turgaybozkus/Desktop/html/ar"

replacements = {
    "vaka-calismasi-tech-startup.html": {
        "title": "دراسة حالة شركة تقنية ناشئة | توسيع عمليات الموارد البشرية | CADRO",
        "desc": "اكتشف كيف استخدمت شركة تقنية ناشئة نظام إدارة الموارد البشرية من CADRO لتحسين التوظيف والتهيئة وإدارة الموظفين والأداء."
    },
    "vaka-calismasi-perakende.html": {
        "title": "دراسة حالة قطاع التجزئة | نظام الحضور والانصراف لأكثر من 2000 موظف | CADRO",
        "desc": "تعرف على كيفية استخدام نظام إدارة الموارد البشرية من CADRO لإدارة الحضور والانصراف والإجازات وتتبع الموظفين في قطاع التجزئة متعدد الفروع."
    },
    "vaka-calismasi-saglik.html": {
        "title": "دراسة حالة الرعاية الصحية | الملف الوظيفي الرقمي وامتثال الموارد البشرية | CADRO",
        "desc": "اكتشف كيف يدعم نظام إدارة الموارد البشرية من CADRO المؤسسات الصحية عبر الملفات الوظيفية الرقمية وإدارة مستندات الموظفين."
    },
    "vaka-calismasi-egitim.html": {
        "title": "دراسة حالة التعليم | أداء المعلمين ومتابعة التطوير | CADRO",
        "desc": "اكتشف كيف يدعم نظام إدارة الموارد البشرية من CADRO إدارة التدريب الداخلي وتتبع الحضور والتقارير عبر نظام تعلم مؤسسي."
    },
    "vaka-calismasi-lojistik.html": {
        "title": "دراسة حالة اللوجستيات | تتبع الحضور والورديات الميدانية | CADRO",
        "desc": "تعرف على كيفية دعم نظام إدارة الموارد البشرية من CADRO لفرق اللوجستيات عبر تتبع الحضور والتحقق من الموقع في العمليات الميدانية."
    },
    "vaka-calismasi-uretim-devi.html": {
        "title": "دراسة حالة التصنيع | التوفير والتحكم في العمليات متعددة المستويات | CADRO",
        "desc": "اكتشف كيف يساعد نظام إدارة الموارد البشرية من CADRO شركات التصنيع الكبيرة على ربط إدارة الموظفين والورديات والإجازات والمصروفات."
    },
    "vaka-calismasi-danismanlik.html": {
        "title": "دراسة حالة الاستشارات | إدارة الخبراء ومعايير العمليات | CADRO",
        "desc": "تعرف على كيفية دعم نظام إدارة الموارد البشرية من CADRO لشركات الاستشارات عبر تتبع OKR وإدارة الأداء والمواهب."
    }
}

for fname, meta in replacements.items():
    fpath = os.path.join(base, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        html = f.read()
    
    # Replace <title>...</title>
    html = re.sub(r'<title>[^<]+</title>', f'<title>{meta["title"]}</title>', html)
    # Replace meta description
    html = re.sub(r'<meta name="description" content="[^"]+">',
                  f'<meta name="description" content="{meta["desc"]}">', html)
    # Replace og:title
    html = re.sub(r'<meta property="og:title" content="[^"]+">',
                  f'<meta property="og:title" content="{meta["title"]}">', html)
    # Replace og:description
    html = re.sub(r'<meta property="og:description" content="[^"]+">',
                  f'<meta property="og:description" content="{meta["desc"]}">', html)
    # Replace twitter:title
    html = re.sub(r'<meta name="twitter:title" content="[^"]+">',
                  f'<meta name="twitter:title" content="{meta["title"]}">', html)
    # Replace twitter:description
    html = re.sub(r'<meta name="twitter:description" content="[^"]+">',
                  f'<meta name="twitter:description" content="{meta["desc"]}">', html)
    
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"✓ {fname}")

print("Done!")
