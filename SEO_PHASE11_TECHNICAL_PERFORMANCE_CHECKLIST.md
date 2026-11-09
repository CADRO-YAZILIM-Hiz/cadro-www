# SEO Faz 11 — Teknik performans ve sürdürülebilirlik checklist'i

**Tarih:** 2026-11-09  
**Durum:** Checklist hazır; gerçek saha CWV ölçümü bekleniyor.

## Mevcut kaynak gözlemi

- Ana sayfalarda hero görselleri için `preload`, `fetchpriority="high"`, `width` ve `height` kullanılıyor.
- İkincil görsellerde `loading="lazy"` ve bazı sayfalarda `decoding="async"` uygulanıyor.
- Google Fonts için `preconnect` kullanılıyor.
- Service worker kaydı mevcut.
- `app.min.js` görsel preload ve image loading hint davranışlarını yönetiyor.
- Gerçek kullanıcı Core Web Vitals verisi veya PageSpeed export'u çalışma alanında bulunmuyor.

## Ölçülecek metrikler

| Metrik | Hedef | Kontrol |
|---|---|---|
| LCP | mobilde iyi sınır içinde | Hero görseli, font, ilk içerik |
| INP | etkileşim gecikmesi düşük | Menü, dil değiştirici, hesaplayıcı, CTA |
| CLS | düşük | Görsellerde boyut, font ve dinamik bloklar |
| TTFB | sunucu/önbellek etkisi | CDN, cache, HTML yanıtı |
| JS yükü | gereksiz bloklama yok | `app.min.js`, `lang-all.min.js`, consent/analytics |
| Görsel ağırlığı | sayfa niyetine uygun | WebP, hero ve below-fold kaynaklar |

## Temsilî sayfa seti

Her dil için aynı sayfa tipi seçilecek:

- Ana sayfa: `/`, `/en/`, `/de/`, `/ar/`
- Ticari ürün: `ik-yazilimi.html` ve eşleri
- Araç: `bordro-maliyet-hesaplama.html` ve eşleri
- İçerik: bir mevzuat/rehber makalesi
- Dönüşüm: `demo.html` ve eşleri

## Laboratuvar ölçüm protokolü

1. Chrome Lighthouse mobil ve masaüstü çalıştırılır.
2. Her URL iki kez ölçülür; ilk sonuç ve tekrar sonucu ayrı kaydedilir.
3. Cache açık/kapalı koşullar belirtilir.
4. Consent reddedilmiş ve kabul edilmiş durumlar ayrı ölçülür.
5. Dil değiştirici ve form etkileşimi INP için test edilir.
6. Hero görseli, font yükü, script ve layout shift kaynakları not edilir.
7. Sonuçlar tarih, URL, cihaz/emülasyon ve Lighthouse sürümüyle kaydedilir.

## Saha verisi protokolü

- Search Console Core Web Vitals raporu ayrıca kontrol edilir.
- PageSpeed Insights field data ile lab data ayrıştırılır.
- Dil ve cihaz kırılımları korunur.
- Trafik düşükse field data yokluğu başarı/başarısızlık olarak yorumlanmaz.
- Gerçek kullanıcı verisi olmadan “CWV geçti” iddiası yazılmaz.

## Kontrol listesi

### HTML ve görsel

- [x] Hero görseli için preload/fetchpriority olan temsilî sayfalar mevcut.
- [x] Görsellerin çoğunda width/height mevcut.
- [x] Below-fold görseller lazy yükleniyor.
- [ ] Tüm önemli sayfalarda poster ve görsel boyutları saha ölçümüyle doğrulanacak.
- [ ] Gereksiz büyük görseller optimize edilecek.

### JavaScript

- [x] Analytics consent sonrasında yükleniyor.
- [x] Analytics scripti async/defer davranışı kullanıyor.
- [ ] Analytics kabul/red senaryosunda Lighthouse karşılaştırması yapılacak.
- [ ] Hesaplayıcı ve dil değiştirici INP ölçümü yapılacak.
- [ ] Kullanılmayan sayfa scriptleri tespit edilecek.

### Service worker ve cache

- [x] Service worker kaydı mevcut.
- [ ] Cache stratejisi ve eski asset invalidation davranışı doğrulanacak.
- [ ] Yeni deploy sonrası eski JS/CSS cache riski test edilecek.
- [ ] Offline cache'in güncel canonical/metadata davranışı incelenecek.

### Mobil ve erişilebilirlik

- [ ] 390px temsilî sayfa seti tekrar gözden geçirilecek.
- [ ] Uzun DE kelimeleri ve AR RTL blokları kontrol edilecek.
- [ ] Form focus/keyboard akışı ölçülecek.
- [ ] Video ve lightbox'ın mobil etkileşimleri test edilecek.

## Aylık teknik SEO checklist'i

- [ ] GSC indeksleme ve CWV raporu
- [ ] Sitemap freshness ve local target kontrolü
- [ ] Canonical/hreflang regresyon testi
- [ ] Lighthouse temsilî URL ölçümü
- [ ] Kırık link ve asset kontrolü
- [ ] Console runtime error kontrolü
- [ ] Consent/analytics davranışı
- [ ] Form, demo ve hesaplayıcı smoke testleri
- [ ] Service worker cache invalidation
- [ ] Mobil RTL/LTR görsel kontrolü

## Yayın engelleri

- Lighthouse veya saha verisi olmadan CWV sonucu iddia edilmez.
- Görsel optimizasyonu layout regression testi olmadan toplu uygulanmaz.
- Service worker cache değişikliği deploy smoke testinden geçmeden yayınlanmaz.
- Analytics değişiklikleri consent davranışı doğrulanmadan yayınlanmaz.
