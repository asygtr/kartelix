# Kartelix Yol Haritası

## Güncel Durum

### Sprint 1: Stabilizasyon ve Kurumsallaştırma
- Tamamlandı
- Ortak dil, navbar, panel ve form davranışları tek deneyime yaklaştırıldı
- Boş durum, yükleniyor ve hata mesajları sadeleştirildi
- Mobil kullanımda ana akışlar tutarlı hale getirildi

### Sprint 2: Mamül Çekirdeği
- Tamamlandı
- Mamül düzenleme ve güncelleme akışı eklendi
- Mamül detay görünümü ve ürün kartı özet paneli oluşturuldu
- Varyant hazırlığı için veri omurgası kuruldu
- Mamül kopyalama, koleksiyon alanı ve taslak/yayında durumu eklendi
- Article no üretimi otomatik kural mantığıyla çalışıyor

### Sprint 3: Etiket ve Sipariş Derinliği
- Tamamlandı
- Staff için QR okutunca otomatik siparişe ekleme aktif
- Etiket ekranı mamül kartına tam bağlı çalışıyor
- Toplu etiket baskı akışı eklendi
- Sipariş listesi, detay ve güncelleme akışı güçlendirildi

### Sprint 4: Public Vitrin ve İçgörü
- Tamamlandı
- Public ürün vitrini ürün hikâyesi, materyal notları ve benzer ürünlerle güçlendirildi
- Koleksiyon bilgisi public deneyime taşındı
- QR/public görüntülenme analitiği başlatıldı
- Yönetim için rapor ekranı oluşturuldu

## Aktif Modüller
- `Mamül Kartı`: oluşturma, düzenleme, kopyalama, yayın durumu, koleksiyon, teknik ve maliyet akışı
- `Etiket Bas`: arama, QR ile seçim, tekil etiket önizleme, toplu baskı
- `Ürün Tanıtımı`: hikâye, materyal dili, vitrin başlığı ve public içerik yönetimi
- `Siparişler`: yeni sipariş, QR ile ürün ekleme, mevcut siparişi açma ve güncelleme
- `Raporlar`: toplam mamül, public aktif kayıt, sipariş hacmi, görüntülenme ve performans listeleri

## Global Pratiklerden Alınan Yön
- Mamül kartı sistemin tek ürün doğrusu olarak kalır
- Public vitrin ayrı görünüm katmanıdır, ana veri kaynağı değildir
- QR aksiyon taşımaz; ürün kimliği taşır
- Referans veriler ayarlarda, operasyon verileri akış ekranlarında yönetilir
- Ürün, varyant, maliyet ve hikâye aynı omurgaya bağlı ama farklı kullanım bağlamlarında sunulur

## Mimari İlkeler
- QR yalnızca ürün kimliği taşır; davranışı bağlam belirler
- Admin tüm akışları görebilir; veri modeli sade kalır
- Public ve iç operasyon ekranları birbirine karışmaz
- Referans veriler ayarlardan, operasyonel veriler akış ekranlarından yönetilir
- Mamül kartı sistemin ana veri kaynağıdır
