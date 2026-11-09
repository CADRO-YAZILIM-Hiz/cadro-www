# SEO uygulama takibi — 1 Kasım 2026

- [x] 1. Bozuk HTML head yapıları: tüm 586 sayfa HTML5 parser ile doğrulandı; canonical, hreflang ve temel metadata head içinde.
- [x] 2. Blog kartları ve site haritası: dört eski URL düzeltildi; üreticide eksik/noindex/canonical hedef, tarih ve URL güvenliği kontrolleri eklendi.
- [x] 3. Hreflang: mevcut 586 HTML üzerinde eksik, yanlış dil, yinelenen ve karşılıksız hedef denetimi sıfır bulgu; çeviri eşlemeleri test altında.
- [ ] 4. Metadata ve mevzuat içeriği: sayfaya özgü açıklamalar, doğru dil, resmi kaynak ve uzman kontrolü.
- [ ] 5. İndeksleme ve hız: önemli URL'lerde GSC denetimi, temsilî sayfalarda laboratuvar ölçümü.
- [ ] 6. Yayın sonrası: canlı HTTP/DOM doğrulaması ve GSC takibi.

## Faz 11 — teknik performans
- Teknik performans ve Core Web Vitals kontrol planı `SEO_PHASE11_TECHNICAL_PERFORMANCE_CHECKLIST.md` içinde tutulur.
- Mevcut kaynak kodunda preload, lazy loading, görsel boyutları, preconnect, service worker ve consent-gated analytics kontrolleri bulunur.
- Gerçek saha CWV/PageSpeed verisi alınmadan performans sonucu iddia edilmez.

## Koruma ve kapsam
- Başlangıçta değişmiş olan `bordro-yazilimi.html`, `ik-yazilimi.html`, `pdks.html`, `puantaj-ve-vardiya-yazilimi.html`, `site-config.min.js`, `sitemap.xml` korunur.
- Test bağımlılıkları `tests/seo/` altında tutulur; sitenin runtime bağımlılığı değildir.
- Commit/push veya canlı sunucu değişikliği bu ilk yerel düzeltme turunun parçası değildir.
- Yerel test başarısı, canlı yayın veya Google'ın yeniden işlemesi anlamına gelmez.

## İlk yerel tur
- Başlangıç BOM'u tarayıcıdaki taşıma katmanına uygun biçimde ayrıldı; gömülü BOM, fazla `>` ve artık açıklamalar temizlendi. Ham metin denetimindeki 65 adayın tamamı gerçek hata değildi.
- Dört sektör sayfasında DOCTYPE öncesindeki `?` temizlendi.
- Blog sitemap: 176 → 181 URL; 28 Ekim–1 Kasım arasında yayın tarihi gelmiş beş mevcut makale eklendi. Yeni içerik oluşturulmadı.
- Hreflang aşaması kısmen tamamlandı: SGK, net-brüt, kıdem, bordro maliyeti, ROI formülü ve ROI senaryoları; 24 sayfada 120 karşılıklı alternate hedefi test edildi. Diğer dil grupları sonraki turda ele alınacak.
- Kalite kapısına parser tabanlı testler ve sitemap `--check` eklendi. Sitemap tazelik kontrolü günlük yayın takvimine göre çalışır; günlük yayın işinin site haritasını güncellemesi gerekir.
- Mevcut `daily-blog-publish.yml` zaten günlük publisher sonrasında sitemap üreticisini çalıştırıyor; bu akış korundu.
- Son doğrulama: 32/32 regresyon testi, 586/586 head kontrolü, 181 URL sitemap tazelik kontrolü, mevcut i18n testi ve `git diff --check` başarılı.
- Test bağımlılıklarının npm güvenlik denetimi: 0 açık. Snyk aracı bu oturumda mevcut olmadığından Snyk kod taraması yapılmadı.

