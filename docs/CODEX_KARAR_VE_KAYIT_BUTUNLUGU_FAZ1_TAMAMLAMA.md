# Faz 1 tamamlama — karar ve kayıt bütünlüğü

Tarih: 24 Eylül 2026  
Proje: `C:\projects\SESTIA`  
Temel Git durumu: `668a1ef` üzerindeki mevcut, commit edilmemiş çalışma ağacı.

## 1. Sonuç ve kapsam

Claude'un raporu ve ekli Faz 1 tamamlama talimatı okundu. Bulgular güncel koddan kontrol edildi; önceki raporlar uygulamanın doğruluğunun kanıtı kabul edilmedi. Devam isteğinden sonra Git farkları yeniden incelendi. Önceki düzenleme girişimi Python bulunamadığı için çalışmamıştı; o girişimin dosyalara uygulanmadığı doğrulandı. Mevcut Faz 1 kodu ve kapsam dışındaki değişiklikler korunarak devam edildi.

**Son regresyon sonucu: 45 test, 45 başarılı, 0 başarısız, 0 atlanan.** Son izole Next.js üretim derlemesi de başarılı. Yeni kod gerçek yerel kullanıcı veritabanına uygulanmadı. Commit ve deploy yapılmadı.

Faz 1'in güvence alanı: aynı analizin onayı tekrar karar/puan üretmez; kayıt, onay ve kapatma doğru analizi hedefler; eski kayıt isteği yeni aktif taramanın yerini alamaz; kaydedilmiş öneri, taslak ve nihai karar ayrı okunur. Bu, fotoğrafların ve model girdilerinin bütün oturum yarışlarından arındırıldığı anlamına gelmez.

## 2. Y1–Y7 değerlendirmesi

| Bulgu | Bağımsız kontrol | Yapılan işlem ve son durum |
|---|---|---|
| Y1 — eski ilk POST / yeniden etkinleşme | Doğrulandı. Önceki `save` yalnızca mevcut analiz için aktif satır kontrolü yapıyordu; satır yokken de devam edebiliyordu. | **Faz 1 kapsamında giderildi.** Analizden önce sunucuda tarama ayırma, oda nesli karşılaştırması ve bütün yazmalarda aktif analiz kontrolü eklendi. Yeni çalışma açıkça seçildiğinde önceki analiz kapatılır. |
| Y2 — bağlantısız eski tarama | Doğrulandı. `analysisId` zorunluluğu eski bağlantısız kayda kapatma yolu bırakmıyordu. Yerel oda 5'e bu çalışmada müdahale edilmedi; gerçek kayıt sayısı yeniden sorgulanmadı. | **Giderildi.** Eski satırın içerik parmak iziyle hedeflenen kapatma eklendi. İçerik kalıcı geçmişe aktarılır; onay durumu bilinmiyor olarak saklanır. Seçimler salt okunur. |
| Y3 — kapatma arayüzü / durum | Doğrulandı. İstemciden DELETE çağrısı yoktu, geçmiş kapalı durumu göstermiyordu. | **Giderildi.** “Onaylamadan kapat” / “Bu eski taramayı kapat” düğmeleri gerçek DELETE akışına bağlıdır. Geçmiş listesi ve ayrıntısı kapatma durumunu gösterir. |
| Y4 — `modelSuggestion` | Doğrulandı. Öneri alanı ve gerekçe uzunluğu kontrol edilmiyordu. | **Biçim doğrulaması giderildi.** İzinli öneri ve en fazla 300 karakter gerekçe doğrulanır. Tarayıcıdan gelen önerinin gerçekten modelden çıktığına dair kriptografik veya sunucu kaynaklı kanıt eklenmedi. |
| Y5 — yanıt kaybı / 409 | Doğrulandı. Tam tekrar denetiminin fotoğraf listesi karşılaştırması her tekrar için eşdeğer değildi; istemci güncel receipt okuyamıyordu. | **Analiz düzeyinde kurtarma eklendi.** Başarısız/çatışan isteğin ardından GET ile durum okunur. Yerel değişiklikler otomatik silinmez; kullanıcı kayıtlı sürümü açıkça açabilir. Oda ve fotoğraf oluşturmanın genel idempotency sorunu N04 olarak açık. |
| Y6 — eski istemci | Doğrulandı. Güvenli ret vardı, yenileme mesajı yoktu. | **API sözleşmesi ve güncel istemci düzeltildi.** `protocol: 2`; eski istek için `client_upgrade_required` ve yenileme açıklaması. Eski JS paketinin yeni mesajı ekrana basacağı garanti edilemez; sunucu daha önce yüklenmiş JS kodunu geriye dönük değiştiremez. Eski sayfa yenilenmelidir. |
| Y7 — hata kaydı / kategori / geçmiş görünümü | Log eksikliği, 300/60 kategori farkı ve hariç tutma görünümü doğrulandı. Gerçek oda adının yazılması ve Tek Eşya yolunun meşruluğu da doğrulandı. | **İlgili eksikler giderildi.** Beklenmeyen hatalar teşhis kodlarıyla loglanır; SQLite yazma çatışması tekrar okunabilir 409'dur. Karar kategorisi 60 karaktere kesilir. Geçmiş kartında nihai seçim önceliklidir. N07'nin yalnızca oda onayındaki kısmı düzeltilmiş sayılır. |

