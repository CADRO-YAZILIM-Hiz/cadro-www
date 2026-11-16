import fs from 'node:fs';
import path from 'node:path';

// Generate with: node tests/seo/legacy-redirects.mjs --write-server-rules
export function legacyRedirectBlock(server) {
  if (server === 'apache') {
    return Object.entries(extraLegacyRedirects)
      .map(([source, target]) => `Redirect 301 ${source} ${target}`)
      .join('\n');
  }
  if (server === 'nginx') {
    return Object.entries(extraLegacyRedirects)
      .map(([source, target]) => `    rewrite ^${source.replaceAll('.', '\\.')}$ ${target} permanent;`)
      .join('\n');
  }
  throw new Error(`Unknown server: ${server}`);
}

// Historical URLs explicitly reported by GSC, including malformed legacy slugs.
// These indicate old page identities, not new families of public URLs.
export const extraLegacyRedirects = {
  '/Artikel-2026-sgk-tavan-taban.html': '/makale-2026-sgk-tavan-taban.html',
  '/Artikel-Digital-ozluk-donusu-suresi.html': '/makale-dijital-ozluk-donusu-suresi.html',
  '/Artikel-HR-Digital-donusum-2026.html': '/makale-ik-dijital-donusum-2026.html',
  '/Artikel-HR-Berichterstattung-dashboard-kurgusu.html': '/makale-ik-raporlama-dashboard-kurgusu.html',
  '/Artikel-HR-analitigi-Berichterstattung-sHR-hatalar.html': '/makale-ik-analitigi-raporlama-sik-hatalar.html',
  '/Artikel-HR-analitigi-12-kpi.html': '/makale-ik-analitigi-12-kpi.html',
  '/Artikel-HR-yazilimi-2026-trendler.html': '/makale-ik-yazilimi-2026-trendler.html',
  '/Artikel-HR-yazilimi-Implementierung-takvimi-90-gun.html': '/makale-ik-yazilimi-uygulama-takvimi-90-gun.html',
  '/Artikel-HR-yazilimi-karsilasma-2026.html': '/makale-ik-yazilimi-karsilastirma-2026.html',
  '/Artikel-KMU-icin-HR-programi.html': '/makale-kobi-icin-ik-programi.html',
  '/Artikel-Leistung-ve-prim-modeli.html': '/makale-performans-ve-prim-modeli.html',
  '/Artikel-Leistung-yonetimi-okr-modeli.html': '/makale-performans-yonetimi-okr-modeli.html',
  '/Artikel-Lohnabrechnung-yazilimi-entegrasyon-listesi.html': '/makale-bordro-yazilimi-entegrasyon-listesi.html',
  '/Artikel-Lohnabrechnung-yazilimi-wie-secilir.html': '/makale-bordro-yazilimi-nasil-secilir.html',
  '/Artikel-ai-ve-kvkk-uyumu.html': '/makale-ai-ve-kvkk-uyumu.html',
  '/Artikel-esnek-calisma-saat-2026.html': '/makale-esnek-calisma-saatleri-2026.html',
  '/Artikel-excel-Lohnabrechnung-sizintilari.html': '/makale-excel-bordro-sizintilari.html',
  '/Artikel-hr-yazilimi-global-lokal-fark.html': '/makale-hr-yazilimi-global-lokal-fark.html',
  '/Artikel-insan-kaynaklari-yazilimi-kvkk-kontrol-listesi.html': '/makale-insan-kaynaklari-yazilimi-kvkk-kontrol-listesi.html',
  '/Artikel-ise-alim-sureci-kpi-metrHRleri.html': '/makale-ise-alim-sureci-kpi-metrikleri.html',
  '/Artikel-ise-alim-yazilimi-aday-Erfahrung.html': '/makale-ise-alim-yazilimi-aday-deneyimi.html',
  '/Artikel-ise-alim-yazilimi-ats-kontrol-listesi.html': '/makale-ise-alim-yazilimi-ats-kontrol-listesi.html',
  '/Artikel-izin-yonetimi-hatalari.html': '/makale-izin-yonetimi-hatalari.html',
  '/Artikel-onboarding-Digitallesme.html': '/makale-onboarding-dijitallestirme.html',
  '/Artikel-pdks-ile-Lohnabrechnung-Integration.html': '/makale-pdks-ile-bordro-entegrasyonu.html',
  '/Artikel-pdks-secim-kriterleri.html': '/makale-pdks-secim-kriterleri.html',
  '/Artikel-pdks-ve-uzaktan-calisma-yonetimi.html': '/makale-pdks-ve-uzaktan-calisma-yonetimi.html',
  '/Artikel-personel-takip-programi-kurulum-Leitfaden.html': '/makale-personel-takip-programi-kurulum-rehberi.html',
  '/Artikel-predHRtif-HR.html': '/makale-prediktif-ik.html',
  '/Artikel-sessiz-istifa-Kosten.html': '/makale-sessiz-istifa-maliyeti.html',
  '/Artikel-turnover-dusurme-yollari.html': '/makale-turnover-dusurme-yollari.html',
  '/Artikel-ucret-degerlendirme-ve-piyasa-karsilasmasi.html': '/makale-ucret-degerlendirme-ve-piyasa-karsilastirmasi.html',
  '/Artikel-yillHR-Leistung-degerlendirme.html': '/makale-yillik-performans-degerlendirme.html',
  '/article-hr-roi-calculation-formula.html': '/en/article-hr-roi-calculation-formula.html',
  '/article-hr-roi-calculation-scenarios.html': '/en/article-hr-roi-calculation-scenarios.html',
  '/ar/article-hr-roi-calculation-scenarios.html': '/ar/mqal-synarywhat-ayd-hr.html',
  '/ar/bordro-maliyet-Calculatema.html': '/ar/hasb-tklf-rwatb.html',
  '/ar/ik-roi-Calculatema.html': '/ar/hasb-ayd-hr.html',
  '/ar/makale-ik-roi-Calculatema-formulu.html': '/ar/mqal-madt-hsab-ayd-hr.html',
  '/ar/makale-ik-roi-Calculatema-ornek-senaryolar.html': '/ar/mqal-synarywhat-ayd-hr.html',
  '/ar/makale-prediktif-ik-sadakat-2026.html': '/ar/mqal-hr-tnby-wla-2026.html',
  '/ar/mqal-mshrat-ada-msar-twzyf.html': '/ar/mqal-mshrat-ada-msar-altwzyf.html',
  '/ar/mqal-thyzt-khwaryzmyat-al-twzyf.html': '/ar/mqal-thyzt-khwaryzmyat-altwzyf.html',
  '/ar/makale-yonetici-ai-adaptasyon-2026.html': '/ar/mqal-tkyf-mdra-ma-ai-2026.html',
  '/ar/makale-onboarding-dijitallestirme.html': '/ar/mqal-rqmn-tahym-mwzfy.html',
  '/ar/makale-pdks-ve-uzaktan-calisma-yonetimi.html': '/ar/mqal-pdks-adart-ml-bd.html',
  '/ar/makale-ik-yazilimi-2026-trendler.html': '/ar/mqal-atjahat-brnamj-hr-2026.html',
  '/ar/makale-ise-alimda-ai-etik.html': '/ar/mqal-akhlqyat-ai-twzyf.html',
  '/ar/asgari-ucret-Calculatema.html': '/ar/hasb-ajr.html',
  '/ar/ik-roi-Berechnenma.html': '/ar/hasb-ayd-hr.html',
  '/de/article-hr-software-pricing-model.html': '/de/artikel-hr-software-preismodell.html',
  '/de/article-hr-software-selection-guide-2026.html': '/de/artikel-hr-software-auswahl-2026.html',
  '/de/article-hr-roi-calculation-scenarios.html': '/de/artikel-hr-roi-szenarien.html',
  '/de/makale-yonetici-ai-adaptasyon-2026.html': '/de/artikel-fuehrungskraft-ki-anpassung-2026.html',
  '/de/makale-prediktif-ik-sadakat-2026.html': '/de/artikel-praediktive-hr-mitarbeiterbindung-2026.html',
  '/de/asgari-ucret-Berechnung.html': '/de/mindestlohn-rechner.html',
  '/de/ik-roi-Berechnenma.html': '/de/hr-roi-rechner.html',
  '/de/sgk-prim-Berechnenma.html': '/de/sozialversicherung-rechner.html',
  '/de/sgk-prim-Berechnung.html': '/de/sozialversicherung-rechner.html',
  '/de/kidem-tazminati-Berechnenma.html': '/de/abfindungsrechner.html',
  '/de/asgari-ucret-Berechnenma.html': '/de/mindestlohn-rechner.html',
  '/de/net-brut-maas-Berechnenma.html': '/de/brutto-netto-rechner.html',
  '/de/makale-ik-yazilimi-2026-trendler.html': '/de/artikel-hr-software-2026-trends.html',
  '/de/makale-onboarding-dijitallestirme.html': '/de/artikel-onboarding-digitalisierung.html',
  '/de/attendance-shift-software.html': '/en/attendance-shift-software.html',
  '/de/artikel-2026-mstlohn-netto.html': '/de/artikel-2026-mindestlohn-netto.html',
  '/de/artikel-2026-sozialandrsicherung-grenze.html': '/de/artikel-2026-sozialversicherung-grenze.html',
  '/de/artikel-ki-und-generatiand-ki.html': '/de/artikel-ki-und-generative-ki.html',
  '/de/artikel-praedHRtive-hr.html': '/de/artikel-praediktive-hr.html',
  '/de/artikel-praediktiand-hr.html': '/de/artikel-praediktive-hr.html',
  '/de/artikel-recruiting-kpi-metrHRen.html': '/de/artikel-recruiting-kpi-metriken.html',
  '/de/asgari-ucret-Calculatema.html': '/de/mindestlohn-rechner.html',
  '/de/bordro-maliyet-Berechnenma.html': '/de/lohnkosten-rechner.html',
  '/de/ik-roi-Calculatema.html': '/de/hr-roi-rechner.html',
  '/de/makale-ik-roi-Calculatema-formulu.html': '/de/artikel-hr-roi-berechnung.html',
  '/de/makale-ik-roi-Calculatema-ornek-senaryolar.html': '/de/artikel-hr-roi-szenarien.html',
  '/de/makale-prediktif-ik-sadakat-2026.html': '/de/artikel-praediktive-hr-mitarbeiterbindung-2026.html',
  '/en/article-ai-and-generatiand-ai.html': '/en/article-ai-and-generative-ai.html',
  '/en/article-predictiand-hr.html': '/en/article-predictive-hr.html',
  '/en/asgari-ucret-Calculatema.html': '/en/minimum-wage-calculator.html',
  '/en/bordro-maliyet-Berechnenma.html': '/en/payroll-cost-calculator.html',
  '/en/ik-roi-Calculatema.html': '/en/hr-roi-calculator.html',
  '/en/ik-roi-Berechnenma.html': '/en/hr-roi-calculator.html',
  '/en/makale-yonetici-ai-adaptasyon-2026.html': '/en/article-manager-ai-adaptation-2026.html',
  '/en/makale-ik-roi-Calculatema-ornek-senaryolar.html': '/en/article-hr-roi-calculation-scenarios.html',
  '/en/makale-prediktif-ik-sadakat-2026.html': '/en/article-predictive-hr-loyalty-2026.html',
  '/en/makale-ik-yazilimi-2026-trendler.html': '/en/article-hr-software-2026-trends.html',
  '/en/sgk-prim-Calculatema.html': '/en/social-security-calculator.html',
  '/en/sgk-prim-Berechnenma.html': '/en/social-security-calculator.html',
  '/en/kidem-tazminati-Berechnenma.html': '/en/severance-pay-calculator.html',
  '/en/kidem-tazminati-Calculatema.html': '/en/severance-pay-calculator.html',
  '/en/asgari-ucret-Berechnenma.html': '/en/minimum-wage-calculator.html',
  '/en/bordro-maliyet-Calculatema.html': '/en/payroll-cost-calculator.html',
  '/en/lohnsteuer-rechner.html': '/de/lohnsteuer-rechner.html',
  '/en/ik-arastirma-raporu-2026.html': '/ik-arastirma-raporu-2026.html',
  '/en/asgari-ucret-hesaplama.html': '/en/minimum-wage-calculator.html',
  '/ar/hr-software.html': '/ar/brnamj-hr.html',
  '/ar/kidem-tazminati-Berechnenma.html': '/ar/hasb-mkafat.html',
  '/ar/net-brut-maas-Berechnenma.html': '/ar/hasb-ratb-safy.html',
  '/ar/asgari-ucret-Berechnenma.html': '/ar/hasb-ajr.html',
  '/ar/sgk-prim-Berechnenma.html': '/ar/hasb-tamynat.html',
  '/ar/article-hr-roi-calculation-formula.html': '/ar/mqal-madt-hsab-ayd-hr.html',
  '/makale-Bordro-maliyet-Berechnenma.html': '/bordro-maliyet-hesaplama.html',
  '/makale-Digital-ozluk-donusu-suresi.html': '/makale-dijital-ozluk-donusu-suresi.html',
  '/makale-HR-Berichterstattung-dashboard-kurgusu.html': '/makale-ik-raporlama-dashboard-kurgusu.html',
  '/makale-HR-analitigi-12-kpi.html': '/makale-ik-analitigi-12-kpi.html',
  '/makale-HR-analitigi-Berichterstattung-sHR-hatalar.html': '/makale-ik-analitigi-raporlama-sik-hatalar.html',
  '/makale-HR-yazilimi-2026-trendler.html': '/makale-ik-yazilimi-2026-trendler.html',
  '/makale-HR-yazilimi-Implementierung-takvimi-90-gun.html': '/makale-ik-yazilimi-uygulama-takvimi-90-gun.html',
  '/makale-KMU-icin-HR-programi.html': '/makale-kobi-icin-ik-programi.html',
  '/makale-Leistung-ve-prim-modeli.html': '/makale-performans-ve-prim-modeli.html',
  '/makale-Leistung-yonetimi-okr-modeli.html': '/makale-performans-yonetimi-okr-modeli.html',
  '/makale-Lohnabrechnung-yazilimi-entegrasyon-listesi.html': '/makale-bordro-yazilimi-entegrasyon-listesi.html',
  '/makale-ai-and-kvkk-uyumu.html': '/makale-ai-ve-kvkk-uyumu.html',
  '/makale-dijital-ozluk-and-kvkk.html': '/makale-dijital-ozluk-ve-kvkk.html',
  '/makale-esnek-calisma-saat-2026.html': '/makale-esnek-calisma-saatleri-2026.html',
  '/makale-hr-yazilimi-maliyet-Berechnung.html': '/makale-hr-yazilimi-maliyet-hesabi.html',
  '/Artikel-HR-roi-Berechnung-formulu.html': '/de/artikel-hr-roi-berechnung.html',
  '/Artikel-personel-takip-programi-Was ist.html': '/de/artikel-was-ist-mitarbeiter-tracking.html',
  '/makale-bordro-maliyet-Berechnenma.html': '/bordro-maliyet-hesaplama.html',
  '/makale-ik-roi-Calculatema-formulu.html': '/makale-ik-roi-hesaplama-formulu.html',
  '/makale-ise-alim-sureci-kpi-metrHRleri.html': '/makale-ise-alim-sureci-kpi-metrikleri.html',
  '/makale-pdks-ile-Lohnabrechnung-Integration.html': '/makale-pdks-ile-bordro-entegrasyonu.html',
  '/makale-pdks-with-bordro-entegrasyonu.html': '/makale-pdks-ile-bordro-entegrasyonu.html',
  '/makale-performans-and-prim-modeli.html': '/makale-performans-ve-prim-modeli.html',
  '/makale-personel-takip-programi-kurulum-Leitfaden.html': '/makale-personel-takip-programi-kurulum-rehberi.html',
  '/asgari-ucret-Berechnenma.html': '/asgari-ucret-hesaplama.html',
  '/asgari-ucret-Calculatema.html': '/asgari-ucret-hesaplama.html',
  '/bordro-maliyet-Berechnenma.html': '/bordro-maliyet-hesaplama.html',
  '/net-brut-maas-Berechnenma.html': '/net-brut-maas-hesaplama.html',
  '/sgk-prim-Berechnenma.html': '/sgk-prim-hesaplama.html',
  '/makale-ucret-adaleti-and-analitik.html': '/makale-ucret-adaleti-ve-analitik.html',
  '/makale-ucret-adaleti-ve-analitHR.html': '/makale-ucret-adaleti-ve-analitik.html',
  '/makale-ucret-degerlendirme-ve-piyasa-karsilasmasi.html': '/makale-ucret-degerlendirme-ve-piyasa-karsilastirmasi.html',
  '/ik-roi-Calculatema.html': '/ik-roi-hesaplama.html',
};

