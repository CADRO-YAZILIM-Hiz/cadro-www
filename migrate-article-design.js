const fs = require('fs');
const path = require('path');
const root = __dirname;
const blog = fs.readFileSync(path.join(root, 'blog.html'), 'utf8');
const scheduledLinks = [...blog.matchAll(/data-publish-date="(2026-(?:10-(?:0[5-9]|1[0-9])|11-0[1-3]))"[^>]*>[\s\S]*?<a href="([^"]+)"[^>]*class="read-more"/g)].map(m => [m[1], m[2]]);
const links = new Map();
for (const [date, href] of scheduledLinks) {
  const trFile = path.join(root, href);
  if (!fs.existsSync(trFile)) continue;
  links.set(href, date);
  const source = fs.readFileSync(trFile, 'utf8');
  for (const match of source.matchAll(/<link rel="alternate" hreflang="(?:en|de|ar)" href="https?:\/\/www\.cadro\.io\/([^"]+)"/gi)) {
    links.set(match[1], date);
  }
}
const skip = new Set(['makale-2026-asgari-ucret-net-hesabi.html']);
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
for (const [href, date] of links) {
  if (skip.has(href)) continue;
  const file = path.join(root, href);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('class="article-container"')) continue;
  const title = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || ['', ''])[1].replace(/<[^>]+>/g, '').trim();
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/i) || ['', ''])[1];
  const meta = `<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://www.cadro.io/assets/screenshots/phase2/tr/dashboard.webp"><meta name="twitter:card" content="summary_large_image"><style>.article-container{max-width:800px;margin:0 auto;padding:40px 20px}.article-header{text-align:center;margin-bottom:40px}.article-meta,.blog-meta{color:var(--cyan);font-weight:700;font-size:.9rem;margin-bottom:15px}.article-title{font-size:2.5rem;color:#0f172a;line-height:1.2;margin-bottom:20px;font-weight:800}.article-content{font-size:1.15rem;color:#334155;line-height:1.8}.article-content h2{font-size:1.8rem;color:#0f172a;margin-top:40px;margin-bottom:15px}.article-content h3{font-size:1.4rem;color:#0f172a;margin-top:30px;margin-bottom:10px}.article-content p{margin-bottom:20px}.article-content li{margin-bottom:10px}.article-cta{background:#0f172a;color:#fff;padding:40px;border-radius:12px;text-align:center;margin-top:50px}.article-cta h3{color:#fff}.article-cta p{color:#cbd5e1}</style><script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://www.cadro.io/"},{"@type":"ListItem","position":2,"name":"Blog","item":"https://www.cadro.io/blog.html"},{"@type":"ListItem","position":3,"name":"${esc(title)}","item":"${canonical}"}]}</script>`;
  html = html.replace('</head>', `${meta}\n</head>`);
  html = html.replace(/<body([^>]*)><main class="section"[^>]*>/i, '<body$1><div class="site-shell"><header class="topbar"><button aria-expanded="false" class="nav-toggle">Menü</button><nav class="nav"><a href="index.html">Ana Sayfa</a><a href="ik-yazilimi.html">İK Yazılımı</a><a href="index.html#solutions">Çözümler</a><a href="blog.html">Blog</a><a href="faq.html">SSS</a></nav><div class="topbar-actions"><a class="ghost-button" href="https://app.cadro.io">Giriş Yap</a><a class="primary-button" href="pay.html?plan=start&amp;billing=monthly">Hemen Başla</a></div></header><main class="article-container"> <div class="article-header">');
  html = html.replace(/(<p class="blog-meta">[\s\S]*?<\/p>\s*)(<h1[^>]*>[\s\S]*?<\/h1>)/i, '$1$2</div><div class="article-content">');
  html = html.replace(/<\/main><\/body>/i, '<div class="article-cta"><h3>İK süreçlerinizi daha güvenilir yönetin</h3><p>CADRO ile veri, süreç ve çalışan deneyimini tek platformda birleştirin.</p><a class="primary-button" href="pay.html?plan=start&amp;billing=monthly">Hemen Başla →</a></div></div></main><footer class="footer"><p>© CADRO</p></footer></div></body>');
  fs.writeFileSync(file, html);
}
console.log(`Migrated ${links.size} scheduled article files.`);
