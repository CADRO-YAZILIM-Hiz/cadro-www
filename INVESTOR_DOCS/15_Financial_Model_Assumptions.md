# CADRO HR — Finansal Model Varsayımları

**Versiyon:** 1.0  
**Tarih:** Mayıs 2026  
**Amaç:** Pitch deck ve yatırım görüşmeleri için finansal model omurgası

---

## 1. Modelin Amacı

Bu belge, CADRO'nun pre-seed aşamasında yatırımcıya sunulacak finansal mantığını ve temel varsayımlarını tanımlar. Model; müşteri edinimi, fiyatlandırma, churn, brüt marj ve büyüme patikasını basit ama savunulabilir şekilde çerçeveler.

---

## 2. Ana Varsayımlar

| Varsayım | Değer | Not |
|---|---:|---|
| Satış modeli | SaaS abonelik | Per-seat |
| Para birimi | USD | Global yatırımcı dili |
| Ortalama aylık fiyat | $10 - $20 / kullanıcı | Plan karmasına bağlı |
| Ortalama müşteri büyüklüğü | 20 kullanıcı | Hedef ICP ortalaması |
| Brüt marj | %80 - %85 | Sunucu + ödeme komisyonu sonrası |
| Aylık churn | %1.5 - %2.5 | Erken aşama SaaS için makul |
| CAC | $300 - $800 | Outbound + referral + demo |
| Ortalama satış döngüsü | 2 - 8 hafta | Segment bazlı değişir |
| Yıllık ödeme oranı | %20 - %35 | Nakit akışını öne çeker |

---

## 3. Gelir Mantığı

CADRO'nun gelir yapısı 3 katmandan oluşur:

1. **Temel abonelik geliri**: BASIC / PRO / ENTERPRISE planları
2. **Upsell geliri**: bordro, AI analitik, white-label, entegrasyonlar
3. **Yıllık ödeme avantajı**: peşin tahsilat ile daha güçlü cash flow

---

## 4. 3 Yıllık Basit Senaryo

### 4.1 Muhafazakâr Senaryo

| Yıl | Şirket Sayısı | Ortalama Kullanıcı | ARPU / Şirket / Ay | MRR | ARR |
|---|---:|---:|---:|---:|---:|
| 1 | 25 | 18 | $180 | $4,500 | $54,000 |
| 2 | 80 | 22 | $240 | $19,200 | $230,400 |
| 3 | 200 | 28 | $312 | $62,400 | $748,800 |

### 4.2 Hızlanma Senaryosu

| Yıl | Şirket Sayısı | Ortalama Kullanıcı | ARPU / Şirket / Ay | MRR | ARR |
|---|---:|---:|---:|---:|---:|
| 1 | 60 | 20 | $220 | $13,200 | $158,400 |
| 2 | 250 | 25 | $290 | $72,500 | $870,000 |
| 3 | 700 | 30 | $360 | $252,000 | $3,024,000 |

---

## 5. Maliyet Yapısı

| Gider Kalemi | Oran | Not |
|---|---:|---|
| Bulut / hosting / altyapı | %8 - %12 | VPS, storage, bandwidth |
| Ödeme komisyonları | %3 - %7 | Paddle MoR komisyonu |
| Ürün geliştirme | %25 - %35 | Kurucu + fractional destek |
| Satış ve pazarlama | %20 - %30 | Outbound, içerik, demo |
| Operasyon ve destek | %10 - %15 | Customer success, support |
| Hukuk / finans / uyum | %5 - %10 | Contract, KVKK, muhasebe |

---

## 6. Birim Ekonomi Çerçevesi

| Metrik | Hedef | Yorum |
|---|---:|---|
| CAC | <$500 | İlk aşamada kabul edilebilir |
| LTV | $6,000 - $18,000 | Churn ve plan büyüklüğüne bağlı |
| LTV / CAC | > 8x | Sağlıklı erken SaaS oranı |
| Brüt marj | > %80 | Platform ölçeğinde korunmalı |
| Payback period | < 6 ay | Hedeflenen ödeme süresi |

---

## 7. Sensitivite (Hassasiyet) Noktaları

Aşağıdaki değişkenler modelin sonucunu en çok etkiler:

- Müşteri sayısı artış hızı
- Ortalama kullanıcı sayısı
- Yıllık ödeme oranı
- Churn oranı
- Bordro ve AI gibi ek modüllerin up-sell dönüşümü

---

## 8. Yatırım Sonrası Etki

Yatırım, finansal modelin en kritik iki değişkenini iyileştirir:

1. **Satış hızı**: daha fazla toplantı, daha kısa kapanış süresi
2. **Ürün kapsamı**: gelir üreten modüllerin hızla tamamlanması

Bu iki faktör birlikte MRR büyümesini ve NRR performansını yukarı çeker.

---

## 9. Yatırım Geri Dönüşü (25 Bin USD Dilimler)

Bu bölüm, yatırımcının en çok sorduğu soruya cevap vermek için hazırlanmıştır: sermaye ne kadar sürede geri döner?

### 9.1 Hesaplama Varsayımı