## 3. Sunucudaki aktif çalışma kuralı

İlgili kod: `lib/roomDecisionStore.cjs:32`, `:62` (`begin`), `:82` (`requireActive`), `:86` (`save`), `:120` (`draft`), `:144` (`confirm`).

Yeni `room_scan_heads` tablosu oda başına bir satır tutar:

| Alan | Anlam |
|---|---|
| `room_id` | Odanın kimliği; birincil anahtar ve oda bağlantısı. |
| `generation` | Yeni tarama ayrılırken ve mevcut ayırma serbest bırakılırken ilerleyen sayaç. |
| `session_key` | Henüz analizi kaydedilmemiş olsa bile odayı kullanmasına izin verilen tarama. Kapalıysa NULL. |

Yeni analiz POST'u kendi başına aktif çalışma açamaz. Önce `begin` yapılmış olmalıdır. `begin` isteği, istemcinin okuduğu `expectedGeneration` değerini taşır. Oda arada değişmişse istek 409 alır. Aynı, hâlâ aktif ayırmanın tekrarı yazmadan güncel sonucu döndürür. Başka açık çalışma varsa ayrıca `replace: true` gerekir.

Yeni çalışma için değişim ve eski analizin kapatılması aynı transaction içindedir. Mevcut analizin POST/PATCH/ilk PUT isteği ancak kendi aktif satırı mevcutsa kabul edilir. Sadece head'in bulunması, eski analiz kaydını yeniden oluşturmak için yeterli değildir. `room_scans` silinmişse eski mevcut analiz tekrar aktifleşemez.

Onaylanmış analizin tekrar PUT isteği önce kayıtlı onay sonucuna bakar. Yeni bir tarama açık olsa bile bu tekrar sadece eski onayın sonucunu ve güncel toplamları döndürür. Yeni taramaya dokunmaz. Eski DELETE yalnızca hedef analizle eşleşen aktif satırı ve ayırmayı kapatabilir.

**Yeniden üretme/regresyon:** A için begin yap, B'yi açıkça onun yerine ayırıp kaydet, ardından A'nın ilk POST'unu gönder: `scan_not_active`, B değişmez. Mevcut A'nın aktif satırını geçici test DB'sinde kaldır ve A'yı güncelle: yine `scan_not_active`. B ile yer değiştirmiş A'yı onaylamaya çalış: `analysis_closed`.

Bu, B13/N02'nin sunucuya ulaşmış eski kayıt isteğiyle ilgili zorunlu alt parçasıdır. Bütün istemci fotoğraf/oda/sohbet oturum mimarisi bu görevde yeniden yazılmadı.

