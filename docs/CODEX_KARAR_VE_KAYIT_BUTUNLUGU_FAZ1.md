# Bir Oda. Bir Eşya. — Karar ve kayıt bütünlüğü, Faz 1

**Tarih:** 24 Eylül 2026  
**Proje:** `C:\projects\SESTIA`  
**Kapsam:** Bağımsız denetimdeki B15, N03, N05, N06.  
**Durum:** Kod uygulandı; 25 kalıcı regresyon/sözdizimi testi geçti. Commit ve deploy yapılmadı.

## 1. Sonuç

Oda taraması onayı artık sunucudaki belirli bir analiz ve kaydedilmiş taslak sürümü üzerinden çalışıyor. Karar satırları, puan/sayaç değişimi, nihai seçim, onay sonucu ve ilgili aktif taramanın kaldırılması aynı SQLite transaction içinde gerçekleşiyor. Aynı analiz tekrar onaylandığında yeni karar/puan üretilmiyor.

Gecikmiş kapatma isteği belirli bir analiz kimliğini hedefliyor. Aynı odanın o anda aktif olan başka taramasını okuyup onun üzerine nihai seçim yazan eski işlem kaldırıldı.

Yeni analizlerde modelin ilk önerisi ayrı saklanıyor. Kullanıcının taslak seçimi ve onaylanmış nihai karar bundan bağımsız. Kullanıcı Sat → Tut değiştirip sohbet ettiğinde ilk öneri kaybolmuyor; geçmişte ilk model önerisi Sat, nihai kullanıcı kararı Tut olarak gösterilebiliyor.

**Önemli eski kayıt sınırı:** Faz öncesindeki karar satırlarında analiz kimliği bulunmadığından, eski bir taramanın kararlarının daha önce yazılıp kapatma isteğinin başarısız olup olmadığı kesin olarak belirlenemiyor. Eski kayıtlar okunuyor ve korunuyor; özgün öneri tahmin edilmiyor. Onay geçmişi belirsiz eski taramaların yeniden onayı veri çoğaltmamak için kapalı. Bu bir otomatik geçmiş veri düzeltmesi veya eski kararları yeni analizlere eşleme işlemi değildir.

**Bütün sistemin güvenli olduğu iddia edilmiyor.** Fotoğraf ve genel oturum yarışları için diğer fazlara kalan riskler §8'de.

## 2. Yeniden inceleme ve tasarım seçimi

Önce güncel `app/page.js`, scan/decide rotaları, `lib/db.js`, model uzlaştırması ve ilgili Next.js 16 yerel route handler belgesi yeniden okundu. Rapordaki öneri aynen kopyalanmadı.

Mevcut model zaten bir tarama için benzersiz `room_analyses.session_key` ve sabit analiz `id` sağlıyor. Onay için ikinci bir genel iş kuyruğu veya yeni karar veritabanı oluşturmak yerine aynı analiz satırı işlem kimliği olarak kullanıldı. Tek bir analiz yalnızca bir kez onaylanabilir. Yeniden fiziksel eylem gerçekleştirme veya kararı uygulama takibi eklenmedi.

Mevcut `recordDecisions` fonksiyonunun karar ve puan hesapları korundu; yeni dış transaction bu fonksiyonun transaction'ını da kapsıyor. Nihai kayıt aşaması başarısız olduğunda önceki karar eklemeleri ve puan değişimi de geri alınıyor. Tetikleyiciyle zorlanan hata bunu test ediyor.

İlk model önerisinin değişmeden saklanması tercih edildi. Bu nedenle arayüz etiketi açıkça **“Sestia'nın ilk önerisi”**. Sonraki konuşmaların metin geçmişi ayrıca kalıyor; başlangıç önerisi yeni öneriymiş gibi yeniden etiketlenmiyor.

## 3. Değiştirilen ve eklenen dosyalar