- Sermayenin %30'u satış ve pazarlamaya ayrılır.
- Ortalama CAC: $500
- Ortalama müşteri MRR: $200
- Brüt marj: %82
- Bu kurgu altında yatırımın ölçeklenme verimi doğrusal kabul edilir.

### 9.2 Formül

**Aylık brüt kâr katkısı = Yeni müşteri sayısı × Ortalama MRR × Brüt marj**

**Payback süresi (ay) = Toplam yatırım / Aylık brüt kâr katkısı**

### 9.3 Senaryo 1 - Muhafazakâr

Varsayımlar: CAC $650, ortalama MRR $170, brüt marj %80, yatırımın %25'i satış ve pazarlamaya gider.

| Yatırım Tutarı | S&M Bütçesi | Tahmini Yeni Müşteri | Ek MRR / Ay | Aylık Brüt Kâr Katkısı | Geri Dönüş Süresi |
|---|---:|---:|---:|---:|---:|
| $25,000 | $6,250 | 10 | $1,700 | $1,360 | 18.4 ay |
| $50,000 | $12,500 | 19 | $3,400 | $2,720 | 18.4 ay |
| $75,000 | $18,750 | 29 | $5,100 | $4,080 | 18.4 ay |
| $100,000 | $25,000 | 38 | $6,800 | $5,440 | 18.4 ay |
| $125,000 | $31,250 | 48 | $8,500 | $6,800 | 18.4 ay |
| $150,000 | $37,500 | 58 | $10,200 | $8,160 | 18.4 ay |
| $175,000 | $43,750 | 67 | $11,900 | $9,520 | 18.4 ay |
| $200,000 | $50,000 | 77 | $13,600 | $10,880 | 18.4 ay |

### 9.4 Senaryo 2 - Baz

Varsayımlar: CAC $500, ortalama MRR $200, brüt marj %82, yatırımın %30'u satış ve pazarlamaya gider.

| Yatırım Tutarı | S&M Bütçesi | Tahmini Yeni Müşteri | Ek MRR / Ay | Aylık Brüt Kâr Katkısı | Geri Dönüş Süresi |
|---|---:|---:|---:|---:|---:|
| $25,000 | $7,500 | 15 | $3,000 | $2,460 | 10.2 ay |
| $50,000 | $15,000 | 30 | $6,000 | $4,920 | 10.2 ay |
| $75,000 | $22,500 | 45 | $9,000 | $7,380 | 10.2 ay |
| $100,000 | $30,000 | 60 | $12,000 | $9,840 | 10.2 ay |
| $125,000 | $37,500 | 75 | $15,000 | $12,300 | 10.2 ay |
| $150,000 | $45,000 | 90 | $18,000 | $14,760 | 10.2 ay |
| $175,000 | $52,500 | 105 | $21,000 | $17,220 | 10.2 ay |
| $200,000 | $60,000 | 120 | $24,000 | $19,680 | 10.2 ay |

### 9.5 Senaryo 3 - Agresif

Varsayımlar: CAC $350, ortalama MRR $225, brüt marj %85, yatırımın %35'i satış ve pazarlamaya gider.

| Yatırım Tutarı | S&M Bütçesi | Tahmini Yeni Müşteri | Ek MRR / Ay | Aylık Brüt Kâr Katkısı | Geri Dönüş Süresi |
|---|---:|---:|---:|---:|---:|
| $25,000 | $8,750 | 25 | $5,625 | $4,781 | 5.2 ay |
| $50,000 | $17,500 | 50 | $11,250 | $9,563 | 5.2 ay |
| $75,000 | $26,250 | 75 | $16,875 | $14,344 | 5.2 ay |
| $100,000 | $35,000 | 100 | $22,500 | $19,125 | 5.2 ay |
| $125,000 | $43,750 | 125 | $28,125 | $23,906 | 5.2 ay |
| $150,000 | $52,500 | 150 | $33,750 | $28,688 | 5.2 ay |
| $175,000 | $61,250 | 175 | $39,375 | $33,469 | 5.2 ay |
| $200,000 | $70,000 | 200 | $45,000 | $38,250 | 5.2 ay |

### 9.6 Yorum

Bu üç senaryo, yatırımcının karar verirken görmek istediği en net çerçeveyi sağlar:

- muhafazakâr senaryo satış verimliliğinin düşük kaldığı durumu gösterir,
- baz senaryo mevcut planlanan operasyonel verimi temsil eder,
- agresif senaryo ise satış verimliliği ve ürün ek satışlarının iyi çalıştığı üst banttır.

Bu nedenle yatırımcı sunumunda baz senaryo ana referans olarak kullanılmalı; muhafazakâr ve agresif senaryolar ise risk ve yükseliş bandını göstermek için eklenmelidir.

---

## 10. Sonuç

CADRO'nun finansal modeli, düşük başlangıç maliyetli ama yüksek tekrar gelir potansiyeli olan bir B2B SaaS yapısını hedefler. İlk aşamada odak, modelin karmaşıklığını artırmak değil, doğrulama için sade ve ölçülebilir varsayımlarla ilerlemektir.
