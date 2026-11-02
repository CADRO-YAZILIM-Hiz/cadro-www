import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { htmlFiles, inspectHead, root } from './metadata.mjs';

const metadata = '<title>Example</title><meta name="description" content="Example"><link rel="canonical" href="https://www.cadro.io/">';

test('Accept valid head metadata in either attribute order', () => {
  assert.deepEqual(inspectHead(`<html><head>${metadata}</head><body></body></html>`), []);
});

for (const broken of ['\uFEFF', '>', "'ler için eski açıklama.\">", '<div>Not metadata</div>']) {
  test(`Reject metadata moved into body by ${JSON.stringify(broken)}`, () => {
    assert.ok(inspectHead(`<html><head>${broken}${metadata}</head><body></body></html>`).length);
  });
}

test('Leading UTF-8 BOM does not invalidate head metadata', () => {
  assert.deepEqual(inspectHead(`\uFEFF<!doctype html><html><head>${metadata}</head><body></body></html>`), []);
});

test('Body JSON-LD is allowed', () => {
  assert.deepEqual(inspectHead(`<html><head>${metadata}</head><body><script type="application/ld+json">{"@type":"Article"}</script></body></html>`), []);
});

test('Every site page keeps SEO metadata inside parsed head', () => {
  const failures = htmlFiles().flatMap(file => inspectHead(fs.readFileSync(file, 'utf8'))
    .map(error => `${path.relative(root, file)}: ${error}`));
  assert.deepEqual(failures, []);
});