# Faz 2 — Fotoğraf ve oturum bütünlüğü

**Tarih:** 24 Eylül 2026
**Proje:** `C:\projects\1_ODA_1_KARAR`, `668a1ef` üzerindeki commit edilmemiş çalışma ağacı
**Uygulayan:** Claude Code. Codex, Faz 2'nin büyük kısmını kullanım limitine takılmadan önce yazmıştı. Bu oturumda o iş devralındı, doğrulandı ve kalan açıklar kapatıldı.
**Kapsam:** B01, N01, B13, N02, N04. Faz 1 korumaları (atomik ve idempotent onay, analiz kimliği, revision, aktif tarama nesli, taslak seçimler, özgün Sestia önerisi) değiştirilmedi.

## 0. Sonuç

- **Codex'in yarım kalan Faz 2 çalışması çalışma ağacında vardı ve büyük ölçüde doğruydu.** Başlangıçta `npm test` 69/69 geçiyordu. Sunucudaki N04 idempotency katmanı (`lib/creationStore.cjs`), istemcideki fotoğraf ve oturum korumaları ve bunların testleri mevcuttu.
- **Kalan gerçek hata N04'teydi.** Oda oluşturma ve galeri fotoğrafı yükleme sunucuda başarılı olup yanıt geldiğinde, kullanıcı bu sırada başka ekrana geçmişse istemci işlemi "sonucu bilinmiyor" olarak tutmaya devam ediyordu. Kalıcı 4xx reddinde de işlem anahtarı hiç bırakılmıyordu. Bu iki durum düzeltildi.
- **Son durum:** `npm test` **72/72 geçti**, 0 başarısız, 0 atlanan. İzole üretim derlemesi başarılı. Gerçek `app.db`, `-wal` ve `-shm` dosyalarının özetleri derleme öncesi ve sonrasında aynı.
- Commit, push, deploy, ücretli AI çağrısı, gerçek veritabanında migration ya da yazma yapılmadı.

## 1. Başlangıç durumu

`git status` ve dosya zaman damgaları incelendi. Faz 1 tamamlama raporunun (22:22) ardından şu dosyalar değişmişti ya da oluşturulmuştu:

| Dosya | Faz 2 içeriği |
|---|---|
| `lib/creationStore.cjs` (yeni, izlenmiyor) | Oda ve fotoğraf oluşturma için `creation_operations` tablosu. Sahip + tür + işlem anahtarı birlikte tekil. İçerik özeti tutuluyor. Tekrar gelen istek ilk sonucu döndürüyor. |
| `lib/db.js:696` | `creations` export'u. |
| `app/api/rooms/route.js`, `app/api/rooms/[id]/photos/route.js` | `operationKey` zorunlu. `sessionKey` ile aktif tarama kontrolü yapılıyor. |
| `app/page.js` | Ref ve state'i birlikte güncelleyen tek yol (`updateRoomPhotos`). Oturum bağlamı (`roomContext` / `isRoomContext`). Fotoğraf sürümü ve kapsam isteğinin iptali. Analiz girdisi için sabit snapshot. İşlem anahtarlarıyla tekrar deneme. |
| `tests/room-client.test.cjs`, `tests/room-decisions.test.cjs` | B01/N01/N02/N04 regresyonları. |

Yarım kalmış, derlenmeyen ya da testi kırık bir değişiklik bulunmadı. Mevcut bütün iş korundu.

## 2. Bulgu bazında doğrulama

Her madde güncel koddan ve testlerin gerçekte neyi çalıştırdığına bakılarak kontrol edildi.

### B01 — Fotoğraf state/ref yarışları: **giderilmiş (Codex)**

