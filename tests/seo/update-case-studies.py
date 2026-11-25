from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
cases = ['vaka-calismasi-uretim-devi.html','vaka-calismasi-danismanlik.html','vaka-calismasi-tech-startup.html','vaka-calismasi-saglik.html','vaka-calismasi-perakende.html','vaka-calismasi-lojistik.html','vaka-calismasi-egitim.html']

for name in cases:
    file = ROOT / name
    html = file.read_text(encoding='utf-8')
    # remove any existing product outcome claim tone in hero description
    # replace entire <section class="case-hero"> content with scenario disclaimer
    start = html.index('<section class="case-hero">')
    end = html.index('</section>', start)
    assert start >= 0 and end > start
    hero = html[start:end]
    # keep the breadcrumbs and industry badge untouched; replace h1 + p with scenario phrasing
    h1_match = re.search(r'<h1>(.*?)</h1>', hero)
    if not h1_match:
        raise RuntimeError(f'No h1 in case hero for {name}')
    original_h1 = h1_match.group(1)
    desc_match = re.search(r'(?<=</h1>)\s*<p>(.*?)</p>', hero, re.DOTALL)
    if not desc_match:
        raise RuntimeError(f'No description p in case hero for {name}')
    new_h1 = original_h1.replace('Vaka', 'Kullanım Senaryosu').replace('Büyük Ölçekli','').replace('Proje Bazlı','').replace('Hızlı Büyüyen Teknoloji','Teknoloji').replace('Sağlık Hizmetleri','Sağlık').replace('Perakende','Perakende').replace('Lojistik','Lojistik').replace('Eğitim','Eğitim')
    if len(new_h1) > 140:
        new_h1 = 'CADRO İKYS için ' + name.split('-')[2] + ' sektörü kullanım senaryosu'
    scenario = '<p>Bu sayfa, belirli bir müşterinin ölçülmüş dönem sonuçlarını değil, CADRO İKYS modüllerinin nasıl kullanılabileceğine dair örnek bir senaryoyu anlatır. Gerçek müşteri adı, baseline, dönem ve ölçüm içermez.</p>'
    new_hero = hero.replace(original_h1, new_h1).replace(desc_match.group(1), scenario[3:-4])
    html = html[:start] + new_hero + html[end:]
    # soften the result wording: it must not promise that "güçlü" or measured outcome was achieved
    result_match = re.search(r'<h2>Sonuç</h2>\s*<p>(.*?)</p>', html, re.DOTALL)
    if result_match:
        original_result = result_match.group(1)
        new_result = original_result.replace('sağlandı', 'hedeflenmiştir').replace('güçlü', '').replace('daha güçlü', '').replace('İK operasyonları yalnızca daha hızlı değil,', 'Bu senaryoda İK süreçlerinin görünürlüğü bir adım ileri taşınırken,')
        html = html.replace(original_result, new_result)
    # remove old "Vaka Çalışması" phrasing from breadcrumb text
    html = html.replace('Vaka Çalışmaları', 'Kullanım Senaryoları')
    file.write_text(html, encoding='utf-8')
    print(f'Updated {name}')