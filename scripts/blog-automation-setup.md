# CADRO Blog Otomasyon Kurulumu (4 Dil)

Bu kurulum, her gun TR/EN/DE/AR dillerinde otomatik yayin yapar.

## 1) Yayin planini duzenle
- Dosyalar:
  - `scripts/blog_schedule_tr_30.json`
  - `scripts/blog_schedule_en_30.json`
  - `scripts/blog_schedule_de_30.json`
  - `scripts/blog_schedule_ar_30.json`
- Her obje icin alanlar:
  - `publish_date` (YYYY-MM-DD)
  - `slug` (ornek: `makale-ik-yazilimi-secim-rehberi-2026.html`)
  - `title`
  - `excerpt`
  - `category`
  - `keywords` (liste)
  - `published` (false/true)
  - `ready` (false/true) -> false ise yayinlanmaz

## 2) Manuel test
```bash
cd /var/www/html
python3 scripts/auto_publish_blog_multilang.py --lang tr --date 2026-05-26 --dry-run
python3 scripts/auto_publish_blog_multilang.py --lang en --date 2026-05-26 --dry-run
python3 scripts/auto_publish_blog_multilang.py --lang de --date 2026-05-26 --dry-run
python3 scripts/auto_publish_blog_multilang.py --lang ar --date 2026-05-26 --dry-run
```

## 3) Cron ile gunluk calistirma
Sunucuda crontab ac:
```bash
crontab -e
```
Asagidaki satiri ekle (her gun 08:00):
```cron
0 8 * * * /var/www/html/scripts/run_daily_blog_publish.sh
```

## 4) Scriptin yaptiklari
- Her dil icin gunu gelen ilk yaziyi yayinlar (`--max-per-run` varsayilan 1)
- Makale dosyasini olusturur (yoksa)
- `blog.html`, `en/blog.html`, `de/blog.html`, `ar/blog.html` icine kart ekler (AUTO_BLOG_CARDS marker arasina)
- `sitemap.xml` dosyasina URL ekler
- Plan dosyasinda ilgili kaydi `published=true` yapar

## 5) Notlar
- Coklu yayin icin: `--max-per-run 2` gibi kullanabilirsiniz.
- Sadece kontrol icin: `--dry-run` kullanin.
- Script idempotenttir; ayni slug ikinci kez eklenmez.
