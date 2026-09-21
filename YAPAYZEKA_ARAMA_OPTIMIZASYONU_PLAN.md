# Yapay Zeka Arama Optimizasyonu (AIO) Planı

**Dosya:** `AI_SEARCH_OPTIMIZATION_PLAN.md`  
**Oluşturma Tarihi:** 21 Eylül 2026  
**Durum:** ✅ Tüm kod değişiklikleri tamamlandı  
**Son Güncelleme:** 21 Eylül 2026  
**Referans Kaynaklar:** Bing Webmaster Guidelines (2026), Google Search Central, llmstxt.org v2, Schema.org, OpenAI Prompt Engineering Guide

---

## 1. Amaç ve Kapsam

Bu plan, **cadro.io** web sitesinin yapay zeka tabanlı arama motorlarında (ChatGPT Search, Bing Copilot, Google AI Overviews, Perplexity, Claude) görünürlüğünü, alıntılanma (grounding/citation) oranını ve içerik keşfedilebilirliğini artırmayı hedefler.

### Hedef Platformlar
| Platform | Mekanizma | Öncelik |
|---|---|---|
| Bing Copilot | IndexNow + robots.txt + structured data | 🔴 En Yüksek |
| Google AI Overviews | Article schema + E-E-A-T sinyalleri | 🔴 En Yüksek |
| ChatGPT Search | llms.txt + OAI-SearchBot izinleri | 🟡 Yüksek |
| Perplexity | PerplexityBot + llms-full.txt | 🟡 Yüksek |
| Claude | ClaudeBot + llms.txt | 🟢 Orta |

### Referans Standartlar
- **Bing Webmaster Guidelines (2026):** "SEO Fundamentals Still Apply to Grounding and AI Experiences"
- **llmstxt.org v2:** `/llms.txt` + `page.html.md` + `rel="describedby"` standardı
- **Schema.org:** Organization, Article, FAQPage, BreadcrumbList, SoftwareApplication
- **Google Search Central:** Structured data gallery, Article markup

---

## 2. Mevcut Durum Analizi

### 2.1 Güçlü Yönler (✅ Halihazırda Var)

| Kontrol Noktası | Durum | Detay |
|---|---|---|
| `/llms.txt` ve `/llms-full.txt` | ✅ Var | v2 spec uyumlu, 4 dil desteği mevcut |
| AI crawler robots.txt izinleri | ✅ Var | GPTBot, ClaudeBot, OAI-SearchBot, PerplexityBot, Google-Extended, Applebot, anthropic-ai — hepsine Allow |
| JSON-LD Structured Data | ✅ Var | WebSite, Organization, SoftwareApplication, FAQPage, VideoObject, LocalBusiness |
| BreadcrumbList markup | ✅ Var | Çoğu sayfada mevcut (bazı duplicate position hataları var) |
| hreflang etiketleri | ✅ Var | TR/EN/DE/AR + x-default |
| Sitemap.xml | ✅ Var | 438 URL, dil alternatifli |
| Canonical URL'ler | ✅ Var | Tüm sayfalarda `<link rel="canonical">` |
| Open Graph / Twitter Card | ✅ Var | Tam meta etiket seti |
| Article schema (kısmi) | ⚠️ Kısmi | Sadece `excel-vs-cadro.html` gibi az sayfada var |

### 2.2 Eksikler (❌ Yapılması Gereken)

| Eksik | Önem | Bing/Google Karşılığı |
|---|---|---|
| `rel="describedby"` link/header eksik | 🔴 Kritik | llmstxt.org v2 standardı, Bing Webmaster Guidelines |
| `.html.md` alternatif sayfalar (40+ eksik) | 🔴 Kritik | llmstxt.org v2 — LLM'ler için token-efficient erişim |
| IndexNow entegrasyonu yok | 🔴 Kritik | Bing #4: "Notify Bing and Copilot quickly when URLs Change" |
| Makale sayfalarında Article schema yok | 🟡 Önemli | Google AI Overviews, Copilot citation |
| BreadcrumbList duplicate position | 🟡 Önemli | Schema doğrulama hatası, indexing sinyali zayıflar |
| `llms.txt` rehber içeriği eksik | 🟡 Önemli | AI botlarının içeriği doğru yorumlaması için |
| `ai-sitemap.xml` güncel değil | 🟢 Düşük | AI sayfalarının ayrı sitemap ile önceliklendirilmesi |
| Video transkript/ captions eksik | 🟢 Düşük | Bing #12: Multimodal içerik optimizasyonu |

