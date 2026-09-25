# Faz 1–2 sonrası izole uçtan uca test

**Tarih:** 24 Eylül 2026
**Proje:** `C:\projects\1_ODA_1_KARAR`, `668a1ef` üzerindeki commit edilmemiş çalışma ağacı (Faz 1 + Faz 2 dahil)
**Uygulayan:** Claude Code. Uygulama kodunda değişiklik yapılmadı.

## 0. Sonuç

**İstenen akışların hepsi gerçek tarayıcıda çalıştı. Veri bütünlüğü hatası bulunmadı.** Kontrol edilen noktalar:

- Kayıtlar mükerrer oluşmuyor.
- Fotoğraf–analiz eşleşmesi doğru.
- Sestia'nın ilk önerisi, taslak ve nihai karar birbirinden ayrı tutuluyor.
- Revision sayaçları doğru ilerliyor.
- Onaylamadan kapatma karar ya da puan üretmiyor.

İki küçük kullanıcı deneyimi sorunu bulundu (§4). İkisi de veri kaybı ya da yanlış kayıt oluşturmuyor.

Gerçek `data/app.db`, `-wal` ve `-shm` dosyalarının SHA-256 özetleri test öncesi ve sonrasında aynı. `data/room-photos` altındaki gerçek dosya sayısı da değişmedi (21). Ücretli AI çağrısı, production, Railway, commit ve deploy yok.

**Kullanıcının bilmesi gereken yan etki:** §1.3'e bakın. Tarayıcı panelindeki `localhost` misafir çerezi değişmiş olabilir.

## 1. İzolasyon düzeneği

### 1.1 Kurulum

Faz 1'deki `tests/build-isolated.cjs` yaklaşımı dev sunucusuna uyarlandı. Çalıştırıcı betik proje dışında, oturumun geçici klasöründe tutuldu (`scratchpad/e2e/run-isolated-dev.cjs`).

- **Kaynak kopyası:** `app`, `lib`, `components`, `public`, `SESTIA_BILGI_KUTUPHANESI`, paket/yapılandırma dosyaları ve `proxy.js`, `%TEMP%\sestia-e2e-*` altına kopyalandı. `node_modules` junction ile bağlandı. `data`, `.env*`, `.git` ve `.next` kopyalanmadı. Betik şunları denetledi: kopyada `.env` dosyası yok, `data` klasörü baştan boş.
- **Veritabanı:** `lib/db.js`, `process.cwd()/data` kullanıyor. Sunucu kopyanın içinden çalıştırıldı. Böylece yeni migrationlar ve `creation_operations` tablosu yalnızca geçici DB'de oluştu.
- **Kimlik bilgileri:** Yalnızca sahte değerler kullanıldı (`AUTH_SECRET`, `ANTHROPIC_API_KEY`). Resend anahtarı verilmedi.
- **Model:** `ANTHROPIC_BASE_URL=http://127.0.0.1:4599` üzerinde kontrollü bir sahte model sunucusu çalıştı. Yanıtlar deterministikti, kapsam sonucu testten değiştirilebiliyordu ve her çağrı görsel sayısıyla birlikte loglandı. Uygulama sürecinin dış ağ erişimi bir `--require` koruması ile yalnızca loopback adreslerine sınırlandı. Sahte anahtar olduğu için ücretli çağrı zaten mümkün değildi.
- **Next.js:** `next dev --webpack` kullanıldı. Turbopack, `node_modules` junction'ını "filesystem root dışı" diyerek reddetti. Webpack, Faz 1'de doğrulanan paketleme yoluyla aynı.
- **Kopyada yapılan tek ayar:** `next.config.mjs`'e `allowedDevOrigins: ['127.0.0.1']` eklendi. Aksi hâlde Next 16 dev sunucusu, `127.0.0.1` kaynağından gelen `/_next` isteklerini engelliyor ve sayfa hydrate olmuyordu.
- **Başlatma:** Sunucu, tarayıcı paneli üzerinden izlenen bir `launch.json` girdisiyle başlatıldı. Proje dosyası test sonunda `git checkout` ile eski hâline döndürüldü.

### 1.2 Doğrulama ve temizlik

- Test öncesi ve sonrası gerçek DB özetleri:
  - `app.db 72fe0f38…`
  - `-wal 797ea14b…`
  - `-shm 1a3ea9f3…`

  Değişiklik yok.