## 4. Kapatma, devam ve yeni tarama

İlgili kod: `app/page.js:310` (`reserveRoomScan`), `:323` (`startRoomScanInRoom`), `:364` (`closeRoomScan`), `:550` (`resumeRoomScan`); store `retire`, `closeLegacy`, `close`.

### Önce

- Yeni taramanın ilk kaydı mevcut aktif çalışmayı sessizce değiştirebiliyordu.
- Kullanıcı kaydedilmiş taramayı açıkça kapatamıyordu.
- Eski bağlantısız kayıtta düzenlenebilir seçimler, çalışmayan kaydetme ve tekrar deneme mesajları vardı.

### Şimdi

- Oda ekranındaki “Taramaya Devam Et” kayıtlı taslak seçimlerini ve receipt'i geri yükler.
- “Oda Taraması Yap” önce güncel sunucu durumunu okur. Açık çalışma varsa yeni taramayla eski çalışmanın kapatılacağı açıklanır; kullanıcı iptal edip mevcut çalışmaya devam edebilir.
- Oda seçilmeden hazırlanmış analiz bir odaya kaydedilirken de aynı ayırma kontrolü fotoğraf yükleme ve analiz kaydından önce yapılır.
- Kayıtlı taramada “Onaylamadan kapat” vardır. Kayıtlı analiz ve sohbet korunur; kaydedilmemiş seçimlerin saklanmayacağı açıklanır. Karar, puan ve sayaç oluşturulmaz.
- Kapatılmış yeni çalışma geçmişte **“Onaylanmadan kapatıldı.”** görünür.
- Bağlantısız eski çalışma **“Bu eski taramayı kapat”** ile kapatılır. Onay ve seçim düzenleme açık değildir.
- Başka sekme arada çalışma başlatırsa eski nesille yeni tarama açma isteği çatışır; sessizce üzerine yazılmaz.

Analiz henüz oluşmadan ayrılmış bir oturumda geri yüklenecek analiz/sohbet yoktur. Bu durumda sonraki yeni tarama girişimi yine açık çalışma uyarısından geçer. Galerideki fotoğraflar bu işlemle silinmez.

### Eski bağlantısız kaydın korunması

`closeLegacy`, mevcut eski `room_scans` satırının SHA-256 parmak izini ve oda neslini eşleştirir. Güncel satır farklıysa reddeder. Eşleşen satırın eşyaları, sohbeti ve tarihleri kalıcı `room_analyses` kaydına aktarılır; ardından aktif işaret kaldırılır. `suggestions_json` ve `final_items_json` uydurulmaz. `close_reason='legacy_unknown'` kullanılır.

Fotoğraf eşleştirmesi tahmin edilmez: bağlantısız eski snapshot için `photo_ids_json=[]` kalır. Odanın fotoğraf kayıtları ve dosyaları galeride korunur. Bu boş liste “oda fotoğrafsızdı” iddiası değildir.

Kullanıcı geçmişte **“Eski tarama kapatıldı — onay durumu bilinmiyor”** görür. Geciken eski kapatma isteği, daha sonra açılan B taramasını kapatamaz. Bu yolun testinde sohbet içeriği, bilinmeyen kaynak durumu ve karar sayısının sıfır olması kontrol edilir.

## 5. Öneri, taslak ve nihai karar

İlgili kod: `lib/anthropic.js:320` (`validRoomItems`), `lib/roomItemSources.cjs:16` (`suggestionLabel`), `lib/db.js:484` (`getRoomAnalyses`), `app/page.js:2420` (`RoomReviewView`).

- `suggestions_json`: bilinen eşyanın ilk kayıtta gönderilen önerisi. Sonraki seçimler bu alanı değiştirmez.
- `draft_items_json`: kaydedilmiş, henüz onay anlamına gelmeyen seçimler.
- `final_items_json` ve `confirmation_json`: açık onay transaction'ının sonucu.
- `items_json`: son analiz snapshot'ı; tek başına özgün model kaynağı olarak yorumlanmaz.
- `closed` ve yeni `close_reason`: kapatma durumu; gerçekleşmiş eylem değildir.