## İkinci yerel tur — hreflang
- Gerçek çevirilerin dosya, canonical ve dönüş bağlantıları karşılaştırıldı; eski slug, yinelenen dil ve eksik karşılıklı bağlantılar düzeltildi. Denetim aracı tüm 586 HTML dosyasını kapsar.
- `slug-mapping.json` içindeki iki çakışma içerikle doğrulanarak ayrıldı: yeni ücret adaleti makalesinin DE hedefi `artikel-analytik-lohngerechtigkeit`, yeni dashboard makalesinin AR hedefi `mqal-tsmym-lwht-maalwmat-almward-albshrya`. Eski makalelerin ayrı çevirileri korundu.
- Alman vergi hesaplayıcısı EN/DE, GOSI hesaplayıcısı EN/AR gerçek çiftlerine bağlandı. UAE/UK/US tek dilli hesaplayıcılarında ilgisiz ana sayfalara giden hreflang kaldırıldı.
- İki eski AR makale kopyasının yanlış çapraz dil bağlantıları kaldırıldı; canonical/noindex/içerik politikası değiştirilmedi. Kopyaların birleştirilmesi ayrıca değerlendirilecek.
- DE açıklanabilir yapay zekâ makalesindeki eksik AR dönüş bağlantısı tamamlandı.
- Ara ölçümdeki 117 bulgu 32'ye indi. Kalanların tamamı `security.html` ve `compliance.html` dört dil kümesindeki sekiz dosyada. EN/DE/AR gövdeleri Türkçe olduğundan yalnız `lang` değiştirerek geçerli çeviri gibi gösterilmedi; 3. adım bu nedenle açık.
- Bu 32 yapısal bulgu, tam hedef ve nedenleriyle regresyon başlangıç listesinde görünür tutuluyor; yeni hata veya listedeki değişiklik testi durdurur. Testlerin yeşil olması bu borcun çözüldüğü anlamına gelmez. Dil özniteliği kontrolü gerçek içerik dilini tek başına doğrulamaz.
- Yeni testler tek dilli sayfaları, gerçek iki dilli çiftleri, x-default, noindex hedefleri, karşılıklılık ve tüm indekslenebilir dört dilli slug eşlemelerini kapsar. Mevcut CI `npm test` üzerinden bunları da çalıştırır.
- Son doğrulama: **38/38 test**, **586/586 head**, **181 URL sitemap** kontrolü başarılı. i18n kontrolü hatasız; gerçek iki dilli/tek dilli ve eski AR sayfalarında dört dilli küme beklediği için 9 uyarı var. `git diff --check` başarılı; bazı dosyalarda Git LF→CRLF bilgilendirmesi veriyor.
- npm güvenlik denetimi: 0 açık; Snyk aracı mevcut değil. Başlangıçtaki altı değişmiş dosyanın SHA256 değerleri korundu. Commit/push/deploy yapılmadı.

### Sıradaki iş
1. Yinelenen/genel meta açıklamalarını ve mevzuat iddialarının resmi kaynak doğrulamasını ele al.
2. TR güvenlik/uyum sayfalarındaki bozuk metinleri, kanıtsız sertifika/veri konumu iddialarını ve puan/fiyat şemasını ayrıca gözden geçir; bu tur TR içeriklerini değiştirmedi.

