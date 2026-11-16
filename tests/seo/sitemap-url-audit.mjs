import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { attribute, elements, root } from './metadata.mjs';

export function normalizeUrl(node) { return text(node).replace(/\s+/g, ' ').trim(); }
export function text(node) {
  if (!node || ['script', 'style', 'template', 'noscript'].includes(node.tagName)) return '';
  return node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
}
export function languageFlag(text, language) {
  const words = (text.match(/[^\s,.;:!?"()[\]{}<>|/\\@#%&*=+~`^$]+/g) || []).filter(w => /\p{L}/u.test(w));
  const turkish = (text.match(/[ışğüöçİŞĞÜÖÇ]/g) || []).length;
  const arabic = (text.match(/[\u0600-\u06ff]/g) || []).length;
  const english = (text.match(/\b(the|and|with|your|our|this|that|for|from|how|what|are|you|can|will|not)\b/gi) || []).length;
  const threshold = Math.max(15, words.length * 0.025);
  return language === 'ar' ? arabic < 30 : language === 'en' || language === 'de' ? turkish > threshold : language === 'tr' ? english > Math.max(25, words.length * 0.2) : false;
}
export function auditPage(html) {
  const doc = parse(html.replace(/^\uFEFF/, ''));
  const all = elements(doc, () => true);
  const robots = all.filter(n => n.tagName === 'meta' && attribute(n, 'name') === 'robots').map(n => attribute(n, 'content') || '');
  const indexable = robots.filter(r => /noindex/i.test(r) || !/follow/i.test(r));
  const found = all.filter(n => n.tagName === 'a').map(n => attribute(n, 'href') || '');
  const lang = attribute(all.find(n => n.tagName === 'html'), 'lang') || 'tr';
  const content = text(all.find(n => n.tagName === 'main'));
  return {
    noindex: robots.some(r => /noindex/i.test(r)),
    languageFlag: languageFlag(content, lang),
    primaryLink: found.some(url => /(?:sgk\.gov\.tr|csgb\.gov\.tr|tuik\.gov\.tr|kvkk\.gov\.tr|mevzuat\.gov\.tr|gib\.gov\.tr|resmigazete\.gov\.tr|w3\.org|nist\.gov|oecd\.org|weforum\.org)/i.test(url)),
    reviewDate: /(?:16 Kasım 2026|16 November 2026|16\. November 2026|16 نوفمبر 2026)/.test(html) ? '2026-11-16' : '',
    placeholder: /Bekliyor|Örneklem KPI|KPI-Beispiel|مثال KPI/.test(content),
  };
}
export function loadSitemap() {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
}
export function createRows(urls, date = new Date().toISOString().slice(0, 10)) {
  return urls.map(url => {
    const rel = url.replace('https://www.cadro.io/', '') || 'index.html';
    const file = rel.endsWith('/') ? `${rel}index.html` : rel;
    const local = path.join(root, decodeURIComponent(file));
    let result = { noindex: false, languageFlag: false, primaryLink: false, reviewDate: '', placeholder: false };
    if (fs.existsSync(local) && fs.statSync(local).isFile()) result = auditPage(fs.readFileSync(local, 'utf8'));
    return {
      url, local_file: file, technical_status: fs.existsSync(local) ? 'local_target_passed' : 'local_target_missing',
      live_status: 'not_checked_this_pass', language_check: result.languageFlag ? 'review_required' : 'no_automatic_flag',
      currency_check: result.reviewDate ? `explicit_review_${result.reviewDate}` : 'no_explicit_current_review',
      originality_check: result.placeholder ? 'placeholder_or_review_required' : 'no_automatic_flag_not_approved',
      evidence_check: result.primaryLink ? 'linked_open_source_candidate_verify_claims' : 'no_mapped_primary_source_review',
      noindex: result.noindex, review_status: 'pending_human_review', owner: 'not_assigned',
      reviewer: '', reviewed_at: '', evidence_notes: '', next_action: 'manual_source_and_quality_review', generated_date: date,
    };
  });
}
export function toCsv(rows) {
  const columns = Object.keys(rows[0]);
  return '\uFEFF' + columns.join(',') + '\n' + rows.map(row => columns.map(col => `"${String(row[col] ?? '').replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
}
if (import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const rows = createRows(loadSitemap());
  const output = path.join(root, 'editorial-inventory');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'sitemap-url-audit.csv'), toCsv(rows));
  const findings = ({
    generated_at: new Date().toISOString(), total: rows.length,
    local_missing: rows.filter(r => r.technical_status !== 'local_target_passed').length,
    language_review: rows.filter(r => r.language_check === 'review_required').length,
    no_current_date: rows.filter(r => r.currency_check === 'no_explicit_current_review').length,
    no_mapped_source: rows.filter(r => r.evidence_check === 'no_mapped_primary_source_review').length,
    placeholders: rows.filter(r => r.originality_check !== 'no_automatic_flag_not_approved').length,
    noindex_in_sitemap: rows.filter(r => r.noindex).length,
  });
  fs.writeFileSync(path.join(output, 'audit-metadata.json'), JSON.stringify(findings, null, 2));
  fs.writeFileSync(path.join(output, 'README.md'), `# Sitemap URL kalite envanteri\n\n${findings.generated_at} tarihinde ${rows.length} sitemap URL’si üzerinde otomatik ön inceleme yapıldı.\n\n**Bu dosya içerik onayı değildir.** Middle_manuel review gerekir. Otomatik bir bulgu olmaması özgün, güncel veya kanıtlı anlamına gelmez.\n\n## İnceleme üniteleri\n\n| Sıra | Kriter | sitemap-url-audit.mjs yöntemi | Human check |\n|---|---|---|---|\n| 1 | Teknik erişim | Sitemap her lokasyonu yerel html dosyasıyla eşledi; canlı http response ise \`not_checked_this_pass\` | Canlı status/canonical/noindex kontrolü |\n| 2 | Dil | Görünür body metninde belirgin hatalı dil sinyali | Native-speaker review |\n| 3 | Güncellik | Açıkken bir review date belgeleştirdik; yoksa “no_explicit_current_review” | Mevzuat taze güncellik review |\n| 4 | Özgünlük | Placeholder benzeri içerik bayrağı; full text semantic duplicate check yok | Uzman editoryal inceleme, kanıtlanmış özgün örnekler |\n| 5 | Kanıt | Official primary domain candidate links | Tık tık, kaynak metninin iddiayı gerçekten doğrulaması |\n\n## Sonuç özeti\n\n${Object.entries(findings).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n\nHer satır \`pending_human_review\` durumundadır. Owner, reviewer, reviewed_at ve evidence_notes alanları doldurulmak içindir. Satır yazmak yalnız yetkili human review sonrası geçerli onay sayılır.\n`);
  console.log(findings);
}