- Geçici DB'nin kendi klasöründe oluştuğu dosya listesiyle doğrulandı. Test sırasında geçici DB salt okunur (`query_only`) bağlantıyla kontrol edildi.
- Sahte model logunda 6 çağrı var, hepsi yerel: 3 kapsam, 2 oda analizi, 1 oda sohbeti.
- Test sonunda bütün `sestia-e2e-*` geçici klasörleri silindi. Silmeden önce junction ayrı kaldırıldı ve gerçek `node_modules`'a dokunulmadı.

### 1.3 Yan etki: tarayıcı panelinin `localhost` çerezleri

İzole sunucu ilk açılışta `http://localhost:3456` adresinde açıldı. Tarayıcı panelinde `localhost` için daha önceki oturumlardan kalan çerezler vardı (`access_ok` görüldü). Çerezler porttan bağımsız olduğu için izole sunucu, mevcut misafir çerezini kendi sahte `AUTH_SECRET`'ı ile doğrulayamadı ve muhtemelen yeni bir misafir çereziyle değiştirdi. HttpOnly olduğu için eski değer görülemedi.

- **Etkisi:** Yalnızca Claude uygulamasının tarayıcı panelindeki `localhost:3000` misafir kimliği değişmiş olabilir. Kullanıcının kendi Chrome'u ve gerçek DB etkilenmedi; veriler olduğu gibi duruyor. Panelden `localhost:3000` açılırsa yeni, boş bir misafir kimliğiyle karşılaşılabilir.
- **Önlem:** Bu fark edildikten sonraki bütün testler, çerezleri ayrı tutulan `127.0.0.1:3456` üzerinden yapıldı.
- **Gelecekteki izole testler için öneri:** Doğrudan `127.0.0.1` ile başlayın ya da `localhost` çerezleri olmayan bir tarayıcı profili kullanın.

## 2. Test yöntemi

- Tıklamalar, metin girişi ve Enter tuşu tarayıcı panelinde gerçek kullanıcı etkileşimi olarak yapıldı.
- İki müdahale yapıldı:
  - Dosya seçici: Canvas ile üretilmiş, birbirinden ayırt edilebilir renkli JPEG'ler, `DataTransfer` ile gerçek `<input type=file>` öğesine verildi ve `change` olayı tetiklendi. Sıkıştırma, yükleme ve analiz gerçek kodla çalıştı.
  - `window.confirm`: Otomasyonun yerel dialogda takılmaması için sayfa içinde değiştirildi. Gösterilen metin kaydedildi, "Tamam" ya da "İptal" yanıtı testten verildi.
- Sunucu durumu, aynı kaynaktan salt okunur GET istekleriyle (`/api/rooms`, `/api/rooms/:id`, `/api/rooms/:id/scan`, `/api/state`) ve geçici DB'nin salt okunur sorgusuyla kontrol edildi.

## 3. Akışlar ve sonuçlar

### 3.1 Keşif → Oda Taraması → analiz → odaya kaydetme → taslak → onay → Odalarım

| # | Adım | Gözlenen | Sonuç |
|---|---|---|---|
| 1 | İlk karşılama: hitap "Test", Misafir Olarak Dene | Keşif ekranı açıldı. | ✅ |
| 2 | "Bir odaya bakalım mı?" | Oda Taraması ekranı açıldı. | ✅ |
| 3 | 1 fotoğraf eklendi; model kapsamı yetersiz buldu | "Sağ tarafı da görebilir miyim?" ve "İstenen açı: …" gösterildi. Analiz başlamadı. | ✅ |
| 4 | 2. fotoğraf eklendi; kapsam yeterli | Kapsam 2 görselle kontrol edildi. Analiz otomatik başladı ve 2 görselle çalıştı. 3 eşya listelendi. | ✅ |
| 5 | Kayıttan önce onay | "Tümünü Onayla" kilitli. "Bu çalışmayı bir odaya kaydet" gösterildi. | ✅ |
| 6 | Yeni oda "Salon" → Odaya Kaydet | 1 oda, 2 fotoğraf, analiz 1 kaydedildi. Onay açıldı. | ✅ (§4.1 metin notu) |
| 7 | Fotoğraf–analiz eşleşmesi (N01) | Kayıtlı `photoIds=[2,1]`. Piksel rengiyle kontrol edildi: id 2 = 1. fotoğraf, id 1 = 2. fotoğraf. Modele gönderilen sırayla aynı. | ✅ |
| 8 | Taslak: kitaplık Sat → Tut, battaniye hariç | Değişiklik yapılınca onay kilitlendi ve "taslak henüz kaydedilmedi" uyarısı çıktı. | ✅ |
| 9 | "Taslak Seçimlerini Kaydet" | Sunucuda revision 2. Kitaplık `tut / manual`, ilk öneri `sat`. Battaniye `excluded`. | ✅ |
| 10 | Sohbet: "Kitaplığı sevdiğim kitaplar için kullanıyorum." | Model 2 görselle çağrıldı. Yanıt ekranda göründü. Sunucuda revision 3 ve 4 mesaj. İlk öneri `sat` ve hariç tutma korundu. | ✅ |
| 11 | "Tümünü Onayla (2 eşya)" | Kutlama ekranı: +10 puan, 1 gün seri. Sunucuda 2 karar ve 10 puan. Aktif tarama kapandı. Nihai: Tut / Geri Dönüştür / battaniye hariç. | ✅ |
| 12 | "Yarın Görüşürüz" → oda ekranı | Geçmiş analiz ve "Bu odadaki kararlar" (Mobilya Tut, Aydınlatma Geri Dönüştür) gösterildi. | ✅ |
| 13 | Geçmiş analiz ayrıntısı | "Sestia'nın ilk önerisi: Sat / Kararın: Tut", "Kararın: Hariç tutuldu". Sohbet ve iki fotoğraf görünüyor. | ✅ |
| 14 | Odalarım | Tek satır: "Salon — 2 karar". Kopya oda yok. | ✅ |

