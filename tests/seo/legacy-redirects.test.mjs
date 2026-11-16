import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { extraLegacyRedirects, readLegacyRedirects, readNginxRedirects, serverRulesWithLegacyRedirects, unresolvedLegacyUrls } from './legacy-redirects.mjs';
import { htmlFiles, root } from './metadata.mjs';

test('Generated GSC block stays unique when maintenance is repeated', () => {
  const current = fs.readFileSync(`${root}/.htaccess`, 'utf8');
  const once = serverRulesWithLegacyRedirects(current, 'apache');
  const twice = serverRulesWithLegacyRedirects(once, 'apache');
  assert.equal(twice, once);
  assert.equal(twice.match(/GSC LEGACY 404 REDIRECTS \(2026-11-16\)/g)?.length, 1);
  assert.equal(twice.includes('/en/hr-software.html /en/hr-software.html'), false);
});

for (const [server, readRedirects] of [['Apache', readLegacyRedirects], ['nginx', readNginxRedirects]]) {
  test(`${server}: every GSC legacy URL has a safe redirect to an existing local HTML target`, () => {
    const expectedSources = [
      '/ar/mqal-mshrat-ada-msar-twzyf.html',
      '/de/makale-ik-roi-Calculatema-formulu.html',
      '/ar/makale-ik-roi-Calculatema-ornek-senaryolar.html',
      '/en/makale-ik-roi-Calculatema-ornek-senaryolar.html',
      '/Artikel-HR-analitigi-12-kpi.html',
      '/en/bordro-maliyet-Berechnenma.html',
    ];
    const redirects = readRedirects(root);
    for (const source of expectedSources) assert.ok(redirects[source], `No 301 for ${source}`);
    assert.deepEqual(unresolvedLegacyUrls(root, redirects), []);
  });

  test(`${server}: GSC legacy redirects remain pinned and do not target another redirect`, () => {
    const redirects = readRedirects(root);
    for (const [source, target] of Object.entries(extraLegacyRedirects)) {
      assert.equal(redirects[source], target);
      assert.equal(redirects[target], undefined, `Redirect chain at ${source} -> ${target}`);
    }
  });
}

test('Article JSON-LD identifies the page own canonical URL without conflicting head metadata', () => {
  const failures = [];
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    if (!/\b(?:makale-|article-|artikel-|mqal-)/.test(file)) continue;
    const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*>/i)?.[0].match(/href="([^"]+)"/i)?.[1];
    assert.ok(canonical, `Canonical missing: ${file}`);
    const metaNames = [...html.matchAll(/<meta\b[^>]*\bname="(robots|description)"[^>]*>/gi)].map(match => match[1]);
    if (new Set(metaNames).size !== metaNames.length) failures.push(`${file}: duplicate description/robots metadata`);
    for (const script of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
      const data = JSON.parse(script[1]);
      if (data['@type'] !== 'Article' || !data.mainEntityOfPage) continue;
      const mainEntity = typeof data.mainEntityOfPage === 'string' ? data.mainEntityOfPage : data.mainEntityOfPage['@id'];
      if (mainEntity !== canonical) failures.push(`${file}: ${mainEntity} != ${canonical}`);
    }
  }
  assert.deepEqual(failures, []);
});
