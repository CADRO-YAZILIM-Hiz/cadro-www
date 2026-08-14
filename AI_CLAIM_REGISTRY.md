# CADRO AI Claim Registry

**Tarih:** 14 Ağustos 2026  
**Durum:** İlk envanter — ürün ve hukuk doğrulaması bekliyor  
**Sorumlu:** AI Program Owner + Ürün + Hukuk/KVKK + İçerik

## Kullanım kuralları

- `Kanıt durumu` doğrulanmadan AI capability, güvenlik veya uyumluluk iddiası yayınlanmaz.
- Kaynaklı araştırma sayıları için canlı URL, rapor adı, yayın tarihi ve metodoloji zorunludur.
- Ürün özelliği gerçek değilse `Roadmap` veya `İçerik konusu` olarak etiketlenir.
- Yüksek riskli HR AI kararlarında insan incelemesi ve itiraz yolu zorunludur.
- Bu dosya ürün, hukuk ve içerik ekiplerinin ortak onayıyla güncellenir.

## Durum kodları

- `Kanıtlı`: Üründe mevcut, ekran/doküman/test kanıtı var.
- `Pilot`: Sınırlı kullanıcı veya kurum içi testte.
- `Roadmap`: Planlanmış fakat yayında değil.
- `Kaynak bekliyor`: Dış araştırma/istatistik doğrulanmalı.
- `Kaldırılacak`: Kanıtlanamıyor veya yanıltıcı.
- `İnceleme`: Ürün/hukuk kararı bekliyor.

## İlk iddia envanteri

| ID | Sayfa | İddia / konu | Kullanım alanı | Risk | Kanıt durumu | Gerekli aksiyon | Owner |
|---|---|---|---|---|---|---|---|
| AI-001 | `makale-ik-yapay-zeka-kesisim-2026.html` | AI destekli İK / AI modülleri | Genel AI in HR | Yüksek | İnceleme | Üründe gerçekten bulunan AI özelliklerini, kullanıcı rolünü, veri akışını ve ekran kanıtını belgelemek | Ürün + İçerik |
| AI-002 | `makale-ise-alimda-ai-etik.html` | AI işe alımda bias azaltma | ATS / işe alım | Yüksek | İnceleme | Bias testleri, insan review, açıklanabilirlik ve itiraz akışını doğrulamak; kanıt yoksa capability iddiasını kaldırmak | Ürün + Hukuk |
| AI-003 | `makale-ik-ai-etik-2026.html` | AI Act, KVKK, etik AI uygulaması | Governance | Yüksek | Kaynak bekliyor | Her mevzuat ve standart için resmi URL, yayın tarihi ve yerel kapsam eklemek | Hukuk + İçerik |
| AI-004 | `makale-ik-donusen-rol-2026.html` | AI çağında İK rol dönüşümü | Workforce transformation | Orta | Kaynak bekliyor | Kullanılan WEF/SHRM/Deloitte/LinkedIn kaynaklarını tam künye ve URL ile eklemek; doğrulanamayan oranları kullanmamak | İçerik |
| AI-005 | `makale-yonetici-ai-adaptasyon-2026.html` | Yönetici AI adaptasyonu ve AI champion | Değişim yönetimi | Orta | Kaynak bekliyor | ADKAR eşlemesi, sponsor/champion görevleri, pilot charter ve ölçüm metrikleri eklemek | Değişim + İçerik |
| AI-006 | `ik-yazilimi.html` | CADRO AI modülleri / AI destekli süreçler | Ürün pazarlaması | Yüksek | İnceleme | Yayında olmayan AI özelliklerini kaldırmak veya Roadmap etiketiyle ayırmak; insan denetimi sınırını açıklamak | Ürün + Pazarlama |
| AI-007 | `compliance.html` | AI ve KVKK uyumu | Veri koruma | Yüksek | İnceleme | Veri işleme, minimizasyon, retention, vendor/subprocessor ve insan override politikasını belgelemek | Hukuk/KVKK |
| AI-008 | `security.html` | AI veri güvenliği ve audit log | Güvenlik | Yüksek | İnceleme | Model/vendor, loglama, erişim, olay yönetimi ve silme kanıtlarını eklemek | Güvenlik + IT |
| AI-009 | `makale-ik-yapay-zeka-kesisim-2026.html` | AI işe alım, performans, analytics etkileri | Use-case eğitimi | Yüksek | Kaynak bekliyor | Kaynaksız sayıları ve alıntıları kaldırmak; senaryo/örnek olarak etiketlemek; kaynakça bloğu eklemek | İçerik |
| AI-010 | `ik-roi-hesaplama.html` | AI/İK ROI tahmini | ROI / karar desteği | Orta | İnceleme | Katsayıların kaynağını ve belirsizlik aralığını açıklamak; sonuçların tahmin olduğunu görünür tutmak | Ürün + Finans |
| AI-011 | `vaka-calismasi-*.html` | AI/otomasyon sonucu veya müşteri başarısı | Vaka çalışması | Yüksek | Kanıt bekliyor | Müşteri izni, dönem, baseline, yöntem ve sınırlamaları eklemek; sahte Review schema kullanmamak | Müşteri Başarı + Hukuk |
| AI-012 | `AI_PLAN.md` / yeni governance sayfaları | AI kullanım ilkeleri | Kurumsal politika | Yüksek | Roadmap | `ai-governance.html` ve `ai-kullanim-ilkeleri.html` oluşturmak | AI Program Owner |
| AI-013 | Yeni AI champion programı | AI champion işletim modeli | Adaptasyon | Orta | Roadmap | Sponsor, seçim kriterleri, eğitim, ofis saati, escalation ve aylık KPI planı oluşturmak | Değişim Yönetimi |
| AI-014 | Yeni data storytelling standardı | Sinyal → içgörü → karar → sonuç | Yönetici iletişimi | Orta | Roadmap | KPI sözlüğü, veri sahibi, kaynak, baseline, hedef ve karar kaydı şablonu oluşturmak | People Analytics |

