import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'parse5';
import { attribute, elements, root } from './metadata.mjs';

const mapping = JSON.parse(fs.readFileSync(path.join(root, 'slug-mapping.json'), 'utf8'));
const groups = [
  'sgk-prim-hesaplama', 'net-brut-maas-hesaplama', 'kidem-tazminati-hesaplama',
  'bordro-maliyet-hesaplama', 'makale-ik-roi-hesaplama-formulu',
  'makale-ik-roi-hesaplama-ornek-senaryolar',
];

for (const slug of groups) {
  test(`${slug}: four canonical languages form one reciprocal cluster`, () => {
    const files = { tr: `${slug}.html`, ...Object.fromEntries(['en', 'de', 'ar']
      .map(lang => [lang, `${lang}/${mapping[slug][lang]}.html`])) };
    const urls = Object.fromEntries(Object.entries(files).map(([lang, file]) => [lang, `https://www.cadro.io/${file}`]));
    const expected = { ...urls, 'x-default': urls.tr };
    for (const [lang, file] of Object.entries(files)) {
      const document = parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
      const head = elements(document, node => node.tagName === 'head')[0];
      const canonical = elements(head, node => node.tagName === 'link' && attribute(node, 'rel') === 'canonical');
      assert.deepEqual(canonical.map(node => attribute(node, 'href')), [urls[lang]], file);
      const alternates = elements(head, node => node.tagName === 'link' && attribute(node, 'hreflang'));
      assert.equal(alternates.length, 5, file);
      assert.deepEqual(Object.fromEntries(alternates.map(node => [attribute(node, 'hreflang'), attribute(node, 'href')])), expected, file);
      const ogUrl = elements(head, node => node.tagName === 'meta' && attribute(node, 'property') === 'og:url');
      assert.deepEqual(ogUrl.map(node => attribute(node, 'content')), [urls[lang]], file);
      assert.equal(elements(head, node => node.tagName === 'meta'
        && /^(robots|googlebot)$/i.test(attribute(node, 'name') || '')
        && /\bnoindex\b/i.test(attribute(node, 'content') || '')).length, 0, file);
    }
  });
}