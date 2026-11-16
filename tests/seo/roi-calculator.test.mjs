import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { root } from './metadata.mjs';

function run(overrides = {}) {
  const ids = ['roi-form','roi-results','roi-input-error','roi-days-error','ik-count','manual-hours','automation-rate','workweeks','ik-salary','hourly-cost','hire-per-year','days-before','days-after','vacancy-day-cost','monthly-plan-cost','hourly-cost-val','derive-hourly','res-annual-save','res-annual-net','res-payback','res-3yr','res-roi','res-efficiency','res-hiring','res-benefit-detail'];
  const defaults = { 'ik-count': 3, 'manual-hours': 10, 'automation-rate': 20, workweeks: 52, 'ik-salary': 45000, 'hourly-cost': 100, 'hire-per-year': 2, 'days-before': 30, 'days-after': 20, 'vacancy-day-cost': 50, 'monthly-plan-cost': 1200 };
  const nodes = Object.fromEntries(ids.map(id => [id, { value: defaults[id] ?? 0, hidden: false, textContent: '', listeners: {}, setAttribute(k, v) { this[k] = v; }, addEventListener(event, fn) { (this.listeners[event] ||= []).push(fn); } }]));
  for (const [id, value] of Object.entries(overrides)) nodes[id].value = value;
  for (const id of ids) Object.defineProperty(nodes[id], 'valueAsNumber', { get() { return this.value; }, set(value) { this.value = value; } });
  const document = { getElementById: id => nodes[id] };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'hr-roi-calculator.js'), 'utf8'), { document, console, Number });
  nodes['roi-form'].listeners.input[0]();
  return nodes;
}

test('ROI follows declared hours/hiring benefit formula without external benchmark', () => {
  const nodes = run();
  assert.equal(nodes['res-annual-save'].textContent, '₺32.200,00');
  assert.equal(nodes['res-annual-net'].textContent, '₺17.800,00');
  assert.equal(nodes['res-efficiency'].textContent, '312 saat/yıl');
  assert.equal(nodes['res-hiring'].textContent, '10 gün/pozisyon');
  assert.equal(nodes['res-payback'].textContent, '5,4 ay');
  assert.equal(nodes['res-3yr'].textContent, '₺53.400,00');
  assert.equal(nodes['res-roi'].textContent, '%123,6');
});

test('ROI shows no ratio without plan cost and rejects reversed hiring dates', () => {
  const noCost = run({ 'monthly-plan-cost': 0 });
  assert.equal(noCost['roi-results'].hidden, true);
  assert.equal(noCost['roi-input-error'].hidden, false);
  const reversed = run({ 'days-before': 20, 'days-after': 30 });
  assert.equal(reversed['roi-results'].hidden, true);
  assert.equal(reversed['roi-days-error'].hidden, false);
});

test('ROI hourly derivation preserves normal gross/176 convention', () => {
  const nodes = run();
  assert.equal(nodes['hourly-cost-val'].textContent, '₺255,68');
  nodes['derive-hourly'].listeners.click[0]();
  assert.equal(nodes['hourly-cost'].value, (45000 / 176).toFixed(2));
});
