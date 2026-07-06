# CADRO HR — Ürün Özeti & Özellik Kataloğu

**Versiyon:** 1.0  
**Tarih:** Mayıs 2026  
**Gizlilik:** Yalnızca Yatırımcı Kullanımı

---

## 1. Ürün Özeti

CADRO, küçük ve orta ölçekli işletmeler (KOBİ) için tasarlanmış, tamamen bulut tabanlı bir İnsan Kaynakları Yönetim Sistemi (HRMS)'dir. İşe alımdan çıkışa kadar çalışan yaşam döngüsünün tamamını tek bir platform üzerinden yönetmeyi mümkün kılar.

| Parametre | Değer |
|---|---|
| **Teknoloji (Backend)** | Python 3.12 / FastAPI |
| **Teknoloji (Frontend)** | React.js + Tailwind CSS |
| **Teknoloji (Mobil)** | Flutter (iOS + Android) |
| **API Mimarisi** | RESTful, versiyonlanmış (`/api/v1`) |
| **Çok Kiracılı Mimari** | Evet — Her şirket izole tenant |
| **Ödeme Altyapısı** | Paddle (Merchant of Record) |
| **Dil Desteği** | Türkçe, İngilizce, Arapça (i18n motoru) |
| **PDF Desteği** | Türkçe, Arapça dahil çok dilli (Roboto + Amiri fontlar) |
| **AI Entegrasyonu** | Google Gemini API (Performans analizi + ATS CV tarama) |
| **RBAC Sistemi** | 6 rol: OWNER, SUPERADMIN, ADMIN, HR, MANAGER, EMPLOYEE |
| **Yetki Sistemi** | Granüler permission keys (örn. `leave.manage_company`) |
| **Bildirim Sistemi** | Push (Firebase FCM) + E-posta (SMTP) + In-app |

---

## 2. Plan Mimarisi — Özellik Matrisi

Codebase'deki `plan_features.py` dosyasından doğrudan alınan özellik kilit haritası:

| Özellik Kodu | Açıklama | BASIC | PRO | ENTERPRISE |
|---|---|:---:|:---:|:---:|
| `core.dashboard` | Yönetici & Çalışan Dashboardı | ✅ | ✅ | ✅ |
| `core.portal` | Çalışan Self-Servis Portalı | ✅ | ✅ | ✅ |
| `core.people` | Personel Yönetimi & Profil | ✅ | ✅ | ✅ |
| `core.dossier` | Dijital Özlük Dosyası & Uyum | ✅ | ✅ | ✅ |
| `core.attendance` | Devam Takibi & Puantaj | ✅ | ✅ | ✅ |
| `core.leave` | İzin Yönetimi | ✅ | ✅ | ✅ |
| `core.assets` | Demirbaş Yönetimi | ✅ | ✅ | ✅ |
| `core.org_chart` | Organizasyon Şeması | ✅ | ✅ | ✅ |
| `core.helpdesk` | Dahili Destek Talebi Sistemi | ✅ | ✅ | ✅ |
| `core.executive` | Yönetici Özet Paneli | ✅ | ✅ | ✅ |
| `core.billing` | Abonelik & Faturalandırma | ✅ | ✅ | ✅ |
| `ops.ats` | İşe Alım Takip Sistemi (ATS) | ❌ | ✅ | ✅ |
| `ops.expenses` | Harcama & Masraf Yönetimi | ❌ | ✅ | ✅ |
| `ops.purchase_requests` | Satın Alma Talepleri | ❌ | ✅ | ✅ |
| `ops.generic_requests` | Özelleştirilebilir Talep Formu | ❌ | ✅ | ✅ |
| `ops.knowledge` | Bilgi Bankası & Politika Arşivi | ❌ | ✅ | ✅ |
| `ops.kpi` | KPI İzleme & Raporlama | ❌ | ✅ | ✅ |
| `ops.lifecycle` | Yaşam Döngüsü Kontrol Listeleri | ❌ | ✅ | ✅ |
| `ops.locations` | Çoklu Lokasyon & Coğrafi Sınır | ❌ | ✅ | ✅ |
| `enterprise.performance` | OKR / Performans Değerlendirme + AI | ❌ | ❌ | ✅ |
| `enterprise.training` | Eğitim Yönetimi & Sertifika | ❌ | ❌ | ✅ |

