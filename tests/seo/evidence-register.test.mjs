import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'parse5';
import { attribute, elements, inspectHead, root } from './metadata.mjs';

const register = fs.readFileSync(path.join(root, 'editorial-inventory', 'evidence-register.csv'), 'utf8');
for (const id of ['SRC-CSGB-KIDEM-2026','SRC-ROI-FORMULA','SRC-BORDRO-VARSAYIM']) {
  test(`Evidence row ${id} is scoped with a reviewer and exact formula/section`, () => {
    const line = register.split(/\r?\n/).find(row => row.startsWith(id + ','));
    assert.ok(line);
    assert.match(line, /verified|formula_only|needs_specific_review/);
    assert.match(line, /bordro|Finans|CADRO/i);
  });
}
for (const [file, allowed] of [
  ['security.html', ['https://www.kvkk.gov.tr/Icerik/2032/Veri-Sorumlusu-Kimdir', 'https://www.iso.org/iso-27001-information-security.html', 'mailto:info@cadro.io']],
  ['ik-roi-hesaplama.html', ['id="hesaplama"', 'id="roi-form"', 'href="pricing.html"']],
]) {
  test(`${file}: visible claims map to declared evidence without benchmarks/certification`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const document = parse(html);
    assert.equal(elements(document, n => n.tagName === 'main').length, 1, `${file}: one parsed main required`);
    const text = elements(document, n => n.tagName === 'main').map(node => {
      const walk = element => element.nodeName === '#text' ? element.value : (element.childNodes || []).map(walk).join('');
      return walk(node);
    }).join(' ');
    for (const value of allowed) assert.ok(html.includes(value), value);
    const headErrors = inspectHead(html);
    assert.deepEqual(headErrors, [], `${file}: ${headErrors.join('; ')}`);
    if (file === 'security.html') {
      assert.doesNotMatch(text, /AES.?256|Tüm veriler|Veriler yalnızca Türkiye sunucularında saklanır|ISO\s*27001 sertifikal|iki faktörlü kimlik doğrul/iu);
      assert.ok(text.includes('CADRO’nun sertifikası veya altyapı testlerini belgelemez'), 'ISO source boundary: ' + text.slice(0, 250));
      assert.ok(text.includes('CADRO’nun belirli bir politikayı otomatik olarak KVKK uyumlu kıldığı iddia edilmez'), 'KVKK source boundary missing');
      assert.doesNotMatch(text, /Eriim|parıası|süreğileri|gıölü|yıNET|FAZIR|SİKÇA/);
    } else {
      assert.doesNotMatch(text, /SHRM|Deloitte|%65|%35 daha hızlı|3-6 ay|3-6 ayın|150 TL|8-12 saat|%85 hızlanma/);
      assert.ok(text.includes('dış araştırma, CADRO müşteri sonuçları veya fiyat teklifi değildir'));
    }
  });
}
