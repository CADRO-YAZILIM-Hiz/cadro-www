import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlFiles } from './metadata.mjs';

// Maintenance script: preserve all article content and only unify crawler-facing identities.
export function canonicalUrl(html) {
  const link = html.match(/<link\b[^>]*>/gi)?.find(tag => /\brel="canonical"/i.test(tag));
  return link?.match(/\bhref="([^"]+)"/i)?.[1];
}

export function alignArticleIdentity(html) {
  const canonical = canonicalUrl(html);
  if (!canonical) return html;
  return html.replace(
    /(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (whole, start, raw, end) => {
      const data = JSON.parse(raw);
      if (data['@type'] !== 'Article' || !data.mainEntityOfPage) return whole;
      if (typeof data.mainEntityOfPage === 'string') data.mainEntityOfPage = canonical;
      else if (data.mainEntityOfPage['@id']) data.mainEntityOfPage['@id'] = canonical;
      else return whole;
      return start + JSON.stringify(data) + end;
    },
  );
}

if (process.argv.includes('--write')) {
  const changed = [];
  for (const file of htmlFiles()) {
    if (!/\b(?:makale-|article-|artikel-|mqal-)/.test(file)) continue;
    const current = fs.readFileSync(file, 'utf8');
    const next = alignArticleIdentity(current);
    if (next !== current) {
      fs.writeFileSync(file, next);
      changed.push(path.relative(process.cwd(), file));
    }
  }
  console.log(`Aligned Article JSON-LD canonical identities in ${changed.length} files.`);
  console.log(changed.join('\n'));
}

if (process.argv.includes('--check')) {
  const mismatches = htmlFiles().filter(file => alignArticleIdentity(fs.readFileSync(file, 'utf8')) !== fs.readFileSync(file, 'utf8'));
  if (mismatches.length) throw new Error(`Article identity mismatches: ${mismatches.join(', ')}`);
  console.log('Article JSON-LD identities match their canonical URLs.');
}

if (process.argv.includes('--normalize-modified-whitespace')) {
  const { execFileSync } = await import('node:child_process');
  // Add untracked maintenance scripts explicitly: git diff --name-only omits them.
  const names = new Set(execFileSync('git', ['diff', '--name-only'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean));
  for (const file of ['tests/seo/legacy-redirects.mjs', 'tests/seo/legacy-redirects.test.mjs', 'tests/seo/fix-article-identities.mjs', 'tests/seo/apply-nginx-redirects.sh', '.github/workflows/deploy-www.yml']) {
    if (fs.existsSync(file)) names.add(file);
  }
  const results = Array.from(names).map(file => {
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(/[\t ]+(?=\r?\n)/g, '').replace(/\r/g, '');
    const counts = {
      crlf: (before.match(/\r\n/g) || []).length,
      loneCR: (before.match(/\r(?!\n)/g) || []).length,
    };
    if (before !== after) fs.writeFileSync(file, after);
    return { file, changed: before !== after, ...counts };
  });
  console.log(JSON.stringify(results.filter(result => result.changed || result.loneCR), null, 2));
}
