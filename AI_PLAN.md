# CADRO AI Adaptasyonu, Yönetişim ve Değişim Yönetimi Planı

**Durum:** Başlangıç planı  
**Tarih:** 14 Ağustos 2026  
**Kapsam:** CADRO HRMS ürünü, web sitesi, içerik güvenilirliği ve kurum içi AI adaptasyonu

## 1. Amaç

Bu planın amacı, CADRO'nun yapay zekâ entegrasyonunu yalnızca teknoloji eklemek olarak değil; insan, süreç, veri, güvenlik, yönetişim ve ölçüm bileşenleriyle birlikte yönetmesini sağlamaktır.

Hedefler:

- AI özelliklerini kanıtlanabilir ve güvenli biçimde tanımlamak.
- Çalışan, aday ve müşteri verilerinin kullanım sınırlarını açıklaştırmak.
- AI adaptasyonunu ADKAR modeliyle aşamalı olarak yönetmek.
- AI elçisi programı ve yönetici sponsorluğu kurmak.
- Veri odaklı hikâye anlatımıyla AI yatırımının etkisini ölçmek.
- Web sitesindeki AI iddialarını gerçek ürün kapasitesi, kaynak ve kanıtla eşleştirmek.
- AI içeriklerinin SEO, E-E-A-T, KVKK ve güvenilirlik standartlarına uymasını sağlamak.

## 2. Araştırma temeli

### Deloitte — 2026 Global Human Capital Trends

Deloitte'un 2026 çerçevesi üç kritik dönüşüme odaklanıyor:

1. İnsan + makine yaklaşımından insan × makine işbirliğine geçiş.
2. Sadece maliyet verimliliğinden değer yaratmaya geçiş.
3. Statik planlardan dinamik yetenek ve kapasite orkestrasyonuna geçiş.

CADRO için sonuç: AI özelliği tek başına değil; rol tasarımı, karar hakları, insan müdahalesi ve güven sistemiyle birlikte tasarlanmalıdır.

### Microsoft Work Trend Index

Microsoft'un Work Trend Index raporları AI at Work, Frontier Firm ve AI ajanları bağlamında şu alanları öne çıkarıyor:

- Çalışan ajansı.
- İnsan–agent işbirliği.
- Yöneticilerin yeni çalışma biçimlerini desteklemesi.
- İşin yeniden tasarlanması.
- AI kullanımının anonimleştirilmiş ve toplulaştırılmış verilerle ölçülmesi.

CADRO için sonuç: Başarı yalnızca AI kullanım sayısıyla değil, iş akışının kalitesi ve çalışanların AI'yı güvenli kullanabilmesiyle ölçülmelidir.

### World Economic Forum — Future of Jobs 2025

WEF raporu teknoloji değişimi, beceri dönüşümü ve workforce transformation ilişkisini ele alır. CADRO içeriklerinde WEF verileri kullanılacaksa raporun tam URL'si, yayın tarihi, örneklem ve kullanılan bölüm belirtilmelidir.

### Prosci ADKAR

ADKAR, bireysel değişimi beş sonuç üzerinden yönetir:

- **Awareness:** Değişimin nedenini bilme.
- **Desire:** Değişime katılma isteği.
- **Knowledge:** Nasıl değişileceğini bilme.
- **Ability:** Yeni yöntemi uygulayabilme.
- **Reinforcement:** Değişimi sürdürebilme.

### NIST AI RMF

AI yönetişimi için temel yapı:

- **Govern:** Politika, sorumluluk ve hesap verebilirlik.
- **Map:** Kullanım alanı, veri akışı ve risk haritası.
- **Measure:** Kalite, bias, hata, güven ve etki ölçümü.
- **Manage:** Risk azaltma, izleme, olay yönetimi ve sürekli iyileştirme.

### Gallup Workplace

AI adaptasyonu; kültür, yönetici davranışı ve çalışan bağlılığından ayrı ele alınmamalıdır. CADRO ölçüm modelinde çalışan güveni, yönetici desteği ve AI kullanım kalitesi birlikte izlenmelidir.

## 3. Mevcut durum ve boşluk analizi