- `updateRoomPhotos` (`app/page.js:456`): Değişiklik her zaman güncel `roomPhotosRef` üzerinden hesaplanıyor, ardından ref ve state aynı değere ayarlanıyor. Eski closure dizisiyle üzerine yazma artık yok.
- `addRoomPhotos` (`:919`): Kapasite, sıkıştırmadan **önce** ayrılıyor. Sıkıştırma bittiğinde fotoğraf yalnızca hâlâ listede ve aynı oturumdaysa güncelleniyor. Kaldırılmış bir fotoğraf geri gelmiyor.
- `persistNewRoomScanPhotos` (`:471`): Yükleme sonucu yalnızca kendi `id`'sine `map` ile yazılıyor. Aynı fotoğrafın eşzamanlı yüklemeleri `roomUploadsRef` üzerinden tek isteğe indiriliyor.
- Testler: A fotoğrafının yüklemesi B sıkıştırılırken tamamlanıyor ve `photoId` kaybolmuyor. Bekleyen sıkıştırma kapasiteyi ayırıyor. Kaldırılan fotoğraf geri gelmiyor. Eski oturumun sıkıştırması yeni state'e yazamıyor.

### N01 — Eski kapsam yanıtı, analiz/fotoğraf uyumsuzluğu: **giderilmiş (Codex)**

- `checkRoomPhotoCoverage` (`:955`): İstek bir `AbortController`, oturum bağlamı ve `roomPhotoVersionRef` sürümüne bağlı. Fotoğraf eklemek, fotoğraf kaldırmak ya da taramayı sıfırlamak sürümü artırıyor ve isteği iptal ediyor. Eski `sufficient:true` yanıtı analizi başlatamıyor.
- `startRoomAnalysis` (`:985`): Tek analiz kilidi (`roomRequestRef`), yüklemeleri beklemeden önce alınıyor. Modele gönderilen dosyalar ve kaydedilen `photoIds` aynı sıralı snapshot'tan üretiliyor. Yükleme sürerken fotoğraf kaldırılırsa zincir iptal oluyor.
- Sunucu, fotoğraf sırasını koruyor. Yabancı ya da tekrarlanan fotoğraf bağlantısını reddediyor.
- Devam edilen taramada yalnızca analize bağlı fotoğraflar gösteriliyor, galerinin tamamı değil.

### B13 — Eski kaydın yeni sohbeti/analizi ezmesi: **giderilmiş (Faz 1 sunucusu + Codex istemcisi)**

- Sunucu tarafında Faz 1'deki revision kontrolü, eski revision ile gelen yazmayı reddediyor.
- İstemcide `sendRoomChat` (`:1028`), sohbet kilidini kalıcı kayıt bitene kadar tutuyor. Bu süre boyunca seçimler, taslak kaydı, odaya kaydetme ve onay kilitli. Tek bir yazıcı kilidi (`roomWriteRef`) aynı anda yalnızca bir yazmaya izin veriyor. Bu nedenle bir yanıtın "kaydedildi" bayrağını, hâlâ süren başka bir yazma varken açması mümkün değil.
- `saveRoomScanToRoom` (`:556`), içeriği tıklama anında sabitliyor. İşlem boyunca sohbet ve seçimler kilitli. Denetim raporundaki "fotoğraf kaydı beklenirken sohbet yeni sürüm yazar, ardından eski kayıt onu ezer" senaryosu artık oluşamıyor.

### N02 — Terk edilen oturumun yeni oturumu etkilemesi: **giderilmiş (Codex)**

- `goTo` (`:222`), her ekran değişikliğinde `resetRoomScan` çağırıyor. Bu, oturum sayacını ve oturum anahtarını yeniliyor, bekleyen isteği iptal ediyor ve fotoğraf/işlem ref'lerini temizliyor.
- Oturum sınırını aşan her asenkron işlem `isRoomContext` ile tekrar kontrol ediliyor: oda oluşturma, kayıt, yükleme, sohbet, tarama ayırma (begin), oda detayı. Eski yanıt `activeRoomRef`'i, kayıt bayraklarını ya da fotoğrafları değiştiremiyor. `saveRoomScanToRoom`, yakaladığı odayı kullanıyor, daha sonra değişebilecek bir ref'i değil.
- Sunucu tarafında, yerine yenisi geçmiş bir taramaya fotoğraf yüklenirse `scan_not_active` hatası dönüyor. Daha önce tamamlanmış bir yüklemenin tekrarı ise yalnızca ilk sonucu okuyor.

