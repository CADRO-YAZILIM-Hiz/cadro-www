/**
 * Blog Otomatik Yayın Sistemi - Tetikleyici
 * 
 * Bu script günlük olarak çalıştırılmalı (cron job, GitHub Actions, AWS Lambda, vb.)
 * Her gün bugünün tarihine uyan makaleleri blog sayfalarına ekler.
 * 
 * Kullanım: node publish-scheduler.js
 */

const fs = require('fs');
const path = require('path');

const scheduleFile = 'publication-schedule.json';
const blogFiles = {
  tr: 'blog.html',
  en: 'en/blog.html',
  de: 'de/blog.html',
  ar: 'ar/blog.html'
};

// Bugünün tarihini al
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const monthName = months[today.getMonth()];
const dayStr = today.getDate().toString().padStart(2, '0');
const dateDisplayStr = `${dayStr} ${monthName} ${today.getFullYear()}`;

// Schedule kontrol et
if (!fs.existsSync(scheduleFile)) {
  console.log('❌ publication-schedule.json bulunamadı!');
  process.exit(1);
}

const schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));

// Bugüne yayımlanacak makaleleri bul
const todayArticles = schedule.articles.filter(a => a.publishDate === todayStr);

if (todayArticles.length === 0) {
  console.log(`\n✓ ${todayStr} için yayımlanacak makale yok. Sistem çalışmıyor.`);
  process.exit(0);
}

console.log(`\n📅 BLOG YAYIN İŞLEMİ BAŞLADI (${dateDisplayStr})`);
console.log(`Yayımlanacak makale sayısı: ${todayArticles.length} x 4 dil = ${todayArticles.length * 4}`);

// Kategori ve açıklama database'i
const categoryMap = {
  'makale-2026-asgari-ucret-net-hesabi': { cat: 'Bordro & Finans', desc: '2026 yılı asgari ücret hesaplamasında net ücret nasıl hesaplanır? Adım adım kırılım ve örnekler.' },
  'makale-2026-sgk-tavan-taban': { cat: 'Bordro & Finans', desc: 'SGK prim ve ücret tavanı 2026 güncel tablosu. İşveren ve çalışan primlerinde dikkat edilecek noktalar.' },
  // ... diğer kategoriler buraya eklenecek
};

function getCategory(basename) {
  const key = basename.replace('.html', '').toLowerCase();
  return categoryMap[key] || { cat: 'İK Makalesi', desc: 'Detaylı İK yönetimi makalesi' };
}

function createBlogCard(article, isLocalVersion = false) {
  const date = new Date(article.publishDate);
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const dateStr = `${day.toString().padStart(2, '0')} ${month} ${year}`;
  
  const catInfo = getCategory(article.basename);
  const title = article.title.replace(/&/g, '&amp;');
  
  let link = article.basename;
  if (isLocalVersion) {
    link = `../${article.basename}`;
  }
  
  return `
            <article class="blog-card" style="border-left: 4px solid var(--cyan);" data-publish-date="${article.publishDate}">
              <div class="blog-meta">${dateStr} • ${catInfo.cat}</div>
              <h3>${title}</h3>
              <p>${catInfo.desc}</p>
              <a href="${link}" class="read-more">Makaleyi Oku →</a>
            </article>`;
}

let publishedCount = 0;

// Her dil için güncelle
Object.entries(blogFiles).forEach(([lang, filepath]) => {
  try {
    // Dosya var mı kontrol et
    if (!fs.existsSync(filepath)) {
      console.log(`  ⚠️  ${filepath} bulunamadı, atlanıyor...`);
      return;
    }
    
    let html = fs.readFileSync(filepath, 'utf8');
    
    // Son blog-card'ın sonundan sonra ekle
    const lastCardEnd = html.lastIndexOf('</article>') + '</article>'.length;
    
    // Makaleleri dile göre ekle
    const cardsToAdd = todayArticles
      .map(article => createBlogCard(article, lang !== 'tr'))
      .join('');
    
    // Ekle
    html = html.slice(0, lastCardEnd) + cardsToAdd + html.slice(lastCardEnd);
    
    // Kaydet
    fs.writeFileSync(filepath, html);
    
    publishedCount += todayArticles.length;
    console.log(`  ✓ ${filepath}: ${todayArticles.length} makale eklendi`);
  } catch (err) {
    console.log(`  ❌ ${filepath} güncellenirken hata: ${err.message}`);
  }
});

// Schedule güncelle (yayımlanan makaleleri kaldır)
const remainingArticles = schedule.articles.filter(a => a.publishDate !== todayStr);
schedule.articles = remainingArticles;
schedule.lastUpdated = new Date().toISOString();

fs.writeFileSync(scheduleFile, JSON.stringify(schedule, null, 2));

console.log(`\n✓ Yayın işlemi tamamlandı!`);
console.log(`  Yayımlanan: ${publishedCount} makale (${todayArticles.length} x 4 dil)`);
console.log(`  Kalan takvim: ${remainingArticles.length} makale\n`);

process.exit(0);
