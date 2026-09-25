# ODA TARAMASI VE KARAR DURUMU TUTARLILIĞI — DENETİM VE DÜZELTME RAPORU

**Proje:** Bir Oda. Bir Eşya.
**Tarih:** 23 Eylül 2026
**Başlangıç noktası:** [`SESTIA_KARAKTER_ENTEGRASYON_TESTLERI_02.md`](SESTIA_KARAKTER_ENTEGRASYON_TESTLERI_02.md), §9 (kapsam dışı bulgular)
**Kapsam:** (1) Oda seçilmeden başlatılan Oda Taraması'nın onaylanamaması, (2) kaydedilen karar ile gerçekleşmiş eylemin uygulama genelinde ayrılması, (3) Bu Hafta önbelleği.
**Durum:** Kod değişti ve gerçek uygulamada, ayrılmış test kimlikleriyle doğrulandı. Commit ve deploy yapılmadı. Ücretli AI çağrısı yapılmadı.

---

## Özet

| Konu | Önce | Sonra |
|---|---|---|
| Keşif → Oda Taraması | Çıkmaz: analiz hiç kaydedilmiyor, onay kapalı, "Tekrar Dene" istek göndermiyor. Kapsam kontrolü ek açı isterse ekran "Fotoğraflar Kaydediliyor..."da takılı kalıyor. | Analiz odasız görülebiliyor; "Bu çalışmayı bir odaya kaydet" adımıyla mevcut oda seçiliyor ya da yeni oda oluşturuluyor; kayıt bitince onay açılıyor. |
| Kişisel Çalışma Alanı → Oda Taraması | Aynı çıkmaz | Aynı yeni akış |
| Odalarım → odada tarama | Çalışıyordu, ama analiz `photo_ids_json = []` ile, yani fotoğraf bağı olmadan kaydediliyordu. Analiz, fotoğraf yüklemesi bitmeden başlayabiliyordu. | Analiz yükleme bitince başlıyor; fotoğraf bağı kaydediliyor (`[19]`). |
| Kayıtlı taramaya geri dönme | Çalışıyordu | Değişmedi, yeniden doğrulandı |
| Karar sonrası ekran | "Mobilya · Sandalye bağışlandı" | "Mobilya · Sandalye — Kararın: Bağışla" |
| Bu Hafta önbelleği | Eski talimatla üretilmiş ipuçları 7 güne kadar gösterilebiliyordu | İçerik sürümü: eski önbellek bir sonraki ziyarette yeniden üretiliyor; toplu silme yok |

Kullanıcı kararı gerektiren konular §10'da.

---

## 1. İlk bulguların doğrulanma durumu

Rapor 02'deki bulgu kod okumasıyla değil, gerçek uygulamada, ayrılmış test kimlikleriyle yeniden üretildi (yöntem §9).

| Bulgu (rapor 02, §9) | Doğrulama | Sonuç |
|---|---|---|
| Ana ekrandan ya da Keşif'ten başlatılan Oda Taraması onaylanamıyor | Keşif ve Kişisel Çalışma Alanı yollarının ikisinde de gerçek akışla yeniden üretildi | **Doğrulandı.** Ayrıca rapor 02'de görülmeyen iki alt durum çıktı: "Tekrar Dene" hiç istek göndermiyor; kapsam kontrolü ek açı isterse akış analize bile ulaşmıyor. |
| Karar sonrası ekran kararı yapılmış iş gibi anlatıyor | Test kimliğiyle Tek Eşya kararı verildi | **Doğrulandı:** "Mobilya · Sandalye bağışlandı" |
| Bu Hafta önbelleği eski dili taşıyabilir | `app/api/inspiration/route.js` ve `lib/db.js` okundu | **Doğrulandı:** geçersizleşme yalnızca karar sayısı ya da 7 gün |
| — (yeni) Odalarım'dan başlatılan taramada fotoğraf bağı kayboluyor | Test odasında tarama sonrası veritabanı okundu | **Yeni bulgu:** `photo_ids_json = '[]'`, oysa fotoğraf odaya kaydedilmişti |

Rapor 02'nin yazıldığı sırada gözlenen "Yarın Görüşürüz'ün odaya değil ana ekrana dönmesi" ilk turda da görüldü. Sunucu kaydı, karar kaydından hemen sonra bir `GET /` gösteriyor; geliştirme sunucusunun rotayı ilk kez derlerken sayfayı yeniden yüklemesiydi. Rotalar derlendikten sonra aynı adım odaya döndü. **Uygulama hatası değil.**

---

## 2. Gerçek kök nedenler

### K1 — Oda seçilmeden başlatılan tarama çıkmaza giriyor

Zincir (`app/page.js`):