Örnek: İlk öneri Sat → kullanıcı Tut seçer → taslağı kaydeder → onaylar. Geçmişte ilk öneri Sat, nihai karar Tut kalır. Onay yoksa kayıtlı taslak Tut ayrı gösterilir. Nihai hariç tutma kartın soluk görünümünü de belirler.

Eski önerinin özgün kaynağı yoksa eldeki öneri kaybolmaz: **“Kayıtlı son öneri — özgün kaynağı doğrulanamıyor: Tut”** gibi gösterilir. Eski kayıtların NULL `suggestions_json` alanına tahmini kaynak yazılmaz. Onay geçmişi belirsiz açık eski taramanın yeniden onayı güvenlik nedeniyle kapalıdır; kapatma ve yeni tarama yolu vardır.

`modelSuggestion` mevcutsa öneri izinli enum'dan, gerekçe metin ve en fazla 300 karakter olmalıdır. Eksik/NULL alan eski kayıtlarla uyumludur. Bu biçim kontrolü, ilk POST'taki verinin model kaynaklı olduğunu kanıtlamaz. Kendi verisini değiştiren bir istemci ilk öneriyi hâlâ taklit edebilir. Daha güçlü kaynak garantisi model yanıtının sunucuda doğrudan saklanmasını gerektirir; bu fazda yapılmadı.

“Bağışla” bir karardır; bağış işleminin gerçekleştiği anlamına gelmez. Eylem takip sistemi eklenmedi.

## 6. API ve kayıt kurtarma

İlgili kod: `app/api/rooms/[id]/scan/route.js:8`, `lib/roomScanClient.cjs`, `app/page.js:336`, `:345`, `:459`, `:600`, `:1050`.

| İstek | Sözleşme |
|---|---|
| GET `/api/rooms/:id/scan?sessionKey=...` | Oda nesli, aktif hedef, eski satır token'ı ve istenen analizin receipt/içerik/onay/kapatma durumu. Sahiplik gerekir. |
| POST `action: begin` | `protocol:2`, `sessionKey`, `expectedGeneration`, gerektiğinde açık `replace:true`. |
| POST analiz | `protocol:2`, `sessionKey`, `revision`, `items`, `messages`, `photoIds`; önceden ayrılmış aktif oturuma yazar. |
| PATCH | `protocol:2`, `analysisId`, `revision`, tam `choices` listesi. Kaynak öneriyi yazmaz. |
| PUT | `protocol:2`, `analysisId`, `revision`; tek transaction ve tekrar güvenli onay. |
| DELETE bağlantılı | `protocol:2`, `analysisId`, `revision`; hedefe bağlı kapatma. |
| DELETE bağlantısız eski | `protocol:2`, `orphanToken`, `expectedGeneration`; bilinmeyen durumla arşivleme. |

Bir POST/PATCH/PUT yanıtı kaybolduğunda veya 409 döndüğünde istemci aynı oturum anahtarını GET ile yeniden okur. GET de başarısızsa hata görünür kalır; kayıt başarılıymış gibi işaretlenmez. Sunucudaki sürüm bulunursa “Sunucudaki kaydı aç” gösterilir. Yerel kaydedilmemiş değişiklikler kullanıcı seçmeden değiştirilmez. Kayıtlı sürümü açarken hangi değişikliklerin yerine geçeceği açıklanır. Onaylanmış veya kapatılmış oturum düzenleme için yeniden açılmaz; odaya dönülür.

Sunucunun tam POST tekrarı optimizasyonu hâlâ içerik/fotoğraf listesi eşitliğine bağlıdır. Farklı fotoğraf listesi nedeniyle 409 oluşması artık görünmez çıkmaz değildir: kayıtlı sürüm okunabilir. Bu, aynı fotoğrafın iki kez yüklenmesini önleyen bir idempotency sistemi değildir.

