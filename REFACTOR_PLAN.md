# Refactor Planı

Bu doküman, mevcut backend ve frontend yapısında uygulanmakta olan, ancak yarım kalan modular refactor sürecini özetler. Amaç, büyük bang yeniden yazma yapmadan, mevcut `/api` rotalarını ve frontend davranışını koruyarak sistemi daha temiz, bakımı daha kolay ve güvenli hale getirmektir.

## Amaç

- Mevcut API yollarını bozmadan backend'i parçalara ayırmak.
- İş mantığını `routes` ve `modules` katmanlarına taşımak.
- Tek bir büyük monolitik dosya içindeki karmaşıklığı azaltmak.
- Güvenlik ve bakım maliyetini düşürmek.
- Frontend'in mevcut davranışını korumak.

## Uygulanan yaklaşım

- Strangler pattern benzeri bir yaklaşım kullanıldı.
- Mevcut `/api/...` endpoint'leri korunarak, arka plandaki iş mantığı yeni modüler yapıya taşındı.
- Öncelikli olarak auth, settings, reference-data ve mamuller alanları ayrıldı.
- Yeni yapı:
  - `server/routes/` → API rotaları
  - `server/modules/` → iş mantığı
  - `server/middleware/` → auth/guard middleware
  - `server/utils/` → ortak yardımcı fonksiyonlar

## Tamamlanan parçalar

### 1. Temel backend modülerleşmesi
- `server/index.js` içinde doğrudan yazılmış route mantığı azaltıldı.
- `dotenv`, `helmet`, `express-rate-limit` gibi güvenlik/runtime paketleri eklendi.
- Sunucu başlangıcı ve ana API rotaları doğrulandı.

### 2. Auth modülü
- Login / check-username / password change endpoint'leri `server/routes/auth.js` altına taşındı.
- JWT doğrulama mantığı `server/middleware/auth.js` üzerinden merkezi hale getirildi.
- Kimlik doğrulama iş mantığı `server/modules/auth/authService.js` içine alındı.

### 3. Settings modülü
- Tema, genel ayarlar ve sipariş e-posta ayarları için rota/service ayrımı yapıldı.
- `server/routes/settings.js` ve `server/modules/settings/settingsService.js` oluşturuldu.

### 4. Reference data modülü
- Mamul türleri, renkler, iplikler ve prosesler endpoint'leri `server/routes/referenceData.js` altında toplandı.

### 5. Mamuller modülü
- Admin mamuller listesi, detay, lookup, public detail ve temel CRUD akışları `server/routes/mamuller.js` ve `server/modules/mamuller/mamullerService.js` altına taşındı.
- Frontend tarafında mevcut `/api/admin/mamuller` ve `/api/public/mamuller/:slug` endpoint yapısı korunarak bağlandı.

### 6. Katalog / firmlar / prosesler / kartelalar modülü
- Firma listesi ve oluşturma endpoint'leri `server/routes/catalog.js` ve `server/modules/catalog/catalogService.js` altına taşındı.
- Proses oluşturma/güncelleme akışları aynı katmanlar altında toplandı.
- Kartela oluşturma, listeleme, detay, silme ve arama endpoint'leri `/api` yol yapısı korunarak modüler hale getirildi.

### 7. Admin istatistikleri modülü
- `/api/stats` endpoint'i `server/routes/admin.js` ve `server/modules/admin/adminService.js` altına taşındı.
- Admin tarafı özet istatistikleri veritabanı sayımı üzerinden modüler servis ile sunuluyor.

## Devam edilmesi gereken büyük parçalar

### 6. Siparişler (Orders) modu
Hedef:
- `/api/orders`, `/api/orders/:id`, `/api/orders/:id/complete` gibi endpoint'leri ayrı bir module/router altına taşımak.
- Sipariş oluşturma/güncelleme/silme/başlatma akışlarını merkezi hale getirmek.
- Sipariş mail ve onay süreçlerini ayırmak.

### 7. Excel sync ve label/template alanları
Hedef:
- Excel kaynak yönetimi, sync, label template ve export/import akışlarını ayrı modüllere bölmek.
- Bu alanların mevcut davranışlarını koruyarak daha test edilebilir hale getirmek.

### 8. Hata yönetimi ve standart yanıtlar
Hedef:
- Tüm route'lerde tutarlı `success/error` yanıt formatı kullanmak.
- Ortak hata yakalama mekanizması eklemek.
- `sendSuccess`, `sendError` tarzı yardımcı araçlarla kod tekrarını azaltmak.

### 9. Test altyapısı
Hedef:
- Auth, settings, mamuller ve orders için temel API testleri eklemek.
- Refactor sonrası regresyon riskini azaltmak.

### 10. Güvenlik hardening devamı
Hedef:
- Daha katı rate limiting ve güvenlik kuralları eklemek.
- Varsayılan kullanıcı/şifre kullanımını azaltmak.
- Hassas ayarların `.env` üzerinden yönetimini güçlendirmek.

## Uygulama sırası önerisi

1. Siparişler modülü
2. Excel sync modülü
3. Label/template modülü
4. Ortak hata yönetimi ve standart yanıtlar
5. Test katmanları
6. İsteğe bağlı: frontend tarafında API çağrılarını servis katmanına taşıma

## Riskler ve dikkat edilecek noktalar

- Mevcut frontend'in API beklentilerini bozmayın.
- `/api` yol yapısını değiştirmeyin; önce mevcut davranış korunmalı.
- Response formatını değiştirmeden, sadece iç işleyişi bölmek önemli.
- Veritabanı şeması değişmeden ilerlemek; gerekiyorsa sadece ek alanlar eklenmeli.

## Son durum

- Backend refactor başlangıç düzeyinde başarıyla başlatıldı.
- Auth/settings/reference-data/mamuller parçaları modüler hale getirildi.
- Devam eden ana iş siparişler ve Excel/label alanlarının aynı yöntemle ayrılmasıdır.

## Bir sonraki adım

Bir sonraki büyük parça olarak siparişler modülünü `routes/orders.js` ve `modules/orders/ordersService.js` yapısı altında taşımak.