---

## 3. Modül Bazlı Özellik Detayları

### 3.1 Temel Modüller (BASIC ve üstü)

#### Personel Yönetimi (`core.people`)
- Çalışan ekleme, güncelleme, işten çıkarma
- Detaylı profil: iletişim, acil durum, pozisyon, departman, başlangıç tarihi
- Fotoğraf yükleme & güvenli depolama
- Onboarding/offboarding kontrol listeleri (`ops.lifecycle`)
- AI destekli profil özeti oluşturma (Gemini API)
- PDF personel raporu (Türkçe + Arapça font desteği)
- Departman ve Pozisyon yönetimi

#### Özlük Dosyası (`core.dossier`)
- Çalışan belgeleri dijital arşivleme (PDF, JPG, PNG, DOC, DOCX)
- 10MB dosya limiti, güvenli depolama
- Belge uyumluluk özeti (`build_dossier_compliance_summary`)
- Onay iş akışı: otomatik veya çok aşamalı onay
- Belge eylem kaydı (audit log)
- Güvenli belge indirme (URL tabanlı erişim)

#### Devam Takibi (`core.attendance`)
- QR kod ile giriş/çıkış (mobil + konum doğrulama)
- GPS tabanlı coğrafi sınır (Haversine mesafe hesaplama)
- Hastalık raporu kaydı (rapor no, hekim, ödeme türü)
- Toplu Excel/CSV devam yükleme
- İş programı ile entegre otomatik değerlendirme (`work_schedule_service`)
- RBAC: 3 kademe (tüm çalışanlar / yönetici / HR-Admin)
- Devam dışa aktarma (Excel, CSV, PDF)

#### İzin Yönetimi (`core.leave`)
- Çoklu izin tipi katalog sistemi (ülkeye göre otomatik)
- Çakışma kontrolü (PENDING ve APPROVED kayıtlara karşı)
- Otomatik veya hiyerarşik onay akışı
- Onay zinciri bildirimleri (e-posta + push notification)
- Kapsam filtreleme (takım yöneticisi sadece kendi takımını görür)
- Kullanıcı ve yönetici tarafından izin talebi

#### Demirbaş Yönetimi (`core.assets`)
- Toplu demirbaş kaydı (bulk create, seri numarası desteği)
- Çalışana atama & geri alma
- Durum takibi (condition on assign)
- PDF demirbaş raporu (Türkçe + Arapça)
- Çalışan bazlı demirbaş listesi

#### Organizasyon Şeması (`core.org_chart`)
- Departman hiyerarşisi görselleştirme
- Gerçek zamanlı güncelleme

#### Yönetici Özet Paneli (`core.executive`)
- C-level için özet metrikler
- Şirket geneli görünüm

#### Bildirimler (`notifications`)
- Push notification (Firebase FCM)
- E-posta bildirimleri (SMTP)
- In-app notification feed
- Olay bazlı tetikleyiciler (`PushEventType` enum)

---

### 3.2 Operasyon Modülleri (PRO ve üstü)

#### İşe Alım Takip Sistemi — ATS (`ops.ats`)
- İş ilanı oluşturma ve yayınlama
- Aday başvuru takibi (pipeline aşamaları)
- CV PDF yükleme (5MB limit, güvenli)
- **AI destekli CV tarama** — Gemini API ile aday değerlendirme
- Aday derecelendirme (rating sistemi)
- Otomatik ret e-postası gönderme
- Teklif mektubu (offer letter) oluşturma & PDF dışa aktarma
- HR Agent entegrasyon desteği (`HR_AGENT_URL`)

#### Harcama Yönetimi (`ops.expenses`)
- Harcama talebi oluşturma (fatura/makbuz yükleme)
- Çok aşamalı onay akışı
- E-posta bildirimleri (approval, rejection)
- Dışa aktarma: Excel, CSV, PDF
- Yönetici kapsam filtresi (takım bazlı görünüm)
- Toplam harcama raporlama

