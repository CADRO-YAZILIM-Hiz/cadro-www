import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root } from './metadata.mjs';

const reports = ['ik-arastirma-raporu-2026.html','en/hr-research-report-2026.html','de/hr-forschungsbericht-2026.html','ar/tqryr-bhth-hr-2026.html'];
for (const file of reports) {
  assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /<meta[^>]*(?:name="robots"[^>]*content="noindex|content="noindex[^>]*name="robots")/i, `${file} must be explicitly noindex before removal.`);
}
const xml = execFileSync('git', ['-C', root, 'show', 'HEAD:sitemap.xml'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
let next = xml, removed = [];
for (const file of reports) {
  const url = `https://www.cadro.io/${file}`;
  const pattern = new RegExp(`[\\t ]*<url>\\r?\\n(?:[^<]|<(?!/url>)[\\s\\S])*?<loc>${url.replace(/\./g, '\\.')}</loc>[\\s\\S]*?</url>\\r?\\n`);
  const match = next.match(pattern);
  assert(match, `Expected original one-language report block in sitemap: ${file}`);
  next = next.replace(pattern, '');
  removed.push(url);
}
fs.writeFileSync(path.join(root, 'sitemap.xml'), next);
const locs = [...next.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
assert.equal(locs.length, 547);
assert.equal(new Set(locs).size, locs.length);
console.log('Removed only the four unpublished research reports; preserved the original sitemap otherwise.');