export function readLegacyRedirects(root) {
  const redirects = { ...extraLegacyRedirects };
  const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');
  for (const line of htaccess.split(/\r?\n/)) {
    if (line === 'Redirect 301 /en/hr-software.html /en/hr-software.html') continue;
    const rewrite = line.match(/^RewriteRule \^(\S+)\$ (\S+) \[R=301,L\]$/);
    if (rewrite) {
      const source = `/${rewrite[1].replaceAll('\\.', '.').replaceAll('\\ ', ' ')}`;
      if (source !== '/(.*)') redirects[source] ??= rewrite[2];
      continue;
    }
    const redirect = line.match(/^Redirect 301 (\S+) (\S+)$/);
    if (redirect) redirects[redirect[1]] ??= redirect[2];
  }
  return redirects;
}

export function unresolvedLegacyUrls(root, redirects = readLegacyRedirects(root)) {
  return Object.entries(redirects).flatMap(([source, target]) => {
    if (!target.startsWith('/') || target.includes('?') || (!target.endsWith('.html') && !target.endsWith('/'))) {
      return [{ source, target, reason: 'Unsafe or non-HTML redirect target' }];
    }
    const relativeTarget = target === '/' ? 'index.html' : target.endsWith('/') ? `${target.slice(1)}index.html` : `.${target}`;
    const file = path.resolve(root, relativeTarget);
    return fs.existsSync(file) && fs.statSync(file).isFile() ? [] : [{ source, target, reason: 'Missing local target' }];
  });
}