#### Satın Alma Talepleri (`ops.purchase_requests`)
- Çalışan başına satın alma talebi
- URL, satıcı, miktar, birim fiyat, para birimi
- Finans onay zinciri (payroll officer öncelikli)
- Eylem denetim kaydı (`log_purchase_request_action`)
- Takım kapsamı filtreleme

#### Özel Talep Formu (`ops.generic_requests`)
- Özelleştirilebilir talep kategorileri
- Çalışan self-servis talep oluşturma

#### Bilgi Bankası (`ops.knowledge`)
- Makale & Politika belgeleri (ARTICLE / POLICY)
- Versiyonlama (her değişiklik arşivlenir)
- Hedef kapsam: Tüm şirket / Role göre / Departmana göre / Kişiye özel
- Okundu onayı (acknowledgement) zorunluluğu
- Okuma denetim kaydı (`KnowledgeArticleReceiptLog`)
- Durum: DRAFT / PUBLISHED / ARCHIVED
- Granüler izin kontrolü

#### KPI İzleme (`ops.kpi`)
- Manuel veya otomatik kaynak tipinde KPI metriği
- Kategori, birim (COUNT, vb.), hedef değer
- İlerleme hesaplama (% tamamlanma)
- Şirket geneli ve bireysel KPI görünümü

#### Çoklu Lokasyon (`ops.locations`)
- Birden fazla ofis/şube tanımlama
- QR giriş noktası bazlı konum doğrulama
- GPS sınır kontrolü (yarıçap tabanlı)

#### Yaşam Döngüsü Kontrol Listeleri (`ops.lifecycle`)
- İşe alış (onboarding) ve ayrılış (offboarding) adımları
- Tamamlanma takibi
- Çalışan bazlı şablon ataması

---

### 3.3 Kurumsal Modüller (ENTERPRISE)

#### Performans Değerlendirme + OKR (`enterprise.performance`)
- OKR (Hedef & Anahtar Sonuç) oluşturma
- Hedef güncelleme & ilerleme takibi
- 360° performans değerlendirme
- Değerlendirme dönemi, puan (rating), yorum
- **AI destekli performans analizi** (Google Gemini API)
- Çalışan kendi hedefini görür; yönetici tüm takımı

#### Eğitim Yönetimi (`enterprise.training`)
- Eğitim programı oluşturma (başlık, eğitmen, lokasyon, tarih, saat)
- Katılımcı yönetimi
- Sertifika / tamamlama belgesi PDF çıktısı (Türkçe + Arapça)
- Eğitim listesi & bireysel katılım geçmişi

---

### 3.4 Yatay Platformlar

#### Mobil Uygulama (Flutter — iOS & Android)
- QR tabanlı devam giriş/çıkış (konum + QR doğrulama)
- Çalışan self-servis: izin talebi, harcama, doküman
- Push bildirim desteği (FCM device register)
- Yönetici onay akışları mobil üzerinden
- Destek talebi (helpdesk ticket) oluşturma & mesajlaşma
- Eğitim programı görüntüleme

#### Sosyal & Bağlılık
- **Ruh hali takibi** (günlük mood log — çalışan refahı)
- **Kudos sistemi** — Çalışanlar arası rozet ve teşekkür
- Organizasyon geneli sosyal katılım ölçümleri

#### Raporlama & PDF Motoru
- Çok dilli PDF üretimi (Türkçe, Arapça, Latin)
- Dinamik sütun seçilebilir personel raporu
- Devam, izin, harcama, eğitim, demirbaş raporları
- Excel ve CSV dışa aktarma
- Şirket logo entegrasyonu (şirket bazlı marka)
- Arapça sağdan sola bidi desteği (`arabic_reshaper`)

