import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { parse } from 'parse5';
import { attribute, elements, inspectHead, root } from './metadata.mjs';

function text(node) { return node?.nodeName === '#text' ? node.value : (node?.childNodes || []).map(text).join(''); }
function diff(metadata, expected) { assert.deepEqual(inspectHead(metadata), expected); }
function countVisibleText(document) { return text(elements(document, n => n.tagName === 'main')[0]).replace(/\s+/g, ' ').trim(); }

test('All severance pages use correct period ceilings and source links', () => {
  const files = ['kidem-tazminati-hesaplama.html', 'en/severance-pay-calculator.html', 'de/abfindungsrechner.html', 'ar/hasb-mkafat.html'];
  const expected = { '2026-h2': 73729.87, '2026-h1': 64948.77, '2025-h2': 53919.68, '2025-h1': 46655.43, '2024-h2': 41828.42, '2024-h1': 35058.58 };
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const document = parse(html.replace(/^\uFEFF/, ''));
    const settings = JSON.parse(text(elements(document, n => attribute(n, 'id') === 'severance-config')[0]));
    assert.equal(elements(document, n => n.tagName === 'link' && attribute(n, 'rel') === 'canonical').length, 1, file);
    assert.equal(elements(document, n => n.tagName === 'title').length, 1, file);
    assert.equal(elements(document, n => attribute(n, 'src')?.endsWith('severance_calculator.js')).length, 1, file);
    assert.deepEqual(Object.keys(settings.periods).length, 6);
    for (const [key, amount] of Object.entries(expected)) assert.equal(settings.periods[key].ceiling, amount, `${file}: ${key}`);
    assert.ok(fs.existsSync(path.join(root, 'severance_calculator.js')));
    assert.ok(html.includes('https://www.csgb.gov.tr/Media/ydelgoxf/kidem-tazminati-yillar-1980-2026.pdf'));
    assert.doesNotMatch(countVisibleText(document), /Temel Formül|Tavan Sınırı|35,058 TRY \(estimated\)|28,410|28\.410/);
    assert.deepEqual(inspectHead(html), [], file);
  }
});

class Node {
  constructor(tagName = 'div', attrs = {}) {
    this.tagName = tagName;
    this.children = [];
    this.attrs = { ...attrs, value: attrs.value || '', hidden: !!attrs.hidden };
    this.listeners = {};
    this.textContent = '';
  }
  get id() { return this.attrs.id; }
  get value() { return this.attrs.value; }
  set value(value) { this.attrs.value = value; }
  get hidden() { return this.attrs.hidden; }
  set hidden(value) { this.attrs.hidden = value; }
  get className() { return this.attrs.class || ''; }
  set className(value) { this.attrs.class = value; }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.append(node); return node; }
  addEventListener(event, handler) { (this.listeners[event] ||= []).push(handler); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  submit() { for (const handler of this.listeners.submit || []) handler({ preventDefault() {} }); }
}
function runCalculator({ period = 'h2', years = 1, months = 0, salary = 100000 } = {}) {
  const ids = ['years', 'months', 'salary', 'period', 'result', 'severance-form', 'severance-config'];
  const nodes = Object.fromEntries(ids.map(id => [id, new Node(id === 'severance-form' ? 'form' : 'input', { id })]));
  nodes.years.value = years;
  nodes.months.value = months;
  nodes.salary.value = salary;
  nodes.period.value = period;
  nodes['severance-config'].textContent = JSON.stringify({ periods: { h2: { label: 'H2', ceiling: 73729.87 }, h1: { label: 'H1', ceiling: 64948.77 } }, messages: { en: { years: 'year error', months: 'month error', salary: 'salary error', period: 'period error', service: 'duration', base: 'base', gross: 'gross', tax: 'tax', net: 'net', capped: 'capped' } } });
  const document = { documentElement: { lang: 'en' }, getElementById: id => nodes[id], createElement: tag => new Node(tag) };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'severance_calculator.js'), 'utf8'), { window: {}, document, console, Number, Intl, JSON });
  nodes['severance-form'].submit();
  const result = nodes.result.children;
  return { nodes, result, rows: result.filter(n => n.className === 'calc-result-row'), warning: result.filter(n => n.className === 'calc-warning')[0] };
}
test('Severance engine caps wage and computes gross/tax/net for exact years', () => {
  const { rows, warning } = runCalculator();
  assert.equal(warning.textContent, 'capped');
  assert.deepEqual(rows.map(row => row.children.map(c => c.textContent)), [[
    'duration', '1/0 — H2'
  ], ['base', 'TRY\u00a073,729.87'], ['gross', 'TRY\u00a073,729.87'], ['tax', '-TRY\u00a0559.61'], ['net', 'TRY\u00a073,170.26']]);
});
test('Severance engine approximates only additional months and rejects partial first year', () => {
  const valid = runCalculator({ salary: 50000, months: 6 });
  assert.equal(valid.warning, undefined);
  assert.equal(valid.rows.length, 5);
  assert.equal(valid.rows.at(-1).children.at(-1).textContent, 'TRY\u00a074,090.88');
  const invalid = runCalculator({ years: 0, months: 6, salary: 50000 });
  assert.ok(invalid.warning.textContent.includes('year error'));
  assert.equal(invalid.rows.length, 0);
});

test('Service worker static cache references only packaged local assets', () => {
  const html = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  const match = html.match(/^const CACHE = '([^']+)';\s*const STATIC_ASSETS = \[([\s\S]*?)\];/m);
  assert.ok(match);
  assert.equal(match[1], 'cadro-v3');
  assert.doesNotMatch(match[2], /components\.min\.js/);
  for (const asset of vm.runInNewContext(`[${match[2]}]`)) assert.ok(fs.existsSync(path.join(root, asset.slice(1))), `Missing static asset: ${asset}`);
});