### Mevcut güçlü yönler

- AI, İK, etik, analitik ve adaptasyon konularında içerik kümeleri mevcut.
- SEO teknik temeli temizlendi: JSON-LD parse hatası, rating/review schema ve sitemap duplicate sorunu yok.
- AI ile ilgili bazı makalelerde pilot, insan denetimi ve veri kalitesi vurgusu bulunuyor.
- Dört dilli yayın altyapısı mevcut.
- İK modülleri; ATS, özlük, izin, puantaj, performans ve analitik kümeleriyle AI kullanım senaryolarına uygun.

### Kritik boşluklar

- Üründe gerçekten mevcut AI özellikleri, roadmap özellikleri ve içerik iddiaları tek bir registry'de tutulmuyor.
- AI ürün iddiaları için ekran, kullanıcı rolü, veri akışı, model/vendor ve sınırlama kanıtı yok.
- Merkezi AI governance ve AI kullanım ilkeleri sayfası yok.
- İnsan denetimi, override, itiraz ve AI kaynaklı olay yönetimi açık değil.
- AI champion programı yalnızca içerik tavsiyesi düzeyinde.
- ADKAR aşamaları kullanıcı segmentleri, owner ve metriklerle eşleştirilmemiş.
- Data storytelling için KPI sözlüğü, veri kaynağı ve karar kaydı standardı yok.
- Bazı AI makalelerinde kaynak adı var; ancak tam URL, örneklem, yöntem ve erişim tarihi yok.
- Bazı ürün metinleri AI yeteneğini gerçek ekran veya doğrulanabilir ürün akışı göstermeden anlatıyor.

## 4. Uygulama fazları

## Faz 0 — AI gerçeklik ve claim registry

**Süre:** 1 hafta  
**Çıktı:** `AI_CLAIM_REGISTRY.md`

Görevler:

1. Web sitesindeki tüm AI iddialarını çıkar.
2. Üründe gerçekten çalışan özellikleri ürün ekibiyle doğrula.
3. Her iddiayı şu durumlardan biriyle işaretle:
   - Kanıtlı ve yayında.
   - İç pilot.
   - Roadmap.
   - Kaynak bekliyor.
   - Kaldırılacak.
4. Yüksek riskli kullanım alanlarını ayrıca işaretle:
   - İşe alım eleme.
   - Performans ve terfi.
   - Ücret ve yan haklar.
   - Çalışan bağlılığı tahmini.
   - Biyometrik ve konum verisi.

Her kayıt şu alanları içermelidir:

| Alan | Açıklama |
|---|---|
| Claim ID | Benzersiz kimlik |
| Sayfa | Dosya veya URL |
| İddia | Kullanılan ifade |
| Ürün durumu | Kanıtlı / pilot / roadmap / kaldırılacak |
| AI kullanım alanı | ATS, analitik, asistan vb. |
| Veri türü | Kişisel, anonim, sentetik, toplu |
| İnsan onayı | Gerekli / değil / belirsiz |
| Kanıt | Ekran, doküman, pilot sonucu veya kaynak URL |
| Risk seviyesi | Düşük / orta / yüksek |
| Owner | Sorumlu ekip |
| Son inceleme | Tarih |

## Faz 1 — AI yönetişim ve güven

**Süre:** 2 hafta  
**Çıktılar:**

- `ai-governance.html`
- `ai-kullanim-ilkeleri.html`
- Güncel güvenlik ve KVKK sayfaları

İçerik:

- AI sistemlerinin amacı ve kapsamı.
- İnsan denetimi ve nihai karar sorumluluğu.
- Veri minimizasyonu.
- Aday ve çalışan verilerinin kullanım sınırları.
- Public LLM'lere kişisel veri girme yasağı.
- Model çıktılarının doğrulanması.
- Bias ve kalite izleme.
- Audit log ve erişim kontrolü.
- Veri saklama, silme ve vendor/subprocessor sınırları.
- Hata, itiraz ve olay bildirim süreci.

