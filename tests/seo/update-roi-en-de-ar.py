from pathlib import Path
import re, json

ROOT = Path(__file__).resolve().parents[2]
# Use the TR page as the canonical source for the open scenario form and evidence boundary.
tr = (ROOT / 'ik-roi-hesaplama.html').read_text(encoding='utf-8')
main_match = re.search(r'<main\b[^>]*\bid="main-content"[^>]*>', tr)
if not main_match: raise RuntimeError('TR main not found')
end = tr.index('</main>', main_match.start()) + len('</main>')
main = tr[main_match.start():end] # preserve data-i18n-skip

lang_text = {
    'en': {
        'title': 'HR ROI Scenario Calculator | Open Formula and Assumptions | CADRO',
        'desc': 'Build your own HR ROI scenario with viewed hours, rates, hiring days and plan cost. No external benchmarks are assumed.',
        'keywords': 'HR ROI scenario calculator, HR ROI estimator, HR investment return',
        'application_desc': 'HR ROI scenario tool with user‑defined hours, rates, hiring assumptions and plan cost.',
        'badge': 'Open scenario tool',
        'h1': 'HR software ROI scenario: define your own inputs',
        'lead': 'Enter hours, rates, hiring timelines and plan cost. This calculation does not claim CADRO customer results or industry averages.',
        'legal': 'Important limitation: this tool only shows the arithmetic result of your inputs. The provided sample values are not external research, CADRO customer outcomes or price quotes. Use your own measurements and your current contract cost.',
        'form_title1': '1. Workforce assumptions',
        'hr_count': 'Number of HR/admin staff',
        'manual_hours': 'Weekly manual work hours per person',
        'automation_rate': 'Assumed reduction rate (%)',
        'automation_hint': 'Example scenario; not a research result.',
        'workweeks': 'Weeks worked per year',
        'salary': 'Monthly gross HR salary (TRY)',
        'hourly_cost': 'Hourly cost (TRY)',
        'derive': 'Use gross ÷ 176 hours',
        'form_title2': '2. Hiring assumptions',
        'hire_count': 'Annual hires',
        'days_before': 'Previous days per position',
        'days_after': 'New days per position',
        'vacancy_cost': 'Assumed daily cost of an open position (TRY)',
        'vacancy_hint': 'Leave at zero to exclude hiring benefit.',
        'form_title3': '3. Plan cost',
        'plan_cost': 'Monthly plan cost (TRY)',
        'plan_hint': 'Must be greater than zero. Enter your actual offer/invoice amount from the <a href="pricing.html">pricing page or your quote</a>. No result is shown without a cost.',
        'input_error': 'All inputs must be valid numbers in range. Enter a monthly cost greater than zero for a payback calculation.',
        'days_error': 'New hiring days must not exceed previous days.',
        'result_title': 'Scenario result',
        'formula_title': 'Formula, source and limitations',
        'formula_list': ['<li>Annual labour benefit = staff × weekly hours × reduction rate × work weeks × hourly cost.</li>', '<li>Annual hiring benefit = hires × (previous days − new days) × vacancy day cost.</li>', '<li>Annual net = total two benefits − (12 × monthly plan cost).</li>', '<li>Payback = annual cost ÷ (annual total gross benefit ÷ 12).</li>', '<li>ROI = annual net benefit ÷ annual cost × 100. No ratio is shown with zero cost.</li>'],
        'formula_note': 'The formula is a simplification: wage increases, tax, financial discounting, employee departures/reductions, product licensing status and real productivity transformation are not included. The result is not a guarantee, tax advice or customer proof.',
    },
    'de': {
        'title': 'HR-ROI-Szenariorechner | Offene Formel und Annahmen | CADRO',
        'desc': 'Erstellen Sie Ihr eigenes HR-ROI-Szenario mit Arbeitsstunden, Raten, Einstellungstagen und Plankosten. Keine externen Benchmarks.',
        'keywords': 'HR ROI Szenario Rechner, HR ROI schätzen, HR Investitionsrendite',
        'application_desc': 'HR-ROI-Szenariotool mit benutzerdefinierten Stunden, Raten, Einstellungsannahmen und Plankosten.',
        'badge': 'Offenes Szenario-Tool',
        'h1': 'HR-Software-ROI-Szenario: Ihre eigenen Eingaben',
        'lead': 'Geben Sie Stunden, Raten, Einstellungszeiträume und Plankosten ein. Diese Berechnung behauptet keine CADRO-Kundenergebnisse oder Branchendurchschnitte.',
        'legal': 'Wichtige Einschränkung: Dieses Tool zeigt nur das arithmetische Ergebnis Ihrer Eingaben. Die bereitgestellten Beispielwerte sind keine externe Forschung, CADRO-Kundenergebnisse oder Preisangebote. Verwenden Sie Ihre eigenen Messungen und Ihre aktuellen Vertragskosten.',
        'form_title1': '1. Personaleinsatz-Annahmen',
        'hr_count': 'Anzahl HR-/Verwaltungspersonal',
        'manual_hours': 'Wöchentliche manuelle Arbeitsstunden pro Person',
        'automation_rate': 'Angenommene Reduktionsrate (%)',
        'automation_hint': 'Beispielszenario; kein Forschungsergebnis.',
        'workweeks': 'Arbeitswochen pro Jahr',
        'salary': 'Monatliches Bruttogehalt HR (TRY)',
        'hourly_cost': 'Stundensatz (TRY)',
        'derive': 'Brutto ÷ 176 Stunden verwenden',
        'form_title2': '2. Einstellungsannahmen',
        'hire_count': 'Jährliche Einstellungen',
        'days_before': 'Bisherige Tage pro Position',
        'days_after': 'Neue Tage pro Position',
        'vacancy_cost': 'Angenommene Tageskosten einer offenen Stelle (TRY)',
        'vacancy_hint': 'Null belassen, um den Einstellungsvorteil auszuschließen.',
        'form_title3': '3. Plankosten',
        'plan_cost': 'Monatliche Plankosten (TRY)',
        'plan_hint': 'Muss größer als null sein. Geben Sie Ihren tatsächlichen Angebots-/Rechnungsbetrag von der <a href="pricing.html">Preisseite oder Ihrem Angebot</a> ein. Ohne Kosten wird kein Ergebnis angezeigt.',
        'input_error': 'Alle Eingaben müssen gültige Zahlen im Bereich sein. Geben Sie monatliche Kosten größer als null für eine Amortisationsberechnung ein.',
        'days_error': 'Neue Einstellungstage dürfen die bisherigen Tage nicht übersteigen.',
        'result_title': 'Szenario-Ergebnis',
        'formula_title': 'Formel, Quelle und Einschränkungen',
        'formula_list': ['<li>Jährlicher Personalkostenvorteil = Personal × Wochenstunden × Reduktionsrate × Arbeitswochen × Stundensatz.</li>', '<li>Jährlicher Einstellungsvorteil = Einstellungen × (bisherige Tage − neue Tage) × Tageskosten der offenen Stelle.</li>', '<li>Jährlich netto = Summe beider Vorteile − (12 × monatliche Plankosten).</li>', '<li>Amortisation = jährliche Kosten ÷ (jährlicher Bruttovorteil ÷ 12).</li>', '<li>ROI = jährlicher Nettovorteil ÷ jährliche Kosten × 100. Ohne Kosten wird keine Quote angezeigt.</li>'],
        'formula_note': 'Die Formel ist eine Vereinfachung: Gehaltserhöhungen, Steuern, finanzielle Diskontierung, Personalabgänge, Produktlizenzstatus und echte Produktivitätstransformation sind nicht enthalten. Das Ergebnis ist keine Garantie, Steuerberatung oder Kundenbestätigung.',
    },
    'ar': {
        'title': 'حاسبة سيناريو عائد استثمار الموارد البشرية | صيغة وافتراضات مفتوحة | CADRO',
        'desc': 'أنشئ سيناريو عائد الاستثمار الخاص بك باستخدام الساعات والمعدلات وأيام التوظيف وتكلفة الخطة. لا يتم افتراض أي معايير خارجية.',
        'keywords': 'حاسبة سيناريو عائد استثمار الموارد البشرية، تقدير عائد استثمار الموارد البشرية',
        'application_desc': 'أداة سيناريو عائد استثمار الموارد البشرية مع ساعات ومعدلات وافتراضات توظيف وتكلفة خطة محددة من المستخدم.',
        'badge': 'أداة سيناريو مفتوح',
        'h1': 'سيناريو عائد استثمار برامج الموارد البشرية: حدد مدخلاتك',
        'lead': 'أدخل الساعات والمعدلات والجداول الزمنية للتوظيف وتكلفة الخطة. لا تدعي هذه العملية الحسابية نتائج عملاء CADRO أو متوسطات الصناعة.',
        'legal': 'قيود مهمة: تعرض هذه الأداة فقط النتيجة الحسابية لمدخلاتك. القيم النموذجية المقدمة ليست بحثاً خارجياً أو نتائج عملاء CADRO أو عروض أسعار. استخدم قياساتك الخاصة وتكلفة عقدك الحالية.',
        'form_title1': '1. افتراضات القوى العاملة',
        'hr_count': 'عدد موظفي الموارد البشرية / الإداريين',
        'manual_hours': 'ساعات العمل اليدوي الأسبوعية لكل شخص',
        'automation_rate': 'معدل التخفيض المفترض (%)',
        'automation_hint': 'سيناريو مثال؛ ليس نتيجة بحث.',
        'workweeks': 'أسابيع العمل في السنة',
        'salary': 'الراتب الإجمالي الشهري للموارد البشرية (ليرة تركية)',
        'hourly_cost': 'التكلفة بالساعة (ليرة تركية)',
        'derive': 'استخدم الإجمالي ÷ 176 ساعة',
        'form_title2': '2. افتراضات التوظيف',
        'hire_count': 'التوظيف السنوي',
        'days_before': 'الأيام السابقة لكل منصب',
        'days_after': 'الأيام الجديدة لكل منصب',
        'vacancy_cost': 'التكلفة اليومية المفترضة للمنصب الشاغر (ليرة تركية)',
        'vacancy_hint': 'اتركه صفراً لاستبعاد فائدة التوظيف.',
        'form_title3': '3. تكلفة الخطة',
        'plan_cost': 'تكلفة الخطة الشهرية (ليرة تركية)',
        'plan_hint': 'يجب أن تكون أكبر من الصفر. أدخل مبلغ العرض/الفاتورة الفعلي من <a href="pricing.html">صفحة الأسعار أو عرضك</a>. لا تظهر نتيجة بدون تكلفة.',
        'input_error': 'يجب أن تكون جميع المدخلات أرقاماً صالحة ضمن النطاق. أدخل تكلفة شهرية أكبر من الصفر لحساب الاسترداد.',
        'days_error': 'يجب ألا تتجاوز أيام التوظيف الجديدة الأيام السابقة.',
        'result_title': 'نتيجة السيناريو',
        'formula_title': 'المعادلة والمصدر والقيود',
        'formula_list': ['<li>الفائدة السنوية للقوى العاملة = الموظفون × الساعات الأسبوعية × معدل التخفيض × أسابيع العمل × التكلفة بالساعة.</li>', '<li>الفائدة السنوية للتوظيف = عدد التوظيف × (الأيام السابقة − الأيام الجديدة) × تكلفة اليوم الشاغر.</li>', '<li>الصافي السنوي = مجموع الفائدتين − (12 × تكلفة الخطة الشهرية).</li>', '<li>الاسترداد = التكلفة السنوية ÷ (إجمالي الفائدة السنوية ÷ 12).</li>', '<li>عائد الاستثمار = صافي الفائدة السنوية ÷ التكلفة السنوية × 100. لا تظهر نسبة بدون تكلفة.</li>'],
        'formula_note': 'المعادلة مبسطة: لا تشمل زيادات الرواتب أو الضرائب أو الخصم المالي أو مغادرة الموظفين أو حالة ترخيص المنتج أو التحول الحقيقي في الإنتاجية. النتيجة ليست ضماناً أو استشارة ضريبية أو دليلاً على نتائج العملاء.',
    },
}

