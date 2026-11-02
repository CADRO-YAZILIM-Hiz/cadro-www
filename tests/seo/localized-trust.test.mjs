import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { parse } from 'parse5';
import { attribute, elements, root } from './metadata.mjs';

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'lang-all.min.js'), 'utf8'), sandbox);
const dictionaries = Object.fromEntries(['en', 'de', 'ar'].map(lang => [lang, sandbox.window[`CADRO_TR_${lang}`]]));
const text = node => node?.nodeName === '#text' ? node.value : (node?.childNodes || []).map(text).join('');
const normalized = node => text(node).replace(/\s+/g, ' ').trim();

for (const lang of ['en', 'de', 'ar']) {
  for (const name of ['security', 'compliance']) {
    test(`${lang}/${name}: translated body, metadata, FAQ and resources remain consistent`, () => {
      const file = `${lang}/${name}.html`;
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      const document = parse(source);
      const html = elements(document, node => node.tagName === 'html')[0];
      const main = elements(document, node => node.tagName === 'main')[0];
      const direction = lang === 'ar' ? 'rtl' : 'ltr';
      assert.equal(attribute(html, 'lang'), lang);
      assert.equal(attribute(html, 'dir'), direction);
      assert.equal(attribute(elements(document, node => node.tagName === 'body')[0], 'dir'), direction);
      const title = normalized(elements(document, node => node.tagName === 'title')[0]);
      const meta = key => elements(document, node => node.tagName === 'meta'
        && (attribute(node, 'name') === key || attribute(node, 'property') === key))
        .map(node => attribute(node, 'content'));
      assert.deepEqual(meta('og:title'), [title]);
      assert.deepEqual(meta('twitter:title'), [title]);
      assert.deepEqual(meta('og:description'), meta('description'));
      assert.deepEqual(meta('twitter:description'), meta('description'));
      assert.equal(dictionaries[lang][`meta_title_${name}`], title);
      assert.equal(dictionaries[lang][`meta_desc_${name}`], meta('description')[0]);
      assert.deepEqual(meta('og:url'), [`https://www.cadro.io/${file}`]);
      assert.doesNotMatch(normalized(main), /[ğışİĞŞ]|\b(?:Çalışan|Güvenlik|Uyumluluk|İncele)\b/u, 'Turkish fallback body returned');
      if (lang === 'ar') assert.match(normalized(main), /[\u0600-\u06ff]/u);
      assert.doesNotMatch(normalized(main), /AES.?256|ISO\s*27001/i, 'Unverified certification/encryption assertion returned');

      const schemas = elements(document, node => node.tagName === 'script' && attribute(node, 'type') === 'application/ld+json')
        .map(node => JSON.parse(text(node)));
      const web = schemas.find(item => item['@type'] === 'WebPage');
      assert.ok(web);
      assert.equal(web.inLanguage, lang);
      assert.equal(web.name, title);
      assert.equal(web.description, meta('description')[0]);
      assert.equal(web.url, `https://www.cadro.io/${file}`);
      assert.doesNotMatch(JSON.stringify(schemas), /aggregateRating|ratingValue|"offers"/);
      const faq = schemas.find(item => item['@type'] === 'FAQPage');
      const visible = elements(main, node => node.tagName === 'details').map(detail => ({
        question: normalized(elements(detail, node => node.tagName === 'summary')[0]),
        answer: normalized(elements(detail, node => node.tagName === 'p')[0]),
      }));
      assert.deepEqual(faq.mainEntity.map(item => ({ question: item.name, answer: item.acceptedAnswer.text })), visible);

      for (const node of elements(document, node => ['a', 'img', 'script', 'link'].includes(node.tagName))) {
        const target = attribute(node, node.tagName === 'img' || node.tagName === 'script' ? 'src' : 'href');
        if (!target || /^(?:[a-z]+:|\/\/|#)/i.test(target)) continue;
        const local = decodeURIComponent(target.split(/[?#]/)[0]);
        assert.ok(fs.existsSync(path.resolve(root, lang, local)), `Missing resource: ${file} -> ${target}`);
      }
    });
  }
}