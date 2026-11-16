import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'parse5';
import { attribute, elements, inspectHead, root } from './metadata.mjs';

const reports = ['ik-arastirma-raporu-2026.html','en/hr-research-report-2026.html','de/hr-forschungsbericht-2026.html','ar/tqryr-bhth-hr-2026.html'];
function visible(node) {
  if (['script', 'style', 'noscript', 'template'].includes(node?.tagName)) return '';
  return node?.nodeName === '#text' ? node.value : (node?.childNodes || []).map(visible).join(' ');
}
for (const file of reports) {
  test(`${file}: unpublished statistical report is noindex and not a Report schema`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const document = parse(html);
    const main = elements(document, n => n.tagName === 'main');
    assert.equal(main.length, 1);
    assert.deepEqual(elements(document, n => n.tagName === 'meta' && attribute(n, 'name') === 'robots').map(n => attribute(n, 'content')), ['noindex, follow']);
    assert.doesNotMatch(html, /"@type":"Report"/);
    assert.doesNotMatch(visible(main[0]), /%67|%18|%44|%58|528 Türk|528|₺28K|30 sayfalık|Örneklem KPI|KPI-Beispiel|مثال KPI|Temel Bulgular|Tam Raporu/);
    assert.doesNotMatch(file === 'ar/tqryr-bhth-hr-2026.html' ? visible(main[0]) : '', /Turkey HR Research Report 2026|Türkiye geneli|BAĞIMSIZ|Bağımsız/);
    const links = elements(main[0], n => n.tagName === 'a').map(n => attribute(n, 'href'));
    assert.ok(links.some(link => /tuik\.gov\.tr|sgk\.gov\.tr|kvkk\.gov\.tr/.test(link || '')));
    assert.deepEqual(inspectHead(html), []);
  });
}
for (const file of ['ik-yazilimi.html', 'en/hr-software.html']) {
  test(`${file}: commercial proof block and claim boundaries`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const document = parse(html);
    const main = elements(document, n => n.tagName === 'main')[0];
    const text = visible(main);
    assert.ok(text.includes('Doğrulanabilir kapsam') || text.includes('Evidence boundary'));
    assert.ok(text.includes('demo'));
    assert.ok(text.includes('sözleşm') || text.includes('contract'));
    assert.ok(text.includes('yönetici incelemesi') || text.includes('manager review'));
    if (file.startsWith('en/')) {
      assert.ok(text.includes('product interface, not a customer outcome'));
      assert.ok(text.includes('must be confirmed in your contract'));
      assert.ok(text.includes('do not make automated promotion or termination decisions'));
    } else {
      assert.ok(text.includes('yazılım tek başına KVKK uyumu veya veri güvenliği garantisi sağlamaz'));
      assert.ok(text.includes('kararlarını otomatik vermez'));
    }
    assert.doesNotMatch(text, /AI destekli analizlerle|AI-powered insights/i);
    assert.ok(fs.existsSync(path.join(root, `assets/screenshots/phase4/${file.startsWith('en/') ? 'en' : 'tr'}/attendance-payroll.webp`)));
    assert.deepEqual(inspectHead(html), []);
  });
}