for lang, name in [('en','en/hr-roi-calculator.html'),('de','de/hr-roi-rechner.html'),('ar','ar/hasb-ayd-hr.html')]:
    file = ROOT / name
    html = file.read_text(encoding='utf-8')
    t = lang_text[lang]
    m = main
    m = m.replace('id="roi-form"', 'id="roi-form"')
    for old, new in [
        ('Açık senaryo aracı', t['badge']),
        ('İK yazılımı ROI senaryosu: girdilerinizi siz belirleyin', t['h1']),
        ('Saat, oran, işe alım süreleri ve plan maliyetini girin. Hesap, CADRO müşterilerinin kazanımını veya genel sektör ortalamasını iddia etmez.', t['lead']),
        ('Bu araç yalnız girdiğiniz varsayımların aritmetik sonucunu gösterir. Sağlanan örnek başlangıç değerleri dış araştırma, CADRO müşteri sonuçları veya fiyat teklifi değildir. Kendi ölçümlerinizi ve güncel sözleşme maliyetini kullanın.', t['legal']),
        ('Örnek senaryo; araştırma sonucu değildir.', t['automation_hint']),
        ('Sıfır bırakılırsa işe alım faydası eklenmez.', t['vacancy_hint']),
        ('Gerçek teklif/fatura bedeli 0’dan büyük olmalıdır. Fiyatı fiyat sayfasından veya teklifinizden girmeden sonuç gösterilmez.', t['plan_hint']),
        ('Tüm girdiler geçerli aralıklarda sayı olmalıdır. Geri dönüş hesabı için sıfırdan büyük aylık maliyet girin.', t['input_error']),
        ('Yeni işe alım süresi eski süreyi aşamaz; azalma negatif olamaz.', t['days_error']),
        ('Formül basitleştirme tercihidir: ücret artışları, vergi, finansal iskonto, işten çıkarma/eleman azaltımı, ürün lisans durumu ve gerçek üretkenlik dönüşümü hesaba katılmaz. Sonuç taahhüt, vergi danışmanlığı veya müşteri kanıtı değildir.', t['formula_note']),
    ]:
        m = m.replace(old, new)
    m = m.replace('</label>', '</label>').replace('<br>', ' ')  # ensure no structural break
    new_main = re.sub(r'<main\b[^>]*\bid="main-content"[^>]*>', r'<main id="main-content" data-i18n-skip="true">', m, count=1)
    start = html.index('<main id="main-content"')
    end = html.index('</main>', start) + len('</main>')
    updated = html[:start] + new_main + html[end:]
    updated = updated.replace('<title>' + ('İK ROI Senaryo Hesaplama | Açık Formül ve Varsayımlar | CADRO' if lang == 'tr' else re.search(r'<title>(.*?)</title>', html).group(1)),
                              '<title>' + t['title'])
    updated = re.sub(r'<meta\s+name="description"\s+content="[^"]*"\s*>', f'<meta name="description" content="{t["desc"]}">', updated)
    updated = re.sub(r'<meta\s+name="keywords"\s+content="[^"]*"\s*>', f'<meta name="keywords" content="{t["keywords"]}">', updated)
    updated = re.sub(r'"description":"[^"]*"', f'"description":"{t["application_desc"]}"', updated)
    updated = re.sub(r'<script>\s*\/\/.*?ROI.*?[\s\S]*?<\/script>', '', updated)
    updated = re.sub(r'<script type="application\/ld\+json">\{"@context":"https://schema\.org","@type":"FAQPage"[\s\S]*?<\/script>', '', updated)
    if '<script src="../hr-roi-calculator.js" defer></script>' not in updated:
        updated = updated.replace('<script src="../app.min.js"', '<script src="../hr-roi-calculator.js" defer></script>\n<script src="../app.min.js"')
    file.write_text(updated, encoding='utf-8')
    print(f'Updated {name}')