| Dosya | Bu fazdaki değişiklik |
|---|---|
| `lib/roomDecisionStore.cjs` | Yeni bağlantı açmayan, verilen SQLite bağlantısıyla çalışan kayıt/taslak/onay/kapatma katmanı; ek sütun migrasyonu, sürüm kontrolü, atomic onay ve tekrar sonucu. |
| `lib/roomItemSources.cjs` | Modelin ilk önerisini kullanıcı seçiminden ayıran uzlaştırma ve ortak geçmiş etiketi. |
| `lib/db.js` | Yeni katmanın kurulması; aktif tarama okumasına revision/session/source bilgisi; geçmişe taslak ve özgün öneri alanlarının eklenmesi. |
| `lib/anthropic.js` | Oda eşya uzlaştırması yeni kaynak ayırıcıya taşındı. İlk öneri manuel seçim tarafından ezilmiyor. Ücretli çağrı yapılmadı. |
| `app/api/rooms/[id]/scan/route.js` | POST kayıt, PATCH taslak, PUT onay ve hedefli DELETE sözleşmeleri. Kimlik kontrolü korunuyor. |
| `app/api/decide/route.js` | `source: 'oda'` ile eski anahtarsız karar yolu 409 ile kapatıldı. Oda istemcisinin yeni onay sözleşmesini kullanması gerekiyor. |
| `app/page.js` | Analiz kimliği/revision takibi, yeni onay çağrısı, açık taslak kaydetme ve çıkış uyarısı, kaynakları ayrı gösteren geçmiş görünümü, legacy uyarıları. |
| `tests/room-decisions.test.cjs` | Geçici gerçek SQLite dosyasıyla kayıt, onay, rollback, legacy ve route sözleşmesi testleri. |
| `tests/room-history-ui.test.cjs` | Gerçek `RoomReviewView` kaynak kodunun React statik render'ıyla kaynak etiketleri ve kaydedilmemiş taslak gösterimi. |
| `tests/syntax.test.cjs` | Değişen uygulama dosyalarını çalıştırmadan Next'in SWC derleyicisiyle sözdizimi/JSX kontrolü. |
| `package.json` | `npm test` komutu. Yeni paket bağımlılığı eklenmedi. |

Çalışma ağacında bu fazdan önce de çok sayıda değiştirilmiş/takip dışı dosya vardı. Yukarıdaki liste bu fazın kapsamıdır; bütün mevcut Git diff'inin bu çalışmada üretildiği ileri sürülmüyor.

## 4. Veri modeli

`room_analyses` tablosuna eksikse aşağıdaki sütunlar ekleniyor:

| Sütun | İşlev |
|---|---|
| `suggestions_json TEXT` | Yeni analizde eşya kimliği bazında ilk model önerisi ve gerekçesi. Eski satırlarda NULL; geçmişten tahmin edilerek doldurulmuyor. |
| `draft_items_json TEXT` | Kaydedilmiş kullanıcı taslak seçimi, hariç tutma ve manuel seçim durumu. |
| `revision INTEGER NOT NULL DEFAULT 0` | Taslak/analiz güncellemelerinin sürümü. Eski sürümle yazma veya ilk onay reddediliyor. |
| `confirmation_json TEXT` | Başarılı onayın analiz kimliği ve karar sayısı dahil sonucu. Tekrarda yeni karar eklemek yerine bu sonuç kullanılıyor; güncel toplamlar yeniden okunuyor. |
| `closed INTEGER NOT NULL DEFAULT 0` | Kapatılmış/onaylanmış analizin gecikmiş POST ile yeniden açılmasını engelliyor. Fiziksel eylemin gerçekleştiği anlamına gelmiyor. |

Var olan `final_items_json` nihai kullanıcı kararı için kullanılmaya devam ediyor. `items_json` ve mesajlar mevcut analiz gösterimi/sohbet uyumluluğu için korunuyor; özgün önerinin tek kanıtı olarak kullanılmıyor. Model kaynağı `suggestions_json` üzerinden ekleniyor.

Migrasyon ekleyicidir: sütunlar yoksa oluşturulur. Önceden mevcut kayıtların eşya/mesaj/karar metinleri değiştirilmez. İlk gerçek uygulama açılışında mevcut `lib/db.js` başlatma yaklaşımıyla çalışır. Bu geliştirme sırasında uygulama sunucusu başlatılmadı ve migrasyon gerçek yerel kullanıcı veritabanına uygulanmadı; migrasyon testleri yalnızca geçici dosyalarda çalıştı.

## 5. API ve işlem sırası

### POST `/api/rooms/:id/scan`

`sessionKey`, `revision`, `items`, `messages`, `photoIds` alır. Yeni kayıt revision 0 ile başlar; başarılı yanıt `analysisId`, `revision`, `sessionKey` döndürür. Var olan kaydın sürümü eşleşmelidir. Onaylanmış/kapatılmış analiz tekrar yazılamaz. Başka aktif taramanın yerine eski analiz güncellemesi geçirilemez.

Analiz ve aktif tarama kaydı aynı dış transaction altında yazılır. Kaybolan kayıt yanıtının aynı içerikle tam tekrarı yeni revision üretmeden önceki receipt'i döndürebilir. Farklı/eski içerik sessizce yazılmaz, çatışma alınır.

### PATCH `/api/rooms/:id/scan`