Eksik/eski protokole 409 `client_upgrade_required` ve sayfayı yenileme mesajı verilir. Eski `/api/decide` `source:'oda'` yolu da bu açıklamayı verir. `source:'tekli'` ve `roomId` meşru Tek Eşya akışı olarak kalır; bütün oda bağlantılı karar girişlerinin kapatıldığı iddia edilmez.

Beklenmeyen hatalar işlem, oda kimliği ve hata koduyla loglanır; istek gövdesi/sohbet/fotoğraf loglanmaz. `SQLITE_BUSY*` 409 `retry_conflict` döndürür; diğer beklenmeyen hatalar 500'dür.

## 7. Değiştirilen dosyalar

Bu tamamlama çalışmasında düzenlenenler:

- `lib/roomDecisionStore.cjs`: aktif çalışma nesli, ayırma/değiştirme, kapatma/arşivleme, durum okuma, aktif hedef denetimleri, kategori sınırı, migration kilidi.
- `lib/roomScanClient.cjs` — yeni: sürümlü yazma, güncel durumu okuma ve hata açıklaması.
- `lib/roomItemSources.cjs`: eski kaynağı belirsiz önerinin görünürlüğü.
- `lib/anthropic.js`: öneri alanı biçim doğrulaması; ücretli çağrı yapılmadı, karakter dosyası değiştirilmedi.
- `lib/db.js`: oda durumunu ve kapatma bilgisini dışarı verme; şema kurulumunda eşzamanlılık koruması.
- `app/api/rooms/[id]/scan/route.js`: GET, begin/legacy close yönlendirmesi, protokol kontrolü, hata teşhisi.
- `app/api/decide/route.js`: eski oda onayı için yenileme mesajı.
- `app/page.js`: ayırma, açık çalışma seçimi, kapatma, kurtarma, salt okunur eski seçimler, kaynak ve kapatma gösterimi.
- `tests/room-decisions.test.cjs`: gerçek veri katmanı ve gerçek route doğrulayıcılarıyla genişletilmiş regresyonlar.
- `tests/room-history-ui.test.cjs`: gerçek seçenek düğmeleri, durumlar, kaynaklar ve nihai hariç tutma görünümü.
- `tests/room-client.test.cjs` — yeni: gerçek Page fonksiyonlarının sahte fetch ile davranış testleri.
- `tests/build-isolated.cjs` — yeni: gerçek veri/kimlik bilgilerini kopyalamayan geçici üretim derlemesi.
- Bu rapor.

Önceden var olan `npm test` komutu ve `tests/syntax.test.cjs` korundu. Başlangıçta zaten değiştirilmiş olan auth, proxy, genel stiller, kütüphane, diğer API ve bileşen çalışmalarına müdahale edilmedi. Untracked dosyalar hâlâ untracked; Git staging yapılmadı.

## 8. Derlemede bulunan ilave şema yarışı

İlk izole derleme başarılıydı. Sonraki derlemede 11 Next işçisinden birkaçı aynı boş DB'nin `decisions.room` sütununu aynı anda eklemeye çalıştı: `duplicate column name: room`. Bu, Claude'un olasılık olarak belirttiği migration yarışını somut olarak doğruladı.

`lib/db.js:16` içinde mevcut şema kurma ve sütun kontrol/ekleme bloğu `db.transaction(...).immediate()` içine alındı. Store'un ek sütunları da kontrol edilmeden önce aynı tür kilit alınır (`lib/roomDecisionStore.cjs:4`). Böylece sonraki işçi ilk işçinin şemasını kontrol eder. Şema içeriği değiştirilerek eski veri uydurulmadı; işlem sınırı değişti.

Bu dar düzeltme Faz 2 oturum mimarisini genişletmez. Dört gerçek worker ve aynı geçici dosyaya ayrı SQLite bağlantılarıyla eşzamanlı boş şema kurulumu kalıcı teste eklendi. Test başarılı; ardından son izole üretim derlemesi de başarılı oldu.

## 9. Gerçekten çalıştırılan testler

### `npm test`

