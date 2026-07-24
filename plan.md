# Plan: Cadro ERP — Kapsamli Kurumsal Kaynak Planlama Sistemi

## Vizyon
Cadro HRMS platformu uzerine insa edilecek; .NET 9 + React 19 + PostgreSQL teknoloji yiginiyla, on-premise ve intranet bulut calisan, tum olcekli sirketlere uygun, moduler bir ERP. Hedef: SAP'nin %20 fiyatina %80 islevsellik + modern UX + mobil + AI.

## Onerilen Teknoloji Yigini

| Katman | Teknoloji | Gerekce |
|--------|-----------|---------|
| Backend | .NET 9 + ASP.NET Core | TR'de en buyuk kurumsal havuz, Windows+Linux cift platform |
| Frontend | React 19 + TypeScript + MUI + AG Grid | En buyuk ekosistem, ERP icin hazir bilesenler |
| Veritabani | PostgreSQL (primary) + SQL Server (opsiyonel) | Ucretsiz, JSONB destegi, RLS |
| Raporlama | FastReport .NET + DevExpress Dashboard | On-premise native, 30+ cikti formati |
| Mesaj/Cache | RabbitMQ + Redis | Moduller arasi event bus |
| Deployment | Docker + k3s | KOBİ'de Compose, enterprise'da K8s |

## Modul Hiyerarsisi (5 Faz)

### FAZ 1: Finansal Temel (MVP-1, 6-9 ay)

#### A. Sistem Yonetimi
- Kullanici & Rol Yonetimi (RBAC)
- Coklu Sirket Yapisi (Legal Entity)
- Coklu Para Birimi & Kur Yonetimi
- Coklu Dil (i18n)
- Denetim Kaydi (Audit Log)
- Sistem Parametreleri & Numaratorler

#### B. Genel Muhasebe (GL)
- Hesap Plani (hiyerarsik, esnek segment)
- Fis Girisi (cift tarafli kayit)
- Mizan, Defter-i Kebir, Yevmiye Defteri
- Mali Donem Yonetimi
- Donem Sonu Islemleri
- Yabanci Para Degerleme

#### C. Borc Hesaplari (AP)
- Tedarikci Ana Verisi (Party model)
- Tedarikci Fatura Girisi
- Odeme Plani & Yaslandirma
- Odeme Islemleri

#### D. Alacak Hesaplari (AR)
- Musteri Ana Verisi (Party model)
- Musteri Fatura Girisi
- Tahsilat Takibi & Yaslandirma
- Kredi Limiti Kontrolu

#### E. Vergi Yonetimi
- Vergi Kodlari & Oranlari
- KDV Matrah/Hesaplanan/Indirilecek Takibi
- Tevkifat Mekanizmasi
- Stopaj (Muhtasar) Hesaplama
- e-Fatura / e-Arsiv / e-Defter Entegrasyonu

#### F. Nakit Yonetimi
- Banka Hesaplari
- Banka Islemleri & Mutabakat
- Nakit Akis Tahmini

#### G. Sabit Kiymetler
- Kiymet Karti & Kategorileri
- Amortisman Hesaplama
- Kiymet Hareketleri

### FAZ 2: Operasyonel (MVP-2, +4 ay)

#### H. Satin Alma
- Satin Alma Talebi (PR)
- Teklif Toplama (RFQ)
- Satin Alma Siparisi (PO)
- Mal Kabul -> Stok

#### I. Envanter Yonetimi
- Urun Ana Verisi
- Stok Karti & Kategoriler
- Stok Hareketleri (giris/cikis/transfer)
- Stok Sayimi
- Lot/Seri No Takibi
- FIFO/LIFO/Ortalama Maliyet

#### J. Satis & Dagitim
- Musteri Yonetimi (CRM temel)
- Fiyat Listeleri & Iskonto Kurallari
- Satis Siparisi
- Sevkiyat & Irsaliye
- Satis Faturasi -> AR

### FAZ 3: Ileri Operasyonel (MVP-3, +4 ay)

#### K. IK & Bordro Entegrasyonu (Cadro mevcut)
- Bordro -> GL Otomatik Fis
- SGK Bildirimi (MPHB)
- Calisan -> Proje Kaynak Atama

#### L. Butceleme
- Butce Tanimi & Versiyonlama
- Butce Kontrolu
- Gerceklesen vs Butce Analizi

#### M. Maliyet Muhasebesi
- Maliyet Merkezleri
- Kar Merkezleri
- Dagitim Anahtarlari

#### N. Is Zekasi & Dashboard
- KPI Tanimlari
- Dashboard Motoru
- Rapor Tasarimcisi
- Uyari/Alert Motoru

### FAZ 4: Uretim & Proje (+4 ay)

