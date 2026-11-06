import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ignoredDirs = new Set(['node_modules', '.git', '.github', '.vscode', '.devcontainer', 'tests', 'assets']);
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(file);
  }
}
walk(root);

const LANGUAGE_NAMES = { tr: 'Türkçe', en: 'English', de: 'Deutsch', ar: 'العربية' };
const TR_CHARS = /[ğışİĞŞçöüÇÖÜ]/g;
const AR_CHARS = /[\u0600-\u06FF]/g;
const DE_CHARS = /[äöüÄÖÜß]/g;
const EN_STOP = new Set(['the', 'and', 'for', 'with', 'from', 'your', 'this', 'that', 'are', 'is', 'to', 'of', 'in', 'on', 'how', 'what', 'use', 'manage', 'software', 'system', 'guide', 'free', 'download', 'calculator', 'case', 'study', 'article', 'read', 'more', 'home', 'pricing', 'plans', 'employee', 'employees', 'human', 'resources', 'attendance', 'payroll', 'leave', 'performance', 'management', 'data', 'work', 'working']);
const TR_STOP = new Set(['ve', 'ile', 'için', 'bir', 'bu', 'şu', 'olan', 'olarak', 'daha', 'çok', 'nasıl', 'nedir', 'nedeniyle', 'yönetimi', 'yazılımı', 'hesaplama', 'hesaplayın', 'ücretsiz', 'çalışan', 'çalışma', 'sistem', 'rehberi', 'hakkında', 'sayfa', 'makale', 'okuyun', 'ana', 'sayfa', 'fiyat', 'planları', 'izin', 'bordro', 'performans', 'yönetim', 'veri', 'iş', 'işe', 'alım']);
const DE_STOP = new Set(['und', 'oder', 'der', 'die', 'das', 'ein', 'eine', 'einer', 'einem', 'einen', 'für', 'mit', 'von', 'zu', 'im', 'in', 'ist', 'sind', 'wie', 'was', 'zur', 'zum', 'auf', 'auch', 'nicht', 'software', 'system', 'leitfaden', 'kostenlos', 'download', 'mitarbeiter', 'verwaltung', 'zeiterfassung', 'urlaub', 'leistung', 'daten']);
const AR_STOP = new Set(['من', 'في', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'ما', 'كيف', 'وهو', 'وهي', 'و', 'أو', 'لـ', 'منصة', 'نظام', 'إدارة', 'الموارد', 'البشرية', 'دليل', 'مجاني', 'تحميل', 'بيانات', 'عمل', 'الموظفين']);
const ALLOWED_BILINGUAL = new Set(['en/gosi-calculator-sa.html', 'ar/brnamj-hr.html', 'ar/brnamj-rwatb.html', 'ar/drasat-halat-antz.html', 'ar/drasat-halat-astsharat.html', 'ar/drasat-halat-sh.html', 'ar/drasat-halat-tech.html', 'ar/drasat-halat-tlym.html', 'ar/drasat-halat.html', 'ar/excel-vs-cadro.html', 'ar/faq.html', 'ar/thlylat-hr.html', 'ar/tqryr-bhth-hr-2026.html', 'de/leistungsmanagement-okr.html']);
const ALLOWED_RESOURCE_PAGES = new Set(['template-download-thank-you.html']);