`analysisId`, `revision`, `choices: [{id, recommendation, excluded}]` alır. Eşya kimlik kümesinin mevcut kayıtla aynı olması gerekir. İstemci bu yol üzerinden kategori, gerekçe veya özgün öneriyi değiştiremez. Taslak revision artırılır; aynı analize bağlı aktif scan varsa onun taslak görünümü de güncellenir.

### PUT `/api/rooms/:id/scan`

`analysisId`, `revision` alır. Onaylanacak eşya listesi istemcinin gönderdiği serbest bir `finalItems` listesinden değil, sunucuda kayıtlı taslaktan okunur.

İşlem:

1. Analiz ve oda sahipliğini doğrula.
2. Önceki onay sonucu varsa yeni yazım yapmadan sonucu ve güncel toplamları dön.
3. İlk onayda açık analiz, doğru revision ve uygun legacy durumu gerektir.
4. Hariç tutulmamış taslak seçimlerini mevcut karar yazma işlevine ver.
5. Nihai seçimleri ve onay sonucunu aynı analiz satırına kaydet; kapalı işaretle.
6. Aktif scan'i yalnızca `room_id + device_id + analysis_id` eşleşirse sil.
7. Bütün adımları birlikte commit et; herhangi bir hata varsa birlikte geri al.

Onay yanıtı kaybolursa aynı analiz/revision isteği tekrar gönderilebilir. Başka kararlar daha sonra eklenmişse tekrar yanıtı toplam sayacı geçmiş bir değere geri götürmez. İstemci tekrar yanıtında yeniden puan kazanılmış göstermez.

### DELETE `/api/rooms/:id/scan`

Artık analiz kimliği zorunlu. İlk kapatma doğru revision ister. Belirtilen analizi kapatır; yalnızca o analize bağlı aktif satırı kaldırır. `finalItems` ile odanın güncel taramasını finalize eden eski davranış yok. Onay sonrasında istemci ayrı DELETE göndermiyor.

### Eski `/api/decide`

Oda onayı için artık kullanılamaz; `source: 'oda'` 409 döner. Böylece eski istemci, yeni onay transaction'ını farkında olmadan atlayamaz. Tek Eşya akışı bu fazın dışında bırakıldı; onun eski endpoint'ine genel idempotency eklenmedi.

## 6. Taslak ve geçmiş deneyimi

### Taslak seçimin yaşam döngüsü

- Kaydedilmiş taramada öneriyi değiştirmek veya eşyayı hariç tutmak, görünür bir **“taslak henüz kaydedilmedi”** durumu oluşturur.
- **“Taslak Seçimlerini Kaydet”** kalıcı taslağı günceller; karar veya puan oluşturmaz.
- Kaydedilmiş analizde taslak değiştikten sonra sohbet gönderilirse önce taslak kaydı tamamlanır; başarısızsa sohbet bu seçimler kaydedilmiş gibi sürdürülmez.
- Henüz bir odaya kaydedilmemiş analizde konuşmaya devam edilebilir; seçimler oda kaydıyla birlikte saklanır.
- Kaydedilmemiş taslakla uygulama içinden çıkışta açık uyarı vardır. Tarayıcı yenileme/kapatma için `beforeunload` uyarısı eklenmiştir. Tarayıcı/işletim sistemi her kapanışta bunu göstermeyi garanti etmez; bu nedenle kaydedilmemiş durum ayrıca ekranda yazılıdır.
- Taslak kaydı başarısızsa kaydedildi denmez ve onay açılmaz. Çatışmada eski içeriği zorla yazmak yerine kullanıcıdan odayı yeniden açması istenir.
- Kaydedilmiş taslak tekrar girişte `draft_items_json` üzerinden gelir.

### Öneri ve nihai karar

Yeni analizde modelin ilk önerisi `{recommendation, reasoning}` olarak ayrı tutulur. Kullanıcının manuel seçimini koruyan sohbet uzlaştırması bu kaynak bilgisini de korur. Sonraki model cevabı farklı bir karar etiketi içerse bile ilk öneri sessizce değişmez.

Geçmiş görünümünde örnek:

- `Sestia'nın ilk önerisi: Sat`
- İlk model önerisinin kendi gerekçesi
- `Kararın: Tut`

Henüz onay yoksa ayrı olarak `Kaydedilmiş taslak: Tut — henüz onaylanmadı.` gösterilir. Hariç tutulan eşyanın da geçmişte model kaynağı ve nihai hariç tutulma durumu görülebilir.

### Eski kayıtlar