Son sonuç: **45/45 başarılı**. Test başlıkları konsolda ayrı ayrı raporlanır. Kapsam:

1. A'nın gecikmiş ilk POST'u B'yi değiştiremez.
2. Aktif satırsız eski analiz yeniden etkinleşemez.
3. Açık çalışma, açık replace ve güncel nesil olmadan değiştirilemez.
4. Onaylamadan kapatma analiz/sohbet/fotoğraf bağlantısı payload'ını korur; karar ve puan üretmez.
5. Eski bağlantısız satır bilinmeyen onay durumuyla arşivlenir; geciken kapatma B'ye dokunmaz.
6. Kapatılmış analize geç POST/PUT reddedilir.
7. POST gerçek `validRoomItems` ve `validRoomScanMessages` ile çalışır; hatalı öneri/gerekçe/sohbet reddedilir. PATCH gerçek store seçim denetimlerini çalıştırır; null ve geçersiz seçim reddedilir.
8. İki ayrı SQLite bağlantısının transaction'ları çakıştırılır: A okur, B onaylayıp commit eder, A'nın yazması `SQLITE_BUSY_SNAPSHOT` ile geri alınır. A tekrarında replay alır. Sonuç: 1 karar, 5 puan, sayaç 1. Bu deterministik iç içe zamanlama testi, yüksek yük ölçümü değildir.
9. Yanıtı kaybolmuş POST/PATCH/PUT ve tam tekrarlar; güncel toplamlarla eski onay replay'i.
10. İlk öneri Sat, taslak/nihai Tut; sohbet sonrası kaynak korunur; eski bilinmeyen öneri görünür.
11. Gerçek istemci fonksiyonlarında bekleyen POST/PATCH sırasında onay gönderilmez; onay en son revision'ı kullanır.
12. İstemci 409 sonrasında yerel Tut seçimini sessizce silmez; kullanıcı kayıtlı sürümü açınca server Sat seçimi ve revision geri gelir.
13. Gecikmiş istemci yanıtı/ayırma okuması farklı oturuma uygulanmaz.
14. Kayıtlı taramaya dönüş gerçek `resumeRoomScan` fonksiyonunu çalıştırır.
15. Eski şema, legacy kayıtlar, sahiplik, boş onay, kategori sınırı, hata logları, transaction rollback ve tekrarlanabilir migration.
16. Dört işçinin eşzamanlı şema kurulumu.
17. Gerçek React bileşeninin statik çıktısında kaynak/kapatma metinleri ve seçim düğmelerinin kilitleri.
18. SWC sözdizimi kontrolü.

Test düzeneği: DB testleri `lib/db.js` içindeki gerçek şema/fonksiyonları çalıştırır; yalnızca bağlantı bootstrap'ı geçici DB ile değiştirilir ve import/export sözdizimi VM için uyarlanır. AI doğrulayıcılarının gerçek fonksiyon gövdeleri alınır; `()=>true` stub'ları kaldırıldı. İstemci testleri gerçek Page fonksiyonlarını kontrollü state setter ve fetch ile çalıştırır. Bunlar tam tarayıcı testi değildir. Modül paketleme/alias/CJS uyumu ayrıca gerçek Next derlemesiyle kontrol edildi.

### İzole üretim derlemesi

Komut: `node tests/build-isolated.cjs`. Script geçici kopyada `next build --webpack` çalıştırır. Next.js 16.3.5 ile **son çalıştırma başarılı**; 18 statik sayfa üretildi, dinamik rotalar paketlendi.

- Yalnızca uygulama kaynakları, public dosyalar, bilgi kütüphanesi ve yapılandırmalar kopyalanır.
- Gerçek `data`, `.env.local`, `.git`, `.next` kopyalanmaz.
- Bağımlılıklar junction ile kullanılır; yeni paket kurulmaz.
- Ortam değişkenleri izinli işletim sistemi değişkenleriyle sınırlandırılır; gerçek API anahtarı taşınmaz. Dummy anahtarlar kullanılır, fetch engellenir.
- DB ve migration yalnızca geçici kopyanın boş `data` dizininde oluşur.
- Gerçek `app.db`, `app.db-wal`, `app.db-shm` SHA-256 özetleri derleme öncesi/sonrası aynıdır.
- Geçici junction ve klasör kontrol edilen geçici kök altında temizlenir; mevcut kullanıcı/test verisi temizlenmez.

