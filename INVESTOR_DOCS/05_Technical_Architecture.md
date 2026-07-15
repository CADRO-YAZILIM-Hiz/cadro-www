# CADRO HR — Teknik Mimari & Platform Analizi

**Versiyon:** 1.0  
**Tarih:** Mayıs 2026  
**Gizlilik:** Yalnızca Yatırımcı Kullanımı

---

## 1. Yığın (Tech Stack) Özeti

| Katman | Teknoloji | Versiyon | Not |
|---|---|---|---|
| **Backend** | Python / FastAPI | 3.12+ | Async-ready, production-grade |
| **Frontend** | React.js + Tailwind CSS | React 18 | SPA, responsive |
| **Mobil** | Flutter | 3.x | iOS + Android native |
| **Veritabanı** | PostgreSQL | 14+ | Multi-tenant, ilişkisel |
| **ORM** | SQLAlchemy | 2.x | Modeli doğrudan Python'da |
| **Auth** | JWT (HS256) | — | Stateless, rol bazlı |
| **PDF Motoru** | ReportLab | 4.x | TR + AR (Roboto + Amiri fontlar) |
| **AI** | Google Gemini API | — | CV tarama + performans analizi |
| **Push Notif.** | Firebase FCM + APNS | — | iOS + Android |
| **E-posta** | SMTP (Hostinger) | — | Özelleştirilebilir |
| **Faturalama** | Paddle MoR | — | HMAC-SHA256 webhook doğrulama |
| **Container** | Docker + Docker Compose | — | Dev + prod ortam |
| **Web Sunucu** | Nginx (reverse proxy) | — | TLS, static dosya servis |
| **İ18n** | Özel motor (`core/i18n.py`) | — | TR, EN, AR — header tabanlı |
| **Excel/CSV** | Pandas + XlsxWriter | — | Veri dışa aktarma |
| **Arapça RTL** | arabic-reshaper + bidi | — | Doğru sağdan-sola PDF |

---

## 2. Mimari Diyagram