## AI kullanım alanı risk matrisi

| Kullanım alanı | Başlangıç seviyesi | İnsan onayı | Minimum kanıt |
|---|---:|---|---|
| İK SSS / politika arama | Düşük | Yanıt doğrulaması | Kaynak doküman, güncellik ve yanlış yanıt bildirimi |
| Yönetici raporu özetleme | Düşük/Orta | Yayın öncesi review | Kaynak veri, değişiklik izi ve özet doğrulama |
| Onboarding görev önerisi | Orta | İK onayı | Görev kaynağı, kullanıcı rolü ve override |
| Aday sıralama/eleme | Yüksek | Zorunlu insan kararı | Bias testi, açıklama, itiraz, audit log |
| Performans/terfi önerisi | Yüksek | Zorunlu insan kararı | Veri kalitesi, adalet testi, karar kaydı |
| Ücret/yan hak önerisi | Yüksek | Zorunlu insan ve hukuk review | Mevzuat, veri kaynağı, açıklama ve itiraz |
| Çalışan ayrılma tahmini | Yüksek | İK ve yönetici review | Yanlış pozitif analizi, gizlilik, aksiyon sınırı |
| Biyometrik/konum analizi | Çok yüksek | Hukuk/KVKK onayı | Amaç, gereklilik, minimizasyon, saklama ve erişim politikası |

## Kaynak registry standardı

Her dış kaynak için aşağıdaki alanlar doldurulmalıdır:

| Alan | Zorunlu |
|---|---|
| Kaynak kurumu | Evet |
| Rapor/makale tam adı | Evet |
| URL | Evet |
| Yayın tarihi | Evet |
| Erişim tarihi | Evet |
| Örneklem / metodoloji | Evet |
| Kullanılan bölüm veya sayfa | Sayı/alinti varsa evet |
| Parafraz mı doğrudan alıntı mı? | Evet |
| Yerel mevzuat kapsamı | HR/KVKK konularında evet |
| İçerik reviewer’ı | Evet |

## Aksiyon durumu

- [ ] Ürün ekibi AI capability envanterini doğruladı.
- [ ] Hukuk/KVKK yüksek riskli use-case’leri inceledi.
- [ ] Kaynak registry bağlantıları tamamlandı.
- [ ] `ai-governance.html` taslağı hazırlandı.
- [ ] `ai-kullanim-ilkeleri.html` taslağı hazırlandı.
- [ ] ADKAR 30/60/90 pilot charter’ı hazırlandı.
- [ ] AI champion rol tanımı ve eğitim planı hazırlandı.
- [ ] KPI sözlüğü ve data storytelling şablonu hazırlandı.
- [ ] AI iddiaları tekrar audit edildi.

## Kabul kriterleri

1. AI iddialarının tamamı bu registry’de durum ve owner bilgisine sahip.
2. Yüksek riskli iddiaların tümünde insan onayı ve kanıt bulunuyor.
3. Kaynaksız sayı ve alıntı kalmıyor.
4. Ürün sayfaları yalnızca gerçekten mevcut AI özelliklerini anlatıyor.
5. Roadmap özellikleri kullanıcıya mevcut özellik gibi sunulmuyor.
6. JSON-LD, canonical, hreflang ve encoding auditleri yeşil kalıyor.