### 3.2 Mevcut odada tarama, taramaya geri dönme, onaylamadan kapatma

| # | Adım | Gözlenen | Sonuç |
|---|---|---|---|
| 15 | Salon → "Oda Taraması Yap" (açık çalışma yok) | Uyarı gösterilmedi. Sunucuda ayırma yapıldı (generation 3). | ✅ |
| 16 | Odanın içinde 1 fotoğraf eklendi | Fotoğraf hemen odaya yüklendi (id 3). Kapsam ve analiz 1 görselle çalıştı. Analiz 3 otomatik kaydedildi (revision 1). Galeride 3 fotoğraf, kopya yok. | ✅ |
| 17 | Lamba → Sat (kaydedilmedi) → Geri | "Kaydedilmemiş taslak seçimlerin var…" uyarısı çıktı. İptal: ekranda kalındı. Tamam: ana ekrana dönüldü. | ✅ |
| 18 | Salon ekranı | "Yarım kalan bir tarama var… Taramaya Devam Et" gösterildi. | ✅ |
| 19 | Açık çalışma varken "Oda Taraması Yap" → İptal | Açık çalışma uyarısı çıktı. İptal sonrası generation 3 ve analiz 3 değişmedi. | ✅ |
| 20 | "Taramaya Devam Et" | Yalnızca bağlı fotoğraf (3) gösterildi. Kayıtlı seçimler geri geldi. Terk edilen kaydedilmemiş "Sat" gelmedi (kullanıcı atmayı onaylamıştı; beklenen davranış). Dosyalar tarayıcıda olmadığı için sohbet alanı gizli (bilinen sınır). | ✅ |
| 21 | Lamba → At, taslak kaydedildi, çıkıldı, tekrar devam edildi | Sunucuda revision 2, `at / manual`, ilk öneri `geri_donustur`. Devam edildiğinde "Senin seçimin: At" geri geldi. | ✅ |
| 22 | "Onaylamadan kapat" → Tamam | Doğru onay metni gösterildi. Aktif tarama kaldırıldı. Analiz 3 `closed / unconfirmed`, taslak korundu, nihai karar yok. Karar sayısı 2 ve puan 10 değişmedi. Geçmişte "Onaylanmadan kapatıldı." yazıyor. | ✅ |
| 23 | Kapatılmış analizin ayrıntısı | "Sestia'nın ilk önerisi: …" ve "Kaydedilmiş taslak: At — tarama kapatıldı." | ✅ |
| 24 | Kapanış sonrası "Oda Taraması Yap" | Uyarı gösterilmedi. Yeni ayırma yapıldı (generation 5). | ✅ |
| 25 | Fotoğraf eklemeden geri çık → tekrar "Oda Taraması Yap" | Oda ekranında devam seçeneği yok, ancak açık çalışma uyarısı çıkıyor (§4.2). "Tamam" ile değiştirme çalıştı (generation 6). Analiz, karar ve fotoğraf kaybı yok. | ⚠️ UX |

### 3.3 Ek gözlemler (hata değil)

