import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { attribute, elements, htmlFiles, root } from './metadata.mjs';

export function pages() {
  return htmlFiles().map(file => {
    const document = parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    const head = elements(document, node => node.tagName === 'head')[0];
    const links = elements(head, node => node.tagName === 'link');
    return {
      file: path.relative(root, file).replaceAll(path.sep, '/'),
      lang: attribute(elements(document, node => node.tagName === 'html')[0], 'lang'),
      canonical: attribute(links.find(node => attribute(node, 'rel') === 'canonical'), 'href'),
      noindex: elements(head, node => node.tagName === 'meta' && /^(robots|googlebot)$/i.test(attribute(node, 'name') || '')
        && /\bnoindex\b/i.test(attribute(node, 'content') || '')).length > 0,
      alternates: links.filter(node => attribute(node, 'hreflang')).map(node => ({ lang: attribute(node, 'hreflang'), url: attribute(node, 'href') })),
    };
  });
}

export function audit(all = pages()) {
  const byCanonical = new Map(all.map(page => [page.canonical, page]));
  const failures = [];
  for (const page of all.filter(page => !page.noindex)) {
    const languages = new Set();
    for (const alternate of page.alternates) {
      const target = byCanonical.get(alternate.url);
      let reason;
      if (languages.has(alternate.lang)) reason = 'duplicate-language';
      else if (!target) reason = 'missing-or-noncanonical';
      else if (target.noindex) reason = 'noindex-target';
      else if (alternate.lang !== 'x-default' && target.lang !== alternate.lang) reason = 'wrong-language';
      else if (!target.alternates.some(link => link.lang === page.lang && link.url === page.canonical)) reason = 'nonreciprocal';
      languages.add(alternate.lang);
      if (reason) failures.push({ file: page.file, ...alternate, reason });
    }
    if (page.alternates.length && !page.alternates.some(link => link.lang === page.lang && link.url === page.canonical)) {
      failures.push({ file: page.file, reason: 'self-reference-missing' });
    }
  }
  return failures;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const all = pages();
  const failures = audit(all);
  console.log(JSON.stringify({ checked: all.length, failures }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
}