# CADRO HR — Ürün Yol Haritası (Product Roadmap)

**Versiyon:** 1.0  
**Tarih:** Mayıs 2026  
**Gizlilik:** Yalnızca Yatırımcı Kullanımı

---

## 1. Mevcut Durum (Mayıs 2026)

CADRO, **Aşama 0 → Aşama 1** geçişinin sonundadır: Ürün teknik olarak tamamlanmış, ödeme altyapısı (Paddle) kurulmuş, ancak ilk müşteri henüz edinilmemiştir.

### Bugün İtibariyle Canlıda Olan (v1.0)

| Kategori | Tamamlanmış Özellikler |
|---|---|
| Temel HR (BASIC) | Personel, İzin, Devam, Demirbaş, Özlük, Org Chart, Dashboard, Bildirimler |
| Operasyon (PRO) | ATS + AI CV Tarama, Harcama, Satın Alma, Bilgi Bankası, KPI, Lokasyon, Yaşam Döngüsü |
| Kurumsal (ENTERPRISE) | OKR/Performans + AI Analizi, Eğitim + Sertifika |
| Mobil | Flutter iOS + Android (QR devam, self-servis, onay akışı) |
| Faturalama | Paddle MoR — Basic/Pro/Enterprise × Aylık/Yıllık (6 fiyat planı) |
| Güvenlik | RBAC (6 rol), Granüler izinler, JWT, Audit Log, Webhook imza doğrulama |
| Raporlama | Çok dilli PDF (TR+AR), Excel, CSV |
| Sosyal | Mood Log, Kudos/Takdir sistemi |

### Geçici Devre Dışı (Teknik Hazır, Yeniden Etkinleştirmeyi Bekliyor)

| Modül | Durum | Not |
|---|---|---|
| Helpdesk / Destek Talebi | Devre dışı (`# HELPDESK DEVRE DISI`) | Kod hazır, router yorumlanmış |

### Kodlanmış Ama Henüz Yayımlanmamış Özellikler

| Özellik | Dosya | Durum |
|---|---|---|
| **Bordro Hesaplama Motoru** | `services/payroll_service.py` | Kademeli vergi hesaplama, KKTC uyumlu |
| **Toplu Maaş İşleme** | `services/payroll_batch_service.py` | Şirket geneli tek seferde hesaplama |
| **Banka Transfer Listesi** | `services/bank_service.py` | IBAN + net maaş → Excel banka formatı |
| **v1 API Admin Paneli** | `api/v1/endpoints/` | Admin, ATS, Şirket endpoint'leri hazır |

---

## 2. Yol Haritası — Fazlar

### FAZA 0 (Tamamlandı) — Temel Platform ✅

**Hedef:** Çalışan, demo edilebilir, fatura alınabilir ürün

- ✅ 28 aktif API modülü
- ✅ Flutter mobil uygulama (iOS + Android)
- ✅ Paddle faturalama entegrasyonu
- ✅ 3 dil (TR + EN + AR) + RTL desteği
- ✅ AI özellikleri (Gemini API)
- ✅ Multi-tenant mimari

---

### FAZ 1 (Q3 2026) — İlk Müşteri & Pazar Girişi 🚀

**Hedef:** İlk 10 ödeme yapan müşteri, Türkiye pazarı

#### Öncelik 1: Helpdesk Modülünü Yeniden Etkinleştir
- Dahili destek talebi sistemi (kod hazır, yalnızca router açılacak)
- SLA takibi, ticket önceliklendirme
- **Süre:** 1 hafta

#### Öncelik 2: Bordro Modülü — Yayın
- Var olan `payroll_service.py` + `payroll_batch_service.py`'ı API'ye bağla
- Kademeli gelir vergisi hesaplama (KKTC + Türkiye uyumlu mimari)
- Toplu maaş işleme (tüm şirket için tek tıkla)
- Banka transfer listesi Excel export (IBAN bazlı)
- **Süre:** 2-3 hafta (altyapı hazır, yalnızca API katmanı gerekiyor)

#### Öncelik 3: Self-Servis Onboarding Akışı
- Yeni şirket kaydı → yapılandırma → ilk kullanıcı davet
- Kredi kartı ile anlık aktivasyon (Paddle checkout)
- **Süre:** 2 hafta

#### Öncelik 4: Demo Ortamı
- Örnek verilerle dolu demo tenant
- "Demo ile Başla" butonu (kayıt gerektirmeden)
- **Süre:** 1 hafta

---

### FAZ 2 (Q4 2026) — Büyüme & MENA Açılımı 🌍

**Hedef:** 50 müşteri, Körfez bölgesi (GCC) pilot

#### Arap Dili ve Hukuki Uyum
- Hicri takvim desteği (BAE, Suudi Arabistan tatil takvimi)
- Arap ülkeleri izin katalog genişletmesi
- Mevcut Arapça RTL altyapısı üzerine genişletme
- **Süre:** 3 hafta

#### Bordro — Bölgesel Vergi Uyumu
- Türkiye SSK/SGK kesinti hesaplama
- BAE/Katar: kesintisiz bordro (gelir vergisi yok, EOSB/kıdem)
- Suudi Arabistan: GOSI (sosyal sigorta) entegrasyonu
- **Süre:** 4-6 hafta

#### API & Entegrasyonlar
- REST API açık dokümantasyonu (OpenAPI/Swagger)
- Muhasebe entegrasyonu (Logo, Netsis, Mikro — Türkiye)
- **Süre:** 3-4 hafta

#### Gelişmiş Raporlama Dashboardu
- Grafiksel KPI paneli (D3.js veya Chart.js)
- Özelleştirilebilir dashboard widget'ları
- Yönetici email rapor özeti (haftalık/aylık)
- **Süre:** 3 hafta

