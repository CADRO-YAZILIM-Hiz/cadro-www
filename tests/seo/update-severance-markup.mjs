import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parse } from 'parse5';
import { root } from './metadata.mjs';
import { renderPage, ceilings } from './severance_markup.mjs';
import { inspectHead } from './metadata.mjs';

const files = { tr: 'kidem-tazminati-hesaplama.html', en: 'en/severance-pay-calculator.html', de: 'de/abfindungsrechner.html', ar: 'ar/hasb-mkafat.html' };
for (const [lang, file] of Object.entries(files)) {
  const filePath = path.join(root, file);
  const old = fs.readFileSync(filePath, 'utf8');
  const result = renderPage(old, lang, file, fs.readFileSync(path.join(root, 'bordro-maliyet-hesaplama.html'), 'utf8'));
  assert.deepEqual(inspectHead(result), []);
  const doc = parse(result);
  const elements = (n, out = []) => { if (n.tagName) out.push(n); for (const c of n.childNodes || []) elements(c, out); return out; };
  const all = elements(doc);
  assert.equal(all.filter(n => n.tagName === 'main').length, 1, `${file}: main count`);
  assert.equal(all.filter(n => n.tagName === 'script' && n.attrs.some(a => a.name === 'src' && /severance_calculator\.js/.test(a.value))).length, 1);
  assert.equal(all.filter(n => n.tagName === 'script' && n.attrs.some(a => a.name === 'id' && a.value === 'severance-config')).length, 1);
  assert.equal(all.filter(n => n.tagName === 'title').length, 1);
  assert.equal(all.filter(n => n.tagName === 'link' && n.attrs.some(a => a.name === 'rel' && a.value === 'canonical')).length, 1);
  assert(!/KIDEM_TAVAN|calculateKidem\s*\(|Temel Formül|Tavan Sınırı|Sık Sorulan Sorular/.test(result));
  assert(result.includes('73,729.87'));
  fs.writeFileSync(filePath, result);
  console.log(`Verified and updated ${file}: ${Object.keys(ceilings).length} official periods.`);
}
