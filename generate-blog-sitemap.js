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
  const html = markup(fs.readFileSync(filePath, 'utf8'));
  const cards = [];
  for (const match of html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article\s*>/gi)) {
    const attrs = attributes(match[1]);
    if (!(attrs.class || '').split(/\s+/).includes('blog-card')) continue;
    // Only read-more links are sitemap cards (the AR listing has no such links).
    const link = [...match[2].matchAll(/<a\b([^>]*)>/gi)]
      .map(anchor => attributes(anchor[1]))
      .find(anchor => (anchor.class || '').split(/\s+/).includes('read-more'));
    if (link) cards.push({ date: attrs['data-publish-date'], href: link.href });
  }
  return cards;
}

function absoluteUrl(dir, href) {
  if (typeof href !== 'string' || !href || /[\s\\%?#]/.test(href) || href.startsWith('//')) {
    throw new Error(`Unsafe target: ${href}`);
  }
  // Check the raw path BEFORE URL normalizes away traversal segments.
  const rawPath = href.startsWith(`${site}/`) ? href.slice(site.length) : href;
  const relativePath = rawPath.replace(/^\.\//, '').replace(/^\//, '');
  if (!/^[A-Za-z0-9_./-]+$/.test(relativePath) ||
      relativePath.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Unsafe or outside-site target: ${href}`);
  }
  const url = new URL(href, `${site}/${dir}`);
  if (url.origin !== site || url.username || url.password || url.search || url.hash ||
      !url.pathname.endsWith('.html')) {
    throw new Error(`Unsafe or outside-site target: ${href}`);
  }
  return url.href;
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Ignore comments and raw-text elements when looking for real HTML tags.
function markup(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
}

function attributes(tag) {
  const attrs = Object.create(null);
  const pattern = /([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    if (Object.hasOwn(attrs, name)) throw new Error(`Duplicate HTML attribute: ${name}`);
    attrs[name] = match[2] ?? match[3] ?? match[4];
  }
  return attrs;
}

function validateDate(date) {
  const parsed = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00.000Z`) : new Date(NaN);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid publication date: ${date}`);
  }
}

function validateTarget(baseRoot, url) {
  const safeUrl = absoluteUrl('', url);
  const realRoot = fs.realpathSync(baseRoot);
  const file = path.resolve(realRoot, new URL(safeUrl).pathname.slice(1));
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`Published target missing locally: ${url}`);
  }
  const relative = path.relative(realRoot, fs.realpathSync(file));
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`Published target outside local root: ${url}`);
  }
  const html = markup(fs.readFileSync(file, 'utf8'));
  for (const match of html.matchAll(/<meta\b([^>]*)>/gi)) {
    const attrs = attributes(match[1]);
    if (/^(robots|googlebot|bingbot)$/i.test(attrs.name || '') &&
        /\bnoindex\b/i.test(attrs.content || '')) {
      throw new Error(`Published target has noindex: ${url}`);
    }
  }
  const canonicals = [...html.matchAll(/<link\b([^>]*)>/gi)]
    .map(match => attributes(match[1]))
    .filter(attrs => (attrs.rel || '').toLowerCase().split(/\s+/).includes('canonical'));
  if (!canonicals.length || canonicals.some(canonical => canonical.href !== url)) {
    throw new Error(`Published target canonical must exactly equal ${url}`);
  }
}

function generateSitemap({ baseRoot = root, today = new Date().toISOString().slice(0, 10) } = {}) {
  validateDate(today);
  const entries = new Map();
  for (const [language, config] of Object.entries(languages)) {
    for (const card of readCards(path.join(baseRoot, config.dir, config.blog))) {
      validateDate(card.date);
      if (card.date > today) continue;
      const url = absoluteUrl(config.dir, card.href);
      if (excluded.has(path.posix.basename(new URL(url).pathname))) continue;
      validateTarget(baseRoot, url);
      const previous = entries.get(url);
      // Latest published date wins, independently of duplicate card ordering.
      if (!previous || card.date > previous.date) entries.set(url, { url, date: card.date, language });
    }
  }
  const urls = [...entries.values()].sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url));
  const body = urls.map(({ url, date }) => `  <url><loc>${escapeXml(url)}</loc><lastmod>${date}</lastmod></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  return { xml, urls, today };
}

function main(args = process.argv.slice(2), options = {}) {
  if (args.some(arg => arg !== '--check')) throw new Error('Usage: node generate-blog-sitemap.js [--check]');
  // Complete validation before touching the output, including in write mode.
  const result = generateSitemap(options);
  const output = path.join(options.baseRoot || root, 'blog-sitemap.xml');
  if (args.includes('--check')) {
    if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8').replace(/\r\n/g, '\n') !== result.xml) {
      throw new Error('blog-sitemap.xml differs from validated published cards; update the checked-in XML.');
    }
    console.log(`Checked blog-sitemap.xml: ${result.urls.length} published URLs as of ${result.today}.`);
  } else {
    fs.writeFileSync(output, result.xml);
    console.log(`Generated blog-sitemap.xml with ${result.urls.length} published URLs as of ${result.today}.`);
  }
  return result;
}

module.exports = { readCards, absoluteUrl, validateDate, validateTarget, generateSitemap, main };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