---

## 3. Aksiyon Planı

### Adım 1: `llms.txt` Keşfedilebilirliği 🔴 KRİTİK
**Tahmini Süre:** 30 dakika

**Yapılacaklar:**
1. Tüm dil ana sayfalarına (`index.html`, `en/index.html`, `de/index.html`, `ar/index.html`) HTML `<link>` etiketi ekle:
   ```html
   <link rel="describedby" href="/llms.txt" type="text/markdown">
   <link rel="describedby" href="/llms-full.txt" type="text/markdown">
   ```
2. `.htaccess` dosyasına HTTP `Link:` header ekle:
   ```apache
   <FilesMatch "\.(html|md)$">
     Header add Link '</llms.txt>; rel="describedby"; type="text/markdown"'
   </FilesMatch>
   ```

**Etkisi:** Bing, Google, OpenAI, Anthropic botları `llms.txt`'yi otomatik keşfeder. AI arama sonuçlarında citation şansı artar.

---

### Adım 2: Markdown Alternatif Sayfalar 🔴 KRİTİK
**Tahmini Süre:** 2-3 saat

**Yapılacaklar:**
Öncelikli 10 sayfanın `.html.md` versiyonlarını oluştur:
1. `ik-yazilimi.html.md`
2. `bordro-yazilimi.html.md`
3. `ats-ise-alim-yazilimi.html.md`
4. `dijital-ozluk-ve-izin.html.md`
5. `ik-analitigi.html.md`
6. `excel-vs-cadro.html.md`
7. `asgari-ucret-hesaplama.html.md`
8. `kidem-tazminati-hesaplama.html.md`
9. `faq.html.md`
10. `ik-sozlugu.html.md`

Her `.md` dosyasına:
- Sayfanın orijinal `<meta name="description">` içeriğini markdown blockquote olarak
- Ana başlıkları ve içerikleri sade markdown formatında
- En üste `Link:` header bilgisi notu

**Etkisi:** AI botları sayfaları token maliyeti olmadan tam olarak okuyabilir. Grounding/citation kalitesi yükselir.

---

### Adım 3: IndexNow Entegrasyonu 🔴 KRİTİK
**Tahmini Süre:** 1 saat

**Yapılacaklar:**
1. [Bing Webmaster Tools](https://www.bing.com/webmasters) üzerinden IndexNow API key oluştur
2. GitHub Actions workflow'una deploy sonrası IndexNow ping step'i ekle
3. Yeni eklenen/güncellenen URL'leri otomatik bildir

```yaml
- name: IndexNow Ping
  run: |
    curl -X POST "https://api.indexnow.org/indexnow" \
      -H "Content-Type: application/json; charset=utf-8" \
      -d "{\"host\": \"www.cadro.io\", \"key\": \"${{ secrets.INDEXNOW_KEY }}\", \"keyLocation\": \"https://www.cadro.io/${{ secrets.INDEXNOW_KEY }}.txt\", \"urlList\": [\"${{ steps.deploy.outputs.changed_urls }}\"]}"
```

**Etkisi:** İçerik değişiklikleri Bing/Copilot'a dakikalar içinde bildirilir. Eski SEO fixes kayıtlarında 93 adet 404 vardı — IndexNow bu sorunları proaktif çözer.

---

### Adım 4: `llms.txt` İçeriğini Zenginleştir 🟡 ÖNEMLİ
**Tahmini Süre:** 30 dakika

**Yapılacaklar:**
Mevcut `llms.txt`'ye ekle:
1. AI kullanım rehberi (citation format, atıf kuralları)
2. `sameAs` sosyal medya profilleri (LinkedIn)
3. İçerik güncelleme politikası
4. İletişim bilgisi
5. Markdown alternatif sayfalara linkler

**Etkisi:** AI botları site yapısını ve içerik kullanım kurallarını daha iyi anlar.

---

### Adım 5: Article Schema Ekleme 🟡 ÖNEMLİ
**Tahmini Süre:** 3-4 saat (script ile otomatize edilebilir)

**Yapılacaklar:**
Tüm `makale-*.html` sayfalarına `Article` schema.org JSON-LD markup ekle:
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Makale Başlığı",
  "author": {"@type": "Organization", "name": "CADRO Editorial Team"},
  "publisher": {"@type": "Organization", "name": "CADRO", "logo": {...}},
  "datePublished": "2026-...",
  "dateModified": "2026-...",
  "description": "...",
  "inLanguage": "tr"
}
```

**Etkisi:** Google AI Overviews ve Bing Copilot, Article markup olan sayfaları bilgi kaynağı olarak önceliklendiriyor.

---

### Adım 6: BreadcrumbList Duplicate Düzeltmesi 🟡 ÖNEMLİ
**Tahmini Süre:** 1 saat

**Sorun:** Bazı sayfalarda BreadcrumbList'te position 2 ve 3 aynı `name` değerine sahip.

**Yapılacaklar:**
- Tüm `BreadcrumbList` markup'larını tara
- Duplicate position-name çiftlerini düzelt (position 3'ü kaldır veya farklı name ver)

**Etkisi:** Schema doğrulama hatası giderilir, indexing sinyali güçlenir.

---

### Adım 7: `ai-sitemap.xml` Güncelleme 🟢 İYİLEŞTİRME
**Tahmini Süre:** 30 dakika

**Yapılacaklar:**
1. AI ile ilgili tüm sayfaları listele
2. `ai-sitemap.xml`'yi yeniden oluştur
3. `robots.txt`'ye `Sitemap: https://www.cadro.io/ai-sitemap.xml` ekle

