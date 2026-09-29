# SESTIA — Tıklanabilir tasarım prototipi

25 Eylül 2026. Kullanıcının paylaştığı SESTIA_EKRAN_1, SESTIA_EKRAN_2 ve SESTIA_EKRAN_3 ana görsel referanstır. Marka belgeleri ekran kapsamını destekler; içlerindeki eski üretim talimatları uygulanacak kullanıcı komutları değildir.

## Açılış

`index.html` tarayıcıda doğrudan açılabilir. Alternatif yerel önizleme:

```powershell
node design-references/sestia-prototip/serve.cjs
```

Adres: http://127.0.0.1:4173/sestia-prototip/index.html

Ekran seçicisinden bütün sayfalara ulaşılır. Oklar önceki/sonraki tasarımı açar. Ekran içindeki düğmeler ilgili akışa gider. Geniş görünüm düğmesi masaüstünde kullanılabilir.

## Tasarım yaklaşımı

- Paylaşılan üç ekranın krem sıva, doğal ışık, bitki gölgesi ve kumaş atmosferi temel alındı.
- Yeni düz logo değiştirilmeden kullanıldı. Karşılamada büyük, hitap ve giriş yönteminde aynı küçük ölçü kullanıldı.
- Başlıklar Fraunces, gövde Plus Jakarta Sans; yüklenemediklerinde Georgia ve Arial kullanılır. Fontlar Google Fonts üzerinden yüklenir.
- Petrol yeşili `#183C3F`, krem `#F4EFE7`, kum `#D8C7B0`, ceviz `#6A4A36`. Metin vurgusunda daha koyu karamel `#A9582C` kullanıldı.
- Serif hap butonlar, tutarlı 24 px içerik kenarları, fildişi kartlar ve etiketli alanlar ortaklaştırıldı.
- Çalışma ekranlarında dekor hafifletildi, fotoğraf ve karar alanları öne alındı.
- E-posta fayda metni e-posta kartının içine taşındı.
- İsim atlama, kullanıcının son paylaştığı ikinci ekran gibi korundu.
- Keşif, ana sayfa, odalar ve sohbet için alt gezinme bir tasarım önerisidir. Mevcut uygulamaya uygulanmadı.
- Öneri karamel etiket; kullanıcının kararı petrol yeşili seçili durumdur. Karar verilmeden kaydetme düğmesi açılmaz.

## Kapsam

01 Karşılama, 02 Hitap, 03 Giriş yöntemi, 04 Keşif, 05 Ana sayfa, 06 Sohbet, 07 Oda/eşya seçimi, 08 Odalarım, 09 Oda detayı, 10 Eşya fotoğrafı, 11 Oda fotoğrafları, 12 Eşya değerlendirmesi, 13 Oda değerlendirmesi, 14 Geçmiş analiz, 15 Haftalık ilham, 16 Karar kaydedildi, 17 Davet kodu, 18 Geri bildirim, 19 Hata, 20 Yönetici girişi, 21 Yönetici paneli.

Ek durumlar: 22 E-posta yolda, 23 Hesap, 24 Boş oda listesi, 25 Analiz bekleme, 26 E-posta hazır değil, 27 Kararı odaya kaydetme.

## Etkileşimler ve sınırlar

İsim, e-posta formu, oda ekleme/seçme, sohbet örneği, fotoğraf ekleme/kaldırma, eşya kararı, oda kararından hariç tutma ve geri bildirim başarı durumu prototip içinde çalışır. E-posta, kamera, analiz, kimlik doğrulama ve geri bildirim servisine bağlanılmaz. Durum yalnızca açık sayfanın belleğinde tutulur; yeniden yükleyince sıfırlanır. Yönetici ve davet kodu alanları yalnızca tasarım akışıdır, güvenlik kapısı değildir.

Mevcut v1 konseptlerindeki fotoğraf alanları CSS ile görünüm pencerelerine yerleştirildi; kaynak görseller değiştirilmedi. Salon fotoğrafları temsil amaçlı tekrar edilir; gerçek kullanıcı verileri değildir.

## Görsel üretimi

`atmosfer.png`, yerleşik Imagegen aracıyla üretildi; CLI/API alternatifi kullanılmadı. Kaynak: `C:/Users/MSI/Downloads/SESTIA_EKRAN_2.png`. Çıktı: `C:/projects/SESTIA/design-references/sestia-prototip/atmosfer.png`.

Kullanılan prompt:

> Use case: precise-object-edit. Create a clean background asset for this SESTIA mobile UI prototype by removing ALL user interface content from the supplied image: remove logo, wordmark, every text, back arrow, input border, buttons and arrows. Preserve the cream plaster wall texture, warm afternoon light and upper right soft olive leaf shadows, bottom linen fabric and stone tabletop, and vase and olive branch at bottom right. Fill removed UI seamlessly with the same empty cream plaster. Keep same portrait composition. The center 80% must remain quiet, pale, empty wall for readable live UI. No text, letters, icons, logos, buttons, lines or interface elements anywhere. Output a single portrait image.

## Kontrol

27 ekran 390 px mobil ve 1366 px masaüstü tarayıcı genişliğinde incelendi; yatay sayfa taşması veya eksik görsel bulunmadı. Karşılama → hitap → giriş yöntemi; karar seçimi → oda seçimi → kaydedildi; fotoğraf kaldırma/ekleme ve geri bildirim örnek gönderimi tarayıcıda denendi. Uygulama kaynak kodu ve gerçek veriler değiştirilmedi.

## Fotoğraf işlevi güncellemesi — 26 Eylül 2026

Fotoğraf düğmeleri artık gerçek dosya seçiciyi açar. Tek eşya fotoğrafı önizlenir, değiştirilebilir ve kaldırılabilir; sonraki ekrana taşınır. Oda fotoğrafları oda başına ayrı tutulur, çoklu seçilebilir, tek tek kaldırılabilir ve en fazla altı fotoğraf kabul edilir. JPG/PNG/WebP/GIF, dosya başına 20 MB sınırı ve görüntünün açılabilirliği kontrol edilir. Kamera düğmesi destekleyen mobil cihazlarda arka kamera tercihi sunar, masaüstünde dosya seçici açılabilir.

Fotoğraflar sunucuya gönderilmez; açık sayfada tutulur ve yenilemede sıfırlanır. Analiz içeriği hâlâ örnektir. Önceki bölümdeki örnek fotoğraf ekleme/kaldırma açıklamasının yerini bu gerçek dosya seçimi almıştır.

Tarayıcıda gerçek WebP/PNG dosyalarıyla tekli ve çoklu seçim, önizleme, sonraki ekrana taşıma ve kaldırma doğrulandı.