#### Denetim Kaydı (`audit_log`)
- Her işlem için tam kayıt (kim, ne zaman, ne yaptı)
- Kaynak tipi, eylem tipi filtresi
- Tarih-saat aralığı filtresi
- Departman ve çalışan bazlı filtreleme
- Sadece yetkili roller erişebilir (`audit.view_tenant`)

#### İş Programı Yönetimi (`work_schedule`)
- Şirket geneli iş programı tanımlama
- Departman bazlı program ataması (bulk)
- Çalışan bazlı program override
- Devam sistemi ile entegre (otomatik değerlendirme)
- PDF program raporu (Türkçe + Arapça)

---

## 4. Güvenlik & Uyum Özellikleri

| Özellik | Durum |
|---|---|
| JWT tabanlı kimlik doğrulama | ✅ |
| Granüler RBAC (6 rol) | ✅ |
| Granüler permission keys (izin bazlı erişim) | ✅ |
| Multi-tenant izolasyon (company_id her sorguda) | ✅ |
| Güvenli dosya yükleme (extension + boyut kontrolü) | ✅ |
| Dosya adı sanitizasyonu (path traversal önleme) | ✅ |
| Paddle webhook imza doğrulama (HMAC-SHA256) | ✅ |
| Denetim kaydı (tüm değişiklikler loglanır) | ✅ |
| Belge erişim denetimi (URL tabanlı, yetkisiz erişim engellidir) | ✅ |
| Şifre hashing (güvenli hash algoritması) | ✅ |
| i18n — güvenli çok dilli içerik | ✅ |

---

## 5. Teknik Altyapı Özeti

```
CADRO Mimari Yığını
═══════════════════════════════════════════════════════
  [Flutter Mobil]  [React Web]  [Paddle Billing]
         │               │               │
         └───────────────┼───────────────┘
                         │
              ┌──────────▼──────────┐
              │   FastAPI (Python)   │
              │   /api/v1 — 28 Router│
              │   JWT + RBAC + i18n  │
              └──────────┬──────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
   [PostgreSQL]   [File Storage]  [Firebase FCM]
    (Multi-tenant)   (Local/Cloud)  (Push Notify)
          │
   [Google Gemini API] (AI özellikleri)
   [SMTP Email Server] (Bildirimler)
```

---

## 6. Rekabet Avantajları (Ön Bakış)

| Fark | Açıklama |
|---|---|
| **Çok dilli (3 dil)** | Türkçe + İngilizce + Arapça — Orta Doğu pazarı için hazır |
| **Mobil öncelikli** | Tam özellikli Flutter uygulaması (iOS + Android) |
| **AI entegrasyonu** | CV tarama + performans analizi (Gemini API) |
| **Katmanlı plan yapısı** | Basic/Pro/Enterprise — KOBİ'den kurumsal ölçeğe |
| **Açık fiyatlandırma** | Paddle MoR ile otomatik — şeffaf, self-servis |
| **Çalışan refahı** | Mood log + Kudos — rakiplerin çoğunda yok |
| **Denetim kaydı** | Her işlem loglanır — yasal uyum ready |
| **Kodsuz onay akışı** | İzin, masraf, belge için çok aşamalı onay |

---

## 7. Özellik Sayısı Özeti

| Kategori | Modül/Özellik Sayısı |
|---|---|
| Temel (BASIC) | 12 özellik kodu, 50+ API endpoint |
| Operasyon (PRO +) | 8 ek özellik kodu, 40+ API endpoint |
| Kurumsal (ENTERPRISE +) | 2 ek özellik kodu, 20+ AI destekli endpoint |
| Mobil uygulama | 10+ ekran, tam CRUD |
| Raporlama | 8+ PDF/Excel/CSV rapor türü |
| **Toplam aktif router** | **28 router (helpdesk geçici olarak devre dışı)** |

---

## Notlar

> Tüm özellik bilgileri doğrudan kaynak koddan (`/backend/app/api/`, `/backend/app/core/plan_features.py`) elde edilmiştir.  
> Plan matrisi `PLAN_FEATURE_MATRIX` sözlüğüne dayanmaktadır.  
> AI özellikleri `settings.GEMINI_API_KEY` yapılandırması gerektirir.
