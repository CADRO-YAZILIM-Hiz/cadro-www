# Kanıt eşleme sözleşmesi

Açık kaynak adı veya URL tek başına kanıt değildir. Her sayısal/ürün/güvenlik iddiası için aşağıdaki bağlantı tutulur.

1. **İddia:** Tam metin ve URL.
2. **Kaynak:** Kurum, belge adı, yayın/erişim tarihi ve kapsamı.
3. **Yer:** Sayfa/bölüm/madde/formül. Ana sayfa bağlantısı tek başına kanıt sayılmaz.
4. **Sınır:** Kaynağın neyi doğrulamadığı; örneklem/yöntem gereken durumlar.
5. **Sorumlu:** Gerçek incelemeyi yapan rol ve sonraki kontrol/eylem.
6. **Durum:** `verified`, `formula_only`, `needs_specific_review`, `pending`, `remove_or_noindex`.

## Faz yaklaşımı

- Faz 1: Kayıt şeması, ROI hesap modeli ve TR güvenlik ifadeleri.
- Faz 2: EN/DE/AR güvenlik ve ürün iddiaları, küçük dil düzeltmeleri.
- Faz 3: Ücret/vergi hesaplayıcılarında her oran/istisna için özel mevzuat eşleme.
- Faz 4: Vaka çalışmaları ve müşteri başarısı kanıtları.

`evidence-register.csv` eklenebilir kayıt defteridir. Bir satır `verified` ise iddianın doğrudan okunabilir kaynak içinde yer alması gerekir. `formula_only` kullanıcı varsayımı veya açık hesaplamadır; dünyaya dair bir sonuç kanıtı değildir. Tam metin incelenmemiş kaynak `verified` yapılmaz.