#### O. Uretim Yonetimi
- Urun Agaci (BOM)
- Is Istasyonlari & Operasyonlar
- Is Emri
- MRP (Malzeme Ihtiyac Planlamasi)
- Kalite Kontrol

#### P. Proje Yonetimi
- Proje & WBS
- Kaynak Planlama
- Zaman Cizelgesi (Timesheet)
- Proje Maliyet Takibi

### FAZ 5: Ileri Seviye (+4 ay)

#### R. Ortak Servisler
- Is Akis Motoru (BPMN 2.0)
- Dokuman Yonetim Sistemi (DMS)
- Bildirim Motoru
- E-Imza / Dijital Onay

#### S. Gelismis Ozellikler
- AI/ML: Akilli mutabakat, fatura okuma (IDP)
- Low-Code: Ozel alan/form olusturucu
- Extension Marketplace
- Mobil PWA

## Veritabani Tasarim Desenleri

### Temel Desenler
- Party Model: customers, vendors, employees -> tek parties tablosu
- Double-Entry Journal: journal_entries + journal_entry_lines
- Polymorphic Reference: entity_type + entity_id
- Stock Move: source_location -> destination_location
- Sequence Numbers: Sirket basina ayri numarator
- Soft Delete + Temporal Validity

### Multi-Tenant Stratejisi
- KOBİ: Shared DB + Row-Level Security
- Enterprise: Database per tenant
- Hibrit yaklasim

## Kritik Modul Bagimliliklari

1. Chart of Accounts -> GL -> AP, AR, Fixed Assets
2. Tax Engine -> Tum finans modulleri
3. Party Model -> Customers, Vendors, Employees
4. Inventory -> Procurement, Sales, Manufacturing

## Uygulama Adimlari

### Asama 1: Altyapi (Hafta 1-2)
1. .NET 9 solution yapisi (Clean Architecture)
2. React 19 + TypeScript projesi (Vite, MUI, AG Grid)
3. PostgreSQL + Docker Compose gelistirme ortami
4. EF Core + Flyway migrations
5. CI/CD pipeline (GitHub Actions)

### Asama 2: Cekirdek Moduller (Hafta 3-12)
6. Multi-tenancy & Auth (blok bagimlilik)
7. Parties (Taraflar): Party model, customers, vendors
8. Chart of Accounts: Hiyerarsik hesap plani
9. GL Engine: Journal entry, donem yonetimi
10. Tax Engine: Vergi kodlari, KDV/stopaj
11. AP Module: Vendor invoices, payments
12. AR Module: Customer invoices, receipts

### Asama 3: Genisletilmis Finans (Hafta 13-16)
13. Fixed Assets: Amortisman motoru
14. Cash Management: Banka, mutabakat
15. e-Invoice Integration: UBL-TR, GIB
16. Budgeting: Butce tanimi, kontrol

### Asama 4: Operasyonel Moduller (Hafta 17-24)
17. Product Master & Inventory
18. Procurement: PR -> PO
19. Sales & Distribution
20. Cost Accounting

### Asama 5: IK Entegrasyonu & Raporlama (Hafta 25-30)
21. Payroll -> GL Bridge
22. BI/Dashboard Engine
23. Audit Log
24. Workflow Engine

### Asama 6: Ileri Moduller (Hafta 31-40)
25. Manufacturing: BOM, is emri, MRP
26. Project Management
27. DMS
28. Quality Control

## Dogrulama (Verification)

1. Birim Testleri: GL double-entry tutarliligi, vergi hesaplamalari
2. Entegrasyon Testleri: PO -> AP -> GL zinciri
3. Performans Testleri: 100K journal entry < 2sn
4. Kullanici Kabul Testi (UAT)
5. Regulasyon Uyumlulugu: e-Fatura GIB test, KVKK
6. On-Premise Deployment: Docker Compose tek komut
7. Multi-Company Testi: Inter-company, konsolidasyon

## Pazar Firsati

Turkiye ERP pazari ~$500M, yillik %12-15 buyume. Mevcut rakiplerin zayif yonleri:
- 2000'ler seviyesinde UI/UX
- Mobil cozum yok
- API destegi zayif
- AI entegrasyonu yok
- Eski kod tabani (Delphi/C++)

KONUMLANDIRMA: SAP'nin %20 fiyatina, %80 islevsellik + modern UX + mobil + AI

## Fiyatlandirma Modeli

- Starter: 1.499TL/ay (3 kullanici, temel finans)
- Professional: 3.999TL/ay (10 kullanici, tum moduller)
- Enterprise: 9.999TL/ay (sinirsiz kullanici, ozel gelistirme, SLA)
- Yillik pesin: %20 indirim
- On-premise: Ayrica fiyatlandirma
