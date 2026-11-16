# Küçük fazlı editoryal ve kanıt onarım planı

## Faz 1 — Kanıt standardı ve iki pilot
Tamamlandı, yerel doğrulandı: evidence-register, açık ROI hesap modeli, TR güvenlik UI ve referans kaynak sınırları.

- Dış başarı oranı söylenmeyen `ik-roi-hesaplama.html`; oran, gün, işçilik maliyeti ve plan maliyeti kullanıcı girdisi.
- `security.html`: doğrulanmamış AES-256/Türkiye/ISO/2FA ifadeleri kaldırıldı; ekran kanıtı, KVKK rehberi ve ISO referansı ayrıldı.
- `EVIDENCE_POLICY.md`: URL’nin tek başına kanıt olmadığı ve kaynak/iddia dönemi ölçütü.

## Faz 2 — Yerelleştirme ve diğer dillerde kanıt sınırı
Hedef: 87 dil uyarısının önce en yüksek riskli gruplarını çözmek; toplu kelime çevirisi yerine doğrudan gövde/dil eşlemesi.

- EN/DE/AR security/compliance tekrar denetimi: header, meta, body, JSON-LD ve yetkili ekranlar aynı dil.
- ROI EN/DE/AR varyantları da dış или tahmini başarı oranından arındırılmalı; örnek değerler açık ‘senaryo’ etiketi almalı.
- Kıdem hattının `og:locale:alternate` eşlemesi TR sayfasında hâlâ yanlış tekrar edebilir; diğer dillerde kaynak değer/dil aynı resmî döneme bağlı olmalı.
- Kesin problemli günlük ücret sayfa gövdelerinde `Calculate`, `Gross Salary` gibi otomatik metin kalıntıları düzeltildiğinden durum ülkeyi/vergi kapsamını yönlendiren `net-brut-maas-hesaplama` ailesine özel denetim yapılmalı.

Çıkış kriterleri: Önce en savunmasız 2–3 sayfalık dil paketi; parse + dil + hreflang + browser testi. Tüm 87 sıfırlanmış sayılmadan faz bitmez.

## Faz 3 — Bordro/vergi parametreleri
Hedef: her oran/istisna için kaynak metin, dönem ve formül girdisi bağlantısı. Genel SGK.gov.tr adresini detay kaynağı gibi kullanmamak.

- `net-brut-maas-hesaplama` ve dilleri: kümülatif tarife, asgari ücret istisna, sigorta payları ve geçici sabit değerlerin kaynağı/dönemi.
- `sgk-prim-hesaplama`: prim/tavan/teşvik kapsamları.
- Açık kaynak metin kontrol edilmeden yıla ait kesin oran yayınlanmaz; eksik kaynak durumu user-facing gösterilir veya içerik noindex yapılır.

## Faz 4 — Vaka ve ürün iddiaları
Müşteri yazılı izni, baseline, dönem, ölçüm, ürün müdahalesi ve alternatif açıklama olmayan başarı/kazanım cümleleri kaldırılır. Doğrulanmamış AI/şifreleme/sertifika/ROI ifadeleri de şeffaf ürün kapsamına çevrilir.

## Faz 5 — Tekrarlanan denetim, yayın ve GSC
Full Node regresyon, sitemap/index-noindex kümesi, dil smoke test, hesap form testi, canlı HTTP/özellikle 404 kontrolü, Actions ve sonrasında GSC doğrulaması. Mevcut değişiklikler hâlâ uncommitted durumdadır; Faz 2 bitiminde küçük bir ayrık commit ve deploy önerilir.

## Kanıt durum çözümü
`verified` yalnız okunan kaynağın doğrudan iddiayı desteklemesi demektir. `formula_only` açık aritmetik hesap, müşteri sonucu değildir. `needs_specific_review` ana sayfa/başlık/bağlantı eşlemesi tam fakat ayrıntılı kaynak/metrik onayı eksik demektir.
