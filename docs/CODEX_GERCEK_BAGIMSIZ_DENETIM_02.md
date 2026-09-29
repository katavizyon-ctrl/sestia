# Bir Oda. Bir Eşya. — Gerçek bağımsız kod denetimi 02

**Tarih:** 24 Eylül 2026 (inceleme 23 Eylül'de başladı).  
**Proje:** `C:\projects\SESTIA`  
**İncelenen temel commit:** `668a1efb5de38d92e3a9de1ba22eaf26c21c3390` üzerindeki mevcut, commit edilmemiş çalışma ağacı.  
**Denetçi:** Değişiklikleri uygulayan Claude Code oturumundan bağımsız Codex incelemesi.

## 1. Sonuç ve kapsam

`CODEX_BAGIMSIZ_KOD_DENETIMI_01.md` baştan sona okundu; bulguları sonuç olarak kabul edilmedi. Güncel fonksiyonlar, istemci–sunucu işlem sırası ve yerel verinin sınırlı salt okunur sorgusu esas alındı.

**Mevcut değişiklikler veri bütünlüğü açısından henüz hazır değil.** B15 mükerrer karar riskidir ve önceki rapordaki düşük–orta seviyeden daha önemlidir. B13 yalnızca son cevabın görünmesi değildir: daha yeni sohbetin kalıcı kaydını eski sürümle değiştirebilir; tamamlanmamış kayıt varken onayı açabilir. Bunlara ek olarak eski kapsam yanıtının yeni oturumda analiz başlatması, gecikmiş oda kaydının aktif oda bağlamını değiştirmesi ve eski bir DELETE isteğinin yeni taramayı kapatması bulundu.

B01'deki eski state üzerine yazma bağımsız olarak doğrulandı. B02'nin **bugünkü fotoğraf sayıları** doğrulandı; “boş bağ kesin doğrudur, geçmişte hiç fotoğraf yoktu, kullanıcı verisinde hata izi yok” şeklindeki daha geniş tarihsel sonuç doğrulanamaz.

### Sınırlar

- Uygulama kodu, kaynak raporlar ve kullanıcı kayıtları değiştirilmedi.
- Ücretli API, uygulama sunucusu, e-posta, production, commit, deploy ve build kullanılmadı.
- Gerçek veritabanına test kaydı yazılmadı; veri temizlenmedi.
- Tek kalıcı çıktı bu rapordur. Test kodları bellekte çalıştırıldı; ayrı test dosyası oluşturulmadı.
- Gerçek tarayıcı/ağ uçtan uca testi yapılmadı. Aşağıdaki “bellekte doğrulandı” ifadesi, kaynak fonksiyonun alınarak kontrollü Promise, sahte fetch ve state değişkenleriyle çalıştırıldığını anlatır; React'in gerçek render zamanlamasının ölçüldüğü anlamına gelmez.
- Önceki test raporlarının canlı model sonuçları, yedek karşılaştırması ve test dışı kullanıcı verilerinin değişmediği iddiaları bu denetimde yeniden doğrulanmadı.

### Önem ölçeği

**P1:** Kalıcı veri doğruluğunu bozan veya eski oturumun yeni çalışmaya müdahalesine neden olan, giderilmesi öncelikli sorun. **P2:** Koşullu akış kilidi, kayıt/gösterim kaybı veya belirgin işlev hatası. **P3:** Sınırlı metin, sunum veya süreç iyileştirmesi. **Politika:** Teknik arızadan ziyade açık ürün tercihi. P0 düzeyinde doğrulanmış bir bulgu yok; bu, kapsamlı güvenlik güvencesi değildir.

Dosya/satır referansları bu denetimde okunan çalışma ağacına aittir; aralıklar fonksiyon içinde ilgili kanıtı gösterir.

## 2. Claude bulgularının ayrımı

| Sınıf | Bulgular | Açıklama |
|---|---|---|
| Bağımsız doğrulananlar | B01, B03, B05, B06, B07, B08, B09, B10, B12, B14, B15, B16 | B08 editoryal yargı, B09 politika; teknik bulguların etkisi aşağıda ayrı tartıldı. |
| Kısmen doğrulananlar | B02, B04, B11, B13, B17, B18 | Sayılar, bağımlılıklar veya mekanizma doğrulanıyor; tarihsel kesinlik, genelleme, neden açıklaması ya da önem değerlendirmesi aynı şekilde kabul edilmiyor. |
| Yanlış/kanıtsız alt sonuçlar | B02'nin tarihsel kesinliği; B04'te bütün eksik dosyaların derleme hatası sayılması; B11'de ilk tur `idea` alanının daima boş olduğu; B13'te DB'yi son HTTP yanıtının belirlediği; tekrar denemenin her koşulda kopyasız olduğu | Gerekçeler ilgili maddelerde. |
| Yeni bulunanlar | N01–N08 | Oturum, fotoğraf bağlamı, kapatma, yeniden deneme ve tarihçe sorunları. |

## 3. Öncelikli bulgular

### B01 — Sıkıştırma beklenirken tamamlanan yüklemenin kimliği kayboluyor

**Durum:** Doğrulandı; kaynak fonksiyonla bellek içi zamanlama testi. **Önem:** P2; mevcut tarama değişikliği için commit öncesi giderilmeli.

**Yer:** `app/page.js:707–736` / `addRoomPhotos`; `326–347` / `persistNewRoomScanPhotos`; `74` / state→ref effect; `777–803` / `startRoomAnalysis`; `1107` ve `2075` / devam düğmesi.

**Teknik gerekçe:** `addRoomPhotos` render anındaki `roomPhotos` dizisini closure içinde tutuyor. `compressImage` beklenirken A fotoğrafının yüklemesi sonuçlanıyor; yükleme fonksiyonu güncel state ve ref'e `photoId` ekliyor. İkinci eklemenin sıkıştırması tamamlanınca `updated = [...roomPhotos, ...newEntries]` eski A nesnesini tekrar yazıyor. Hem state hem ref güncel kimliği kaybediyor. Sonraki effect bunu düzeltmiyor; eski veri artık state'in de içeriği.

**Çalıştırılan örnek:** Başlangıç A/kimliksiz; B sıkıştırması askıda; A'ya `photoId=101` atanıyor; B çözülüyor. Sonuç `lostPhotoId=true`, `waiting=true`. Gerçek yükleme, AI ve DB kullanılmadı.

**Etki:** Sunucuda kaydedilmiş A istemcide kaydedilmemiş görünür. `uploadFailed` de bulunmadığı için tekrar yükleme düğmesi oluşmaz; devam düğmesi kilitlenir, otomatik analiz en fazla 15 saniye bekleyip hata verir. Veritabanındaki fotoğraf bu işlemle silinmez. Aynı eski dizi yaklaşımı eşzamanlı iki sıkıştırmada yeni eklenen girdinin kaybına veya bu sırada kaldırılan girdinin geri gelmesine de izin verir.

**Yeniden üretim:** Kontrollü sıkıştırma/yükleme Promise'leriyle yukarıdaki sıra; ileride izole tarayıcı testinde oda içinden A yüklenirken B ekleyip A cevabını B sıkıştırması bitmeden teslim etmek. Fotoğraf ekleme kontrolleri kapsam isteği sürerken kilitlenmiyor (`2039–2046`).

**Öneri:** Fotoğraf listesini tek tutarlı güncelleme yoluyla yönet; güncel liste üzerinden ekle, kapasiteyi tamamlanma anında yeniden kontrol et. Eski oturumun sıkıştırma sonucunu reddet. Ref ve state'i birbirinden bağımsız iki güncelleme mantığıyla düzeltmek tek başına bütün yarışları çözmez. Kapsam/analiz için aynı fotoğraf sürümünü sabitle; N01 de ele alınmalı.

### B15 — Karar kaydı idempotent değil; tarama kapatılması ayrı ve sonucu izlenmiyor

**Durum:** Doğrulandı; istemci fonksiyonu bellek testi ve sunucu kod incelemesi. **Önem:** P1.

**Yer:** `app/page.js:897–952` / `confirmRoomDecisions`; `app/api/decide/route.js:16–34` / POST; `lib/db.js:261–303` / `recordDecisions`; `app/api/rooms/[id]/scan/route.js:67–88` / DELETE.

**Teknik gerekçe:** Kararlar önce `/api/decide` ile ekleniyor. İstek, analiz kimliği, oturum anahtarı veya eşya kimliği taşımıyor; sunucu her istekte yeni satır ekleyip puan/sayacı artırıyor. Kararların kendi aralarında transaction içinde olması tekrar işlemeyi engellemiyor. Ardından gönderilen DELETE beklenmiyor; HTTP hata kodu da kontrol edilmiyor, ağ hatası yutuluyor.

**Etki:** DELETE sunucuya ulaşmazsa aktif tarama kalır. Odaya dönüp aynı taramayı onaylamak aynı kararları yeniden ekler, puanı ve karar sayısını şişirir. Ayrıca `/api/decide` sunucuda başarılı olup yanıtı kaybolduğunda ilk ekranda tekrar denemek de aynı problemi yaratır; DELETE başarısızlığı tek tetikleyici değildir. Tek Eşya da aynı endpoint'i anahtarsız kullandığından yanıt kaybına açıktır (`app/page.js:634–670`).

**Çalıştırılan örnek:** Gerçek `confirmRoomDecisions` fonksiyonuna başarılı sahte decide ve başarısız sahte DELETE verildi; aynı tarama iki kez onaylandı, iki decide isteği çıktı. Gerçek DB'ye mükerrer satır yazılmadı; bunun sunucudaki karşılığı `INSERT` ve benzersiz işlem anahtarı bulunmamasından doğrulandı.

**Yeniden üretim:** İzole testte decide commit'inden sonra DELETE'i düşür, taramaya geri dön, onayla. Ayrı senaryoda decide cevabını düşür ve tekrar dene. Beklenti tek karar kümesi/tek puan artışı.

**Öneri:** İstemci aynı işlem için kararlı bir onay anahtarı taşımalı. Sunucu sahipliği doğrulanmış analiz/işlem kimliğiyle kararları, nihai seçimleri ve aktif taramanın kapatılmasını tek transaction içinde tamamlamalı; yinelenen istek önceki sonucu döndürmeli. Yalnızca DELETE'e `await` eklemek yeterli değil: karar kaydı zaten gerçekleşmiş olabilir. N03'teki oturum hedefleme de zorunlu.

### B02 — Üç eski analizde bugünkü fotoğraf sayısı sıfır; tarihsel neden kanıtlanmış değil

**Durum:** Güncel veri bağımsız doğrulandı; tarihsel yorum kısmen/kanıtsız. **Önem:** P3 belge doğruluğu; mevcut veriye müdahale gerektirmiyor.

**Yer:** Yerel `data/app.db`, `room_analyses` ve `room_photos`; görüntüleme `app/page.js:1047–1056` / geçmiş analiz; `lib/db.js:475–492` / `getRoomAnalyses`.

Salt okunur sorgu sonucu:

| Analiz id | Oda id | photo_ids_json | Odanın mevcut fotoğraf sayısı |
|---|---|---|---|
| 1 | 5 | `[]` | 0 |
| 5 | 5 | `[]` | 0 |
| 9 | 8 | `[]` | 0 |

Oda 5 ve 8 kayıtları mevcut. Sayım yalnızca analize bağlı fotoğrafları değil, ilgili odadaki bütün `room_photos` satırlarını kapsıyor.

**Yöntem:** `better-sqlite3` doğrudan `{readonly:true, fileMustExist:true}` ile açıldı; `query_only=ON`. `lib/db.js` import edilmedi; onun açılışındaki şema/migration işlemleri çalıştırılmadı. WAL dikkate alındı; `immutable=1` ile güncel WAL'ı yok sayan bir okuma yapılmadı. `app.db`, `app.db-wal`, `app.db-shm` SHA-256 özetleri okuma öncesi/sonrası aynı çıktı. Sandbox kütüphane çözümlemeyi engellediği için izinli salt okunur komut kullanıldı.

**Düzeltme:** “Bu odalarda şu anda hiç fotoğraf kaydı yok; mevcut veriden güvenilir fotoğraf eşleştirmesi yapılamaz” doğrulanmış sonuçtur. “Hiç fotoğraf olmadı”, “boş bağ doğrudur” ve “K2 kullanıcı verisinde iz bırakmadı” sonuçları mevcut anlık görüntüden çıkarılamaz. Fotoğrafların hiç yüklenmemesi, daha sonra silinmesi veya kaydının başarısız olması bu sorguyla ayrıştırılamaz. Diğer eski analizlerin nasıl düzeldiğine ilişkin sohbet/closure açıklaması da olasılıktır.

**Yeniden üretim:** `SELECT a.id,a.room_id,a.photo_ids_json,(SELECT COUNT(*) FROM room_photos p WHERE p.room_id=a.room_id) FROM room_analyses a WHERE a.id IN (1,5,9);`

**Öneri:** Veri aynen kalmalı; tahmini bağ kurulması için kanıt yok. Eski rapordaki nedensel iddia, yeni raporda da bunun kesin çürütüldüğü iddiası bu sınırla düzeltilmeli.

### B13 — Eski kayıt yeni sohbeti ezebilir; kayıt başarı bayrağı eşzamanlı işlemleri temsil etmiyor

**Durum:** Mekanizma doğrulandı; önceki neden/önem açıklaması düzeltiliyor. **Önem:** P1.

**Yer:** `app/page.js:404–445` / `saveRoomScanToRoom`, özellikle `435`; `845–885` / `sendRoomChat`, özellikle `877`; `373–395` / `persistRoomScanIfActive`; `2349–2350`, `2432`, `2448` / kontroller; `lib/db.js:448–455` / koşulsuz upsert.

**Teknik gerekçe:** Odaya kaydetme, çağrıldığı render'ın `roomItems`/`roomMessages` değerlerini tutuyor. Fotoğraf yüklemesini beklerken sohbet yanıtı yeni değerler üretebilir ve ayrı kayıt başlatabilir. Eski kaydetme daha sonra eski içerikle aynı `sessionKey`'i yazar. Sunucuda içerik sürümü kontrolü yok. Her kayıt yanıtı bağımsız olarak `roomScanSaved=true`, `roomScanSaving=false` yapıyor; başka istek hâlâ sürse bile.

**Önemli ayrım:** Kalıcı veriyi son HTTP yanıtı değil, son yürütülen SQL güncellemesi belirler. HTTP yanıtlarının sırası ise istemcinin hata/başarı bayraklarını etkiler. Eski rapor bu iki sırayı karıştırıyor.

**Çalıştırılan örnek:** İki gerçek `persistRoomScanIfActive` çağrısı sahte fetch üzerinde başlatıldı; yalnızca ilkinin yanıtı tamamlandığında ikinci hâlâ beklerken `saved=true`, `saving=false` oldu.

**Etki:** Son sohbet kaybolabilir; arayüz daha yeni içeriği kayıtlı sanabilir. Kapatma sonrası gelen POST aktif taramayı tekrar oluşturabilir; B15'i de tetikleyebilir.

**Yeniden üretim:** Odasız analizde fotoğraf kaydını beklet, sohbet yanıtını tamamlayıp yeni sürümü kaydet, eski kaydetme akışını devam ettir. Ayrı testte iki kayıt yanıtını ters sırayla tamamla.

**Öneri:** Oturum başına kayıt sıralaması, içerik revision'ı ve son revision için başarı durumu kullanılmalı. Sunucu eski revision'ı reddetmeli; onay belirli kaydedilmiş revision'ı hedeflemeli. Kaydetme/sohbet kontrollerinin koordinasyonu da gerekli.

## 4. B03–B18'in kalan değerlendirmeleri

### B03 — Giriş e-postasında kanıtsız süreklilik

**Durum/önem:** Doğrulandı, P3. **Yer:** `lib/auth.js:24–57` / `sendVerificationRequest`, özellikle `41`. Aynı HTML ilk kullanıcıya da “kaldığın yerden devam” diyor; içerikte ilk giriş ayrımı yok. **Etki:** Yeni kullanıcı veya geçmişi taşınmamış misafir yanlış beklenti edinebilir. **Üretim:** Gönderim işlevinin ilk ve tekrar giriş için aynı metni üretmesini incele; e-posta göndermek gerekmez. **Öneri:** Nötr giriş cümlesi veya gerçekten bilinen duruma göre metin. Veri bütünlüğü sorunlarından önce ele alınması gerekmiyor.

### B04 — Eksik commit bağımlılıkları

**Durum/önem:** Kısmen doğrulandı, P2 teslimat riski. **Yer:** `lib/db.js:5`, `lib/anthropic.js:3`, `app/page.js` / `KesifView` içindeki `/api/sestia-chat` çağrısı; Git index. `lib/sestiaLibrary.js` ve sohbet rotası takip dışı. **Gerekçe/etki:** Import edilen kütüphane eksik commit edilirse derleme bozulabilir. API rotasının eksikliği ise zorunlu olarak derleme hatası değil, çalışma anında 404 üretir. **Üretim:** `git ls-files` çıktısında iki yol yok; import ve fetch tüketicileri mevcut. **Öneri:** Commit içeriğinin gerekli kaynakları kapsadığını temiz checkout ile doğrula. Bütün görsel/PDF arşivlerinin commit edilmesi teknik zorunluluk değil.

### B05 — Yarım kayıt oda/fotoğraf bırakıyor

**Durum/önem:** Doğrulandı, P2. **Yer:** `app/page.js:411–437` / `saveRoomScanToRoom`; `197–206` / `goTo`; `lib/db.js:308–310` / `createRoom`. **Gerekçe:** Oda ve fotoğraflar analizden önce kalıcı; hata/çıkışta geri alma veya taslak durumu yok. **Etki:** Analizi olmayan oda/fotoğraflar kalır; boş oda gerçek çalışma sayıldığı için ana ekran davranışı değişebilir. Bu SQL açısından sahipsiz yabancı anahtar kaydı değil, ürün açısından yarım çalışmadır. **Üretim:** Oda başarılı → fotoğraf/analiz başarısız → çık. **Öneri:** Açık taslak/devam durumu ve kurtarma; kullanıcı verisini otomatik silmeyi varsayılan çözüm yapma. N04 yeniden deneme riskini de kapsamalı.

### B06 — Tek soru filtresi kısmi

**Durum/önem:** Doğrulandı, P3. **Yer:** `app/page.js:2219–2223` / `joinReplyAndQuestion`. **Gerekçe:** Yalnızca sondaki `?` kontrol ediliyor. **Etki/üretim:** Bellek testinde `Neden? Bir fikir.` + `Hangisi?` iki soru döndürdü; kapanış tırnağı da aynı sınırı aşar. **Öneri:** Görev alanlarını net tut; filtreyi kesin bir dil doğrulayıcısı olarak sunma. B12'deki içerik kaybını artıracak kör noktalama silme uygulanmamalı.

### B07 — Kısmi kayıtta üst hata ve panel hatası

**Durum/önem:** Doğrulandı, P3. **Yer:** `app/page.js:347,392,431,437`, `2326`, `2428–2445` / kayıt işlevleri ve `RoomReviewView`. **Gerekçe:** Ayrı hata state'leri aynı hatayı iki yerde gösterebiliyor. Fotoğraf retry düğmesi yalnızca fotoğraf ekranında; incelemede kayıt paneli var. **Etki:** Kullanıcı hangi işlemi tekrarladığını anlayamayabilir, ancak panelin tekrar deneme yolu mevcut. **Üretim:** Odasız kayıt sırasında fotoğraf isteğini başarısız kıl. **Öneri:** Hata adımını tek yerde, doğru eylemle göster; veri sorunlarıyla karıştırılmamalı.

### B08 — “Odasına kaydetme yarım kaldı”

**Durum/önem:** Metin mevcut; editoryal öneri, P3. **Yer:** `app/page.js:2246–2247` / `SaveScanToRoom`. **Etki:** Anlaşılır ama daha doğal kurulabilir; teknik hata değil. **Üretim:** `pendingRoomName` dolu. **Öneri:** “Bu odaya kayıt tamamlanamadı” gibi kısa, kayıt durumunu anlatan metin. Oda oluşturma mı fotoğraf mı analiz mi eksikse mümkünse o adımı belirt.

### B09 — Geçersiz sürümlü ipucu önbelleğine geri dönülmüyor

**Durum/önem:** Doğrulandı, politika/P3. **Yer:** `app/api/inspiration/route.js:22–44` / GET. **Gerekçe:** Sürüm tutmazsa üretime geçiliyor, üretim hatası 500 döndürüyor. **Etki:** Eski içerik yerine hata ekranı; eski yanlış gerçekleşmişlik dilini yeniden göstermemek makul tercih olabilir. **Üretim:** Eski sürüm cache + başarısız sahte üretici. **Öneri:** Bilinçli hata/yeniden deneme politikası belirle; bunu koşulsuz regresyon diye adlandırma. Canlı üretim yapılmadı.

### B10 — “Bir Eşya Daha Tara” aktif odayı koruyor

**Durum/önem:** Doğrulandı, P2 bağlam belirsizliği. **Yer:** `app/page.js:197–206` / `goTo`, `1147` / `onScanAgain`, `645` / `confirmSingleDecision`, `303–309` / `persistPhotosToActiveRoom`. **Gerekçe:** `scan` geçişi odayı temizlemiyor; sonraki karar ve fotoğraf aynı odaya gidiyor. **Etki:** Odasız başlayıp sonradan oda seçen kişi fark etmeden farklı eşyayı bu odaya bağlayabilir; serbest oda etiketi ile gerçek oda id'si ayrışabilir. **Üretim:** Odasız tarama → A'ya kaydet/onayla → başka eşya tara. **Öneri:** Aktif oda açıkça gösterilmeli ve değiştirilebilir olmalı veya yeni genel taramada açıkça sıfırlanmalı. Ürün tercihi belirlenmeden rastgele bağ koparılmamalı.

### B11 — İlk turda soru ve `idea` genellemesi

**Durum/önem:** Kısmen doğrulandı, P3. **Yer:** `lib/anthropic.js:54–58,70,89–91` / görev promptları. Tek Eşya ilk yanıtta soru istiyor. Oda metni “İlk soruyu bu odaya özel sor” diyor; bu “her ilk yanıt zorunlu soru” ile aynı kesinlikte değil. `idea` boşluğu validator tarafından ilk tura göre zorlanmıyor (`313`). **Etki:** Soru ağırlıklı başlangıç oluşabilir; “daima yalnızca soru” kod garantisi değil. **Üretim:** İlk tur için `idea` dolu sahte yanıt doğrulayıcı tarafından kabul edilebilir. **Öneri:** İlk karşılaşma davranışı kullanıcı niyetine göre tarif edilmeli. Kanondaki “her mesaj soruyla bitmez”, tek bir sorulu yanıtın yanlışlığı anlamına gelmez.

### B12 — Eski sohbet sorusunun gösterimde kaybolması

**Durum/önem:** Doğrulandı, P2. **Yer:** `app/page.js:2219–2223,2332–2335` / birleştirme ve geçmiş görünümü. **Etki:** Ayrı ve anlamlı kayıtlı soru, `reply` soru işaretiyle bittiği için tamamen saklanıyor; kullanıcı sonraki cevabının neye karşılık geldiğini göremeyebilir. DB değişmiyor. **Üretim:** Bellek testinde `Neden?` + `Önemli farklı soru?` yalnızca `Neden?` döndürdü. **Öneri:** Tarihî mesajları geriye dönük sessizce eksiltme; yeni yanıtların normalizasyonu ile kayıtlı geçmişi ayır.

### B14 — Yükleme bekleyişi

**Durum/önem:** Doğrulandı, P3. **Yer:** `app/page.js:773,787–798,2075–2076`. **Gerekçe:** Kapsam isteğinin spinner'ı analiz bekleme süresinden önce kapanabiliyor. **Etki:** Kullanıcı kilitli “Fotoğraflar Kaydediliyor...” düğmesini görüyor; tamamen geri bildirimsiz değil. **Üretim:** Kapsam erken başarılı, yükleme 15 saniyeden uzun. **Öneri:** Bekleme ve yeniden deneme durumunu açıklaştır; gerçek kilit B01'den ayrı tut.

### B16 — Taramadan kaldırılan fotoğraf galeride kalıyor

**Durum/önem:** Doğrulandı, politika/P3. **Yer:** `app/page.js:740–746` / `removeRoomPhoto`. **Gerekçe:** Yalnızca yerel diziden çıkartılıp blob URL iptal ediliyor; kalıcı silme yok. **Etki:** Kullanıcı kaldırmayı kalıcı silme sanabilir. **Üretim:** Oda fotoğrafı yüklendikten sonra taramadan kaldır, galeriye dön. **Öneri:** “Bu taramadan çıkar” ile kalıcı silmeyi ayır. Geç gelen kapsam yanıtının kaldırılan fotoğrafı analiz etmesi ise ayrı ve daha ciddi N01 bulgusu.

### B17 — Tekrarlanan karakter/görsel bağlamı ve maliyet

**Durum/önem:** Kısmen doğrulandı, P3. **Yer:** `lib/anthropic.js:20–39,43,76,135,286–300,386–407` / karakter ve çağrılar. Ortak temel her çağrıda sistem metnine ekleniyor; kaynakta açık `cache_control` ayarı yok, oda görselleri takip turlarında yeniden gönderiliyor. **Etki:** İstek yükü artıyor; yaklaşık karakter sayısı gerçek token/fatura ölçümü değil. **Üretim:** Çağrı parametrelerini ağsız incele. **Öneri:** Davranış ve veri düzeldikten sonra ölçülmüş kullanım üzerinden optimizasyon; burada fiyat veya kesin tasarruf iddiası yok.

### B18 — Kalıcı regresyon paketi eksik

**Durum/önem:** İncelenen repo envanteri kapsamında doğrulandı, P2 süreç riski. **Yer:** `package.json:6–10` / scripts; test/spec/lint dosya araması. `dev`, `build`, `start` dışında test/lint komutu ve uygulama test paketi bulunmadı. Önceki geçici testler kalıcı koruma sağlamıyor. **Etki:** B01/B13/B15 gibi deterministik hatalar yeniden gelebilir. **Üretim:** Dosya ve script envanteri. **Öneri:** Özellikle asenkron oturum ve idempotency senaryolarını ağsız testlere dönüştür. Sırf lint eklemek bu hataları çözmez.

## 5. Önceki raporda kaçırılan sorunlar

### N01 — Eski kapsam yanıtı yeni oturumda analiz başlatabiliyor; analiz görselleri ile kayıtlı fotoğraf id'leri ayrışabiliyor

**Durum:** Koddan doğrulandı; geç kapsam callback'i bellekte çalıştırıldı. **Önem:** P1.

**Yer:** `app/page.js:754–774` / `checkRoomPhotoCoverage`, `676–704` / reset, `777–833` / analiz, `379–384` / kalıcı kayıt.

**Gerekçe:** Kapsam fetch'i AbortController'a veya oturum/sürüm kontrolüne bağlı değil. Reset yalnızca `roomRequestRef` içindeki analiz/sohbet isteğini iptal ediyor. Eski kapsam cevabı geldiğinde `startRoomAnalysis(photos)` çağrılıyor; bu fonksiyon eski oturuma ait olduğunu bilmeden **o anki** oturum numarasını artırıp devam ediyor. Yükleme bekleme kontrolü fonksiyon girişinde yakalanan yeni numarayı kontrol ettiği için eski isteği ayırt etmiyor.

Aynı oturumda A için kapsam sürerken B eklenebilir. Eski kapsam A'yı yeterli bulursa analiz A'nın snapshot'ıyla çalışır; kaydetme `roomPhotosRef.current` üzerinden A+B id'lerini toplar. Sahiplik filtresi bunların gerçekten modele gönderildiğini kontrol etmez. Fotoğraf kaldırıldığında da eski snapshot kullanılabilir.

**Etki:** Kullanıcı ana sayfaya döndükten sonra eski analiz ekranı tekrar açılabilir. Yeni odaya geçmişse eski fotoğraftan gelen analiz yeni oda bağlamına yazılabilir. Aynı oda içinde analiz kanıtı olarak gösterilen fotoğraflar gerçek girdi kümesiyle uyuşmayabilir. Gecikmiş ikinci kapsam sonucu tamamlanmış ilk analizi sıfırlayabilir.

**Üretim:** Kapsam isteğini beklet → ana sayfaya çık/yeni oda taraması aç → eski `sufficient:true` yanıtını teslim et. Ayrı senaryo: A kapsamını beklet → B ekle/yükle → A cevabını teslim et; model payload ve POST scan id listesini karşılaştır. Bellek testi eski callback'in hiçbir oturum doğrulaması olmadan eski listeyle analiz çağırdığını gösterdi.

**Öneri:** Kapsam ve sıkıştırma dahil bütün zincire oturum+fotoğraf sürümü taşı; değişince iptal/sonucu yok say. Analize gönderilen dosyalar ve kaydedilecek id'leri tek sabit snapshot'tan üret. Tek analiz başlatma kilidi kullan.

### N02 — Kaydetmeden çıkış sonrası eski işlemler aktif odayı ve yeni kayıt durumunu değiştirebiliyor

**Durum:** Kod ve gerçek fonksiyonun kontrollü bellek testiyle doğrulandı. **Önem:** P1.

**Yer:** `app/page.js:404–445` / `saveRoomScanToRoom`, `326–350` / fotoğraf kaydı, `373–395` / scan kaydı, `2307` / geri düğmesi, `197–206` / gezinme.

**Gerekçe:** Kayıt sürerken geri düğmesi yalnızca `confirming` ile kilitli; `scanSaving` ile değil. Bu üç asenkron işlev oturum kontrolü yapmıyor. Oda oluşturma cevabı döndüğünde `activeRoomRef` koşulsuz eski odaya atanıyor; fotoğraf listesi, oturum anahtarı ve hedef oda ise farklı await sınırlarında güncel ref'lerden okunuyor. Önceki POST yanıtı yeni taramanın `roomScanSaved` bayrağını da true yapabilir.

**Etki:** Eski ve yeni taramanın oda, fotoğraf, içerik ve kaydedildi durumu karışabilir. Eski içerik yanlış odaya gidebilir veya yeni kullanıcı işlemi eski odaya bağlanabilir; bunlar aynı kullanıcıya ait odalar arasında veri bütünlüğü sorunudur.

**Üretim:** A odasını oluşturma yanıtını beklet → geri çık ve B taramasını aç → A yanıtını teslim et. Bellek testinde B olarak değiştirilmiş aktif oda tekrar A oldu; eski item listesi kalıcı kayıt callback'ine taşındı.

**Öneri:** Kayıt başlangıcında oda/oturum/fotoğraf snapshot'ı al; await sonrası oturum kontrol et; UI sonuçlarını yalnızca hâlâ ilgili oturuma uygula. Çıkış politikası ayrıca belirlenmeli. Sunucuda zaten gerçekleşmiş adımların kaybolmadığı kurtarma kimliği tutulmalı.

### N03 — Oda id'sine göre DELETE, başka taramanın nihai seçimini ezip aktif kaydını silebiliyor

**Durum:** Route işlevi sahte veri fonksiyonlarıyla çalıştırılarak doğrulandı. **Önem:** P1.

**Yer:** `app/api/rooms/[id]/scan/route.js:78–87` / DELETE; `lib/db.js:375–383,388–406,467–471`; `app/page.js:935–940`.

**Gerekçe:** DELETE analizi/oturumu hedeflemiyor. Odanın o anki scan satırını okuyup onun `analysisId` değerine istek gövdesindeki finalItems'ı yazıyor, ardından odanın aktif scan'ini siliyor. Aynı odada yeni tarama satırı eskisinin üzerine geçebilir.

**Etki:** A taramasının gecikmiş kapatma isteği, başka sekmede/yeni akışta açılmış B taramasına A'nın seçimlerini yazar ve B'nin devam kaydını kaldırır. Sahiplik kontrolü bunu engellemez; iki tarama da aynı kullanıcı ve odadadır.

**Üretim:** A için DELETE'i beklet → B'nin POST scan kaydını tamamla → A DELETE'ini yürüt. Bellekte gerçek DELETE fonksiyonuna mevcut `analysisId=22` ve eski A item'ı verildi; 22 finalize edildi ve mevcut scan temizlendi.

**Öneri:** Onay/kapatma analizin sabit kimliği ve revision'ıyla yapılmalı. Aktif kayıt yalnızca aynı analizse silinmeli. B15 çözümüyle tek transaction içinde ele al.

### N04 — Yanıt kaybında “Tekrar Dene” yeni oda ve fotoğraf kopyaları yaratabilir

**Durum:** İstemci/sunucu kodundan doğrulandı; gerçek kayıt oluşturulmadı. **Önem:** P2.

**Yer:** `app/page.js:414–426,335–345,428–429`; `app/api/rooms/route.js:20–26`; `lib/db.js:308–310`; `app/api/rooms/[id]/photos/route.js:40–55`.

**Gerekçe:** Kopyasız tekrar deneme yalnızca istemcinin başarı yanıtını aldığı durumda geçerli. Oda sunucuda oluşup cevap kaybolursa ref atanmaz; tekrar yeni oda oluşturur. Fotoğraf sunucuda yazılıp cevap kaybolursa entry `uploadFailed` olur; tekrar POST yeni UUID ve satır üretir. Bu uçlarda istemci işlem kimliği/dedup yok.

**Etki:** Yinelenen oda/fotoğraflar, depolama ve kafa karışıklığı. `sessionKey` yalnızca analiz upsert'ini korur.

**Üretim:** İzole testte server commit'i başarılı kabul edip cevap katmanını düşür; aynı UI tekrarını çalıştır. **Öneri:** Oda oluşturma ve fotoğraf yüklemesine kararlı istemci işlem kimlikleri ve sahiplik kapsamında benzersizlik; yinelenen isteğe aynı sonuç. Başarısı belirsiz isteği doğrudan yeni işlem sayma.

### N05 — Onaylanmamış manuel seçimler, yeni sohbet/kayıt yoksa çıkışta kayboluyor

**Durum:** Koddan doğrulandı. **Önem:** P2.

**Yer:** `app/page.js:889–895` / `toggleRoomExclude`, `setRoomItemRec`; `454–464` / resume; `877` / sohbet sonrası kayıt.

**Gerekçe:** Manuel karar değiştirme/hariç tutma yalnızca React state'ini güncelliyor. Bunların ardından otomatik kalıcı kayıt yok. Son başarılı kayıttan sonra seçim değiştirip çıkılırsa resume eski scan.items'ı okuyor.

**Etki:** Kullanıcı onaylamadan önce yaptığı seçimleri tekrar yapmak zorunda. Özellikle “çalışma kaydedildi” işareti varken beklentiyle çelişiyor. Başka bir sohbet turu kaydedilirse seçimler tesadüfen kalıcı hâle geliyor; davranış tutarsız.

**Üretim:** Analizi kaydet → bir öneriyi değiştir, bir eşyayı hariç tut → sohbet/onay yapmadan çık → taramaya dön. **Öneri:** Kullanıcının taslak seçimlerini ayrı sürümlü state olarak kaydet veya kaydedilmemiş değişikliği açıkça göster; orijinal model önerisiyle birleştirme (N06).

### N06 — Geçmişte “Sestia'nın önerisi” kullanıcının manuel seçimi olabiliyor

**Durum:** Kod ve sahte model yanıtıyla doğrulandı. **Önem:** P2.

**Yer:** `lib/anthropic.js:437–445` / `analyzeRoom` uzlaştırması; `app/page.js:865–877` / `sendRoomChat`; `lib/db.js:450–453` / analiz güncelleme; `app/page.js:2389–2391` / geçmiş gösterimi.

**Gerekçe:** Manuel item, model çıktısı yerine olduğu gibi korunuyor; bu birleşik liste hem yeni assistant messages'a hem `room_analyses.items_json` alanına yazılıyor. Sonra geçmiş görünümü `items.recommendation` değerini “Sestia'nın önerisi” diye sunuyor. Ayrı `final_items_json` bulunması, items_json zaten kullanıcı seçimiyle değiştirilmişse kaynak ayrımını kurtarmıyor.

**Etki:** Kullanıcının AI önerisine itirazı tarihçede görünmez olur; eski model önerisi ile kullanıcı kararı aynıymış gibi gösterilir.

**Üretim:** Model “sat” → kullanıcı “tut” seçer → sohbet gönderir → geçmişi açar. Bellek testinde sahte model “sat” döndürürken manuel “tut” hem sonuç items'ına hem assistant JSON'una yazıldı. **Öneri:** Model önerisini, kullanıcı taslak seçimini ve nihai kararı ayrı alanlarda koru; görünüm doğru kaynağı etiketlesin.

### N07 — Oda taraması kararlarının oda adı haftalık öneriye “Genel” olarak gidiyor

**Durum:** Uçtan uca veri alanı takibiyle koddan doğrulandı. **Önem:** P2.

**Yer:** `app/page.js:909–916` / karar payload'ı; `app/api/decide/route.js:27,30`; `lib/constants.js:7–8`; `lib/db.js:296,521–524`; `lib/anthropic.js:130–132`.

**Gerekçe:** Oda kararları `roomId` gönderiyor ama `room` göndermiyor. API `room` için DEFAULT_ROOM=`Genel` yazıyor. Haftalık veri sorgusu rooms ile join yapmadan bu metin alanını getiriyor; formatDecisionSummary de aynı değeri kullanıyor.

**Etki:** Gerçek “Ev Ofisi” odasında taranan kararlar haftalık özette “Genel” görünür; oda odaklı öneri için gerekli bilgi kaybolur. SQL oda bağı doğrudur, modele giden oda bağlamı yanlıştır/eksiktir.

**Üretim:** Oda Taraması karar payload'ını temizleme → recordDecisions → getRecentDecisions → formatDecisionSummary boyunca izle. **Öneri:** Yetkili roomId'den gerçek oda adı türet veya son karar sorgusunda sahiplikle join yap; eski serbest etiketleri fallback olarak ayrı tut.

### N08 — Sıfır eşyalı odasız analiz için kayıt paneli yok

**Durum:** Koddan doğrulandı. **Önem:** P2.

**Yer:** `lib/anthropic.js:93–95` / boş items izinli; `app/page.js:2426–2435` / kayıt footer koşulu; `404–445` / kayıt işlevi.

**Gerekçe:** `items:[]` geçerli model sonucudur; sohbet de bulunabilir. Fakat SaveScanToRoom dahil bütün footer `items.length > 0` koşuluna bağlı.

**Etki:** Kullanıcı bir odanın fotoğrafını ve konuşmasını, taşınabilir eşya bulunmadı diye kaydedemez. Mevcut oda yolunda otomatik kayıt gerçekleşebilirken odasız yolda kayıt imkânı yoktur.

**Üretim:** Sahte analiz yanıtını `items:[], reply:'...', question:''` yap; odasız inceleme görünümünde panel koşulunu değerlendir. **Öneri:** Çalışmayı kaydetme koşulunu karar verilebilir eşya sayısından ayır; yalnızca karar onayını dahil edilen eşya sayısına bağla.

## 6. Doğrulanan olumlu noktalar ve sınırları

- `verifyRoomPhotoIds` (`lib/db.js:414–421`) oda ve kullanıcı sahipliğini kontrol ediyor. Başka kullanıcının fotoğraf id'sini kayda bağlamıyor. Bu, fotoğrafın gerçekten bu AI çağrısına girdiğini kanıtlamaz; N01 sürüyor.
- Analiz upsert'i `sessionKey` için oda/kimlik eşleşmesini kontrol ediyor (`444–455`). Kopya analiz satırını önlüyor; eski revision'ın yeniyi ezmesini önlemiyor.
- Kalıcı analiz aktif taramadan önce yazılıyor (`scan POST:43–48`). İki yazım ve daha sonraki karar/kapatma işlemleri tek atomik işlem değil.
- `idea` geriye uyumlu. Gerçek analiz fonksiyonu sahte modelle çalıştırıldığında eksik/sayısal idea boş metne, 500 karakterlik idea 400 karaktere dönüştü. Ücretli çağrı olmadı. Eski JSON'a alan eklenmemesi doğrulama hatası üretmiyor.
- Oda `reply` alanının soru içermemesi artık promptta açık. Bu, bütün model çıktılarının kurala uyduğu anlamına gelmez; gösterim filtresinin sınırları B06/B12'de.
- Karar kutlama metinleri `app/page.js:664,945,2418`'de karar dili kullanıyor. `formatDecisionSummary` ve TIPS sürüm kontrolü doğru niyetle uygulanmış. Canlı dilin kalıcı düzeldiği bu denetimde ölçülmedi.
- `lib/homeMessages.js:73,87` hâlâ fiziksel iyileşme ima ediyor; `selectCategory:140–158` oda var/karar yok kullanıcıya da ilgili havuzu seçebiliyor. `idea`/prompt düzeltmeleri bu sabit metinleri değiştirmiyor.

## 7. Çalıştırılan doğrulamalar

| Kontrol | Bağımsız sonuç |
|---|---|
| Ana raporun tam okuması ve kaynak/satır takibi | B01–B18 tek tek karşılaştırıldı. |
| Git durumu, diff istatistiği, HEAD ve takip edilen dosyalar | 12 mevcut değiştirilmiş dosya, +927/−63; gerekli iki yeni kaynak takip dışı. |
| B01 kaynak fonksiyonunun kontrollü Promise testi | Fotoğraf kimliği kayboldu, uploading koşulu true kaldı. |
| B15 kaynak onay fonksiyonu, sahte decide/DELETE | Aynı tarama iki decide isteği üretti. |
| B13 iki eşzamanlı persist yanıtı | Yeni kayıt beklerken saved=true, saving=false. |
| N01 gecikmiş kapsam callback'i | Eski fotoğraf listesiyle analiz çağrıldı; oturum denetimi yok. |
| N02 gecikmiş oda oluşturma cevabı | Yeni aktif oda eski oda ile değiştirildi. |
| N03 gerçek DELETE route'u, sahte veri erişimi | Eski finalItems mevcut başka analiz kimliğine yazıldı ve scan temizlendi. |
| N06 gerçek analyzeRoom, sahte model | Manuel kullanıcı kararı model önerisi yerine sonuç ve assistant geçmişinde kaldı. |
| `idea` uyumluluk sınırları | Eksik/sayı → boş; uzun metin → 400 karakter. |
| `joinReplyAndQuestion` örnekleri | Ortada soru varsa ikinci soru ekleniyor; sonda soru varsa ayrı kayıtlı soru kayboluyor. |
| B02 yerel SQLite SELECT | Analiz 1/5→oda 5, analiz 9→oda 8; hepsinde bağ `[]`, oda fotoğraf sayısı 0. |
| SQLite dosya özetleri | DB, WAL ve SHM okuma öncesi/sonrası değişmedi. |

Bellek testleri Node `vm` içinde kaynak metninden alınan fonksiyonları kullandı. Fetch/model/veri erişimi yerine sahte nesneler verildi; ağ erişimi yapılmadı. Tam React runtime'ı, gerçek SQL mutasyonları ve tarayıcı ekranı test edilmedi. Üretim senaryoları, ileride izole test ortamında uygulanacak yöntemleri tarif ediyor; bu oturumda kullanıcı verisine uygulanmış değiller.

## 8. Commit öncesi gerekenler

Mevcut değişiklikleri tamamlanmış özellik olarak commit etmeden önce teknik önceliğim:

1. **B15 + N03:** Onayın idempotent, belirli analizi hedefleyen ve atomik olması. Karar, final seçim ve aktif kaydı kapatma aynı tutarlı işlem olmalı.
2. **B01 + N01:** Fotoğraf listesi güncellemesi, kapsam cevapları ve analiz girdi/id snapshot'ı aynı oturum ve sürümle korunmalı.
3. **B13 + N02:** Eski kayıt/sohbet/oda oluşturma sonuçlarının yeni state'i etkilemesi önlenmeli; kayıt revision'ı doğrulanmalı.
4. **N04:** Başarısı belirsiz oda/fotoğraf isteğinin tekrarı kopya üretmemeli; “güvenli tekrar” iddiası buna göre sınanmalı.
5. **N05 + N06:** Kullanıcı taslak seçimi korunmalı, orijinal AI önerisi ayrı kalmalı; geçmiş yanlış etiketlenmemeli.
6. **B04 + B18:** Gerekli kaynaklar commit kapsamına alınmalı; yukarıdaki kontrollü sıralamalar kalıcı regresyon testleriyle korunmalı.

B12, N07 ve N08 de mevcut akışın işlevsel eksikleri olarak giderilmeli; P1 yarışların gerisine koyuyorum. B03/B08 gibi metin düzenlemeleri daha düşük önceliktedir. B02 için kod/veri onarımı değil, kanıt sınırının doğru yazılması gerekir.

Bu rapor hata düzeltme uygulaması değildir. Bulunan sorunların hiçbiri bu denetim sırasında giderilmedi. Veritabanı, test verileri ve production olduğu gibi bırakıldı.