Kural: İşe alım, performans, terfi veya ücret kararlarında AI nihai karar verici olarak tanımlanmayacaktır. AI öneri sağlayabilir; insan incelemesi ve karar kaydı zorunludur.

## Faz 2 — ADKAR tabanlı AI adaptasyon programı

**Süre:** 90 gün  
**Çıktı:** `ai-adoption-playbook.html`

### Gün 1–30: Awareness ve Desire

- Yönetici ve çalışan segmentlerini belirle.
- Her segment için fayda ve kaygı haritası çıkar.
- AI kullanım politikasını anlat.
- İlk 3 kullanım senaryosunu seç.
- Executive sponsor atamasını yap.

### Gün 31–60: Knowledge ve Ability

- AI temelleri eğitimi.
- Güvenli prompt ve veri sınıflandırma eğitimi.
- İnsan denetimi ve çıktı doğrulama eğitimi.
- Düşük/orta riskli pilotları başlat:
  - İK SSS asistanı.
  - Onboarding görev önerileri.
  - Yönetici raporu özetleme.
  - İç politika arama.

### Gün 61–90: Reinforcement

- Kullanım kalitesini ölç.
- Hata ve itirazları incele.
- Kullanıcı güven anketi yap.
- Pilot sonuçlarını baseline ile karşılaştır.
- Devam et / ölçekle / durdur kararı ver.
- Sonuçları karar kaydıyla belgeleyerek yayınla.

## Faz 3 — AI champion programı

**Çıktı:** `ai-champion-programi.html`

Roller:

- Executive sponsor.
- AI program owner.
- Domain lead.
- AI champion.
- IT/güvenlik sorumlusu.
- Hukuk/KVKK reviewer.

AI champion görevleri:

- Kullanım senaryosu toplamak.
- Ekip içi ofis saatleri düzenlemek.
- Güvenli kullanım sorularını yanıtlamak.
- Riskleri program sahibine aktarmak.
- Pilot sonuçlarını belgelemek.
- Başarı hikâyesi üretmek.
- Kullanıcı geri bildirimini ürün ekibine taşımak.

Önerilen 4 haftalık eğitim:

1. AI temelleri ve sınırları.
2. Kişisel veri ve güvenli kullanım.
3. Use-case ve pilot tasarımı.
4. Ölçüm, data storytelling ve yönetici sunumu.

## Faz 4 — Veri odaklı hikâye anlatımı

**Çıktı:** KPI sözlüğü ve yönetici dashboard standardı

Her metrik için:

- Tanım.
- Formül.
- Kaynak sistem.
- Veri sahibi.
- Güncelleme sıklığı.
- Baseline.
- Hedef.
- Sınırlamalar.
- Son karar veya aksiyon.

Her yönetici anlatısı şu yapıda olmalıdır:

> Sinyal → İçgörü → Karar → Sonuç

Korelasyon nedensellik gibi sunulmayacak. Sentetik veya anonim veriler açıkça etiketlenecek.

## Faz 5 — AI ürün kanıtı

Ürün sayfasında AI özelliği yayınlanmadan önce şu kanıtlar hazırlanmalı:

- Özellik adı.
- Kullanıcı rolü.
- Girdi/veri türü.
- Çıktı örneği.
- İnsan inceleme adımı.
- Override mekanizması.
- Audit log.
- Hata ve bias sınırı.
- Veri saklama ve silme bilgisi.
- Ekran görüntüsü veya demo akışı.

Kanıt yoksa metin “planlanan özellik” veya “AI kullanım senaryosu” olarak etiketlenmelidir.

## 5. İçerik ve SEO standardı

AI makalelerinde zorunlu alanlar:

- Gerçek yazar.
- Uzman reviewer.
- `datePublished`.
- `dateModified`.
- Kaynak kurum.
- Rapor adı.
- Yayın tarihi.
- Canlı kaynak URL'si.
- Örneklem ve yöntem.
- Erişim tarihi.
- AI destekli üretim kullanıldıysa editoryal açıklama.

Kaynak doğrulanamıyorsa:

- Kesin oran kaldırılır.
- Doğrudan alıntı kaldırılır.
- “Örnek senaryo” etiketi kullanılır.
- Kurum içi pilotla doğrulanacak biçimde yeniden yazılır.

