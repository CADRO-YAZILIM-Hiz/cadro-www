const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// CSS minifier
function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,.])\s*/g, '$1')
    .replace(/[\n\r\t]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*!important/g, '!important')
    .replace(/;}/g, '}')
    .trim();
}

// JS minifier (Terser)
async function minifyJS(code) {
  const { minify } = require('terser');
  const result = await minify(code, { compress: false, mangle: false, format: { comments: false } });
  if (result.error) throw result.error;
  return result.code;
}

// Minify all CSS files
function buildCSS() {
  const src = path.join(ROOT, 'styles.css');
  const dst = path.join(ROOT, 'styles.min.css');
  const css = fs.readFileSync(src, 'utf8');
  const min = minifyCSS(css);
  fs.writeFileSync(dst, min);
  const orig = Buffer.byteLength(css, 'utf8');
  const now = Buffer.byteLength(min, 'utf8');
  console.log(`styles.css: ${orig} -> ${now} bytes (${Math.round((1-now/orig)*100)}% reduction)`);
}

// Minify all JS files in root
async function buildJS() {
  const jsFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !f.endsWith('.min.js') && f !== 'scripts/build-prod.js' && f !== 'service-worker.js');
  for (const file of jsFiles) {
    const src = path.join(ROOT, file);
    const dst = path.join(ROOT, file.replace('.js', '.min.js'));
    const js = fs.readFileSync(src, 'utf8');
    const min = await minifyJS(js);
    fs.writeFileSync(dst, min);
    const orig = Buffer.byteLength(js, 'utf8');
    const now = Buffer.byteLength(min, 'utf8');
    console.log(`${file}: ${orig} -> ${now} bytes (${Math.round((1-now/orig)*100)}% reduction)`);
  }
}

// Collect all HTML files recursively
function collectHTML(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'scripts' && !entry.name.startsWith('.')) {
      files = files.concat(collectHTML(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

// Update HTML files: replace .css -> .min.css, .js -> .min.js (only for root-level files)
function updateHTML() {
  const htmlFiles = collectHTML(ROOT);
  const cssReplace = [['./styles.css', './styles.min.css'], ['href="styles.css', 'href="styles.min.css']];
  const jsFiles = ['site-config.js', 'app.js', 'components.js', 'page-content.js', 'page-content-tr.js', 'page-content-en.js', 'page-content-de.js', 'page-content-ar.js', 'lang-all.js', 'lang-tr.js', 'lang-en.js', 'lang-de.js', 'lang-ar.js'];
  
  let count = 0;
  for (const file of htmlFiles) {
    let html = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Replace styles.css with styles.min.css
    if (html.includes('styles.css') && !html.includes('styles.min.css')) {
      html = html.replace(/href="([^"]*)styles\.css"/g, (match, prefix) => {
        return match.replace('styles.css', 'styles.min.css');
      });
      modified = true;
    }

    // Replace root JS files with .min.js versions
    for (const jsFile of jsFiles) {
      const pattern = new RegExp(`src="([^"]*)${jsFile.replace(/\./g, '\\.')}"`, 'g');
      if (pattern.test(html)) {
        html = html.replace(pattern, (match) => match.replace('.js"', '.min.js"'));
        modified = true;
      }
    }

    if (modified) {
      // Also update robots.txt path for sitemap
      fs.writeFileSync(file, html, 'utf8');
      count++;
    }
  }
  console.log(`\nUpdated ${count} HTML files with minified references`);
}

(async () => {
  console.log('=== CADRO Production Build ===\n');
  buildCSS();
  await buildJS();
  updateHTML();
  console.log('\nBuild complete. Run `node scripts/build-prod.js` before deployment.');
})();