1. Keşif ve ana ekrandaki "Oda Taraması" `selectMode('oda_tarama')` → `goTo('room-scan')` çağırır. `goTo('home')` daha önce `activeRoomRef.current = null` yapmıştır; yani bu taramanın bir odası yoktur.
2. `persistNewRoomScanPhotos` ve `persistRoomScanIfActive`, `activeRoomRef` boşsa **hiçbir şey yapmadan döner**. Fotoğraf yüklenmez, analiz kaydedilmez.
3. `roomScanSaved` yalnızca başarılı kayıtta ya da kayıtlı taramaya dönüşte `true` olur. Bu yolda hiçbiri olmadığı için **hep `false` kalır**.
4. `confirmRoomDecisions` ve "Tümünü Onayla" butonu `roomScanSaved` ister → onay kalıcı olarak kapalı.
5. Ekrandaki "Tekrar Dene" `retryRoomScanSave` → `persistRoomScanIfActive` çağırır; o da oda olmadığı için yine hiçbir şey yapmaz. **Buton ölüydü.**
6. İkinci biçim: kapsam kontrolü ek açı isterse kullanıcı "Bu Fotoğraflarla Devam Et"e basmalıdır. Ama bu buton, fotoğrafların `photoId` almasını beklerken "Fotoğraflar Kaydediliyor..." olarak kilitli kalır. Odasız taramada fotoğraflar hiç yüklenmediği için **sonsuza kadar kilitli** kalır. Aynı kontrol `startRoomAnalysis` içinde de vardır.

**Ne zaman bozuldu:** `git log` ile bulundu. Commit `2b85dde` ("Kalici oda analizi gecmisi (room_analyses)") onay koşuluna `!roomScanSaved` ekledi. Öncesinde odasız tarama onaylanabiliyordu (kararlar oda bağı olmadan yazılıyordu). Yeni koşul, odası olmayan tarama için bir kayıt yolu tanımlamadı.

### K2 — Eski `roomPhotos` değeri: kontrol atlanıyor, fotoğraf bağı kayboluyor

`addRoomPhotos` fotoğrafları state'e ekler ve aynı anda `checkRoomPhotoCoverage(updated)` başlatır. Bu fonksiyon `startRoomAnalysis`'i çağırır; o da `persistRoomScanIfActive`'i çağırır. Üçü de **fotoğraf eklenmeden önceki render'ın `roomPhotos` değerini** (closure) görür, yani boş diziyi:

- `startRoomAnalysis`'teki "bütün fotoğraflar kaydedildi mi" kontrolü boş dizi üzerinde çalışıp **her zaman geçiyordu**. Analiz, yükleme bitmeden başlayabiliyordu.
- `persistRoomScanIfActive` `photoIds`'i boş diziden hesapladığı için analiz `photo_ids_json = '[]'` ile kaydediliyordu.

Gerçek akışta doğrulandı: test odasında yüklenen fotoğraf 14 odaya kaydedildi, ama analiz 12'nin `photo_ids_json` değeri `[]` çıktı. Mevcut veride de başka kimliklere ait **3 analiz** `[]` taşıyor; muhtemelen aynı nedenden (bkz. §10, §11). Bu kayıtlara dokunulmadı.