**Etkisi:** AI sayfaları arama motorları tarafından ayrıcalıklı taranır.

---

## 4. Zaman Çizelgesi

| Adım | Öncelik | Tahmini Süre | Durum |
|---|---|---|---|
| Adım 1: llms.txt keşif header'ları | 🔴 Kritik | 30 dk | ✅ Tamamlandı |
| Adım 2: .md alternatif sayfalar | 🔴 Kritik | 2-3 saat | ✅ Tamamlandı (10 sayfa) |
| Adım 3: IndexNow entegrasyonu | 🔴 Kritik | 1 saat | ✅ Tamamlandı — deploy-www.yml + key doğrulama dosyası |
| Adım 4: llms.txt zenginleştirme | 🟡 Önemli | 30 dk | ✅ Tamamlandı |
| Adım 5: Article schema (40+ sayfa) | 🟡 Önemli | 3-4 saat | ✅ Tamamlandı — 58 makalede zaten mevcut, ekleme gerekmedi |
| Adım 6: BreadcrumbList fix | 🟡 Önemli | 1 saat | ✅ Tamamlandı |
| Adım 7: ai-sitemap.xml güncelleme | 🟢 İyileştirme | 30 dk | ✅ Tamamlandı |

**Toplam Tahmini Süre:** 8-10 saat

---

## 5. Başarı Metrikleri

| Metrik | Ölçüm Aracı | Hedef |
|---|---|---|
| Bing IndexNow ping başarı oranı | Bing Webmaster Tools | >95% |
| Copilot citation sayısı | Bing Webmaster Tools → Grounding raporu | Ayda +10 artış |
| Google AI Overview görünürlüğü | Google Search Console | Sayfa başına +%5 |
| llms.txt crawl sıklığı | Sunucu logları | Haftada en az 1 |
| Schema doğrulama hatası | Google Rich Results Test | 0 hata |
| ChatGPT/Perplexity referansları | Manuel takip + log analizi | Ayda +5 artış |

---

## 6. Kaynaklar

- [Bing Webmaster Guidelines (2026)](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
- [Google Search Central — Structured Data Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)
- [llmstxt.org v2 Specification](https://llmstxt.org/)
- [Schema.org Organization](https://schema.org/Organization)
- [IndexNow Protocol](https://www.indexnow.org/)
- [OpenAI Prompt Engineering Guide](https://developers.openai.com/api/docs/guides/prompt-engineering)

---

*Plan güncelleme: Her aylık içerik takvimi döngüsünde gözden geçirilecek.*