- `room_analyses` kimlikleri 1 ve 3 oldu, 2 atlandı. `sqlite_sequence=3`. Bunun nedeni, AUTOINCREMENT tablosunda analiz 1'in upsert güncellemesinin sırayı tüketmesi. Satır kaybı yok.
- `creation_operations` tablosunda 1 oda ve 3 fotoğraf işlemi var. Her kaynak için tam bir kayıt oluşmuş.
- Sohbet kutusu bir `textarea`. Enter tuşu gönder yerine yeni satır ekliyor; gönderim "Gönder" düğmesiyle yapılıyor. Mevcut tasarım olarak kaydedildi.
- Odanın içinden başlatılan taramada "Geri" düğmesi odaya değil, ana ekrana dönüyor.
- Öneri düğmeleri yalnızca ikon içeriyor ama `title` ile erişilebilir ada sahip. Oda ve tarama ekranlarındaki geri ikon düğmeleri erişilebilirlik ağacında adsız görünüyor.

## 4. Bulunan sorunlar

### 4.1 Normal kayıt sırasında "kaydetme yarım kaldı" metni (P3, metin)

- **Yer:** `app/page.js` / `SaveScanToRoom`, "“{pendingRoomName}” odasına kaydetme yarım kaldı." metni. `pendingRoomName`, `roomScanNeedsRoom` true iken `activeRoomRef.current?.name` değerinden besleniyor.
- **Gözlenen:** "Odaya Kaydet"e basıldıktan sonra kayıt normal şekilde sürerken, yaklaşık 1–3 saniye boyunca "“Salon” odasına kaydetme yarım kaldı." ve "Kaydediliyor..." birlikte görünüyor. Kayıt tamamlanınca metin kayboluyor.
- **Yeniden üretme:** Keşif → Oda Taraması → fotoğraf → analiz → yeni oda adı → Odaya Kaydet → kayıt bitmeden ekrana bak.
- **Etki:** Kullanıcı başarılı süren bir kaydı yarım kalmış sanabilir. Veri etkisi yok.

### 4.2 Boş ayırmada var olmayan "Taramaya Devam Et" seçeneğine yönlendirme (P3, UX)

- **Yer:** `reserveRoomScan` onay metni ile `RoomDetailView`'daki devam seçeneği (yalnızca `roomDetail.scan` varken gösteriliyor).
- **Gözlenen:** "Oda Taraması Yap" ile ayırma yapılıp fotoğraf eklemeden çıkılırsa, sunucuda analizi olmayan aktif bir ayırma kalıyor. Oda ekranında "Taramaya Devam Et" görünmüyor. Ancak yeni tarama denemesi şu uyarıyı gösteriyor: "Bu odada açık bir çalışma var… Devam etmek için İptal’e basıp “Taramaya Devam Et” seçeneğini kullan." Ekranda böyle bir seçenek yok.
- **Yeniden üretme:** Salon → Oda Taraması Yap → fotoğraf eklemeden Geri → Odalarım → Salon → Oda Taraması Yap.
- **Etki:** Kullanıcı kaybolacak bir çalışma olduğunu sanabilir. "Tamam" güvenli şekilde değiştiriyor ve korunması gereken analiz ya da sohbet yok. Faz 1 raporu bu davranışı sınır olarak kaydetmişti; uçtan uca testte metnin kullanıcıyı var olmayan bir seçeneğe yönlendirdiği görüldü.
- **Karar gerektiren nokta:** Analizi olmayan ayırma için ya uyarı gösterilmemeli, ya metin değiştirilmeli, ya da çıkışta ayırma bırakılmalı. Bu bir ürün kararı; bu testte kod değiştirilmedi.

## 5. Test edilmeyenler

- Tek Eşya akışı ve karar tekrarı (kapsam dışı).
- Gerçek ağ kesintisi ya da kaybolan yanıt. Bunlar `npm test` içinde deterministik olarak test ediliyor; tarayıcıda yapay ağ kesintisi yaratılmadı.
- Birden çok sekme ya da cihaz, mobil kamera girişi, gerçek mobil yaşam döngüsü, `beforeunload` dialogu.
- Hesaplı (e-posta) giriş. Yalnızca misafir akışı test edildi.
- Gerçek model yanıtlarının içeriği ve kalitesi. Yalnızca kontrollü yanıtlar kullanıldı.
- Turbopack dev sunucusu (junction nedeniyle webpack kullanıldı).

## 6. Değiştirilen dosyalar

- Bu rapor.
- `.claude/launch.json` test sırasında geçici olarak genişletildi, sonra `git checkout` ile eski hâline döndü.
- Uygulama kodu, testler ve gerçek veri değişmedi.
