import assert from 'node:assert/strict';
import test from 'node:test';
import { auditAll } from './language-audit.mjs';

const results = auditAll();
const findings = results.flatMap(r => r.findings.map(f => ({ ...f, file: r.file })));

test('all indexed-language pages have no high-confidence language leakage in metadata or headings', () => {
  const errors = findings.filter(f => f.severity === 'error');
  assert.deepEqual(errors, [], `Language leaks found:\n${errors.map(f => `${f.file} ${f.field}: expected ${f.expected}, detected ${JSON.stringify(f.detected)}\n${f.sample}`).join('\n')}`);
});

test('language audit covers the complete HTML tree', () => {
  assert.ok(results.length >= 584, `Expected complete HTML tree, found ${results.length}`);
});