Eski analizde ilk model önerisi ayrı saklanmamışsa **“Sestia’nın özgün önerisi bu eski kayıtta ayrı saklanmamış.”** yazılır. Eldeki recommendation alanından özgün öneri türetilmez. Eski finalItems varsa nihai seçim olarak okunur; eski decisions satırları yeniden yazılmaz.

Eski aktif scan'in analiz bağlantısı yoksa kayıt okunmaya devam eder, fakat analiz bağlantısı uydurulup onay verilmez. Analiz bağlantısı olsa da faz öncesi onay durumu belirsizse yeniden onay kapalıdır. Yeni satırlarla eski kararları kategori/oda/zaman benzerliğine göre eşleme yapılmadı. Bu sınırlama veri çoğaltma riskine karşı bilinçli ve görünür; eski kayıtların bütün yazma davranışlarının değişmeden kaldığı iddia edilmiyor.

## 7. Kalıcı regresyon testleri ve sonuçlar

**Komut:** `npm test`  
**Son sonuç:** 25 test, 25 başarılı, 0 başarısız, 0 atlanan.

Veri testleri işletim sisteminin geçici alanında `sestia-decisions-*` adlı ayrı klasörlerde gerçek SQLite dosyaları açar. Uygulamanın gerçek DB fonksiyonları ve şeması çalıştırılır; yalnızca bağlantı açma başlangıcı test bağlantısıyla değiştirilir. Başlangıç metni beklenen yapıda değilse test assertion ile durur. `lib/db.js` normal import edilmez; böylece `data/app.db` açılmaz.

Her test kendi veritabanını kullanır. Temizlik yalnızca oluşturulan geçici klasörün mutlak yolunun beklenen geçici dizin altında olduğu doğrulandıktan sonra yapılır. Gerçek kullanıcı kayıtları veya projedeki mevcut test kimlikleri temizlenmez.

| Grup | Test edilen durum |
|---|---|
| Tekrarlı onay | Aynı analizi iki kez onaylama; karar/puan/sayaç bir kez artıyor. |
| Kaybolan yanıt | Commit edilmiş onay sonucunu kaybetme ve aynı isteği tekrarlama. Store ve gerçek PUT handler sözleşmesiyle ayrı testler. |
| Hedefli kapatma | A'nın gecikmiş kapatması sırasında B aktif; B'nin scan'i ve finalItems'ı korunuyor. |
| Yeni tarama | A onaylanırken daha yeni B aktif; B kalıyor. Onaylı A'nın gecikmiş POST'u reddediliyor. |
| Kaynak ayrımı | Sat önerisi → Tut taslağı → sohbet: ilk Sat önerisi korunuyor. |
| Geri dönüş | Kaydedilmiş taslak tekrar aktif scan okumasında geliyor; henüz final karar/puan oluşmuyor. |
| Nihai geçmiş | Model ilk önerisi, taslak ve final karar alanlarının doğru kaynakları. |
| Legacy | Eski analiz, eski finalized analiz ve analiz bağlantısız aktif scan okunuyor; bilinmeyen öneri doldurulmuyor, belirsiz onay çoğaltılmıyor. |
| Sahiplik | Başka kullanıcı draft/confirm/close/snapshot yollarını kullanamıyor. |
| Revision | Daha yeni taslak varken eski revision ile onay veya snapshot yazımı reddediliyor. |
| Rollback | Onay sonucu yazımında SQLite trigger hatası; karar, puan ve sayaç tamamen geri alınıyor, aktif scan korunuyor. |
| Kayıt tekrarları | Tam aynı snapshot/draft isteğinin kaybolan yanıt sonrası tekrarı ek revision üretmiyor. |
| Migrasyon | Tekrar çalıştırılabilir migrasyon; faz öncesi şemadaki dolu kaydın payload'ı değişmeden yeni sütunlar ekleniyor. |
| Route | Kimliksiz istek 401, yabancı sahiplik 404, analiz kimliksiz eski DELETE 400. |
| İstek manipülasyonu | PUT gövdesindeki keyfî finalItems dikkate alınmıyor; sunucunun kayıtlı taslağı onaylanıyor. |
| Güncel toplam | Önceki onay tekrarlanırken sonradan verilen başka kararların toplamı geriye gitmiyor. |
| React render | İlk öneri Sat/final Tut ayrı; eski kayıtta kaynak bilinmiyor; kaydedilmemiş taslak açık ve onay düğmesi kapalı. |
| Derleyici | Beş değişen uygulama JS/JSX dosyası SWC dönüşümünden geçiyor; modüller çalıştırılmıyor. |

