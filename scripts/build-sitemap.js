const fs = require('fs');
const path = require('path');

const root = process.argv[2] || require('path').resolve(__dirname, '..');
const baseUrl = 'https://www.cadro.io';
const langs = ['tr', 'en', 'de', 'ar'];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content);
}

function getLocalizedUrl(filename, lang) {
  if (lang === 'tr') {
    return filename === 'index.html' ? `${baseUrl}/` : `${baseUrl}/${filename}`;
  }
  return filename === 'index.html' ? `${baseUrl}/${lang}/` : `${baseUrl}/${lang}/${filename}`;
}

function parseSeedSitemap() {
  const xml = read(path.join(root, 'sitemap.xml'));
  const blocks = [...xml.matchAll(/<url>\s*<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>\s*<priority>(.*?)<\/priority>\s*<\/url>/gs)];
  const seed = new Map();
  blocks.forEach(([, loc, lastmod, priority]) => {
    const normalized = loc === `${baseUrl}/` ? 'index.html' : loc.replace(`${baseUrl}/`, '');
    seed.set(normalized, { lastmod, priority });
  });
  return seed;
}

function buildUrlEntry(filename, lang, meta) {
  const loc = getLocalizedUrl(filename, lang);
  const alternates = langs.map((item) => `    <xhtml:link rel="alternate" hreflang="${item}" href="${getLocalizedUrl(filename, item)}" />`).join('\n');
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${getLocalizedUrl(filename, 'tr')}" />`;
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    alternates,
    xDefault,
    `    <lastmod>${meta.lastmod}</lastmod>`,
    `    <priority>${meta.priority}</priority>`,
    '  </url>',
  ].join('\n');
}

function main() {
  const seed = parseSeedSitemap();
  const files = fs.readdirSync(root)
    .filter((name) => name.endsWith('.html') && name !== 'index.nginx-debian.html')
    .sort();

  const defaultMeta = {
    lastmod: '2026-04-18T00:00:00+00:00',
    priority: '0.70',
  };

  const body = [];
  files.forEach((filename) => {
    const meta = seed.get(filename) || defaultMeta;
    langs.forEach((lang) => {
      body.push(buildUrlEntry(filename, lang, meta));
    });
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...body,
    '</urlset>',
    '',
  ].join('\n');

  write(path.join(root, 'sitemap.xml'), xml);
}

main();