AI konu kümeleri:

1. AI in HR.
2. AI işe alım etiği.
3. AI governance ve KVKK.
4. AI adoption playbook.
5. AI champion programı.
6. Data storytelling.
7. Manager enablement.
8. HR analytics.
9. Human–AI collaboration.

## 6. Kod ve dosya backlog’u

### Hemen yapılacaklar

- `AI_CLAIM_REGISTRY.md` oluştur.
- `makale-ik-yapay-zeka-kesisim-2026.html` kaynak ve capability audit’i.
- `makale-ik-donusen-rol-2026.html` kaynakça/reviewer standardı.
- `makale-yonetici-ai-adaptasyon-2026.html` ADKAR ve 90 günlük pilot bölümü.
- `makale-ise-alimda-ai-etik.html` bias test, insan review ve itiraz bölümü.
- `ik-yazilimi.html` yalnızca doğrulanmış AI özelliklerini yayınla.

### Governance aşaması

- `ai-governance.html` oluştur.
- `ai-kullanim-ilkeleri.html` oluştur.
- `compliance.html` içine AI veri işleme sınırları ekle.
- `security.html` içine AI log, erişim ve incident response açıklaması ekle.
- `about.html` içine AI/HR uzmanı ve reviewer bilgileri ekle.

### Otomasyon

- `tools/seo-ai-content-audit.ps1` oluştur.
- CI içinde şu kontrolleri çalıştır:
  - JSON-LD parse.
  - AI claim anahtar kelimeleri.
  - Kaynak URL varlığı.
  - Yazar/reviewer.
  - Tarih tutarlılığı.
  - Schema-visible content uyumu.
  - Riskli kesin oran ve alıntı tespiti.

## 7. Ölçüm planı

### AI kullanım metrikleri

- Aktif kullanıcı.
- Tekrar kullanım oranı.
- Görev başarı oranı.
- İnsan override oranı.
- Hata ve itiraz sayısı.
- Eğitim tamamlanma oranı.
- Kullanıcı güven skoru.
- Yönetici desteği.
- Zaman ve kalite etkisi.

### 30/60/90 karar kapıları

- **30. gün:** Kullanım senaryosu ve eğitim uygunluğu.
- **60. gün:** Pilot kalite, güvenlik ve kullanıcı deneyimi.
- **90. gün:** Devam, ölçekleme veya durdurma.

## 8. Kabul kriterleri

1. AI iddialarının tamamı `AI_CLAIM_REGISTRY.md` içinde kanıt durumuna sahip.
2. Kaynaklı tüm sayılar için canlı URL, tarih ve yöntem mevcut.
3. Her AI use case için owner, risk seviyesi, insan onayı, metrik ve durdurma koşulu mevcut.
4. AI champion programında sponsor, rol tanımı, eğitim ve aylık ölçüm döngüsü mevcut.
5. ADKAR’ın beş aşaması kullanıcı segmenti, aktivite, owner ve ölçümle eşleşiyor.
6. AI ürün sayfaları gerçek capability/demo kanıtı içeriyor.
7. AI ve KVKK sayfalarında veri minimizasyonu, retention, override, itiraz ve vendor sınırları açıklanıyor.
8. JSON-LD, canonical, hreflang, sitemap ve encoding auditleri yeşil.
9. 30/60/90 pilot kararları kayıt altına alınıyor.

## 9. Uygulama ilkeleri

- AI üründe yoksa varmış gibi pazarlanmayacak.
- İnsan denetimi olmayan yüksek riskli karar akışı yayınlanmayacak.
- Kaynaksız kesin oran ve alıntı kullanılmayacak.
- Anonim müşteri review’u yapılandırılmış veri olarak kullanılmayacak.
- Sentetik veri gerçek müşteri sonucu gibi sunulmayacak.
- AI SEO hilesi, özel markup veya `llms.txt` sıralama stratejisi yapılmayacak.
- Her değişiklik sonrası audit, JSON-LD kontrolü ve build/deploy doğrulaması yapılacak.
