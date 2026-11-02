import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'parse5';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../', import.meta.url));
const { absoluteUrl, validateDate, validateTarget, generateSitemap, main } = require('../../generate-blog-sitemap.js');
const site = 'https://www.cadro.io';
const today = '2026-11-01';
const badUrls = [
  `${site}/en/makale-ik-roi-Calculatema-formulu.html`,
  `${site}/en/makale-ik-roi-Calculatema-ornek-senaryolar.html`,
  `${site}/en/makale-prediktif-ik-sadakat-2026.html`,
  `${site}/de/makale-prediktif-ik-sadakat-2026.html`,
];
const goodUrls = [
  `${site}/en/article-hr-roi-calculation-formula.html`,
  `${site}/en/article-hr-roi-calculation-scenarios.html`,
  `${site}/en/article-predictive-hr-loyalty-2026.html`,
  `${site}/de/artikel-praediktive-hr-mitarbeiterbindung-2026.html`,
];

function fixture(t) {
  const baseRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cadro-sitemap-'));
  t.after(() => fs.rmSync(baseRoot, { recursive: true, force: true }));
  const write = (file, content) => {
    const target = path.join(baseRoot, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  for (const dir of ['', 'en/', 'de/', 'ar/']) write(`${dir}blog.html`, '');
  const page = '<html><head><link href="https://www.cadro.io/en/article.html" rel="canonical"><meta content="index,follow" name="robots"></head><body></body></html>';
  write('en/article.html', page);
  return { baseRoot, write, page, options: { baseRoot, today } };
}

const card = (href = 'article.html', date = '2026-10-01') =>
  `<article data-publish-date="${date}" class="blog-card"><a class="read-more" href="${href}">Read</a></article>`;

test('Import has no sitemap write side effects', () => {
  const file = path.join(root, 'blog-sitemap.xml');
  const before = fs.statSync(file).mtimeMs;
  const content = fs.readFileSync(file);
  delete require.cache[require.resolve('../../generate-blog-sitemap.js')];
  require('../../generate-blog-sitemap.js');
  assert.equal(fs.statSync(file).mtimeMs, before);
  assert.deepEqual(fs.readFileSync(file), content);
});

test('Missing published target fails before writing', t => {
  const f = fixture(t);
  f.write('en/blog.html', card('missing.html'));
  f.write('blog-sitemap.xml', 'sentinel');
  assert.throws(() => main([], f.options), /missing locally/);
  assert.equal(fs.readFileSync(path.join(f.baseRoot, 'blog-sitemap.xml'), 'utf8'), 'sentinel');
  fs.rmSync(path.join(f.baseRoot, 'blog-sitemap.xml'));
  assert.throws(() => main([], f.options), /missing locally/);
  assert.equal(fs.existsSync(path.join(f.baseRoot, 'blog-sitemap.xml')), false);
});

test('Canonical accepts either attribute order, case and single quotes', t => {
  const f = fixture(t);
  f.write('en/blog.html', card());
  for (const link of [
    '<link href="https://www.cadro.io/en/article.html" rel="canonical">',
    "<LINK REL='canonical' HREF='https://www.cadro.io/en/article.html'>",
  ]) {
    f.write('en/article.html', `<html><head>${link}</head></html>`);
    assert.equal(generateSitemap(f.options).urls.length, 1);
  }
});

test('noindex is rejected regardless of attribute order', t => {
  const f = fixture(t);
  f.write('en/blog.html', card());
  for (const meta of [
    '<meta name="robots" content="noindex,follow">',
    "<meta content='follow, NOINDEX' name='robots'>",
    '<meta content="noindex" name="googlebot">',
    '<meta name="bingbot" content="noindex">',
  ]) {
    f.write('en/article.html', f.page.replace('</head>', `${meta}</head>`));
    assert.throws(() => generateSitemap(f.options), /noindex/);
  }
});

test('Missing, conflicting and non-exact canonicals fail', t => {
  const f = fixture(t);
  f.write('en/blog.html', card());
  for (const links of [
    '', '<link rel="canonical" href="article.html">',
    `<link rel="canonical" href="${site}/en/other.html">`,
    `<link rel="canonical" href="${site}/en/article.html#fragment">`,
    `<link rel="canonical" href="${site}/en/article.html"><link href="${site}/en/other.html" rel="canonical">`,
    `<!-- <link rel="canonical" href="${site}/en/article.html"> -->`,
    `<script>const fake = '<link rel="canonical" href="${site}/en/article.html">';</script>`,
  ]) {
    f.write('en/article.html', `<html><head>${links}</head></html>`);
    assert.throws(() => generateSitemap(f.options), /canonical/);
  }
});

test('Invalid publication dates fail rather than silently skipping', t => {
  const f = fixture(t);
  for (const date of ['', 'invalid', '2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '2026-10-01T00:00:00Z']) {
    assert.throws(() => validateDate(date), /Invalid publication date/);
    f.write('en/blog.html', card('article.html', date));
    assert.throws(() => generateSitemap(f.options), /Invalid publication date/);
  }
  assert.doesNotThrow(() => validateDate('2024-02-29'));
  f.write('en/blog.html', '<article class="blog-card"><a class="read-more" href="article.html">Read</a></article>');
  assert.throws(() => generateSitemap(f.options), /Invalid publication date/);
});

test('Future cards skip missing and unsafe targets; today is included', t => {
  const f = fixture(t);
  f.write('en/blog.html', card('missing.html', '2026-11-02') + card('../unsafe.html', '2026-11-02') + card('article.html', today));
  assert.deepEqual(generateSitemap(f.options).urls.map(entry => entry.date), [today]);
});

test('Safe absolute, root-relative and directory-relative URLs resolve correctly', t => {
  const f = fixture(t);
  for (const href of ['article.html', './article.html', '/en/article.html', `${site}/en/article.html`]) {
    assert.equal(absoluteUrl('en/', href), `${site}/en/article.html`);
    f.write('en/blog.html', card(href));
    assert.equal(generateSitemap(f.options).urls[0].url, `${site}/en/article.html`);
  }
});

test('Unsafe URLs fail before normalization or filesystem access', t => {
  const f = fixture(t);
  for (const href of [
    '', '//www.cadro.io/en/article.html', '//evil.test/x.html', 'https://evil.test/x.html',
    'http://www.cadro.io/en/article.html', 'https://www.cadro.io.evil.test/x.html',
    'https://user@www.cadro.io/en/article.html', 'https://www.cadro.io:444/en/article.html',
    'javascript:alert(1)', 'file:///en/article.html', 'data:text/html,hi',
    '../article.html', 'nested/../article.html', '././article.html', '/en/../article.html',
    `${site}/en/../article.html`, '%2e%2e/article.html', '%252e%252e/article.html',
    'en%2farticle.html', 'en\\article.html', 'article.html?x=1', 'article.html?',
    'article.html#x', 'article.html#', ' article.html', 'article.html\n',
    'en//article.html', 'article.xml', 'C:/article.html',
  ]) {
    assert.throws(() => absoluteUrl('en/', href), /Unsafe|outside-site/, href);
    f.write('en/blog.html', card(href));
    assert.throws(() => generateSitemap(f.options), /Unsafe|outside-site/, href);
  }
});

test('Duplicate cards deduplicate with latest date and stable sorted XML', t => {
  const f = fixture(t);
  f.write('en/second.html', f.page.replace('/article.html', '/second.html'));
  const cards = [card('article.html', '2026-09-01'), card('second.html'), card('article.html'), card('./article.html')];
  f.write('en/blog.html', cards.join(''));
  const first = generateSitemap(f.options);
  f.write('en/blog.html', cards.reverse().join(''));
  assert.equal(generateSitemap(f.options).xml, first.xml);
  assert.equal(first.urls.length, 2);
  assert.deepEqual(first.urls.map(entry => entry.date), ['2026-10-01', '2026-10-01']);
  assert.equal(first.urls[0].url, `${site}/en/article.html`);
});

test('--check never writes on match, mismatch or missing XML', t => {
  const f = fixture(t);
  f.write('en/blog.html', card());
  const file = path.join(f.baseRoot, 'blog-sitemap.xml');
  assert.throws(() => main(['--check'], f.options), /differs/);
  assert.equal(fs.existsSync(file), false);
  f.write('blog-sitemap.xml', 'sentinel');
  assert.throws(() => main(['--check'], f.options), /differs/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'sentinel');
  f.write('blog-sitemap.xml', generateSitemap(f.options).xml);
  const mtime = fs.statSync(file).mtimeMs;
  assert.doesNotThrow(() => main(['--check'], f.options));
  assert.equal(fs.statSync(file).mtimeMs, mtime);
  assert.throws(() => main(['--unknown'], f.options), /Usage/);
});

test('Excluded listing targets stay excluded; AR links without read-more stay excluded', t => {
  const f = fixture(t);
  f.write('en/blog.html', ['blog.html', '/en/index.html', `${site}/404.html`].map(href => card(href)).join(''));
  f.write('ar/blog.html', '<article class="blog-card" data-publish-date="2026-10-01"><a href="missing.html">Read</a></article>');
  assert.equal(generateSitemap(f.options).urls.length, 0);
});

test('All 176 targets at the checked-in sitemap cutoff are local, indexable and exactly canonical', () => {
  const result = generateSitemap({ baseRoot: root, today: '2026-10-27' });
  assert.equal(result.urls.length, 176);
  for (const { url } of result.urls) {
    validateTarget(root, url);
    // Independent HTML parser verifies the canonical value, not just the generator regex.
    const document = parse(fs.readFileSync(path.join(root, new URL(url).pathname.slice(1)), 'utf8'));
    const canonical = [];
    function visit(node) {
      const attrs = Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
      if (node.tagName === 'link' && (attrs.rel || '').split(/\s+/).includes('canonical')) canonical.push(attrs.href);
      for (const child of node.childNodes || []) visit(child);
    }
    visit(document);
    assert.ok(canonical.length > 0 && canonical.every(value => value === url), url);
  }
  for (const url of goodUrls) assert.ok(result.urls.some(entry => entry.url === url), url);
  for (const url of badUrls) assert.ok(!result.urls.some(entry => entry.url === url), url);
});

for (const url of badUrls) {
  test(`Checked-in sitemap excludes obsolete URL: ${url}`, () => {
    const xml = fs.readFileSync(path.join(root, 'blog-sitemap.xml'), 'utf8');
    assert.ok(!xml.includes(`<loc>${url}</loc>`), `Obsolete URL remains: ${url}`);
  });
}

test('Checked-in sitemap matches validated published cards as of today', () => {
  const xml = fs.readFileSync(path.join(root, 'blog-sitemap.xml'), 'utf8').replace(/\r\n/g, '\n');
  const generated = generateSitemap({ baseRoot: root }).xml;
  assert.ok(xml === generated, 'Checked-in XML differs from published cards (including obsolete URLs and newly published dates).');
});