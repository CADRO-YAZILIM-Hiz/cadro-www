const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cheerio = require('cheerio');

const root = path.resolve('C:/Users/Turgay0671/Desktop/cadro-project/html');
const langs = ['tr', 'en', 'de', 'ar'];
const rtlLangs = new Set(['ar']);
const baseUrl = 'https://www.cadro.io';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function extractObjectLiteral(source, constName) {
  const marker = `const ${constName} =`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Missing ${constName}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  let end = -1;
  let inString = false;
  let quote = '';
  let escape = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`Unclosed object for ${constName}`);
  return source.slice(open, end + 1);
}

function loadTranslations() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  const langFiles = ['lang-tr.js', 'lang-en.js', 'lang-de.js', 'lang-ar.js'];
  langFiles.forEach((file) => {
    vm.runInContext(read(path.join(root, file)), sandbox);
  });
  const appJs = read(path.join(root, 'app.js'));
  const objectLiteral = extractObjectLiteral(appJs, 'translations');
  return vm.runInContext(`(${objectLiteral})`, sandbox);
}

function loadPageHtml() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read(path.join(root, 'page-content.js')), sandbox);
  return sandbox.window.CADRO_PAGE_HTML || {};
}

const translations = loadTranslations();
const pageHtml = loadPageHtml();
const googleSiteVerification = 'L40TNWo8QOpNjjkkh2WN2YZS4SjqOPeCrKisyNLR-YI';

