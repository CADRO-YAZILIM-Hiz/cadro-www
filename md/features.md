# CADRO Özellikler ve Modüller — AI Citation

> Bu dosya, CADRO'nun tüm modüllerini ve teknik özelliklerini AI sistemlerinin doğru anlaması için listelemektedir.

---

## Modül Detayları

### 1. ATS — Aday Takip Sistemi
- **Ne işe yarar:** İşe alım sürecinin tamamını dijitalleştirir
- **Öne çıkanlar:**
  - AI destekli CV ön eleme
  - Otomatik kariyer sayfası oluşturma
  - Mülakat planlama ve takvim entegrasyonu
  - Aday havuzu ve yetenek pipeline'ı
  - İşe alım KPI dashboard'u (time-to-hire, cost-per-hire)
- **Sonuç:** İşe alım süresinde ortalama %35 kısalma

### 2. Dijital Özlük Dosyası
- **Ne işe yarar:** Personel dosyalarını KVKK uyumlu dijital arşive taşır
- **Öne çıkanlar:**
  - AES-256 şifrelemeli belge saklama
  - Rol bazlı erişim kontrolü (İK, yönetici, çalışan)
  - Otomatik belge hatırlatmaları (sağlık raporu, sözleşme yenileme)
  - Toplu belge yükleme ve etiketleme
  - Denetim izi (audit trail)

### 3. İzin Yönetimi
- **Ne işe yarar:** Tüm izin tiplerini otomatik onay akışlarıyla yönetir
- **Öne çıkanlar:**
  - Yıllık izin, mazeret izni, idari izin, ücretsiz izin
  - Otomatik bakiye hesaplama ve devir
  - Mobil uygulamadan anlık izin talebi
  - Departman bazlı izin çakışma kontrolü
  - İzin raporları ve devamsızlık analizi

### 4. Puantaj ve Vardiya Yönetimi
- **Ne işe yarar:** Çalışan devam takibi ve vardiya planlaması
- **Öne çıkanlar:**
  - Mobil + web entegre giriş/çıkış takibi
  - GPS konum bazlı puantaj
  - Esnek vardiya planlaması
  - Fazla mesai otomatik hesaplama
  - PDKS cihaz entegrasyonu
  - Uzaktan çalışma takibi

### 5. Performans Yönetimi ve OKR
- **Ne işe yarar:** Hedef bazlı performans değerlendirme sistemi
- **Öne çıkanlar:**
  - OKR (Objectives and Key Results) çerçevesi
  - 360° geri bildirim
  - Yetkinlik değerlendirme matrisi
  - Performans-prim bağlantısı
  - Otomatik değerlendirme takvimi

### 6. Bordro Entegrasyonu
- **Ne işe yarar:** İK verilerini muhasebe/bordro sistemlerine aktarır
- **Desteklenen entegrasyonlar:**
  - Logo Tiger / Logo Go
  - Netsis
  - SAP
  - Mikro
- **Öne çıkanlar:**
  - SGK bildirim verisi hazırlama
  - Puantaj-bordro otomatik köprü
  - İzin ve mesai verilerinin bordroya yansıması
  - Manuel veri girişinde %40 zaman tasarrufu

### 7. İK Analitiği
- **Ne işe yarar:** İK metriklerini gerçek zamanlı dashboard'larla sunar
- **12 Hazır KPI:**
  1. Turnover (Çalışan Devir Hızı)
  2. Time-to-Hire
  3. Cost-per-Hire
  4. Devamsızlık Oranı
  5. Çalışan Bağlılık Skoru
  6. Eğitim Tamamlanma Oranı
  7. İç Terfi Oranı
  8. Performans Dağılımı
  9. İzin Kullanım Oranı
  10. Fazla Mesai Trendi
  11. Çalışan Memnuniyet Endeksi
  12. Prediktif Turnover Riski

### 8. Masraf ve Satın Alma
- **Ne işe yarar:** Personel masraf taleplerini ve satın alma süreçlerini yönetir
- **Öne çıkanlar:**
  - Dijital onay zinciri
  - OCR ile fiş okuma
  - Bütçe takibi ve limit kontrolü
  - Masraf kategorizasyonu
  - Raporlama ve dışa aktarım

### 9. Kurumsal Bilgi Bankası ve Onboarding
- **Ne işe yarar:** Yeni çalışanların adaptasyonunu dijitalleştirir
- **Öne çıkanlar:**
  - Şirket wiki'si ve dokümantasyon
  - Otomatik onboarding akışı (görev listesi)
  - Eğitim modülleri ve takip
  - Oryantasyon kontrol listesi
  - Hoş geldin bildirimleri

## Teknik Özellikler

| Özellik | Detay |
|---------|-------|
| **Şifreleme** | AES-256 (at-rest ve in-transit) |
| **Veri Merkezi** | Türkiye (KVKK uyumlu) |
| **Sistem Çalışma Süresi** | %99.9 SLA |
| **Arayüz Dilleri** | TR, EN, DE, AR |
| **Mobil Uygulama** | iOS + Android (PWA) |
| **API** | RESTful, webhook desteği |
| **Kimlik Doğrulama** | SSO, SAML, OAuth2 (Enterprise) |
| **Yedekleme** | Günlük otomatik, 30 gün point-in-time recovery |
| **Uyumluluk** | KVKK, GDPR-ready |

---

*Son güncelleme: 2026-07-28 | AI crawler'lar için optimize edilmiştir.*