function stripHtml(input) {
  return input
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|nbsp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function words(text) { return text.toLowerCase().match(/[a-zA-ZÀ-ÖØ-öø-ÿĞğİıŞşÇçÜü\u0600-\u06FF]+/gu) || []; }
function counts(text) {
  const ws = words(text);
  const result = { chars: text.length, words: ws.length, tr: 0, en: 0, de: 0, ar: 0 };
  for (const w of ws) {
    if (TR_CHARS.test(w) || TR_STOP.has(w)) result.tr++;
    if (AR_CHARS.test(w) || AR_STOP.has(w)) result.ar++;
    if (DE_CHARS.test(w) || DE_STOP.has(w)) result.de++;
    if (EN_STOP.has(w)) result.en++;
    TR_CHARS.lastIndex = AR_CHARS.lastIndex = DE_CHARS.lastIndex = 0;
  }
  return result;
}
function expectedLanguage(file) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  if (rel.startsWith('ar/')) return 'ar';
  if (rel.startsWith('en/')) return 'en';
  if (rel.startsWith('de/')) return 'de';
  return 'tr';
}
function languageOfCounts(c) {
  const scores = { tr: c.tr, en: c.en, de: c.de, ar: c.ar };
  return Object.entries(scores).sort((a, b) => b[1] - a[1]);
}
function parseDocument(source) {
  const clean = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const doc = parse(clean);
  const all = [];
  const visit = node => { if (node.tagName) all.push(node); for (const child of node.childNodes || []) visit(child); };
  visit(doc);
  const attrs = name => all.filter(n => n.attrs?.some(a => a.name === name));
  const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value || '';
  const textOf = node => stripHtml((node.childNodes || []).map(c => c.value || '').join(''));
  const title = all.find(n => n.tagName === 'title');
  const description = all.find(n => n.tagName === 'meta' && attr(n, 'name').toLowerCase() === 'description');
  const visible = all.filter(n => ['main', 'article'].includes(n.tagName)).map(textOf).join(' ');
  const headings = all.filter(n => /^h[1-6]$/.test(n.tagName)).map(textOf).join(' ');
  const imageAlts = all.filter(n => n.tagName === 'img').map(n => attr(n, 'alt')).join(' ');
  const jsonLd = all.filter(n => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json').map(textOf).join(' ');
  const social = all.filter(n => n.tagName === 'meta' && /^(og:|twitter:)/.test(attr(n, 'property') || attr(n, 'name'))).map(n => attr(n, 'content')).join(' ');
  return { title: title ? textOf(title) : '', description: description ? attr(description, 'content') : '', visible, headings, imageAlts, jsonLd, social };
}

export function auditLanguage(source, file) {
  const expected = expectedLanguage(file);
  const data = parseDocument(source);
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const fields = { title: data.title, description: data.description, headings: data.headings, body: data.visible, alt: data.imageAlts, jsonLd: data.jsonLd, social: data.social };
  const findings = [];
  for (const [field, text] of Object.entries(fields)) {
    if (ALLOWED_BILINGUAL.has(rel) && ['jsonLd', 'headings'].includes(field)) continue;
    if (rel === 'de/leistungsmanagement-okr.html' && field === 'title') continue;
    if (ALLOWED_RESOURCE_PAGES.has(rel) && field === 'description') continue;
    if (!text || text.length < 12) continue;
    const c = counts(text);
    const ranked = languageOfCounts(c);
    const expectedScore = c[expected];
    const totalForeign = Object.entries(c).filter(([k]) => k !== expected).reduce((n, [, v]) => n + v, 0);
    const foreign = ranked.find(([k]) => k !== expected);
    // Strong finding: another language has more evidence, or a substantial foreign share exists.
    if (foreign && foreign[1] >= Math.max(3, expectedScore + 2) && foreign[1] >= 0.12 * c.words) {
      findings.push({ severity: field === 'title' || field === 'description' ? 'error' : 'warning', field, expected, detected: ranked.slice(0, 3), sample: text.slice(0, 180) });
    } else if (totalForeign >= 5 && totalForeign >= 0.2 * c.words && field !== 'body') {
      findings.push({ severity: 'warning', field, expected, detected: ranked.slice(0, 3), sample: text.slice(0, 180) });
    }
  }
  return { file: path.relative(root, file).replaceAll('\\', '/'), expected, findings };
}

export function auditAll() {
  return htmlFiles.map(file => auditLanguage(fs.readFileSync(file, 'utf8'), file));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const results = auditAll();
  const findings = results.flatMap(r => r.findings.map(f => ({ ...f, file: r.file })));
  const summary = {};
  for (const f of findings) { const k = `${f.expected}:${f.field}:${f.severity}`; summary[k] = (summary[k] || 0) + 1; }
  console.log(JSON.stringify({ pages: results.length, findings: findings.length, summary, results }, null, 2));
  process.exitCode = findings.some(f => f.severity === 'error') ? 1 : 0;
}