const metaImageMap = {
  index: (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  architecture: (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  blog: (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  faq: (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'ik-sozlugu': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'ik-yazilimi': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  pricing: (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'excel-vs-cadro': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'ats-ise-alim-yazilimi': (lang) => `${baseUrl}/assets/screenshots/phase3/${lang}/ats.webp`,
  'dijital-ozluk-ve-izin': (lang) => `${baseUrl}/assets/screenshots/phase3/${lang}/e-dossier.webp`,
  'performans-degerlendirme-okr': (lang) => `${baseUrl}/assets/screenshots/phase3/${lang}/performance.webp`,
  'puantaj-ve-vardiya-yazilimi': (lang) => `${baseUrl}/assets/screenshots/phase4/${lang}/attendance.webp`,
  'masraf-ve-satin-alma': (lang) => `${baseUrl}/assets/screenshots/phase4/${lang}/expenses.webp`,
  'kurumsal-bilgi-bankasi-ve-onboarding': (lang) => `${baseUrl}/assets/screenshots/phase5/${lang}/knowledge-base.webp`,
  compliance: (lang) => `${baseUrl}/assets/screenshots/phase5/${lang}/compliance.webp`,
  security: (lang) => `${baseUrl}/assets/screenshots/phase5/${lang}/security.webp`,
  'vaka-calismalari': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'vaka-calismasi-tech-startup': (lang) => `${baseUrl}/assets/screenshots/phase3/${lang}/ats.webp`,
  'vaka-calismasi-perakende': (lang) => `${baseUrl}/assets/screenshots/phase4/${lang}/attendance.webp`,
  'vaka-calismasi-saglik': (lang) => `${baseUrl}/assets/screenshots/phase3/${lang}/e-dossier.webp`,
  'vaka-calismasi-lojistik': (lang) => `${baseUrl}/assets/screenshots/phase4/${lang}/attendance.webp`,
  'vaka-calismasi-egitim': (lang) => `${baseUrl}/assets/screenshots/phase3/${lang}/performance.webp`,
  'vaka-calismasi-danismanlik': (lang) => `${baseUrl}/assets/screenshots/phase3/${lang}/performance.webp`,
  'vaka-calismasi-uretim-devi': (lang) => `${baseUrl}/assets/screenshots/phase4/${lang}/expenses.webp`,
  'makale-yapay-zeka-genai': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'makale-prediktif-ik': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'makale-ise-alimda-ai-etik': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'makale-ai-ve-kvkk-uyumu': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'makale-sessiz-istifa-maliyeti': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'makale-ik-dijital-donusum-2026': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'makale-turnover-dusurme-yollari': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'makale-yillik-performans-degerlendirme': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'makale-dijital-ozluk-ve-kvkk': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  'makale-excel-bordro-sizintilari': (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
  privacy: () => `${baseUrl}/Cadro%20Logo.png`,
  terms: () => `${baseUrl}/Cadro%20Logo.png`,
  refund: () => `${baseUrl}/Cadro%20Logo.png`,
  pay: (lang) => `${baseUrl}/assets/screenshots/phase2/${lang}/dashboard.webp`,
};

const localizedListItemNames = {
  'vaka-calismasi-tech-startup.html': { tr: 'Tech Startup Vaka Çalışması', en: 'Tech Startup Case Study', de: 'Fallstudie Tech-Startup', ar: 'دراسة حالة شركة تقنية ناشئة' },
  'vaka-calismasi-perakende.html': { tr: 'Perakende Vaka Çalışması', en: 'Retail Case Study', de: 'Fallstudie Einzelhandel', ar: 'دراسة حالة قطاع التجزئة' },
  'vaka-calismasi-saglik.html': { tr: 'Sağlık Vaka Çalışması', en: 'Healthcare Case Study', de: 'Fallstudie Gesundheitswesen', ar: 'دراسة حالة الرعاية الصحية' },
  'vaka-calismasi-danismanlik.html': { tr: 'Danışmanlık Vaka Çalışması', en: 'Consulting Case Study', de: 'Fallstudie Beratung', ar: 'دراسة حالة الاستشارات' },
  'vaka-calismasi-egitim.html': { tr: 'Eğitim Vaka Çalışması', en: 'Education Case Study', de: 'Fallstudie Bildung', ar: 'دراسة حالة التعليم' },
  'vaka-calismasi-lojistik.html': { tr: 'Lojistik Vaka Çalışması', en: 'Logistics Case Study', de: 'Fallstudie Logistik', ar: 'دراسة حالة الخدمات اللوجستية' },
  'vaka-calismasi-uretim-devi.html': { tr: 'Üretim Vaka Çalışması', en: 'Manufacturing Case Study', de: 'Fallstudie Produktion', ar: 'دراسة حالة التصنيع' },
};

const preloadImageMap = {
  'ats-ise-alim-yazilimi': (lang) => `assets/screenshots/phase3/${lang}/ats.webp`,
  'dijital-ozluk-ve-izin': (lang) => `assets/screenshots/phase3/${lang}/e-dossier.webp`,
  'performans-degerlendirme-okr': (lang) => `assets/screenshots/phase3/${lang}/performance.webp`,
  'puantaj-ve-vardiya-yazilimi': (lang) => `assets/screenshots/phase4/${lang}/attendance.webp`,
  'masraf-ve-satin-alma': (lang) => `assets/screenshots/phase4/${lang}/expenses.webp`,
  'kurumsal-bilgi-bankasi-ve-onboarding': (lang) => `assets/screenshots/phase5/${lang}/knowledge-base.webp`,
};

function getPageSlug($) {
  return $('body').attr('data-page') || 'index';
}

function getTargetDir(lang) {
  return lang === 'tr' ? root : path.join(root, lang);
}

function getRelativeAssetPrefix(lang) {
  return lang === 'tr' ? './' : '../';
}

function getLocalizedUrl(filename, lang) {
  if (lang === 'tr') {
    return filename === 'index.html' ? `${baseUrl}/` : `${baseUrl}/${filename}`;
  }
  return filename === 'index.html' ? `${baseUrl}/${lang}/` : `${baseUrl}/${lang}/${filename}`;
}

function getLocalizedHref(rawPath, lang) {
  if (!rawPath) return rawPath;
  if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(rawPath)) return rawPath;
  if (rawPath.startsWith('../')) return rawPath;
  const [pathPart, suffix = ''] = rawPath.split(/(?=[?#])/);
  const clean = pathPart.replace(/^\.\//, '');
  const prefix = getRelativeAssetPrefix(lang);

  const routeMap = {
    '/pricing': 'pricing.html',
    '/contact': 'index.html#contact',
  };
  if (routeMap[clean]) {
    return `${routeMap[clean]}${suffix}`;
  }

  if (clean.startsWith('/')) {
    return `${clean.slice(1)}${suffix}`;
  }

  if (clean.endsWith('.html')) {
    return `${path.basename(clean)}${suffix}`;
  }

  return `${prefix}${clean}${suffix}`;
}

function setNodeValue($node, value) {
  if ($node.attr('data-i18n-html') === 'true') {
    $node.html(value);
  } else {
    $node.text(value);
  }
}

function translateNodes($, dict) {
  $('[data-i18n-key]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-i18n-key');
    if (dict[key]) setNodeValue($el, dict[key]);
  });
  $('[data-i18n-aria]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-i18n-aria');
    if (dict[key]) $el.attr('aria-label', dict[key]);
  });
}

function updateCommonNavigation($, dict, lang) {
  const faqLabels = {
    tr: 'SSS',
    en: 'FAQ',
    de: 'FAQ',
    ar: 'الأسئلة الشائعة',
  };
  $('nav a[href="faq.html"]').each((_, el) => {
    const $el = $(el);
    $el.text(faqLabels[lang] || dict.nav_faq || dict.faq_eyebrow || 'FAQ');
  });
}

function updateLocalizedMain($, lang, page) {
  const $main = $('main[data-i18n-html="true"]').first();
  if (!$main.length) return;
  const localizedPage = pageHtml?.[lang]?.[page];
  const fallback = lang !== 'tr' ? pageHtml?.en?.[page] : null;
  const pageContent = typeof localizedPage === 'string' && localizedPage.trim()
    ? localizedPage
    : (fallback || pageHtml?.tr?.[page]);
  if (pageContent) {
    $main.html(pageContent);
    $main.attr('data-i18n-skip', 'true');
  }
}

function updateScreenshots($, lang, page) {
  const assetPrefix = getRelativeAssetPrefix(lang);
  const folder = lang;
  const homeMap = {
    dashboard: `${assetPrefix}assets/screenshots/phase2/${folder}/dashboard.webp`,
    ats: `${assetPrefix}assets/screenshots/phase2/${folder}/ats.webp`,
    performance: `${assetPrefix}assets/screenshots/phase2/${folder}/performance.webp`,
    'e-dossier': `${assetPrefix}assets/screenshots/phase2/${folder}/e-dossier.webp`,
  };
  if (page === 'index') {
    const ids = [
      ['#homepage-shot-dashboard', '#homepage-shot-dashboard-trigger', 'dashboard'],
      ['#homepage-shot-ats', '#homepage-shot-ats-trigger', 'ats'],
      ['#homepage-shot-performance', '#homepage-shot-performance-trigger', 'performance'],
      ['#homepage-shot-dossier', '#homepage-shot-dossier-trigger', 'e-dossier'],
    ];
    ids.forEach(([img, trigger, role]) => {
      $(img).attr('src', homeMap[role]);
      $(trigger).attr('data-lightbox-image', homeMap[role]);
    });
  }
}

function syncMeta($, dict, page, filename, lang) {
  const titleKey = `meta_title_${page}`;
  const descKey = `meta_desc_${page}`;
  const title = dict[titleKey] || $('title').text();
  const description = dict[descKey] || $('meta[name="description"]').attr('content') || '';
  const canonicalUrl = getLocalizedUrl(filename, lang);
  $('title').text(title);
  $('meta[name="description"]').attr('content', description);
  $('meta[property="og:title"]').attr('content', title);
  $('meta[property="og:description"]').attr('content', description);
  $('meta[property="og:url"]').attr('content', canonicalUrl);
  $('meta[name="twitter:title"]').attr('content', title);
  $('meta[name="twitter:description"]').attr('content', description);
  const $canonical = $('link[rel="canonical"]');
  if ($canonical.length) $canonical.attr('href', canonicalUrl);
  else $('head').append(`<link rel="canonical" href="${canonicalUrl}">`);

  let $verification = $('meta[name="google-site-verification"]');
  if (!$verification.length) {
    $('head').append(`<meta name="google-site-verification" content="${googleSiteVerification}">`);
    $verification = $('meta[name="google-site-verification"]');
  }
  $verification.attr('content', googleSiteVerification);

  const imageBuilder = metaImageMap[page];
  if (imageBuilder) {
    const image = imageBuilder(lang);
    let $ogImage = $('meta[property="og:image"]');
    if (!$ogImage.length) {
      $('head').append(`<meta property="og:image" content="${image}">`);
      $ogImage = $('meta[property="og:image"]');
    }
    $ogImage.attr('content', image);

    let $twImage = $('meta[name="twitter:image"]');
    if (!$twImage.length) {
      $('head').append(`<meta name="twitter:image" content="${image}">`);
      $twImage = $('meta[name="twitter:image"]');
    }
    $twImage.attr('content', image);
  }

  const localeContent = {
    tr: 'tr_TR',
    en: 'en_US',
    de: 'de_DE',
    ar: 'ar_AR',
  }[lang];
  let $ogLocale = $('meta[property="og:locale"]');
  if (!$ogLocale.length) {
    $('head').append(`<meta property="og:locale" content="${localeContent}">`);
    $ogLocale = $('meta[property="og:locale"]');
  }
  $ogLocale.attr('content', localeContent);
  $('meta[property="og:locale:alternate"]').remove();
  langs.filter((item) => item !== lang).forEach((item) => {
    const val = { tr: 'tr_TR', en: 'en_US', de: 'de_DE', ar: 'ar_AR' }[item];
    $('head').append(`<meta property="og:locale:alternate" content="${val}">`);
  });

  const preloadBuilder = preloadImageMap[page];
  if (preloadBuilder) {
    const href = getLocalizedHref(preloadBuilder(lang), lang);
    let $preload = $('link[rel="preload"][as="image"]').first();
    if (!$preload.length) {
      $('head').append(`<link rel="preload" as="image" href="${href}" type="image/webp">`);
      $preload = $('link[rel="preload"][as="image"]').first();
    }
    $preload.attr('href', href);
    $preload.attr('type', 'image/webp');
  }
}

function localizeBreadcrumbName(lang, page, position, fallback, title) {
  const pos = Number(position);
  const names = {
    tr: { home: 'Ana Sayfa', blog: 'Blog', faq: 'SSS', cases: 'Vaka Çalışmaları' },
    en: { home: 'Home', blog: 'Blog', faq: 'FAQ', cases: 'Case Studies' },
    de: { home: 'Startseite', blog: 'Blog', faq: 'FAQ', cases: 'Fallstudien' },
    ar: { home: 'الرئيسية', blog: 'المدونة', faq: 'الأسئلة الشائعة', cases: 'دراسات الحالة' },
  };
  const locale = names[lang] || names.tr;
  if (pos === 1) return locale.home;
  if (page.startsWith('makale-') && pos === 2) return locale.blog;
  if (page === 'blog' && pos === 2) return locale.blog;
  if (page === 'faq' && pos === 2) return locale.faq;
  if ((page === 'vaka-calismalari' || page.startsWith('vaka-calismasi-')) && pos === 2) return locale.cases;
  if (pos >= 2) return title;
  return fallback;
}

function getBreadcrumbFilename(page, position, currentFilename) {
  const pos = Number(position);
  if (pos === 1) return 'index.html';
  if (page.startsWith('makale-') && pos === 2) return 'blog.html';
  if (page === 'blog' && pos === 2) return 'blog.html';
  if (page === 'faq' && pos === 2) return 'faq.html';
  if (page === 'vaka-calismalari' && pos === 2) return 'vaka-calismalari.html';
  if (page.startsWith('vaka-calismasi-') && pos === 2) return 'vaka-calismalari.html';
  return currentFilename;
}

function getPageTitleFromFilename(filename, lang, dict) {
  const page = filename.replace(/\.html$/, '');
  const key = `meta_title_${page}`;
  return dict[key] || null;
}

function walkStructuredData(node, visitor) {
  if (Array.isArray(node)) {
    node.forEach((item) => walkStructuredData(item, visitor));
    return;
  }
  if (!node || typeof node !== 'object') return;
  visitor(node);
  Object.values(node).forEach((value) => walkStructuredData(value, visitor));
}

function isPageLikeUrl(url) {
  if (!url.startsWith(baseUrl)) return false;
  const pathname = url.slice(baseUrl.length);
  if (pathname === '' || pathname === '/' || /^\/(en|de|ar)\/?$/.test(pathname)) return true;
  return pathname.endsWith('.html');
}

function syncStructuredData($, lang, page, filename, dict) {
  const titleKey = `meta_title_${page}`;
  const descKey = `meta_desc_${page}`;
  const title = dict[titleKey] || $('title').text();
  const description = dict[descKey] || $('meta[name="description"]').attr('content') || '';
  const imageBuilder = metaImageMap[page];
  const image = imageBuilder ? imageBuilder(lang) : null;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const $el = $(el);
      const data = JSON.parse($el.html());
      if (lang !== 'tr' && data['@type'] === 'FAQPage') {
        $el.remove();
        return;
      }
      if (data.inLanguage) data.inLanguage = lang;
      if (data.url) data.url = getLocalizedUrl(filename, lang);
      if (data.isPartOf && data.isPartOf.url) {
        data.isPartOf.url = getLocalizedUrl('index.html', lang);
      }
      if (data.mainEntityOfPage && data.mainEntityOfPage['@id']) {
        data.mainEntityOfPage['@id'] = getLocalizedUrl(filename, lang);
      }
      if (data.headline) data.headline = title;
      if (data.name && ['CollectionPage', 'WebPage', 'SoftwareApplication', 'TechArticle', 'DefinedTermSet'].includes(data['@type'])) data.name = title;
      if (data['@type'] === 'VideoObject') {
        data.name = dict.video_title || title;
        data.description = dict.video_text || description;
        data.inLanguage = lang;
        data.url = `${getLocalizedUrl(filename, lang)}#product-film`;
        data.embedUrl = `${getLocalizedUrl(filename, lang)}#product-film`;
        if (image) data.thumbnailUrl = image;
      }
      if (data.description) data.description = description;
      if (image && data.image) data.image = image;
      walkStructuredData(data, (item) => {
        if (item['@type'] === 'ListItem' && item.position && item.item) {
          const targetFilename = getBreadcrumbFilename(page, item.position, filename);
          item.item = getLocalizedUrl(targetFilename, lang);
          item.name = localizeBreadcrumbName(lang, page, item.position, item.name, title);
        }
        if (item['@type'] === 'ListItem' && typeof item.url === 'string') {
          const lastSegment = item.url.split('/').pop();
          if (lastSegment && lastSegment.endsWith('.html')) {
            item.url = getLocalizedUrl(lastSegment, lang);
            const mappedName = localizedListItemNames[lastSegment]?.[lang];
            if (mappedName) {
              item.name = mappedName;
              return;
            }
            const localizedTitle = getPageTitleFromFilename(lastSegment, lang, dict);
            if (localizedTitle) {
              item.name = localizedTitle.replace(/\s*\|\s*CADRO(?:\s+Blog)?$/i, '').trim();
            }
          }
        }
        if (item['@type'] === 'WebSite' && typeof item.url === 'string') {
          item.url = getLocalizedUrl('index.html', lang);
        } else if (typeof item.url === 'string' && isPageLikeUrl(item.url)) {
          const lastSegment = item.url.split('/').pop() || filename;
          item.url = getLocalizedUrl(lastSegment, lang);
        }
        if (typeof item.image === 'string' && image && item.image.startsWith(baseUrl)) {
          item.image = image;
        }
      });
      if (data['@type'] === 'VideoObject') {
        data.embedUrl = `${getLocalizedUrl(filename, lang)}#product-film`;
        if (data.publisher && data.publisher.logo && data.publisher.logo.url) {
          data.publisher.logo.url = `${baseUrl}/Cadro%20Logo.png`;
        }
      }
      $el.html(JSON.stringify(data));
    } catch (error) {
      // keep original if not valid JSON
    }
  });
}

function applyHreflang($, filename, lang) {
  $('link[rel="alternate"][hreflang]').remove();
  const canonical = $('link[rel="canonical"]');
  const insertAfter = canonical.length ? canonical : $('title');
  const links = [];
  langs.forEach((item) => {
    links.push(`<link rel="alternate" hreflang="${item}" href="${getLocalizedUrl(filename, item)}">`);
  });
  links.push(`<link rel="alternate" hreflang="x-default" href="${getLocalizedUrl(filename, 'tr')}">`);
  insertAfter.after(links.join(''));
}

function rewriteLocalReferences($, lang) {
  const attrs = ['href', 'src', 'poster'];
  $('a, img, script, link, source, video').each((_, el) => {
    const $el = $(el);
    attrs.forEach((attr) => {
      const value = $el.attr(attr);
      if (value) $el.attr(attr, getLocalizedHref(value, lang));
    });
  });
}

function buildFile(filename, lang) {
  const html = read(path.join(root, filename));
  const $ = cheerio.load(html, { decodeEntities: false });
  const page = getPageSlug($);
  const dict = translations[lang] || translations.tr;

  $('html').attr('lang', lang);
  $('html').attr('dir', rtlLangs.has(lang) ? 'rtl' : 'ltr');
  $('body').attr('dir', rtlLangs.has(lang) ? 'rtl' : 'ltr');

  updateLocalizedMain($, lang, page);
  translateNodes($, dict);
  updateCommonNavigation($, dict, lang);
  updateScreenshots($, lang, page);
  syncMeta($, dict, page, filename, lang);
  syncStructuredData($, lang, page, filename, dict);
  applyHreflang($, filename, lang);
  rewriteLocalReferences($, lang);

  const outDir = getTargetDir(lang);
  write(path.join(outDir, filename), $.html());
}

function main() {
  const files = fs.readdirSync(root)
    .filter((name) => name.endsWith('.html') && name !== 'index.nginx-debian.html');

  ['en', 'de', 'ar'].forEach((lang) => {
    fs.mkdirSync(path.join(root, lang), { recursive: true });
  });

  files.forEach((filename) => {
    langs.forEach((lang) => buildFile(filename, lang));
  });
}

main();