**İlk denemelerdeki başarısızlıklar:** Sandbox Node'un `C:\projects` yolunu çözümlemesini EPERM ile engelledi; aynı izole test komutu izinli çalıştırıldı. Daha sonra yeni SWC testi native binding yüklenmeden çalıştığı için bir kez başarısız oldu; teste `loadBindings()` eklenince geçti. Son çalıştırmada açık test başarısızlığı yok.

**Diğer doğrulama:** `git diff --check` geçti. Mevcut CRLF/LF uyarıları var; boşluk hatası raporlanmadı.

### Çalıştırılmayanlar

- Gerçek tarayıcıda tıklama/ağ kısıtlama ve mobil yaşam döngüsü uçtan uca testi.
- Gerçek HTTP sunucusu üzerinden transport hata testi. Handler testleri Request benzeri girdilerle bellekte çalışır; yanıt kaybı committed sonucu teslim etmeyerek simüle edilir.
- Ücretli model, e-posta veya başka dış servis çağrısı.
- `next build` ve canlı geliştirme sunucusu. Veritabanı başlatma/migrasyonunun gerçek yerel verilere uygulanmaması için SWC kontrolüyle sınırlı kalındı; tam Next derlemesi yapılmış sayılmaz.
- Production/Railway veya production veritabanı.
- Çok süreçli yük/stres testi. Onay tekrarı ve SQL atomikliği ayrı dosyalı gerçek SQLite testleriyle sınandı; farklı süreçlerden eşzamanlı kapasite ölçülmedi.

## 8. Diğer fazlarla zorunlu bağımlılıklar ve kalan riskler

### Bu fazda gerekli olan dar koruma

B15'i çözmek için yalnızca onay receipt'i yeterli değil: daha eski bir kayıt onaydan sonra analizi tekrar açmamalı ve onay kullanıcının görmediği başka taslağı tüketmemeli. Bu nedenle **revision kontrolü, closed durumu, kayıtlı taslağı onaylama ve analiz kimliğine bağlı silme** bu fazın zorunlu parçası oldu.

İstemcide onay hedefi aktif oda ref'inden son anda türetilmiyor; başarılı kayıt yanıtından alınan `{roomId, analysisId, revision, sessionKey}` kullanılıyor. Kayıt ve taslak yanıtlarının farklı oturuma uygulanmasını sınırlayan kontroller ile bu yolun aynı anda iki yazım başlatmasını engelleyen koruma eklendi. Sohbet ve odaya kaydetme UI kontrolleri bu dar işlem sırasında birlikte koordine ediliyor.

### Tamamlandığı iddia edilmeyenler

- **B01/N01:** Fotoğraf sıkıştırma/yükleme/kapsam yarışı, eski kapsam yanıtının yeni analiz başlatması ve model girdisiyle fotoğraf id listesinin ayrışması çözülmedi.
- **B13/N02:** Bütün uygulama oturumlarının genel sıra/iptal mimarisi kurulmadı. Özellikle oda oluşturma ve fotoğraf yükleme aşamasında çıkış sonrası eski işlemin aktif oda/ref'lere etkisi kalan fazın konusu. Yeni onay sözleşmesi yanlış analiz hedefleme ve tekrar kayıt riskini daraltır; daha önce yanlış bağlamla üretilmiş analizi otomatik olarak doğru hâle getirmez.
- **N04:** Oda oluşturma ve fotoğraf POST yanıtı kaybındaki kopyalar çözülmedi; analiz/onay receipt'i bu uçların yerine geçmez.
- **Tek Eşya:** Genel `/api/decide` tekli yolunun yanıt kaybında idempotency eksikliği bu fazın dışında. Oda onayı için eski yol kapatıldı; bütün ürünün her karar işlemi artık idempotent denemez.
- **Legacy onay belirsizliği:** Geçmiş decision→analysis bağı olmadığı için veri üzerinde tahmin yapılmadı; güvenli otomatik yeniden onay yok.
- **N08 ve diğer ürün açıkları:** Sıfır eşyalı odasız analiz kaydetme paneli ve diğer denetim maddeleri bu faza dahil edilmedi.

Bu nedenlerle sonuç **“seçili karar/kayıt sözleşmesi yeni analizlerde regresyon testleriyle güvenceye alındı”** şeklindedir; tüm fotoğraf, oturum ve üretim davranışlarının bütünüyle güvenli olduğu şeklinde değildir.

## 9. Teslimat durumu

Kod, kalıcı testler ve bu rapor çalışma ağacında bulunuyor. Yeni bağımlılık kurulmadı. Gerçek yerel veritabanı ve mevcut test kimliklerinde test yazımı/temizlik yapılmadı. Gerçekleşmiş eylem takibi eklenmedi. Commit, deploy ve Railway işlemi yapılmadı.
