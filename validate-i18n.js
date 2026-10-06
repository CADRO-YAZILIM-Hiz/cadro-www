const fs = require('fs');
const path = require('path');

const root = __dirname;
const languages = ['en', 'de', 'ar'];
const universalSlugs = new Set([
  'ai-adoption-playbook', 'ai-governance', 'ai-kullanim-ilkeleri', 'architecture',
  'compliance', 'excel-vs-cadro', 'faq', 'pay', 'pdks', 'pricing', 'privacy',
  'refund', 'security', 'terms', 'watch', 'webinar', 'app-landing',
]);
const trFiles = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
const mapping = JSON.parse(fs.readFileSync(path.join(root, 'slug-mapping.json'), 'utf8'));
const errors = [];
const warnings = [];

function existsFor(language, slug) {
  return fs.existsSync(path.join(root, language, `${slug}.html`));
}

for (const file of trFiles) {
  const trSlug = path.basename(file, '.html');
  if (trSlug === '404' || trSlug === 'index' || trSlug === 'blog') continue;
  if (universalSlugs.has(trSlug)) continue;
  const entry = mapping[trSlug];
  if (!entry || !entry.en || !entry.de || !entry.ar) {
    warnings.push(`${file}: mapping missing`);
    continue;
  }

  for (const language of languages) {
    if (!existsFor(language, entry[language])) {
      errors.push(`${file}: missing ${language}/${entry[language]}.html`);
    }
  }
}

const htmlFiles = [
  ...trFiles.map((file) => path.join(root, file)),
  ...languages.flatMap((language) => fs.readdirSync(path.join(root, language))
    .filter((file) => file.endsWith('.html'))
    .map((file) => path.join(root, language, file))),
];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  if (/\?{3,}/.test(html)) warnings.push(`${relative}: encoding placeholder detected`);
  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) warnings.push(`${relative}: canonical missing`);
  if (!/<link[^>]+hreflang=["']tr["']/i.test(html) && !relative.endsWith('/404.html')) warnings.push(`${relative}: hreflang cluster missing`);
  if (relative.startsWith('ar/') && !/<html[^>]+lang=["']ar["'][^>]+dir=["']rtl["']/i.test(html) && !/<html[^>]+dir=["']rtl["'][^>]+lang=["']ar["']/i.test(html)) {
    warnings.push(`${relative}: Arabic lang/dir declaration missing`);
  }
}

if (errors.length) {
  console.error(`FAIL: ${errors.length} error(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
}
if (warnings.length) {
  console.warn(`WARN: ${warnings.length} warning(s)`);
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}
if (!errors.length) console.log('PASS: i18n validation completed without errors.');
process.exitCode = errors.length ? 1 : 0;