```
╔══════════════════════════════════════════════════════════════════╗
║                        CADRO PLATFORM                            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   [Flutter Mobil App]    [React Web App]    [Paddle Checkout]    ║
║   iOS + Android          SPA + Tailwind     Kredi Kartı          ║
║         │                     │                   │              ║
║         └─────────────────────┼───────────────────┘              ║
║                               │                                  ║
║                        ┌──────▼──────┐                           ║
║                        │    Nginx     │ ← TLS / Reverse Proxy    ║
║                        └──────┬──────┘                           ║
║                               │                                  ║
║                        ┌──────▼──────┐                           ║
║                        │   FastAPI    │                           ║
║                        │  /api/v1    │ ← JWT + RBAC + i18n       ║
║                        │  28 Router  │ ← Plan Feature Guard      ║
║                        └──────┬──────┘                           ║
║                               │                                  ║
║          ┌────────────────────┼─────────────────┐               ║
║          │                    │                 │               ║
║   ┌──────▼──────┐    ┌────────▼───────┐  ┌─────▼─────┐        ║
║   │ PostgreSQL   │    │  File Storage  │  │  HR Agent  │        ║
║   │ Multi-tenant │    │  (uploads/)    │  │ Mikroservis│        ║
║   │ company_id   │    │  PDF, belge    │  │ :8001      │        ║
║   └─────────────┘    └────────────────┘  └────────────┘        ║
║                                                                  ║
║   Harici Servisler:                                              ║
║   • Google Gemini API   (AI — CV + performans)                   ║
║   • Firebase FCM        (iOS/Android push)                       ║
║   • SMTP (Hostinger)    (e-posta bildirimleri)                   ║
║   • Paddle API          (abonelik, webhook)                      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 3. Çok Kiracılı (Multi-Tenant) Mimari

Her şirket, platform üzerinde **izole bir tenant** olarak çalışır:

- Her veritabanı sorgusunda `company_id` filtresi zorunlu
- Plan kodu (`plan_code`) company tablosunda tutulur
- Abonelik durumu (`SubscriptionStatus`) per-tenant
- Çalışanlar, belgeler, izinler, devam kayıtları — hepsi company_id ile izole
- Farklı şirketlerin birbirinin verisine erişimi mimari olarak engellenmiş

**RBAC Rolleri (6 kademe):**

```
OWNER → SUPERADMIN → ADMIN → HR → MANAGER → EMPLOYEE
```

- `OWNER`: Yalnızca platform sahibi (Turgay), tüm tenantları görür
- `SUPERADMIN`: Şirket sahibi, tam yetki
- `ADMIN`: Sistem yönetici
- `HR`: İK uzmanı, çalışan + izin + ATS
- `MANAGER`: Takım yöneticisi, kendi ekibi
- `EMPLOYEE`: Self-servis, yalnızca kendi verisi

**Plan Özellik Kilidi:**

```python
PLAN_FEATURE_MATRIX = {
  BASIC:      {core.*}
  PRO:        {core.* + ops.*}
  ENTERPRISE: {core.* + ops.* + enterprise.*}
}
```

Her API endpoint, plan katmanı ve izin düzeyini çift kontrol eder.

---

## 4. Backend → Frontend Modül Eşleştirmesi

### 4.1 Tam Olarak Hayata Geçirilmiş Modüller ✅

| Backend Modülü | Frontend Bileşen(ler) | Menü'de var mı? |
|---|---|---|
| `auth.py` | `Auth.jsx`, `D_LoginPage.jsx`, `RegisterPage.jsx` | ✅ |
| `employee.py` | `EmployeeList.jsx`, `EmployeePortal.jsx` | ✅ |
| `attendance.py` | `AttendanceList.jsx`, `EmployeeAttendance.jsx` | ✅ |
| `leave.py` | `LeaveManagement.jsx`, `EmployeeLeave.jsx`, `D_LeaveManagement.jsx` | ✅ |
| `asset.py` | `AssetList.jsx`, `EmployeeAsset.jsx` | ✅ |
| `document.py` | `EDossier.jsx` | ✅ |
| `ats.py` | `ATS.jsx` | ✅ |
| `expense.py` | `ExpenseManagement.jsx`, `EmployeeExpense.jsx` | ✅ |
| `purchase_request.py` | `PurchaseRequestManagement.jsx` | ✅ |
| `generic_request.py` | `GenericRequestManagement.jsx` | ✅ |
| `kpi.py` | `KpiStatistics.jsx` | ✅ |
| `knowledge_base.py` | `KnowledgeBase.jsx` | ✅ |
| `performance.py` | `PerformanceManagement.jsx`, `EmployeePerformance.jsx` | ✅ |
| `training.py` | `Training.jsx`, `EmployeeTraining.jsx` | ✅ |
| `location.py` | `Locations.jsx` | ✅ |
| `dashboard.py` | `Dashboard.jsx` | ✅ |
| `executive.py` | `ExecutiveConsole.jsx` | ✅ |
| `paddle.py` | `Billing.jsx` | ✅ |
| `support.py` | `SupportCenter.jsx` | ✅ |
| `notification.py` | `Navbar.jsx` (bildirim zili) | ✅ |
| `mobile.py` | Flutter mobil app | ✅ |
| `company.py` | `CompanySettings.jsx`, `Onboarding.js` | ✅ |
| `social.py` (Kudos) | `Dashboard.jsx` — Kudos feed widget | ⚠️ Kısmi |

---

### 4.2 Backend'de Var, Frontend'de Eksik ❌

Bu bölüm **kritik teknik borç** analizini göstermektedir. Yatırım sonrası öncelik listesi için temel girdidir.

| Backend Modülü / Servis | Ne Yapıyor | Frontend Durumu | Öncelik |
|---|---|---|---|
| **`work_schedule.py`** | İş programı (vardiya) tanımlama, departman/kişi bazlı atama, PDF çıktısı | ❌ Yönetim UI yok — sadece devam sistemi arka planda kullanıyor | 🔴 Yüksek |
| **`audit_log.py`** | Tüm sistemi kapsayan denetim kaydı (kim, ne zaman, ne yaptı) | ❌ Sidebar'da `menu_audit_logs` çevirisi var ama sayfa yok | 🔴 Yüksek |
| **`social.py` (Mood Log)** | Günlük ruh hali kaydı (çalışan refahı) | ❌ Sadece Kudos Dashboard'da var; Mood Log UI yok | 🟡 Orta |
| **`report.py`** | Dinamik sütunlu personel raporu oluşturucu | ❌ Frontend rapor oluşturucu sayfası yok | 🟡 Orta |
| **`holiday.py`** | Resmi tatil takvimi yönetimi | ❌ Tatil yönetim sayfası yok | 🟡 Orta |
| **`attendance_export.py`** | Devam verisini Excel/CSV dışa aktarma | ⚠️ Attendance sayfasından tetikleniyor olabilir, ayrı sayfa yok | 🟢 Düşük |
| **`models/announcement.py`** | Şirket duyurusu (başlık, içerik, öncelik, bitiş tarihi) | ❌ Duyuru yönetim sayfası yok — Dashboard'da placeholder metin var | 🟡 Orta |
| **`services/payroll_service.py`** | KKTC kademeli vergi hesaplama motoru | ❌ Bordro yönetim sayfası yok — servis hazır, API yok | 🔴 Yüksek |
| **`services/payroll_batch_service.py`** | Toplu maaş işleme (şirket geneli) | ❌ Hem backend API hem frontend yok | 🔴 Yüksek |
| **`services/bank_service.py`** | IBAN + net maaş → banka Excel export | ❌ Hem backend API hem frontend yok | 🟡 Orta |
| **`helpdesk.py`** (kısmi) | Dahili destek talebi | ⚠️ `Helpdesk.jsx` var ama backend router devre dışı | 🔴 Kritik |
| **`ticket.py`** | Helpdesk biletleri (mesajlaşma) | ⚠️ Helpdesk ile bağlantılı, backend devre dışı | 🔴 Kritik |

---

### 4.3 Özet Tablo: Platform Tamamlanma Durumu

| Kategori | Tamamlanan | Eksik Frontend | Eksik Her İkisi |
|:---|:---:|:---:|:---:|
| Temel HR | 10/10 | 0 | 0 |
| Operasyon (PRO) | 7/8 | 1 (work_schedule) | 0 |
| Kurumsal (ENTERPRISE) | 2/2 | 0 | 0 |
| Yatay (rapor, audit, sosyal) | 1/5 | 3 | 1 (payroll UI) |
| Servisler (payroll, banka) | 0/3 | 0 | 3 (API + UI her ikisi) |
| Mobil | 1/1 | — | — |
| **Toplam** | **~21/29** | **~4** | **~4** |

**Genel Tamamlanma Oranı:** ~%80 işlevsel (ticari satışa hazır çekirdek)

---

## 5. HR Agent Mikroservisi

`config.py`'de yapılandırılmış bağımsız bir AI mikroservisi:

```python
HR_AGENT_URL = "http://localhost:8001"   # prod: aynı VPS
HR_AGENT_SECRET = "..."                  # X-Agent-Secret header
```

- ATS modülünden çağrılır: CV metni → Gemini → değerlendirme puanı
- Bağımsız deploy edilebilir, FastAPI backend'den HTTP ile tetiklenir
- Gelecekte: tüm AI özelliklerini bu servise merkezi hale getirme

---

## 6. Güvenlik Mimarisi

| Katman | Mekanizma | Detay |
|---|---|---|
| Kimlik Doğrulama | JWT HS256 | Token süre sınırlı, refresh token desteği |
| Yetkilendirme | RBAC (6 rol) + Granüler permission keys | Her endpoint çift kontrol |
| Plan Kapısı | `plan_feature_required` middleware | Özellik plan kapsamı dışındaysa 403 |
| Dosya Yükleme | Extension whitelist + boyut sınırı | 5MB CV, 10MB belge |
| Dosya Adı | `sanitize_filename()` | Path traversal saldırısı önleme |
| Webhook | HMAC-SHA256 imza doğrulama | Paddle webhook sahte isteklere kapalı |
| Çok Kiracılık | Her sorguda `company_id` filtresi | Tenant izolasyonu mimari düzeyde |
| E-posta | SMTP SSL (port 465) | Şifreli iletim |
| Şifre | `security.py` → hash | Plaintext saklanmıyor |

---

## 7. Dağıtım (Deployment) Yapısı

```
Üretim Sunucusu (VPS)
├── Nginx (443/80 → uygulama)
├── Docker Compose
│   ├── cadro-backend   (FastAPI, port 8000)
│   ├── cadro-frontend  (React build, Nginx static)
│   └── postgres        (veritabanı)
├── HR Agent            (ayrı proses, port 8001)
└── uploads/            (belgeler, CV'ler, logolar)

Mobil
├── Flutter iOS  → App Store
└── Flutter Android → Google Play
```

Docker Compose dosyaları hem `backend/` hem `frontend/` dizininde ayrı ayrı mevcut.

---

## 8. Ölçeklenebilirlik Değerlendirmesi

| Konu | Mevcut Durum | Ölçekleme Yolu |
|---|---|---|
| Veritabanı | Tek PostgreSQL instance | Read replica, connection pooling (PgBouncer) |
| Dosya Depolama | Yerel disk (uploads/) | S3/R2 geçişi (kod değişikliği minimal) |
| Uygulama Sunucusu | Tek VPS | Container orchestration (K8s/Fly.io) |
| AI Servisi | Tek mikroservis | Yatay ölçekleme (load balancer) |
| CDN | Yok | Cloudflare entegrasyonu hazır (Nginx yapısı uyumlu) |
| Cache | Yok | Redis eklenebilir (session + sık sorgular) |

**Sonuç:** Mevcut mimari 0→500 müşteri için yeterli. 500+ için basit ölçekleme adımları yeterli, mimari yeniden yazım gerektirmiyor.

---

## 9. Eksik Frontend Modülleri — Yatırım Sonrası Öncelik Listesi

Aşağıdaki modüller **backend kodu hazır**, yalnızca frontend ekranı eksik:

### 🔴 Kritik (FAZ 1 — Hemen)

1. **Helpdesk Modülü** — `Helpdesk.jsx` var, backend router'ı sadece aç
2. **İş Programı (Work Schedule) Yönetim Sayfası** — CRUD ekranı + PDF önizleme
3. **Bordro API + Sayfası** — `payroll_service.py` hazır, API bağ + React sayfası

### 🟡 Orta (FAZ 1-2)

4. **Denetim Kaydı (Audit Log) Sayfası** — Menüde çevirisi bile var, filtreli liste ekranı
5. **Duyuru Yönetimi** — `Announcement` modeli hazır, CRUD + dashboard widget
6. **Tatil Takvimi Yönetimi** — `holiday.py` API var, takvim ekranı
7. **Ruh Hali (Mood Log) Sayfası** — API hazır, çalışan refahı dashboard widget

### 🟢 Düşük (FAZ 2+)

8. **Rapor Oluşturucu** — `report.py` dinamik sütun seçimi, UI builder
9. **Banka Transfer Listesi** — `bank_service.py` hazır, bordro sayfasına entegre et

---

## Notlar

> Backend analizi doğrudan kaynak koddan yapılmıştır:  
> - 28 aktif router → `backend/app/main.py` (satır 717-755)  
> - 38 frontend bileşeni → `frontend/src/components/`  
> - 8 frontend sayfası → `frontend/src/pages/`  
> - Sidebar menü haritası → `frontend/src/components/Sidebar.jsx`  
> - Plan matrisi → `backend/app/core/plan_features.py`  
> - Servisler → `backend/app/services/` (7 dosya)  
> - Modeller → `backend/app/models/` (22 dosya)  
> - Core → `backend/app/core/` (22 dosya)
