import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { audit, pages } from './audit-hreflang.mjs';
import { root } from './metadata.mjs';

const url = file => `https://www.cadro.io/${file}`;
const page = (lang, file, alternates = [], noindex = false) => ({
  lang, file, canonical: url(file), alternates, noindex,
});
const link = (lang, file) => ({ lang, url: url(file) });

test('standalone pages do not require invented translations', () => {
  assert.deepEqual(audit([page('en', 'standalone.html')]), []);
});

test('a reciprocal pair may use a different-language x-default', () => {
  const links = [link('en', 'en.html'), link('de', 'de.html'), link('x-default', 'en.html')];
  assert.deepEqual(audit([page('en', 'en.html', links), page('de', 'de.html', links)]), []);
});

test('missing, noncanonical and noindex targets fail', () => {
  const source = page('en', 'en.html', [link('en', 'en.html'), link('de', 'missing.html'), link('ar', 'ar.html')]);
  const failures = audit([source, page('ar', 'ar.html', [], true)]);
  assert.deepEqual(failures.map(item => item.reason), ['missing-or-noncanonical', 'noindex-target']);
  assert.deepEqual(audit([page('en', 'hidden.html', [link('de', 'missing.html')], true)]), []);
});

test('duplicate languages, wrong language, missing return and missing self fail', () => {
  const failures = audit([
    page('en', 'en.html', [link('de', 'de.html'), link('de', 'de.html'), link('ar', 'de.html')]),
    page('de', 'de.html'),
  ]);
  assert.deepEqual(failures.map(item => item.reason), [
    'nonreciprocal', 'duplicate-language', 'wrong-language', 'self-reference-missing',
  ]);
});

test('site-wide hreflang has no missing, wrong-language or nonreciprocal targets', () => {
  const all = pages();
  assert.ok(all.length >= 586, 'The audit must include the complete HTML tree');
  assert.deepEqual(audit(all), [], 'Unexpected hreflang regression');
});

test('every indexable four-language mapping agrees with its complete canonical cluster', () => {
  const mapping = JSON.parse(fs.readFileSync(path.join(root, 'slug-mapping.json'), 'utf8'));
  const byFile = new Map(pages().map(item => [item.file, item]));
  let checked = 0;
  for (const [slug, translations] of Object.entries(mapping)) {
    if (slug.startsWith('_')) continue;
    const files = { tr: `${slug}.html`, ...Object.fromEntries(['en', 'de', 'ar']
      .map(lang => [lang, `${lang}/${translations[lang]}.html`])) };
    const members = Object.entries(files).map(([lang, file]) => [lang, byFile.get(file)]);
    // A noindex source (for example app-landing) need not have translated files.
    if (byFile.get(files.tr)?.noindex) continue;
    for (const [lang, member] of members) assert.ok(member, `Mapped file missing: ${files[lang]}`);
    // Technical/thank-you pages intentionally marked noindex are not public clusters.
    if (members.some(([, member]) => member.noindex)) continue;
    const expected = { ...Object.fromEntries(Object.entries(files).map(([lang, file]) => [lang, url(file)])),
      'x-default': url(files.tr) };
    for (const [lang, member] of members) {
      assert.equal(member.canonical, url(files[lang]), member.file);
      assert.equal(member.lang, lang, member.file);
      assert.equal(member.alternates.length, 5, member.file);
      assert.deepEqual(Object.fromEntries(member.alternates.map(item => [item.lang, item.url])), expected, member.file);
    }
    checked++;
  }
  assert.ok(checked > 6, 'The regression must cover more than the initial six groups');
});