export function readNginxRedirects(root) {
  const redirects = { ...extraLegacyRedirects };
  const nginx = fs.readFileSync(path.join(root, 'nginx-rewrites.conf'), 'utf8');
  for (const line of nginx.split(/\r?\n/)) {
    if (line.trim() === 'rewrite ^/en/hr-software\\.html$ /en/hr-software.html permanent;') continue;
    const match = line.trim().match(/^rewrite \^(\S+)\$ (\S+) permanent;$/);
    if (match) redirects[match[1].replaceAll('\\.', '.')] ??= match[2];
  }
  return redirects;
}

const startMarker = '# === GSC LEGACY 404 REDIRECTS (2026-11-16) ===';
const endMarker = '# === END GSC LEGACY 404 REDIRECTS ===';

export function serverRulesWithLegacyRedirects(current, server) {
  let insideLegacyBlock = false;
  const retained = current.split(/\r?\n/).filter(line => {
    if (line === startMarker) {
      insideLegacyBlock = true;
      return false;
    }
    if (line === endMarker) {
      insideLegacyBlock = false;
      return false;
    }
    return !insideLegacyBlock && !/\/en\/hr-software\.html \/en\/hr-software\.html/.test(line);
  });
  const block = `${startMarker}\n${legacyRedirectBlock(server)}\n${endMarker}`;
  return `${retained.join('\n').trimEnd()}\n\n${block}\n`;
}

if (process.argv.includes('--write-server-rules')) {
  const root = process.cwd();
  const apache = path.join(root, '.htaccess');
  const nginx = path.join(root, 'nginx-rewrites.conf');
  fs.writeFileSync(apache, serverRulesWithLegacyRedirects(fs.readFileSync(apache, 'utf8'), 'apache'));
  fs.writeFileSync(nginx, serverRulesWithLegacyRedirects(fs.readFileSync(nginx, 'utf8'), 'nginx'));
  console.log(`Updated ${Object.keys(extraLegacyRedirects).length} GSC legacy redirects in Apache and nginx.`);
}
