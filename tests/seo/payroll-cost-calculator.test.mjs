import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { parse } from 'parse5';
import { attribute, elements, inspectHead, root } from './metadata.mjs';

const ids = ['gross-salary','gross-salary-error','emp-count','emp-count-error','payroll-results','kidem-check','prim-check','tesvik-check','r-gross','r-sgk','r-isizlik','r-kidem','r-prim','r-tesvik','r-total','r-annual','r-team','kidem-row','prim-row','tesvik-row','team-row','r-annual-label','r-cost-note','payroll-cost-form'];
function calculate({ gross = 50000, count = 1, kidem = true, bonus = false, incentive = false } = {}) {
  const nodes = Object.fromEntries(ids.map(id => [id, { value: 0, hidden: false, checked: false, listeners: {}, setAttribute(name, value) { this[name] = value; }, addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); } }]));
  nodes['gross-salary'].value = gross;
  nodes['emp-count'].value = count;
  nodes['kidem-check'].checked = kidem;
  nodes['prim-check'].checked = bonus;
  nodes['tesvik-check'].checked = incentive;
  const document = { getElementById: id => nodes[id] };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'payroll-cost-calculator.js'), 'utf8'), { document, console, Number });
  nodes['payroll-cost-form'].listeners.input[0]();
  return nodes;
}
test('Payroll cost keeps SGK and unemployment separate; year/team totals follow declared inputs', () => {
  const basic = calculate();
  assert.equal(basic['r-sgk'].textContent, '₺10.250,00');
  assert.equal(basic['r-isizlik'].textContent, '₺1.000,00');
  assert.equal(basic['r-total'].textContent, '₺65.416,67');
  assert.equal(basic['r-annual'].textContent, '₺785.000,00');
  const incentive = calculate({ incentive: true, bonus: false });
  assert.equal(incentive['r-sgk'].textContent, '₺7.750,00');
  assert.equal(incentive['r-isizlik'].textContent, '₺1.000,00');
  assert.equal(incentive['r-total'].textContent, '₺62.916,67');
  const partial = calculate({ kidem: false, incentive: true });
  assert.equal(partial['r-total'].textContent, '₺58.750,00');
  const team = calculate({ count: 2, bonus: true });
  assert.equal(team['r-total'].textContent, '₺69.583,33');
  assert.equal(team['r-annual'].textContent, '₺1.670.000,00');
  const invalid = calculate({ gross: 0 });
  assert.equal(invalid['payroll-results'].hidden, true);
  assert.ok(invalid['gross-salary-error'].textContent.length > 0);
});
test('Payroll form exposes maintained engine and methodology/sources', () => {
  const html = fs.readFileSync(path.join(root, 'bordro-maliyet-hesaplama.html'), 'utf8');
  const doc = parse(html);
  assert.deepEqual(inspectHead(html), []);
  assert.equal(elements(doc, n => attribute(n, 'src')?.endsWith('payroll-cost-calculator.js')).length, 1);
  assert.equal(elements(doc, n => attribute(n, 'id') === 'payroll-cost-form').length, 1);
  assert.ok(html.includes('https://www.mevzuat.gov.tr/mevzuatmetin/1.5.5510.pdf'));
  assert.ok(html.includes('https://www.sgk.gov.tr/'));
});
