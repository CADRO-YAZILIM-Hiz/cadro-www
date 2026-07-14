# Blog Otomatik Yayın Sistemi

## 📊 Sistem Özeti

Bu sistem, 172 makaleful blog sayfalarında otomatik olarak yayınlanmasını yönetir.

### Dosyalar:
- **blog-schedule.js** - Blog kartlarını filtreler ve tarihe göre sıralar
- **publication-schedule.json** - Gelecek makalalar için yayın takvimi
- **publish-scheduler.js** - Günlük tetikleyici (her gün çalışmalı)

## 📈 Mevcut Durum (25.06.2026)

| Durum | Sayı |
|-------|------|
| **Blog.html'de gösterilen makale** | 48 (12 eski + 36 yeni) |
| **Tüm dosyalardaki makale** | 184 |
| **Yayın tarihi olan makale** | 142 |
| **Gelecekte yayımlanacak** | 0 |

## 🚀 Nasıl Kullanılır

### 1. Her gün otomatik yayın (Tetikleyici)

`publish-scheduler.js` dosyası her gün çalıştırılmalı:

```bash
# Manuel çalıştırma
node publish-scheduler.js

# Windows Scheduler ile (görev planlayıcı)
# Yeni görev oluştur → "node C:\path\to\publish-scheduler.js"
# Tetikleyici: Günlük, saat 00:00

# Linux/Mac Cron job
# Crontab'a ekle: 0 0 * * * cd /path && node publish-scheduler.js
```

### 2. Yayın takvimini kontrol etme

```bash
cat publication-schedule.json
```

### 3. Yeni makaleler eklemek

1. Makale HTML dosyasına `data-publish-date="YYYY-MM-DD"` ekleyin
2. Veya makale HTML'de tarih belirtin: "25 Haziran 2026"
3. Sistem otomatik olarak takip edecektir

## 📅 Yayın Takvimi Formatı

```json
{
  "lastUpdated": "2026-06-25T10:30:00.000Z",
  "today": "2026-06-25",
  "totalScheduledArticles": 0,
  "articles": [
    {
      "basename": "makale-ornek.html",
      "title": "Makale Başlığı",
      "publishDate": "2026-07-01",
      "languages": ["tr", "en", "de", "ar"],
      "files": {
        "tr": "makale-ornek.html",
        "en": "en/makale-ornek.html",
        "de": "de/makale-ornek.html",
        "ar": "ar/makale-ornek.html"
      }
    }
  ]
}
```

## 🔧 Sistem Nasıl Çalışıyor

1. **blog-schedule.js** - Sayfa yüklendiğinde blog kartlarını filtreler
   - `data-publish-date` tarihine bakar
   - Bugüne kadar olan makaleleri gösterir
   - Tarihe göre sıralar (yeni → eski)

2. **publish-scheduler.js** - Günlük otomatik yayın
   - `publication-schedule.json`'da bugünün tarihini arar
   - Eşleşen makaleleri tüm 4 dilde blog'a ekler
   - Sonra takvimden çıkarır

## ⚙️ Kurulum

### 1. Mevcut blog kartlarına `data-publish-date` ekle
Tüm blog.html kartlarında zaten var.

### 2. publication-schedule.json oluştur
```bash
node create-publication-schedule.js
```

### 3. Gelecek makalalarla test et
- blog.html'de yeni kart ekle
- `data-publish-date="2026-07-15"` yazarak ileriye ayarla
- `publish-scheduler.js` günü gelince çalıştır

## 📝 Notlar

- Sistem **en/blog.html**, **de/blog.html**, **ar/blog.html** dosyalarını otomatik günceller
- Lokalize versiyonlarda link otomatik olarak `../makale-...` formatına dönüştürülür
- Her makale **4 dil**de yayımlanır (TR, EN, DE, AR)
- Yayımlanan makaleler otomatik olarak takvimden çıkarılır

## 🔗 İlgili Dosyalar

- `blog.html` - Türkçe blog sayfası
- `en/blog.html` - İngilizce blog sayfası
- `de/blog.html` - Almanca blog sayfası
- `ar/blog.html` - Arapça blog sayfası
- `blog-schedule.js` - Filtreleme scripti
- `publication-schedule.json` - Yayın takvimi
- `publish-scheduler.js` - Günlük tetikleyici

