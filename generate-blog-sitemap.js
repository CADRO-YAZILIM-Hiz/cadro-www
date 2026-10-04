const fs = require('fs');
const path = require('path');

const root = __dirname;
const site = 'https://www.cadro.io';
const languages = {
  tr: { dir: '', blog: 'blog.html' },
  en: { dir: 'en/', blog: 'blog.html' },
  de: { dir: 'de/', blog: 'blog.html' },
  ar: { dir: 'ar/', blog: 'blog.html' },
};

const excluded = new Set([
  '404.html',
  'blog.html',
  'index.html',
]);

function readCards(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const cardRegex = /<article\s+class="blog-card"[^>]*data-publish-date="([^"]+)"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*class="read-more"/gi;
  return [...html.matchAll(cardRegex)].map((match) => ({
    date: match[1],
    href: match[2],
  }));
}

function absoluteUrl(dir, href) {
  return `${site}/${dir}${href.replace(/^\.\//, '')}`;
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

const today = new Date().toISOString().slice(0, 10);
const entries = new Map();

for (const [language, config] of Object.entries(languages)) {
  const cards = readCards(path.join(root, config.dir, config.blog));
  for (const card of cards) {
    if (card.date > today || excluded.has(card.href)) continue;
    const url = absoluteUrl(config.dir, card.href);
    entries.set(url, { url, date: card.date, language });
  }
}

const urls = [...entries.values()].sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url));
const body = urls.map(({ url, date }) => `  <url><loc>${escapeXml(url)}</loc><lastmod>${date}</lastmod></url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
fs.writeFileSync(path.join(root, 'blog-sitemap.xml'), xml);
console.log(`Generated blog-sitemap.xml with ${urls.length} published URLs as of ${today}.`);