### N04 — Yanıtı kaybolmuş başarılı yazmanın tekrarı: **büyük ölçüde Codex, kalan açık bu oturumda kapatıldı**

**Sunucu (Codex, doğrulandı):** `createCreationStore` (`lib/creationStore.cjs:8`)
- Oda oluşturma: tek bir `IMMEDIATE` transaction içinde işlem kaydı alınıyor, oda oluşturuluyor ve yanıt kaydediliyor.
- Fotoğraf: önce işlem kaydı kalıcı olarak alınıyor, ardından dosya yazımı + satır + yanıt ayrı bir `IMMEDIATE` transaction'da yapılıyor. Dosya adı işlem anahtarından türetiliyor. Bu nedenle çökme ya da DB hatasından sonraki tekrar yeni kopya yaratmıyor, aynı dosyanın üzerine yazıyor.
- Aynı anahtar farklı içerikle gelirse `operation_content_conflict` dönüyor. Anahtarlar sahibe göre ayrılıyor, başka kullanıcının kaynağı ifşa edilmiyor.
- İki gerçek worker süreci aynı oda ve fotoğrafı tek bir kez oluşturuyor.

**İstemci (Codex):** Taramadaki fotoğraflar işlem anahtarı olarak kendi `entry.id` değerlerini kullanıyor. Odasız taramanın oda oluşturması `roomCreateOperationRef` ile, galeri yüklemesi `galleryUploadRef` ile yapılıyor. Sıkıştırılmış baytlar önbelleğe alınıyor, böylece tekrar aynı içeriği gönderiyor.

**Bu oturumda bulunan ve düzeltilen hatalar** (`app/page.js`):

1. **`createRoomAndOpen` (`:258`), tamamlanmış oda oluşturmayı bekliyor sanıyordu.** Yanıt gelmeden kullanıcı listeden çıkarsa, oda sunucuda oluşmasına ve yanıt istemciye ulaşmasına rağmen işlem anahtarı silinmiyordu. Kullanıcı sonraki odasını farklı bir adla açmak istediğinde "Önceki isteğin sonucunu almak için aynı oda adıyla tekrar dene" mesajıyla engelleniyordu. Oda listesi de güncellenmiyordu. **Düzeltme:** Başarılı yanıt geldiğinde anahtar ekrandan bağımsız olarak temizleniyor ve liste güncelleniyor. Odaya yönlendirme yalnızca kullanıcı hâlâ aynı ekrandaysa yapılıyor.
2. **Kalıcı 4xx reddinde anahtar hiç bırakılmıyordu.** Sunucu yazmadan önce reddettiğinde (`name_required`, `operation_key_required`, yetki) kullanıcı, var olmayan bir sonucu beklemeye zorlanıyordu. **Düzeltme:** 4xx yanıtta anahtar bırakılıyor ve genel bir hata mesajı gösteriliyor. Ağ hatası ya da okunamayan yanıtta (sonuç bilinmiyor) anahtar ve ad korunmaya devam ediyor. Aynı düzeltme `saveRoomScanToRoom` içindeki oda oluşturmaya da uygulandı.
3. **`handleRoomPhotoUpload` (`:311`)**, kullanıcı ekrandan ayrıldıktan sonra başarılı olan yüklemeyi silmiyordu. Aynı işlem daha sonra tekrar denemeye aday olarak kalıyordu. **Düzeltme:** Başarılı yanıtta işlem, bağlam kontrolünden önce temizleniyor.

## 3. Eklenen regresyon testleri

`tests/room-client.test.cjs`. Testler gerçek `createRoomAndOpen` ve `handleRoomPhotoUpload` fonksiyonlarını sahte fetch ile çalıştırıyor. Test düzeneğine bu iki fonksiyon ve eksik `setRoomsError` setter'ı eklendi.

| Test | Kapsam |
|---|---|
| N04: kullanıcı listeden ayrılmışken oluşan oda kesinleşir; sonraki oda yeni anahtar alır | Hata 1 |
| N04: sonucu bilinmeyen oda anahtarı ve adı korunur; kalıcı 4xx anahtarı bırakır | Hata 2 |
| N04: ekrandan ayrıldıktan sonra başarılı olan galeri yüklemesi tekrar deneme olarak sunulmaz | Hata 3 |
| N04: başarısız galeri yüklemesi aynı işlem anahtarı ve aynı baytlarla tekrar denenir | Koruma (daha önce test edilmiyordu) |