Çalıştırma sırasında Windows sandbox `EPERM lstat C:\projects` nedeniyle Node test/derleme başlatamadı; gerekli komutlar izinli sandbox dışı çalıştırmayla tamamlandı. İlk build helper denemesinde Windows preload yol kaçışı hatası düzeltildi. Bir sonraki tekrarın ortaya çıkardığı migration hatası yukarıda giderildi. **Son test ve derleme çalıştırmalarında açık başarısızlık yoktur.**

### Çalıştırılmayanlar

- Gerçek kullanıcı DB'sinde migration, yazma, veri temizleme veya oda 5 kapatma işlemi.
- Canlı AI, e-posta veya ücretli servis çağrısı.
- Railway/production kontrolü, commit, push, deploy.
- Tam tarayıcı E2E, mobil yaşam döngüsü, gerçek ağ kesintisi ve beforeunload etkileşimi.
- Yüksek eşzamanlılık/yük performansı testi.
- Varsayılan Turbopack üretim derlemesi; doğrulanan paketleme yolu Webpack'tir.

## 10. Kalan riskler ve Faz 2 sınırı

1. **B01/N01 fotoğraf yarışları:** Onay kimliği korunur; fotoğraf state/ref akışının her durumda doğru model girdisi oluşturduğu garanti edilmez. Bu faz o yarışları çözmedi.
2. **B13/N02 genel oturum yarışları:** Sunucu aktif tarama değişimi ve yeni kayıt akışındaki gerekli birkaç istemci guard'ı çözüldü. Diğer fotoğraf/model/oda callback'leri kapsamlı biçimde yeniden tasarlanmadı. Sistemin bütünü oturum yarışlarına karşı tamamen güvenli ilan edilmez.
3. **N04 oda/fotoğraf oluşturma:** Sunucuda oluşmuş oda veya fotoğrafın yanıtı kaybolursa tekrar oluşturma hâlâ mümkündür. Analiz receipt'ini yeniden okumak bunu çözmez. Dosya/oda idempotency anahtarları ayrı çalışma gerektirir.
4. **Öneri kaynağı:** Biçim doğru olabilir ama ilk POST tarayıcıdan gelir. Model kökenini sunucuda doğrulanmış saymayın.
5. **Eski istemci:** Eski sayfalar API tarafından güvenli reddedilir. Eski JS'nin yeni hata metnini gösterebilmesi garantilenmez; yenileme gerekir.
6. **Eski veri:** Bağlantısız analizin fotoğraf ilişkisi veya geçmiş onayı çıkarımla doldurulmadı. Eski, nihai kararsız ve artık aktif olmayan analizlerin geçmişine toplu “kapatıldı” backfill'i yapılmadı.
7. **N07 oda etiketi:** Oda onayı gerçek oda adını yazar; serbest isimleri kanonik oda sınıflarına dönüştüren genel çözüm yapılmadı.

## 11. Teslimat durumu

Faz 1 tamamlama kodu, kalıcı regresyonlar ve bu rapor çalışma ağacındadır. Commit/deploy yapılmadı. Karakter Dosyası v1 ve gerçek kullanıcı kayıtları değiştirilmedi.

Gelecekte commit hazırlanırken mevcut karışık çalışma ağacı ayrıca gözden geçirilmeli; özellikle henüz Git tarafından izlenmeyen `lib/roomDecisionStore.cjs`, `lib/roomItemSources.cjs`, `lib/roomScanClient.cjs` ve `tests/` import bağımlılıkları eksik bırakılmamalıdır. Bu rapor commit veya production dağıtımı yapıldığı anlamına gelmez.