---

### FAZ 3 (Q1 2027) — Ölçekleme & Kurumsal Özellikler 📈

**Hedef:** 200+ müşteri, kurumsal segment, seri A

#### AI Özellik Genişletmesi
- Devamsızlık risk tahmini (makine öğrenimi)
- Otomatik maaş bandı önerisi (piyasa verisiyle kıyaslama)
- AI destekli işe alım e-postası kişiselleştirme
- **Süre:** 6-8 hafta

#### E-İmza Entegrasyonu
- İş sözleşmesi, eki ve belgeler için e-imza
- DocuSign veya yerel e-imza çözümü entegrasyonu
- **Süre:** 3-4 hafta

#### SSO & Güvenlik
- SAML 2.0 / OAuth2 SSO entegrasyonu (Google, Microsoft, Okta)
- Gelişmiş şifre politikası, 2FA
- SOC 2 Type II uyum hazırlığı
- **Süre:** 4-5 hafta

#### Mobil Uygulama Geliştirme
- Çevrimdışı devam kaydı (sonra senkronizasyon)
- Biometrik doğrulama (parmak izi / yüz tanıma)
- Vardiya zamanlama ve değiş tokuş
- **Süre:** 6 hafta

#### Ücret & Yan Haklar Yönetimi
- Maaş bandı tanımlama ve benchmarking
- Prim ve bonus hesaplama
- Yan haklar takibi (araç, telefon, sigorta)
- **Süre:** 5-6 hafta

---

### FAZ 4 (Q2-Q4 2027) — Platform Olgunluğu 🏗️

**Hedef:** 500+ müşteri, white-label, marketplace

#### White-Label Çözüm
- Partner markasıyla özelleştirilebilir arayüz
- Telekom ve danışmanlık şirketleri için lisans modeli
- **Süre:** 8-10 hafta

#### Marketplace & Ekosistem
- Üçüncü taraf entegrasyon mağazası
- Açık API & webhook altyapısı
- İş ortağı (partner) programı
- **Süre:** 10-12 hafta

#### Yapay Zeka Asistanı
- Çalışan self-servis AI chatbot (HR sorularını otomatik yanıtlar)
- Yönetici kararlarına AI önerisi
- **Süre:** 8-10 hafta

---

## 3. Yol Haritası Özet Görünümü

```
2026 Q3          2026 Q4          2027 Q1          2027 Q2-Q4
────────────────────────────────────────────────────────────────
[FAZ 1]          [FAZ 2]          [FAZ 3]          [FAZ 4]
İlk Müşteri      MENA Açılımı     Ölçekleme        Platform
────────────────────────────────────────────────────────────────
• Helpdesk ✳     • Hicri takvim   • AI genişlet.   • White-label
• Bordro API     • TR SSK bordro  • E-imza         • Marketplace
• Onboarding     • GCC bordro     • SSO/2FA        • AI asistan
• Demo tenant    • Muhasebe ent.  • Biometrik mob  • Partner prog.
                 • Dashboard v2   • Maaş bandı
────────────────────────────────────────────────────────────────
Hedef: 10 müş.   Hedef: 50 müş.  Hedef: 200 müş.  Hedef: 500+
```

✳ *Kod hazır, yalnızca aktivasyon gerekiyor*

---

## 4. Teknik Borç & Risk Haritası

| Madde | Risk Seviyesi | Açıklama | Çözüm |
|---|:---:|---|---|
| Helpdesk devre dışı | 🟡 Orta | Müşterinin destek talebi kanalı eksik | FAZ 1'de etkinleştir |
| Bordro API yok | 🟡 Orta | Rakiplerin %80'inde temel özellik | FAZ 1 bordro API'si |
| Ücretsiz deneme yok | 🟡 Orta | Rakiplerin tümü sunuyor | FAZ 1 demo tenant |
| Tek kurucu bağımlılığı | 🔴 Yüksek | Operasyonel risk | FAZ 2'de ilk ekip |
| Müşteri referansı yok | 🔴 Yüksek | Satış sürecini zorlaştırır | FAZ 1 ilk 3 müşteri |
| SOC 2 uyum yok | 🟡 Orta | Kurumsal satış engeli | FAZ 3 |

---

## 5. Önerilen Öncelik Sıralaması (Yatırım Alınması Durumunda)

Eğer **tohum yatırımı** ($300K-500K) alınırsa:

| Hafta | Faaliyet |
|---|---|
| 1-2 | Helpdesk aktif + Demo tenant oluştur |
| 3-5 | Bordro API yayını (TR + KKTC) |
| 6-8 | İlk 3 müşteri (beta, indirimli) |
| 9-12 | GCC lokalizasyonu (Hicri takvim + BAE bordro) |
| 13-16 | Muhasebe entegrasyonu (Logo/Netsis) |
| 17-20 | İlk 10 ödeme yapan müşteri → Seri A hazırlığı |

---

## Notlar

> Bordro ve banka transfer modülleri kaynak kodda (`services/payroll_service.py`, `services/payroll_batch_service.py`, `services/bank_service.py`) tamamen işlevsel durumdadır; yalnızca API katmanına bağlanmaları gerekmektedir.  
> Helpdesk modülü (`api/helpdesk.py`) tamamen yazılmış olup `main.py`'de yorum satırına alınmıştır — yeniden etkinleştirme 1 satır değişikliğiyle mümkündür.  
> Yol haritası süreleri tek kişilik geliştirme kapasitesine göre tahmin edilmiştir; ekip büyüdükçe hız artar.