**Mutasyon kontrolü:** Düzeltmeler geçici olarak geri alındığında ilk üç test başarısız oldu (24/27). Kod geri yüklendiğinde 27/27 geçti.

## 4. Çalıştırılan doğrulamalar

- `npm test`: **72 test, 72 başarılı**, 0 başarısız, 0 atlanan.
- `node tests/build-isolated.cjs`: Next.js 16.3.5 webpack üretim derlemesi başarılı. Kopya kaynak kullanıldı, `data` klasörü boştu, gerçek kimlik bilgisi yoktu, ağ kapalıydı. `Real DB/WAL/SHM fingerprints unchanged.`
- Tarayıcıda uçtan uca test yapılmadı. Değişiklikler, dev server'ın gerçek DB'ye migration uygulayacağı akışlarda ve yalnızca zamanlama yarışlarında gözlenebiliyor. Bu nedenle fonksiyon düzeyinde deterministik testler tercih edildi.

## 5. Değiştirilen dosyalar (bu oturum)

- `app/page.js`: `createRoomAndOpen`, `handleRoomPhotoUpload`, `saveRoomScanToRoom` içindeki oda oluşturma adımı.
- `tests/room-client.test.cjs`: 4 yeni test ve test düzeneği genişletmesi.
- Bu rapor.

Codex'in Faz 2 dosyalarına bu düzeltmeler dışında dokunulmadı. Git staging yapılmadı. Yeni dosyalar hâlâ izlenmiyor (`lib/creationStore.cjs` dahil). Commit hazırlanırken bu dosyalar eklenmezse derleme bozulur.

## 6. Kalan riskler

1. **Tek Eşya kararının tekrarı:** `/api/decide` `source:'tekli'` isteğinin yanıtı kaybolur ve kullanıcı tekrar onaylarsa ikinci bir karar yazılabilir. Bu, N04'ün oda/fotoğraf kapsamı dışında kaldığı için değiştirilmedi. Ayrı bir idempotency anahtarı gerekiyor.
2. **Sonucu bilinmeyen oda + başka oda seçimi:** Odasız taramada oda oluşturma yanıtı kaybolur ve kullanıcı bu kez mevcut bir odayı seçerse, sunucuda oluşmuş olabilecek boş oda listede kalır. Bu bir kopya değil ama kullanılmayan bir oda bırakır.
3. **Eski istemciler:** `operationKey` göndermeyen, önceden yüklenmiş sayfalar oda/fotoğraf oluştururken 400 alır. Sayfanın yenilenmesi gerekir (Faz 1'deki `protocol:2` ile aynı durum).
4. **`creation_operations` tablosu** süresiz büyür. Temizleme politikası yok.
5. **Migration:** Yeni tablo, `lib/db.js` ilk yüklendiğinde otomatik oluşur. Gerçek yerel DB'de bu oturumda çalıştırılmadı.
6. **Kilide dayalı sıralama:** Aynı oturumda ikinci bir kalıcı kayıt, yazma sürerken çağrılırsa `persistRoomScanIfActive` sessizce atlıyor. Mevcut arayüz kilitleri bu yolu kapatıyor. Gelecekte kilitlerden bağımsız yeni bir yazma girişi eklenirse içerik sürümüne dayalı bir koruma gerekir.
7. **Taramadan kaldırılan fotoğraf** sunucudaki galeriden silinmiyor (B11 politikası, değişmedi).
8. **Özgün öneri kaynağı** hâlâ istemciden gelen POST'a dayanıyor (Faz 1 Y4).
9. **Test sınırı:** İstemci testleri, gerçek Page fonksiyonlarını kontrollü state ve fetch ile çalıştırıyor. Gerçek React render zamanlaması, mobil yaşam döngüsü ve gerçek ağ kesintisi test edilmedi.