İlk düzeltme denemesi (`useEffect` ile ref'i güncellemek) yetmedi. Kapsam kontrolü çok hızlı dönünce zincir render tamamlanmadan ilerliyor ve ref hâlâ eski kalıyordu; test analizi 16 yine `[]` ile kaydedildi. Son çözümde ref, fotoğraf eklenince ve yükleme sonucu gelince eşzamanlı güncelleniyor (§3).

### K3 — Karar sonrası ekran "gerçekleşmiş eylem" dili kullanıyor

`components/icons.js`'teki `REC_DONE_LABEL` haritası (`tutuldu`, `satışa çıktı`, `bağışlandı`, `atıldı`, `geri dönüşüme gitti`), Tek Eşya kararından sonra `CelebrationView` özet satırına yazılıyordu. Uygulamada eylemin gerçekleştiğini kaydeden hiçbir veri yok (§7). Bu yüzden bu metin, kaydedilmemiş bir olayı olmuş gibi anlatıyordu.

### K4 — Bu Hafta önbelleği içerik değişikliğinden habersiz

`inspiration_cache` satırı yalnızca iki koşulla geçersizleşiyordu: karar sayısı değişirse ya da 7 gün geçerse. Talimat ya da girdi biçimi değiştiğinde eski içerik aynı kaldı.

---

## 3. Değiştirilen dosyalar ve fonksiyonlar

| Dosya | Fonksiyon / bölüm | Değişiklik |
|---|---|---|
| `app/page.js` | Yeni state: `roomScanNeedsRoom`, `roomScanSaveError`, `roomScanSavedRoomName` | Odasız başlatılmış taramanın kayıt durumu |
| `app/page.js` | Yeni ref: `roomPhotosRef` | `roomPhotos`'un her zaman güncel hâli. `useEffect` ile senkron tutuluyor; ayrıca `addRoomPhotos` ve `persistNewRoomScanPhotos` içinde eşzamanlı güncelleniyor (K2). |
| `app/page.js` | `resetRoomScan` | `roomScanNeedsRoom = !activeRoomRef.current`. Odalarım'dan başlayınca `false`, Keşif ve ana ekrandan başlayınca `true`. Kayıt hatası ve oda adı sıfırlanıyor. |
| `app/page.js` | `resumeRoomScan` | `roomScanNeedsRoom = false` (kayıtlı tarama zaten bir odaya ait) |
| `app/page.js` | `persistNewRoomScanPhotos` | Artık `{ ok, photoIds }` döndürüyor; ref'i eşzamanlı güncelliyor |
| `app/page.js` | `persistRoomScanIfActive` | İsteğe bağlı `photoIdsOverride` parametresi; `photoIds` artık eski closure yerine ref'ten; başarılı mı değil mi `true`/`false` döndürüyor |
| `app/page.js` | **Yeni** `saveRoomScanToRoom({ roomId, name })` | Sırasıyla: oda (seçilen ya da `POST /api/rooms` ile yeni) → henüz yüklenmemiş fotoğraflar → analiz (`photoIds` ile). Adımlardan biri başarısız olursa kayıt tamamlanmış sayılmaz. Tekrar denemek güvenli: önceki denemede oluşturulan oda yeniden kullanılır, kaydedilmiş fotoğraf yeniden yüklenmez, analiz aynı `sessionKey` ile aynı satırı günceller. |
| `app/page.js` | `startRoomAnalysis` | "Fotoğraflar kaydedildi mi" kontrolü yalnızca oda içindeki taramada ve ref ile yapılıyor. Süren yüklemeler en fazla 15 sn bekleniyor; kullanıcı ekrandan çıkarsa bekleme duruyor. Odasız taramada kaydetme adımı için oda listesi yükleniyor. |
| `app/page.js` | `RoomScanView` çağrısı ve bileşeni | Yeni `photosSavedToRoom` prop'u. Odasız taramada küçük resimlerde "Kaydediliyor..." yazmıyor ve devam butonu yükleme beklemiyor. |
| `app/page.js` | `RoomReviewView` | Yeni prop'lar: `needsRoom`, `rooms`, `pendingRoomName`, `onSaveToRoom`, `saveToRoomError`, `savedRoomName`. Odasız ve henüz kaydedilmemiş taramada eski hata kutusu yerine kaydetme adımı gösteriliyor. Kayıttan sonra "Bu çalışma “X” odasına kaydedildi." satırı çıkıyor. Oda içindeki taramalarda eski uyarı ve "Tekrar Dene" aynı kaldı (orada gerçekten çalışıyor). |
| `app/page.js` | **Yeni** bileşen `SaveScanToRoom` | Mevcut odalar (seçim çipleri) ya da yeni oda adı; "Odaya Kaydet". Yarım kalmış kayıtta "“X” odasına kaydetme yarım kaldı." ve "Tekrar Dene". |
| `app/page.js` | `confirmSingleDecision` | Kutlama özeti: `"${category} — Kararın: ${REC_META[selectedRec].label}"` |
| `components/icons.js` | `REC_DONE_LABEL` | Kaldırıldı (tek tüketicisi yukarıdaki satırdı) |
| `lib/anthropic.js` | **Yeni** `TIPS_CONTENT_VERSION = 2` | Bu Hafta içeriğinin talimat/girdi sürümü |
| `app/api/inspiration/route.js` | `GET` | Önbellek yalnızca `contentVersion` eşleşirse kullanılıyor; yeni üretilen ipuçları `contentVersion` ile kaydediliyor |

**Değişmeyenler:** Sunucu rotaları (`/api/rooms`, `/api/rooms/[id]/photos`, `/api/rooms/[id]/scan`, `/api/decide`), veritabanı şeması, karar kategorileri (`Tut / Sat / Bağışla / Geri Dönüştür / At`), Karakter Dosyası v1, `SESTIA_CHARACTER_BASE`, giriş ekranları.

### Arayüze eklenen Türkçe metinler

- "Bu çalışmayı bir odaya kaydet"
- "Fotoğraflar, bu analiz ve vereceğin kararlar aynı odada saklanır. Kararlarını onaylamadan önce kaydetmen gerekiyor. Kaydetmeden çıkarsan bu tarama saklanmaz."
- "Odalarından birini seç" / "Ya da yeni bir oda oluştur" (hiç oda yoksa: "Yeni bir oda oluştur")
- Yer tutucu: "Oda adı, örn. Salon"
- Buton: "Odaya Kaydet" / "Kaydediliyor..." / (yarım kalmışsa) "Tekrar Dene"
- "“X” odasına kaydetme yarım kaldı."
- "Bu çalışma “X” odasına kaydedildi."
- Hatalar: "Oda oluşturulamadı. Tekrar dener misin?" · "Fotoğraflar odaya kaydedilemedi. Tekrar dener misin?" · "Analiz odaya kaydedilemedi. Tekrar dener misin?" · "Kaydedilemedi. İnternet bağlantını kontrol edip tekrar dener misin?" (uygulamadaki mevcut hata kalıbıyla aynı)
- Kutlama: "{kategori} — Kararın: {Tut|Sat|Bağışla|Geri Dönüştür|At}" (Geçmiş Analiz ekranındaki "Kararın: …" ifadesiyle aynı)

---

## 4. Önceki ve yeni davranışın karşılaştırması

### Oda seçilmeden başlatılan tarama (Keşif ve Kişisel Çalışma Alanı)

| Adım | Önce | Sonra |
|---|---|---|
| Fotoğraf ekleme | Yükleme denenmiyor ama küçük resimde "Kaydediliyor..." yazıyor | Yükleme yok, etiket yok (henüz oda yok) |
| Kapsam yeterli | Analiz başlıyor (K2'deki eski değer sayesinde, tesadüfen) | Analiz başlıyor |
| Kapsam yetersiz → "Bu Fotoğraflarla Devam Et" | Buton "Fotoğraflar Kaydediliyor..." olarak **kalıcı kilitli** | Buton açık, analiz başlıyor |
| Analiz ekranı | "Analiz henüz kalıcı olarak kaydedilemedi — kararlarını onaylayamazsın." + ölü "Tekrar Dene" + kapalı onay | Kaydetme adımı + kapalı onay (neden kapalı olduğu açıkça yazıyor) |
| Kaydet | — | Oda (seçilen ya da yeni) → fotoğraflar → analiz; başarılıysa onay açılıyor |
| Kayıt başarısız | — | Hata gösteriliyor, onay kapalı kalıyor, tekrar denemede ikinci oda açılmıyor |
| Kaydetmeden çıkış | Hiçbir şey kaydedilmiyor | Hiçbir şey kaydedilmiyor (değişmedi; artık ekranda da yazıyor) |
| Onay sonrası | — | Kararlar odaya bağlı yazılıyor (`room_id`), aktif tarama temizleniyor, analiz nihai seçimlerle işaretleniyor, kutlamadan sonra odaya dönülüyor |

### Odalarım'dan başlatılan tarama

| Adım | Önce | Sonra |
|---|---|---|
| Analizin başlaması | Yükleme bitmeden başlayabiliyordu | Yükleme bitince (en fazla 15 sn bekleme) |
| Kaydedilen analizin fotoğraf bağı | `[]` | Gerçek fotoğraf id'leri |
| Kullanıcının gördüğü akış | — | Aynı; kaydetme adımı görünmüyor |

---

## 5. Oda Taraması'nın dört giriş yolu — test sonuçları

Hepsi gerçek uygulamada, ayrılmış test kimlikleriyle çalıştırıldı (§9). "İstekler" sütunu tarayıcının gönderdiği gerçek sunucu isteklerini gösterir (telemetri hariç).

### Düzeltmeden önce

| Yol | İstekler | Sonuç |
|---|---|---|
| Keşif → Oda Taraması (kapsam yeterli) | yalnızca analiz | ❌ Onay kapalı; "Tekrar Dene" 0 istek |
| Keşif → Oda Taraması (kapsam yetersiz → devam) | yalnızca kapsam kontrolü | ❌ "Fotoğraflar Kaydediliyor..."da takılı |
| Kişisel Çalışma Alanı → Oda Taraması | yalnızca analiz | ❌ Onay kapalı |
| Odalarım → odada tarama | `POST /api/rooms/19/photos` 200 → `POST /api/rooms/19/scan` 200 → onay → `POST /api/decide` 200 → `DELETE /api/rooms/19/scan` 200 | ✅ Tamamlandı, ama `photo_ids_json = []` (K2) |
| Kayıtlı taramaya geri dönme | `GET /api/rooms/19` → "Taramaya Devam Et" → onay → `POST /api/decide` 200 → `DELETE …/scan` 200 | ✅ Tamamlandı |

### Düzeltmeden sonra

| Yol | İstekler | Sonuç |
|---|---|---|
| **Keşif → Oda Taraması** (yeni kimlik, hiç odası yok) | Kaydetmeden önce: yalnızca analiz ve `GET /api/rooms`. Kaydet: `POST /api/rooms` 200 → `POST /api/rooms/21/photos` 200 → `POST /api/rooms/21/scan` 200. Onay: `POST /api/decide` 200 → `DELETE /api/rooms/21/scan` 200 | ✅ Kaydetmeden önce onay kapalı, sonra açık. Kaydetme adımında yalnızca "Yeni bir oda oluştur" görünüyor. Kutlamadan sonra "Keşif Test Odası" açıldı. Analiz `[21]`, 2 karar `room_id = 21`. |
| **Kişisel Çalışma Alanı → Oda Taraması → yeni oda** | `POST /api/rooms` → `…/20/photos` → `…/20/scan` → onay → `…/decide` → `DELETE …/20/scan` | ✅ Analiz `[16]`, 3 karar `room_id = 20`. Kutlamadan sonra oda açıldı. |
| **Kişisel Çalışma Alanı → Oda Taraması → mevcut oda** | `…/19/photos` → `…/19/scan` (yeni oda **oluşturulmadı**) → onay → `…/decide` → `DELETE …/19/scan` | ✅ "“Test Salon” odasına kaydedildi.", onay açık |
| **Odalarım → odada tarama** | `…/19/photos` 200 → **ardından** analiz → `…/19/scan` 200 → onay → `…/decide` → `DELETE …/scan` | ✅ Kaydetme adımı görünmüyor (davranış korundu). Analiz artık yüklemeden sonra başlıyor, `photo_ids_json = [19]`. |
| **Kayıtlı taramaya geri dönme** | "Taramaya Devam Et" → onay → `…/decide` → `DELETE …/scan` | ✅ Kaydetme adımı ve uyarı yok, onay açık, kutlamadan sonra odaya dönüldü |

### Ek senaryolar (düzeltmeden sonra)

| Senaryo | Sonuç |
|---|---|
| Kayıt sırasında analiz kaydı başarısız (tarayıcıda `POST …/scan` bir kez 500 döndürüldü) | ✅ Oda oluştu, fotoğraf yüklendi, analiz başarısız. Onay kapalı kaldı. Ekranda "“Test Çalışma Odası” odasına kaydetme yarım kaldı." + "Analiz odaya kaydedilemedi. Tekrar dener misin?" göründü. "Tekrar Dene" yalnızca `POST …/20/scan` gönderdi: ikinci oda açılmadı, fotoğraf yeniden yüklenmedi. Veritabanında bu adla tek oda var. |
| Odasız tarama, kaydetmeden çıkış | ✅ Hiç `POST /api/rooms`, `/photos`, `/scan`, `/decide` isteği yok |
| Odasız tarama, kapsam yetersiz → "Bu Fotoğraflarla Devam Et" | ✅ Buton açık, küçük resimde etiket yok, analiz ve kaydetme adımı geldi |

---

## 6. Analiz kaydı ve karar onayının doğrulaması

Test kimliklerinin kayıtları testten sonra salt okunur sorgulandı:

| Kontrol | Sonuç |
|---|---|
| Odasız taramadan kaydedilen analizlerin fotoğraf bağı | `room_analyses` 14 (oda 20) → `[16]`, 18 (oda 20) → `[20]`, 19 (oda 21, Keşif yolu) → `[21]`; fotoğraflar `room_photos`'ta ilgili odada |
| Odasızdan mevcut odaya kaydedilen analiz | 15 (oda 19) → `[17]` |
| Odalarım yolunda, düzeltmeden sonra fotoğraf bağı | 17 (oda 19) → `[19]`, eşleşen fotoğraf 19 |
| Onaydan sonra analiz nihai seçimlerle işaretlendi mi | Test analizlerinin 8'inde de `final_items_json` dolu |
| Onaydan sonra aktif tarama temizlendi mi | Test kimliklerinde `room_scans` = 0 |
| Kararların oda bağı | Oda 19 → 15 karar, oda 20 → 6 karar, oda 21 → 2 karar; ayrıca 2 odasız Tek Eşya kararı (`room_id` NULL). Toplam 25. |
| Düzeltmeden önceki ve ara denemedeki test analizleri | 12 ve 13 → `[]` (K2'nin kanıtı), 16 → `[]` (ilk, yetersiz düzeltme denemesi: yalnızca `useEffect` ile ref). Bunlar test kimliğine ait. |

---

## 7. Karar ile gerçekleşmiş eylem ayrımı — uygulama genelindeki durum

**Veri modeli:** `decisions` tablosu yalnızca kararı tutuyor (`category`, `recommendation`, `reasoning`, `source`, `room`, `room_id`, `created_at`). "Gerçekten yapıldı" bilgisini tutan hiçbir alan, tablo ya da akış yok. Yani uygulama bugün yalnızca **"karar verildi"** durumunu bilebilir. Bu görevde yeni durum modeli, "tamamlandı" butonu ya da takip sistemi eklenmedi (bkz. §10).

| Yer | Bulgu | Durum |
|---|---|---|
| Karar kaydetme (`/api/decide`, `recordDecisions`) | Yalnızca karar ve puan/seri | ✅ Ayrımı bozmuyor |
| Tek Eşya kutlama özeti (`REC_DONE_LABEL`) | "bağışlandı", "atıldı", "geri dönüşüme gitti", "satışa çıktı" | **Düzeltildi** → "{kategori} — Kararın: Bağışla" |
| Oda Taraması kutlama özeti | "3 eşya karara bağlandı: …" | ✅ Zaten karar dili |
| Kutlama başlığı | "Harika iş, X!" / "Bugünün görevini tamamladın" | 🟡 Eylemi doğrudan iddia etmiyor; burada "görev" karar vermek. Ama "tamamladın" okunuşu belirsiz → karar sende (§10) |
| Odalarım → "Bu Odadaki Kararlar" | Kategori + "Tut/Bağışla…" etiketi | ✅ Karar dili |
| Geçmiş Analiz | "Sestia'nın önerisi: …" / "Kararın: …" | ✅ Öneri, karar ve seçim ayrımı zaten var |
| Tek Eşya ekranı | "Öneri: Tut" banner'ı, "Onayla ve Devam Et" | ✅ |
| Ana ekran istatistikleri | "Puan", "Karar Verildi", seri | ✅ Karar sayısı; eylem iddiası yok |
| Ana ekran mesaj havuzu (`lib/homeMessages.js`) | `06_kucuk_adimlar` başlığı: "Yaşam alanını istediğin gibi iyileştiriyoruz!"; `07_ilerleme` alt başlığı: "Yaşadığın yer, her dokunuşunla daha da güzelleşiyor." | 🟡 Karar sayısına bakarak fiziksel bir değişim olduğunu ima ediyor. Metin kullanıcının kendi editoryal içeriği olduğu için **değiştirilmedi** → karar sende (§10) |
| Bu Hafta (`generateWeeklyTips`) | Rapor 02'de düzeltildi: kararlar niyet olarak gönderiliyor, prompt sonuç dilini yasaklıyor | ✅ + bu turda önbellek sürümü (§8) |
| Kararların Sestia'ya aktarıldığı diğer yerler | Oda sohbeti `currentItems`'ı "Mevcut eşya listesi ve kullanıcının seçimleri" diye gönderiyor, yani seçim olarak; Keşif sohbeti ve Tek Eşya kararları hiç almıyor | ✅ Eylem iddiası yok |
| Yönetici paneli | "Günlük Karar Sayısı" | ✅ |

---

## 8. Önbellek incelemesi ve uygulanan çözüm

**Önceki geçersizleşme koşulları** (`app/api/inspiration/route.js`): önbellek `decision_count_at_generation === totalDecisions` ve yaşı 7 günden azsa aynen döndürülüyordu. Talimat değişikliği hiçbir koşulda önbelleği geçersiz kılmıyordu. Kullanıcı yeni karar vermedikçe eski ("masa lambası gitti" dilinde) ipuçları 7 güne kadar görünebilirdi.

**Çözüm (şema değişikliği yok, toplu silme yok):**
- `lib/anthropic.js`: `TIPS_CONTENT_VERSION = 2`. Talimat ya da girdi biçiminin anlamı değiştiğinde artırılır.
- Yeni üretilen ipuçları `payload_json` içinde `contentVersion: 2` ile saklanıyor. İstemci bu alanı kullanmıyor, zararsız.
- Önbellek ancak `contentVersion` eşleşirse döndürülüyor. Sürümsüz (eski) satır, kullanıcı Bu Hafta'yı bir sonraki açışında yeniden üretiliyor ve mevcut `ON CONFLICT` güncellemesiyle aynı satırın üzerine yazılıyor.

**Yeni dilin mevcut kullanıcıya yansıma zamanı:** Bu kod çalıştıktan sonra Bu Hafta'yı **ilk açışta**; 7 gün ya da yeni karar beklemeden. Önbelleği olan her kullanıcı için bir kerelik bir AI çağrısı demek. Bugün yerel veritabanında 4 önbellek satırı var.

**Doğrulama:**
- ✅ Canlı: test kimliğine `contentVersion: 2` taşıyan bir önbellek satırı yazıldı. `GET /api/inspiration` onu 327 ms'de, AI çağrısı yapmadan döndürdü. Satır testten sonra silindi.
- ⚠️ Canlı doğrulanmadı: sürümsüz satırın yeniden üretilmesi. Bu yol bir Anthropic çağrısı yapar; talimat gereği ücretli çağrı yapılmadı. Doğrulama kod okumasıyla sınırlı (koşul tek satır). İstenirse tek bir çağrıyla doğrulanabilir.

---

## 9. Çalıştırılan ve çalıştırılmayan testler

### Yöntem ve izolasyon
- **Test kimlikleri:** Senin `localhost` oturumuna ve verine dokunmamak için geliştirme sunucusu ayrı adreslerde çalıştırıldı. Her adresin çerezi ayrı olduğu için iki taze misafir kimliği oluştu:
  - `127.0.0.1:3001` → "Test" (kimlik `4e3ac059…`): Kişisel Çalışma Alanı, Odalarım, geri dönüş yolları
  - `kesif.localhost:3002` → "Keşif Test" (kimlik `d475dfce…`): Keşif yolu
  - Not: `127.0.0.1` ilk denemede Next.js'in geliştirme kaynaklarını çapraz köken olarak engellemesi yüzünden etkileşimsiz kaldı. `next.config.mjs` değiştirilmedi; sunucu `-H 127.0.0.1` ile o adrese bağlanarak çalıştırıldı. Bunun için `C:\projects\.claude\launch.json`'a iki test yapılandırması eklendi (proje dışı dosya).
- **AI çağrıları:** Hiç yapılmadı. Tarayıcıda yalnızca `/api/analyze` istekleri yakalanıp kayıtlı/sentetik yanıtlarla cevaplandı. Oda, fotoğraf, analiz kaydı ve karar istekleri gerçek sunucuya, test kimliği adına gitti. Kayıt, doğrulama ve onay mantığı gerçekten çalıştı; yalnızca modelin kendisi yoktu.
- **Görseller:** Tarayıcıda üretilmiş 64×64 düz renk PNG. Gerçek kullanıcı fotoğrafı kullanılmadı.
- **Yedek:** Testten önce `data/app.db`'nin tam kopyası alındı (oturumun geçici klasörü, `app-before-oda-test.db`).
- **Veri bütünlüğü kontrolü:** Test sonunda yedekle karşılaştırıldı. Test kimlikleri dışındaki bütün kimliklerin `users` (72), `rooms` (17), `room_photos` (13), `room_scans` (1), `room_analyses` (6), `decisions` (94) ve `inspiration_cache` (4) sayıları **değişmedi**.
- **Kaçınılmaz küçük yazım:** Görevin başında önizleme aracı `localhost:3000`'i bir kez açtı. Uygulamanın her açılışta gönderdiği olağan oturum telemetrisi (`/api/event`, `/api/state`) mevcut yerel dev misafirin adına yazıldı. Oda, karar ya da fotoğraf verisine dokunulmadı.

### Çalıştırılanlar
- Düzeltmeden önce: 4 yol + kapsam yetersiz alt yolu + ölü "Tekrar Dene" (§5)
- Düzeltmeden sonra: 4 yol + mevcut odaya kaydetme + yarım kalan kaydın tekrar denenmesi + kaydetmeden çıkış + kapsam yetersiz alt yolu (§5)
- Veritabanı doğrulamaları (§6), Tek Eşya kutlama metni (§7), sürümlü önbellek (§8)
- Değişen 4 dosyanın söz dizimi kontrolü (SWC), sunucu hata kaydı (hata yok)

### Çalıştırılmayanlar
- Gerçek AI yanıtıyla uçtan uca tarama (ücretli; kayıt ve onay mantığı AI'dan bağımsız olduğu için yanıt tekrarı yeterli görüldü)
- Gerçek telefon fotoğrafı, yavaş ağda büyük fotoğraf yüklemesi, 15 saniyelik bekleme sınırının aşılması
- Kaydetme adımından sonra oda sohbetinin sürdürülmesi (kod yolu: `sendRoomChat` → `persistRoomScanIfActive`, artık odası olan tarama)
- Fotoğraf yüklemesinin gerçek bir sunucu hatasıyla başarısız olması (yalnızca analiz kaydı hatası denendi)
- Sürümsüz önbelleğin yeniden üretilmesi (§8)
- Production

---

## 10. Kalan hatalar, belirsizlikler ve kullanıcı kararı gerektiren konular

### Karar bekleyenler
1. **Ana ekran mesajları** (`lib/homeMessages.js`): "Yaşam alanını istediğin gibi iyileştiriyoruz!" ve "Yaşadığın yer, her dokunuşunla daha da güzelleşiyor." karar sayısına dayanarak fiziksel değişim ima ediyor. Senin metnin olduğu için değiştirilmedi; revize edilsin mi?
2. **Kutlama başlığı** "Bugünün görevini tamamladın": Eylemi doğrudan iddia etmiyor ama "tamamladın" bağlamdan kopunca yapılmış iş gibi okunabilir. Kalsın mı?
3. **Eylemin gerçekleştiğini kaydetmek** (ör. "bağışladım" işareti): Bugün veri modelinde yok, bu görevde eklenmedi. İstenirse ayrı bir ürün kararıdır: durumlar, arayüz, puan/istatistik etkisi, Sestia'ya aktarımı.
4. **Mevcut 3 analizin boş fotoğraf bağı:** Test kimlikleri dışındaki 3 `room_analyses` satırında `photo_ids_json = '[]'`; büyük olasılıkla K2 yüzünden. Sonradan tahminle eşleştirmek yanlış bağ kurabilir, o yüzden dokunulmadı. Olduğu gibi mi kalsın?
5. **Test verisi:** Yerel veritabanında iki test kimliği ve onların 3 odası ("Test Salon", "Test Çalışma Odası", "Keşif Test Odası"), 8 fotoğrafı (dosyaları `data/room-photos/` altında), 8 analizi ve 25 kararı duruyor. Silinmesini istersen yalnızca bu iki kimliğe ait satırlar ve dosyalar temizlenebilir.

### Kalan küçük sorunlar (düzeltilmedi)
- Kayıt adımı başarısız olduğunda iki hata birden görünüyor: ekranın üstünde mevcut `SCAN_PERSIST_ERROR` ("Analiz odaya kaydedilemedi — bu oturumda görebilirsin ama sayfa yenilenirse kaybolabilir.") ve panelde kısa hata. Anlam doğru, tekrar var.
- Analiz 0 eşya bulursa alt bölüm hiç çıkmıyor; odasız taramada kaydetme adımı da görünmüyor. Onaylanacak bir şey olmadığı için çıkmaz değil.
- Oda Analizi ekranındaki geri butonu, tarama odadan başlatılmış olsa bile ana ekrana dönüyor (önceden de böyleydi).
- Keşif'teki "Birlikte düşündüklerimiz burada kalır." kartı: Oda Taraması için artık kaydetme yolu var, ama Keşif sohbeti hâlâ kalıcı değil (önceki raporlarda da açık).
- Odasız taramayı bir odaya kaydeden Keşif kullanıcısı artık "gerçek çalışması olan" sayılıyor (oda var) ve bir sonraki açılışta Kişisel Çalışma Alanı'nı görüyor. Bu, `hasStartedRealWork` tanımıyla tutarlı; kaydetmeyen kullanıcı Keşif'te kalıyor.

---

## 11. Mevcut veriye ve geriye dönük uyumluluğa etkisi

- **Şema:** Değişmedi. Yeni tablo ya da sütun yok.
- **Mevcut kayıtlar:** Hiçbiri değiştirilmedi, taşınmadı, silinmedi. Eski analizlerin boş fotoğraf bağları olduğu gibi duruyor.
- **Kayıtlı taramalar (`room_scans`):** Geri dönüş akışı aynen çalışıyor. Mevcut 1 kayıtlı tarama etkilenmedi.
- **Sunucu API'leri:** Değişmedi; istemci yalnızca mevcut uçları farklı sırayla kullanıyor.
- **Odalarım'dan başlatılan taramalar:** Kullanıcının gördüğü akış aynı. Tek fark, analizin yükleme bitince başlaması (en fazla 15 sn bekleme) ve fotoğraf bağının artık doğru yazılması.
- **Bu Hafta önbelleği:** Mevcut 4 satır toplu silinmedi. Her biri, sahibi Bu Hafta'yı bir sonraki açtığında bir kez yeniden üretilecek (kullanıcı başına bir AI çağrısı). `payload_json`'a eklenen `contentVersion` alanı istemci tarafından yok sayılıyor.
- **`REC_DONE_LABEL`:** Dışa aktarım kaldırıldı; projede başka tüketicisi yok (grep ile doğrulandı).
- **Tek Eşya kararları:** Değişmedi. Ana ekrandan verilen Tek Eşya kararları eskisi gibi odasız kaydediliyor; yalnızca kutlama metni değişti.

---

## 12. Commit / deploy durumu

- **Commit:** Yok. Değişiklikler çalışma kopyasında: `app/page.js`, `components/icons.js`, `lib/anthropic.js`, `app/api/inspiration/route.js` (bu görev) + önceki turların commit edilmemiş değişiklikleri.
- **Deploy:** Yok. Production'a, Railway'e ve production verisine erişilmedi.
- **Proje dışı dosya:** `C:\projects\.claude\launch.json`'a iki test sunucusu yapılandırması eklendi (`bir-oda-test-kimligi`, `bir-oda-test-kimligi-2`).
- **Geçici dosyalar:** Veritabanı yedeği oturumun geçici klasöründe; repoya eklenmedi.
