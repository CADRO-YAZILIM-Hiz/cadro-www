# SEO Faz 3 — GSC hızlı kazanım uygulama kaydı

**Tarih:** 2026-11-08  
**Durum:** GSC dışa aktarımı bekleniyor; mevcut tarihsel snapshot ile adaylar kilitlendi. Güncel veri olmadan metadata değişikliği yapılmayacak.

## GSC export formatı

Uygulama için Search Console Performance raporundan CSV alınmalı. Tercih edilen sütunlar:

```text
Top queries, Clicks, Impressions, CTR, Position, Top pages
```

Rapor aralığı: son 28 veya 90 gün. Ülke ve cihaz filtreleri export sırasında korunmalı; dosyada e-posta, kullanıcı adı veya kişisel veri bulunmamalı.

Dosya çalışma alanına eklendiğinde adı `gsc-export.csv` olmalı. Dosya commit edilmeyecek; yalnızca yerel analiz girdisi olarak kullanılacak.

## Veri sınırı

Son doğrulanmış GSC snapshot'ı 31 Temmuz–30 Ekim 2026 aralığına ait:

- 104 tıklama
- 10.597 gösterim
- Ortalama konum: 31,7
- 479 indekslenmiş URL

Bu dosyada yeni sorgu, CTR veya pozisyon değeri uydurulmamıştır. Canlı GSC sorgu-sayfa export'u olmadan mevcut metadata'yı tekrar topluca değiştirmek güvenli değildir.

## Faz 3 hedef kümeleri

Her aday dört dilde aynı faz paketinde ele alınacak; tek dilde metadata değişikliği yapılmayacak.

| Niyet | TR | EN | DE | AR | İlk işlem |
|---|---|---|---|---|---|
| Ana ticari giriş | `index.html` | `en/index.html` | `de/index.html` | `ar/index.html` | Gösterim/CTR ve ticari sorgu ayrımı |
| İK yazılımı | `ik-yazilimi.html` | `en/hr-software.html` | `de/hr-software.html` | `ar/brnamj-hr.html` | Sorgu sahipliği ve title/description testi |
| Bordro yazılımı | `bordro-yazilimi.html` | `en/payroll-software.html` | `de/lohnsoftware.html` | `ar/brnamj-rwatb.html` | Bordro/maaş/SGK niyet ayrımı |
| PDKS | `pdks.html` | `en/pdks.html` | `de/pdks.html` | `ar/pdks.html` | PDKS/attendance/shift sorgu ayrımı |
| ATS | `ats-ise-alim-yazilimi.html` | `en/ats-recruitment-software.html` | `de/ats-recruiting-software.html` | `ar/brnamj-twzyf.html` | ATS/recruiting/applicant tracking ayrımı |
| Fiyatlandırma | `pricing.html` | `en/pricing.html` | `de/pricing.html` | `ar/pricing.html` | Ticari sorgularda CTR ve demo geçişi |
| Kıdem araması | `kidem-tazminati-hesaplama.html` | `en/severance-pay-calculator.html` | `de/abfindungsrechner.html` | `ar/hasb-mkafat.html` | Araç niyeti ile içerik niyetini ayırma |

## GSC export geldiğinde uygulanacak karar kuralları

### A — Yüksek gösterim, düşük CTR

- Önce yalnızca title ve meta description değişir.
- Canonical, hreflang ve URL değişmez.
- Dört dilde doğal arama ifadesi kullanılır.
- Değişiklik öncesi değerler bu dosyaya eklenir.
- 28 günlük karşılaştırma yapılmadan ikinci değişiklik yapılmaz.

### B — 4–10. pozisyon

- İlk paragraf ve H2 yapısı sorgu niyetine göre güncellenir.
- En az üç iç bağlantı doğrulanır: ürün, araç, kardeş içerik.
- CTA tıklaması `analytics.js` üzerinden izlenir.

### C — Aynı sorguya birden fazla URL

- Önce hedef sorgu tek sayfaya atanır.
- Destekleyici sayfa ana sayfaya bağlanır.
- Birleştirme veya yönlendirme kararı yalnızca GSC URL verisiyle alınır.

## Dört dil yayın sözleşmesi

Bir aday paketinin yayına alınması için:

- TR/EN/DE/AR title ve description hazır olmalı.
- Dört canonical aynı URL eşleşmesine sahip olmalı.
- Beş alternate link karşılıklı olmalı.
- Görünür H1 ve ilk paragraf arama niyetiyle uyumlu olmalı.
- CTA aynı dönüşüm hedefini göstermeli.
- Dil bazlı event parametresi korunmalı.
- SEO testleri, i18n testi ve sitemap kontrolü yeşil olmalı.

## 28 günlük ölçüm tablosu

| Paket | Başlangıç gösterim | Başlangıç tıklama | Başlangıç CTR | Başlangıç pozisyon | 28 gün gösterim | 28 gün CTR | Demo geçişi |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ana ticari giriş | GSC export | GSC export | GSC export | GSC export | — | — | — |
| İK yazılımı | GSC export | GSC export | GSC export | GSC export | — | — | — |
| Bordro | GSC export | GSC export | GSC export | GSC export | — | — | — |
| PDKS | GSC export | GSC export | GSC export | GSC export | — | — | — |
| ATS | GSC export | GSC export | GSC export | GSC export | — | — | — |
| Fiyatlandırma | GSC export | GSC export | GSC export | GSC export | — | — | — |
| Kıdem aracı | GSC export | GSC export | GSC export | GSC export | — | — | — |

## Faz 3 kapanış ölçütü

- Her hedef sayfa için sorgu sahipliği kaydedildi.
- Değişiklik öncesi GSC baseline kaydedildi.
- Dört dil metadata paketi birlikte yayınlandı.
- 28 günlük ölçüm dönemi tamamlandı.
- CTR, pozisyon ve demo geçişleri karşılaştırıldı.
- Kazanan değişiklik kalıcılaştırıldı; kaybeden değişiklik geri alındı.

## Mevcut durum

- Taze `gsc-export.csv` bulunamadı.
- Tarihsel snapshot dışında sorgu, URL, CTR veya pozisyon değeri kullanılabilir durumda değil.
- Bu nedenle Faz 9 uygulama değişikliği beklemede.
- GSC export geldiğinde önce yalnızca aday listesi üretilecek; değişiklikten önce ayrıca onaylı baseline kaydı oluşturulacak.