## Üçüncü yerel tur — güvenlik ve uyum çevirileri
- EN/DE/AR `security.html` ve `compliance.html`: altı sayfanın gövdesi, navigasyonu, SSS'si, CTA ve alt metinleri gerçek çevirilerle tamamlandı. AR HTML ve body yönü RTL; canonical ve hreflang kümeleri korundu.
- Başlık, açıklama, Open Graph/Twitter ve JSON-LD kendi dili ve URL'siyle tutarlı hale getirildi. `lang-all.min.js` içindeki yalnız ilgili dokuz farklı sözlük değeri değiştirildi; çalışma anında statik metadata'nın eski metne dönmesi önlendi.
- Bu altı sayfadaki doğrulanmamış AES/ISO/Türkiye sunucusu/iki faktör iddia paragrafı yerine güncel güvenlik dokümanını isteme ve gereksinimlerle değerlendirme metni kullanıldı. Compliance şemasındaki kaynağı görünmeyen puan/teklif kaldırıldı; sayfalar `WebPage` olarak tanımlandı. Bu değişiklikler bir güvenlik sertifikası doğrulaması değildir.
- Ortak CSS/JS/görsel/manifest ve service worker yolları locale dizininden kökteki gerçek dosyalara düzeltildi; içerik bağlantıları gerçek çevrilmiş slug'lara yönlendirildi. Mevcut TR ekran görüntüleri korundu; ekran görüntülerinin yerelleştirilmesi ayrıca yapılabilir.
- 32 bulguluk istisna listesi kaldırıldı. Genel hreflang testi artık **sıfır bulgu** gerektirir. Altı yeni test gerçek gövde dilinin örnek denetimini, sözlük/metadata/schema tutarlılığını, görünür SSS eşleşmesini ve yerel kaynak varlığını kapsar; otomatik test profesyonel dil incelemesinin yerini tutmaz.
- **44/44 test başarılı**; head ve hreflang denetimleri **586 sayfada sıfır bulgu**, sitemap **181 URL**. Mevcut i18n kontrolü hatasız; önceki dokuz sınırlı küme uyarısı sürüyor.
- Yerel tarayıcıda altı sayfanın çalışma anındaki başlık/açıklama/canonical/dil/yön ve beş head alternate kontrolü yapıldı; yüklenmiş bozuk görsel görülmedi. 390 px mobil kontrolde DE uzun metin taşmaları sayfaya özel kurallarla düzeltildi. Canlı site değiştirilmedi.
- Snyk aracı mevcut olmadığından kod taraması yapılamadı. Commit/push/deploy yapılmadı; 4–6. adımlar açık.

## Dördüncü yerel tur — metadata ve mevzuat riskleri
- Arapça makalelerdeki dokuz İngilizce fallback açıklaması, mevcut Arapça konu başlıklarına göre özgün açıklamalarla değiştirildi. Gövde, canonical, hreflang ve hukuki iddialar değiştirilmedi.
- Asgari ücret ve SGK tavan/taban makalelerinde meta açıklama ile gövde arasındaki doğrulanmamış sayısal çelişkiler kaldırıldı; açıklamalar sayısal iddia içermeyen konu tanımlarına çekildi. SGK `og:description` de aynı şekilde eşitlendi.
- Resmî SGK, GİB ve Resmî Gazete ana kaynakları incelendi; üç mevzuat makalesinde doğrudan kaynak bağlantısı bulunmadığı ve gövdede tutar/oran/kanun numarası çelişkileri olduğu doğrulandı. Rakamları tahmin ederek değiştirmedim.
- Açık içerik riski: `makale-2026-yemek-istisnasi.html` içindeki 7577 sayılı Kanun, 240 TL/120 TL ve vergi/SGK istisnası iddiaları; asgari ücret ve SGK makalelerinin gövde rakamları hâlâ resmî kaynak ve uzman incelemesi gerektiriyor. Bu nedenle mevzuat doğrulaması tamamlanmış sayılmıyor.
- Sıradaki güvenli iş, kaynak metinleri ve yürürlük tarihleri kesinleştirilmeden hukuki/numeric gövdeyi güncellememek; ardından kaynak URL, erişim tarihi ve kapsam notu eklemektir.
- Son doğrulama: **44/44 test**, **586/586 head**, **586/586 hreflang** ve **182 URL blog sitemap** kontrolü başarılı; i18n hatasız ve npm audit 0 açık. Sistem tarihi 2 Kasım 2026 olduğu için doğrulanmış 2 Kasım blog kartı sitemap'e eklendi; 3 Kasım kartı gelecekte olduğu için dışarıda bırakıldı.