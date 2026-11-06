import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pages = [
  ['de', 'artikel-2026-mindestlohn-netto.html'],
  ['de', 'artikel-ats-recruiting-checkliste.html'],
  ['ar', 'mqal-12-kpi-thlyl-hr.html'],
  ['en', 'hr-analytics.html'],
];
const rootMarkers = {
  ar: ['A comprehensive guide to help you navigate', 'Scope and objective', '90-day implementation plan', 'Common mistakes', 'Conclusion and action list'],
  de: ['After the 2026 minimum wage announcement', 'A comprehensive guide to help you navigate', 'Scope and objective', 'Step-by-Step Calculation', 'How Much Does the Employer Pay'],
  en: ['Turnover oranından', 'İK ANALİTİŞİ MODÜLLERİ', 'Neler Yapabilirsiniz?', 'Özellikleri Gör', '14 Gün Free Trial'],
};
function visible(source) {
  return source.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
const findings = [];
for (const [lang, rel] of pages) {
  const file = path.join(root, lang, rel); const source = fs.readFileSync(file, 'utf8'); const body = visible(source);
  for (const marker of rootMarkers[lang]) if (body.includes(marker)) findings.push({ lang, rel, marker });
}
console.log(JSON.stringify({ pages, findings }, null, 2));
process.exitCode = findings.length ? 1 : 0;
