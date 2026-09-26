# SESTIA — Bug Audit 01

Tarih: 26 Eylül 2026  
İncelenen yerel commit: `45b4817c0b29b5cb7c9e5cc411326bdc07a37230`  
Hedef ortam: https://sestia-test-staging.up.railway.app/hosgeldin

## 1. Executive Summary

**Yerel kaynak kodu ve izole çalıştırmalarla üç bug doğrulandı.** Kullanıcının iki bildirimi tek bir enum/sıralama hatasına indirgenemiyor:

| ID | Durum | Önem | Sonuç |
| --- | --- | --- | --- |
| AUDIT-01 | CONFIRMED | P1 / Yüksek | İlk analiz kaydı başarısızken kullanıcı seçim değiştirirse taslak kaydetme için gereken receipt yoktur. Arayüz ilk kaydı yeniden deneme yolunu kapatır; toplu onay açılamaz. |
| AUDIT-02 | CONFIRMED | P1 / Yüksek | Kullanıcı sunucudaki mevcut kararı özellikle seçtiğinde PATCH, `manual: true` bilgisini kaybeder. Seçim vurgusu kaybolur; sonraki sohbet bu açık kullanıcı tercihini değiştirebilir. |
| AUDIT-03 | CONFIRMED | P1 / Yüksek | PUT sürerken tarayıcının geri işlemi oturumu sıfırlarsa `roomConfirming` temizlenmez. Sonraki taramalarda kontroller ve toplu onay kilitli kalır. |

**Önemli ayrım:** AUDIT-02'de yalnızca taslak kaydının anında `sat` değerini başka bir enum'a çevirdiği doğrulanmadı. Doğrulanan ilk bozulma `manual` alanındadır: seçili görünüm kaybolur. Sonraki sohbet adımında gerçek karar değeri de değişebilir. Farklı bir kararı seçme, beş enum'u kaydetme, ters sıralanmış ID'lerle PATCH gönderme ve yeniden açma kontrolleri doğru çalıştı.

Yerel arayüzde bildirilen “Tümünü Kaydet” karşılığı **“Tümünü Onayla (N eşya)”**, taslak düğmesi ise **“Taslak Seçimlerini Kaydet”**. Staging ile yerel commit eşitliği doğrulanmadığından bunların aynı sürüm olduğu varsayılmadı.

### Kapsam ve kanıt sınırları

- Canlı tarayıcıda `/hosgeldin → Hadi Başlayalım → /giris` doğrulandı. Davet kodu gönderilmedi; fotoğraf yüklenmedi, oda/karar oluşturulmadı.
- Bu sınırın nedeni kullanıcının **“DATABASE'E GERÇEK VERİ YAZMA”** talimatıdır. Giriş sonrası `/api/state`, `getState → getOrCreateUser` ile yeni kullanıcı satırı yaratabilir (`app/api/state/route.js:28`, `lib/db.js:255`). Dolayısıyla sırf ana ekranı açmak bile güvenli bir salt-okuma değildir. Başlangıç ekranına erişim canlı Oda Taraması reproduction'ı sayılmamıştır.
- İnceleme gerçek uygulama fonksiyonları, sahte ağ yanıtları, gerçek scan API handler'larının izole çağrıları, geçici SQLite fixture'ları ve React statik render ile yapıldı. Tam tarayıcı yaşam döngüsü/E2E veya gerçek AI servisi testi yapılmadı.
- Uygulama/test kaynakları değiştirilmedi; fix, refactor, deploy yapılmadı. Gerçek yerel veya staging veritabanı açılmadı. Test verileri sentetiktir; fixture'lar geçici klasörlerini temizledi.
- Kurulu Next.js route-handler rehberi okundu; route caching veya framework sürümü hakkında eski varsayımlarla çıkarım yapılmadı.
- Başlangıçta mevcut olan `design-references/ChatGPT Image Sep 22, 2026, 07_13_59 PM.png` silinmesi bu incelemeye ait değildir ve değiştirilmedi.

## 2. Confirmed Bugs

### AUDIT-01 — İlk kayıt hatasından sonra taslak/receipt çıkmazı

- **Severity:** P1 / Yüksek; hata koşulunda taramayı kaydetme/onaylama akışı bloke olur.
- **Reproduction:** Mevcut odadan tarama başlat. Analiz sonucunun ilk `POST /api/rooms/:id/scan` kaydını, commit gerçekleşmeden 500 ile başarısız kıl. Recovery GET için `analysis: null` döndür. Bir eşyanın kararını değiştir. “Taslak Seçimlerini Kaydet”e bas.
- **Expected:** Yerel sonuç ve seçimler korunarak ilk snapshot kaydı tekrar denenebilmeli; receipt alındıktan sonra onay açılmalı.
- **Actual:** `roomReceiptRef.current=null`, `roomDraftDirty=true`, `roomScanSaved=false`. Taslak handler'ı ağ isteği göndermeden “Önce analizin kaydını tamamla” hatasıyla çıkar. Ancak ilk analiz kaydını tekrar deneme düğmesi artık gösterilmez. Receipt olmadan taslak kaydı mümkün değildir.
- **Root cause:** `persistRoomDraft` receipt zorunlu tutarken `retryRoomScanSave` dirty olduğunda doğrudan aynı handler'a yönelir. `RoomReviewView` snapshot retry alanını `!draftDirty && !recovery` koşuluna bağlar. Recovery snapshot'ı boş olsa bile `recovery` nesnesi retry'ı gizler.
- **Dosya/function:** `app/page.js:597` `persistRoomScanIfActive`; `:455` `recoverRoomWrite`; `:721` `retryRoomScanSave`; `:730` `persistRoomDraft`; `:1153` `toggleRoomExclude`; `:1160` `setRoomItemRec`; `:2235` ve `:2254` `RoomReviewView`.
- **Zincirin kırıldığı yer:** Başarısız ilk POST → receipt yok → yerel seçim dirty → yanlış kayıt yöntemi seçimi. Enum/API normalization kaynaklı değildir.
- **Ek etki:** `loadRecoveredRoomScan` boş snapshot için `openRoom` çağırır (`app/page.js:464`); bu yol yerel taramayı sıfırlar. Bu çıkış seçimleri kaydeden bir kurtarma yolu değildir.
- **Güven:** CONFIRMED. Gerçek istemci fonksiyonlarıyla ilk hata ve sonraki handler çağrıları çalıştırıldı; yeni write oluşmadığı assert edildi. Statik render'da taslak düğmesi var, “Tekrar Dene” yok, toplu onay disabled. Canlı staging reproduction yapılmadı.

### AUDIT-02 — Aynı değerin açıkça seçilmesi kayıtta manuel tercih sayılmıyor

- **Severity:** P1 / Yüksek; kullanıcı niyeti kaybı ve sonraki sohbette sessiz karar değişimi.
- **Reproduction:** Yeni analizde `item-1 = { recommendation: 'sat', manual: false }` olsun. Kullanıcı aynı eşya için açıkça “Sat”ı seçsin. Taslağı kaydetsin. Ardından aynı ID için modelin `bagisla` önerdiği bir sohbet yanıtı gelsin.
- **Expected:** `sat` ve kullanıcının bunu açıkça seçtiği bilgisi korunmalı; seçim vurgusu kalmalı. Yeni AI önerisi kullanıcının seçiminin üzerine yazmamalı.
- **Actual:** Kaydetmeden önce `{recommendation:'sat', manual:true}`; PATCH/DB/response sonrasında `{recommendation:'sat', manual:false}`. Seçim vurgusu ve “Senin seçimin” satırı kalkar. Sonraki reconciliation `sat → bagisla` değişikliğine izin verir.
- **Root cause:** İstemci PATCH'te yalnızca `{id,recommendation,excluded}` gönderir. Sunucu `manual: item.manual || choice.recommendation !== item.recommendation` hesaplar. Eski kayıt manual=false ve aynı karar olduğunda sonuç false kalır. Sunucu, “kullanıcı bu kararı seçti” olayını değer farkından türetmektedir; bu iki bilgi aynı değildir.
- **Dosya/function:** `app/page.js:1160` `setRoomItemRec`; `:730` `persistRoomDraft`; `:743` payload; `:748` response hydration; `lib/roomDecisionStore.cjs:133` `draft`, özellikle `:145`; `app/page.js:2198` manuel seçim açıklaması, `:2205` selected class; `lib/roomItemSources.cjs:2` `reconcileRoomItems`, özellikle `:10`.
- **Zincirin kırıldığı yer:** client state → PATCH payload → sunucunun manual türetmesi → UI rehydration. ID ve recommendation ilk PATCH'te değişmez; kullanıcı-tercihi metadata'sı kaybolur. Sonraki AI reconciliation bunu “dokunulmamış öneri” olarak değerlendirir.
- **Koşul:** Daha önce gerçekten farklı bir değer kaydedilerek manual=true olmuş item aynı senaryoda bu hatayı göstermez. Model önerisinden farklı bir karar doğrudan seçildiğinde de karşılaştırma true üretir. “Bazı seçimler” etkilenmesini bu koşul açıklayabilir; kullanıcının canlı vakasının kesin eşleşmesi henüz bilinmiyor.
- **Güven:** CONFIRMED. Gerçek istemci handler'ı → gerçek API PATCH handler'ı/validator → gerçek store → geçici SQLite → response → istemci zinciri çalıştırıldı. React render öncesi/sonrası selected class ve sonraki reconciliation sonucu assert edildi. Gerçek model yanıtı yerine sentetik yanıt kullanıldı.

### AUDIT-03 — Onay sürerken tarayıcıyla geri dönüş kalıcı kilit bırakıyor

- **Severity:** P1 / Yüksek; sayfa yenilenene kadar sonraki oda işlemleri kullanılamayabilir.
- **Reproduction:** Kaydı tamamlanmış taramada toplu onaya bas; PUT yanıtını geciktir. İstek sürerken tarayıcı/telefon geri hareketini yap. Yanıt geldikten sonra başka tarama aç.
- **Expected:** Eski isteğin yanıtı yeni taramayı değiştirmemeli; yeni taramanın loading/confirming durumu temiz olmalı.
- **Actual:** `roomConfirming=true` kalır. Toplu onay “Kaydediliyor...” durumundadır; karar butonları disabled; bazı handler'lar doğrudan return eder.
- **Root cause:** `confirmRoomDecisions` true yapar; `finally` ancak `roomReceiptRef.current === receipt` ise false yapar. `goTo → resetRoomScan` receipt'i null yapar ama `roomConfirming` değerini sıfırlamaz. Geç yanıt receipt eşitliği kontrolünden geçemez. `resumeRoomScan` da bu bayrağı temizlemez.
- **Dosya/function:** `app/page.js:98` state; `:248` `goTo`; `:273` `handleBrowserBack`; `:298` popstate; `:964` `resetRoomScan`; `:1167` `confirmRoomDecisions`, özellikle `:1184`; `:678` `resumeRoomScan`; `:2261` onay düğmesi.
- **Zincirin kırıldığı yer:** Navigasyonla receipt invalidation → eski isteğin cleanup'ının atlanması → yeni oturuma taşınan confirming state. Veritabanının PUT'u başarıyla tamamlaması bu UI kilidini çözmez.
- **Not:** Ekran içindeki üst geri düğmesi confirming sırasında disabled'dır (`:2104`); tarayıcı popstate yolu aynı korumayı uygulamaz. Bu nedenle normal üst geri düğmesiyle senaryo üretilmez.
- **Güven:** CONFIRMED. Geciktirilmiş PUT, gerçek `goTo('home')`, reset ve geç yanıt işlenerek bayrağın true kaldığı assert edildi. Popstate'ten bu fonksiyona erişim kaynak koduyla doğrulandı; gerçek tarayıcı geri olayı izole deneyde üretilmedi.

## 3. Known Bug 1 Investigation

### Disabled koşullarının tamamı

`RoomReviewView`, `app/page.js:2261`:

```js
includedCount === 0 || confirming || chatBusy || scanSaving ||
draftDirty || legacyApprovalUnknown || !scanSaved
```

| Koşul | Kaynak / anlam | Değerlendirme |
| --- | --- | --- |
| `includedCount === 0` | `items.filter(it => !it.excluded).length`, `:2094` | Tümü hariçse beklenen koruma. Manuel seçilmiş sayısını değil dahil edilen sayısını ölçer. |
| `confirming` | `roomConfirming` | İstek sırasında normal; AUDIT-03 nedeniyle kalıcı kalabilir. |
| `chatBusy` | `sendRoomChat`, `:1117` | AI yanıtı ve sonraki persist sırasında normal kilit. |
| `scanSaving` | snapshot/draft/odaya kaydetme işlemleri | Devam eden kayıt sırasında normal kilit. |
| `draftDirty` | karar veya exclusion değiştirilince true | Mevcut tasarımda önce taslak kaydetmek zorunlu. Tek başına bug değildir. |
| `legacyApprovalUnknown` | kaynak/onay bağlantısı doğrulanamayan eski analiz | Mükerrer kararı engelleyen kasıtlı koruma; yeni analizle aynı değerlendirilmemeli. |
| `!scanSaved` | ilk state false; başarılı POST/PATCH veya resume true yapar | Odaya bağlanmamış/başarısız kayıtlı taramada normal; AUDIT-01 ile çıkmaza girebilir. |

Düğmenin görünürlüğü de ayrı koşullara bağlıdır: readOnly olmamalı, analyzing bitmeli ve item bulunmalı veya kapatma eylemi olmalı (`:2231`). `confirmRoomDecisions` ayrıca receipt, `roomRequestRef`, `roomWriteRef` denetler (`:1169`). Ekranın enabled görünmesi ile handler'ın gerçekten ilerleyebilmesi aynı sözleşme değildir; gösterge ve ref kilitleri ayrı tutuluyor.

### Akışlara göre sonuç

- **Oda içinden başlatılan yeni tarama:** begin rezervasyonu → fotoğraflar → analiz → otomatik snapshot POST. Başarılı kayıt ve dirty=false sonrasında onay açıktır. İlk kaydın başarısızlığı ve sonraki seçim AUDIT-01'i tetikler.
- **Oda seçmeden başlatılan tarama:** ilk `persistRoomScanIfActive` oda yoksa false döner (`:599`). `needsRoom=true` ile “Odaya Kaydet” gösterilir. Önce mevcut oda seçilir/yeni oda oluşturulur, begin/fotoğraf/snapshot tamamlanır, ardından onay açılır. Bu başlangıç disabled durumu beklenendir.
- **Sonuçları yeni odaya veya mevcut odaya ekleme:** `saveRoomScanToRoom`, `:634`, iki yolu aynı persistence zincirine bağlar. Yeni oda için operationKey, fotoğraflar için idempotency kullanılır. `needsRoom` kaydetme bitene kadar kaldığı için bu yolun retry UI'si AUDIT-01'deki oda-içi snapshot yolundan farklıdır.
- **Kaydedilmiş taramaya dönme:** `resumeRoomScan` receipt/revision ve seçimleri sunucudan alır; normalde `scanSaved=true`, `draftDirty=false`. AUDIT-03'teki eski confirming=true temizlenmez.
- **Guest/account:** `getIdentity` imzalı guest kimliği veya hesap kimliğini döndürür (`lib/identity.js:17`). Aynı scan handler/store ve UI state kullanılır; disabled ifadesinde kimlik türü koşulu yoktur. Private/email-required modunda guest'e izin verilmemesi ayrı erişim politikasıdır. Gerçek guest/account oturumlarıyla E2E yapılmadı.

**Sonuç:** Düğmenin her zaman disabled olduğu doğrulanmadı. Beklenen iki-aşamalı kayıt davranışı, AUDIT-01 ve AUDIT-03 ayrı nedenlerdir. Kullanıcının canlı olayında hangisinin geçerli olduğu, o andaki flag'ler ve request sonuçları olmadan kesinleştirilemez.

## 4. Known Bug 2 Investigation

### Aynı ID ve kararın uçtan uca takibi

| Aşama | Kod | Veri / davranış |
| --- | --- | --- |
| Kullanıcı seçimi | `app/page.js:1160` | İndeksteki item'a `{recommendation:key, manual:true}`; dirty=true, saved=false. |
| Yerel state | `app/page.js:97` | `roomItems`; kart key'i `item.id` (`:2178`). |
| Save handler | `app/page.js:730` | Receipt'teki analysisId/revision ve `choices` hazırlanır. |
| Payload | `app/page.js:743`, `lib/roomScanClient.cjs:2` | `{id,recommendation,excluded}`; JSON'a `protocol:2` eklenir. **manual gönderilmez.** |
| API | `app/api/rooms/[id]/scan/route.js:8`, `:55` | Kimlik/protokol/analysisId kontrolü; PATCH → `roomDecisions.draft`. Karar sıralaması uygulanmaz. |
| Normalizasyon/eşleştirme | `lib/roomDecisionStore.cjs:133` | Tam choice sayısı, benzersiz ID, izinli enum, boolean excluded doğrulanır; `find(c.id === item.id)` kullanılır. |
| Persistence | `lib/roomDecisionStore.cjs:152` | `room_analyses.draft_items_json`, revision ve `room_scans.items_json` transaction içinde yazılır. |
| Response | `lib/roomDecisionStore.cjs:156` | `{analysisId,revision,sessionKey,items}` döner. |
| UI hydration | `app/page.js:748` | `setRoomItems(saved.items)`; dirty=false, saved=true. Normal başarı yolunda ikinci GET yoktur. |
| Yeniden açma | `lib/db.js:409`, `lib/roomDecisionStore.cjs:191`, `app/page.js:678` | `draft_items_json` önceliklidir; modelSuggestion ayrı overlay edilir. |
| Nihai kayıt | `lib/roomDecisionStore.cjs:157`, `lib/db.js:282` | PUT kayıtlı taslağı kullanır; excluded item'ları ayırır; decisions + final snapshot + receipt atomik kaydedilir. |

### Neler elendi, neler doğrulandı?

- `ACTION_ORDER = ['tut','sat','bagisla','geri_donustur','at']` (`app/page.js:28`) istenen sıradadır. Store whitelist'inde `at` değerinin daha önce gelmesi yalnızca membership kontrolüdür; ordinal dönüşüm yapılmaz.
- İzin verilmeyen karar PATCH'te sessizce Tut'a dönmez; `invalid_choices` ile reddedilir. `normalizeRecommendation` helper'ı taslak/oda persistence zincirinin parçası değildir.
- Handler'ların indeks kullanması aynı render'daki item'ı değiştirir; persistence ID bazlıdır ve kartlar `key={item.id}` kullanır. Ters sıralı choice payload'ı ile değerlerin kaymadığı izole testte doğrulandı.
- `overlay` kararın üzerine AI önerisini yazmaz; ayrı `modelSuggestion` alanı ekler (`lib/roomDecisionStore.cjs:24`). Buradaki doğrudan karar overwrite hipotezi doğrulanmadı.
- **Doğrulanan sorun manual alanındadır.** `manual` hem seçili görünümün hem de AI değişikliğine karşı korumanın anahtarıdır. Değer eşitliği kullanıcı niyetini taşımadığı için bu iki davranış birlikte bozulur.
- Save 409/hata yolunda otomatik olarak sunucu seçimleri yüklenmez. Recovery ayrıca gösterilir; geçerli aktif snapshot'ın yüklenmesi kullanıcı onayı ister (`app/page.js:471`). Boş/kapalı snapshot'ın odaya dönüş dalı bu onaydan öncedir.
- Onayda `final_items_json` ID'li tam snapshot'ı korur. Ancak düz `decisions` kayıtlarında `analysis_id`/`item_id` yoktur (`lib/db.js:299`); nihai tekil karar satırının orijinal item'la ilişkisini şemadan doğrudan ispatlamak mümkün değildir. Bu bir izlenebilirlik sınırıdır, bu incelemede doğrulanmış seçim-kayması değildir.

## 5. Additional Bugs Found

**Doğrulanmış ek bug:** AUDIT-03. Ayrıntıları Bölüm 2'de; loading state'in yeni taramaya sızması kaynaklıdır.

Aşağıdakiler confirmed bug listesine dahil edilmemiştir:

| Durum | Konu | Kanıt ve sınır |
| --- | --- | --- |
| HIGH CONFIDENCE / UX kayıp riski | Henüz odaya kaydedilmemiş, hiç seçim değiştirilmemiş analizden çıkış | `goTo` ve beforeunload yalnızca `roomDraftDirty` kontrol eder (`app/page.js:129`, `:248`). İzole deneyde dirty=false ile çıkış uyarısız temizledi. Ancak “Odaya Kaydet” alanı açıkça kaydetmeden çıkınca taramanın saklanmayacağını söylüyor (`:2038`). Bu nedenle otomatik kayıt eksikliği tek başına bug ilan edilmedi. İlk persist hatası gibi diğer kaydedilmemiş durumlar için de koruma tasarlanmalı. |
| HIGH CONFIDENCE / kurtarma riski | Boş/kapalı recovery snapshot'ında yerel değişikliklerin atılması | `loadRecoveredRoomScan` onay diyaloğundan önce `openRoom` çağırır (`:464`); `openRoom` reset yapar (`:359`). Yerel unsaved içeriği koruyan bir recovery stratejisi gerekir. Canlı kayıp vakası üretilmedi. |
| SUSPECTED | AI'nin geçerli ID'yi farklı fiziksel eşyaya bağlaması | `reconcileRoomItems` ID'ye güvenir; model yanıtında eşya semantiği/ID tutarlılığı ayrıca doğrulanmaz. `analyzeRoom` model çıktısında ID formatı/uniqueness için giriştekine eşdeğer bir doğrudan kontrol yapmıyor (`lib/anthropic.js:414`). Gerçek model vakası olmadan eşya kayması doğrulandı denemez. |
| SUSPECTED | Deployed sürüm veya eski tarayıcı kodu farkı | Kullanıcının düğme adı ile yerel ad farklı. Protocol 2 olmayan write'lar 409 döner (`scan/route.js:15`); bu koruma mevcut. Canlı build SHA ve kullanıcının yüklediği bundle bilinmiyor. |

### Sağlam görünen korumalar

İncelenen testler ve ek kontrol; geç eski oturum yanıtları, revision conflict, farklı owner, eski analiz üzerine yazma, çift confirmation, transaction rollback, fotoğraf sırası ve room/photo idempotency için mevcut korumaları doğruladı. API hata verdiği halde scanSaved=true yapılması normal hata yolunda görülmedi. Bunlar bütün olası tarayıcı yarışlarının elendiği anlamına gelmez; AUDIT-03 eksik lifecycle cleanup örneğidir.

Yeniden açılan taramada sohbetin kapalı olması mevcut tasarımda açıklanır: `resumeRoomScan` sunucu fotoğraf URL'lerini kurar ama File nesnelerini geri getirmez; `chatDisabled={roomFilesRef.current.length === 0}` (`app/page.js:1336`). Bu davranış kararların değişmesiyle karıştırılmamalıdır.

## 6. State & Persistence Map

```text
Fotoğraf seçimi
  app/page.js:addRoomPhotos → lib/client.js:compressImage
  roomPhotosRef + roomPhotos state; upload/version/session referansları
    ↓ mevcut oda varsa fotoğraf upload + begin rezervasyonu
Kapsam kontrolü / Analiz
  checkRoomPhotoCoverage → startRoomAnalysis
  POST /api/analyze → lib/anthropic.js:analyzeRoom
  ID atama + roomItemSources.reconcileRoomItems
    ↓
roomItems + roomMessages + roomAnalysisPhotosRef
    ├─ oda varsa: persistRoomScanIfActive → POST /api/rooms/:id/scan
    └─ oda yoksa: SaveScanToRoom → saveRoomScanToRoom
         oda oluştur/seç → begin → fotoğraf upload → aynı snapshot POST
    ↓
roomDecisionStore.save (transaction)
  room_analyses.items_json + draft_items_json + suggestions_json
  messages_json + photo_ids_json + revision
  room_scans (aktif tarama snapshot'ı), room_scan_heads (oturum rezervasyonu)
    ↓ receipt: analysisId + revision + sessionKey
roomReceiptRef + scanSaved=true
    ↓ kullanıcı seçer / hariç tutar
setRoomItemRec / toggleRoomExclude → roomItems, draftDirty=true, scanSaved=false
    ↓ Taslak Seçimlerini Kaydet
persistRoomDraft → PATCH → roomDecisionStore.draft
  ID ile eşleme; draft_items_json + room_scans.items_json + revision
    ↓ items response
setRoomItems(saved.items), draftDirty=false, scanSaved=true
    ↓ Tümünü Onayla
confirmRoomDecisions → PUT → roomDecisionStore.confirm
  kayıtlı taslak → excluded filtre → recordDecisions
  decisions + users puan/sayaç + final_items_json + confirmation_json
  aktif scan temizlenir; head serbest bırakılır (aynı transaction)
    ↓ result.state / count / replayed
celebration → finishCelebration → openRoom
    ↓ GET /api/rooms/:id
getRoomDetail → getRoomScan / getRoomAnalyses
  açık tarama: resumeRoomScan → draft + receipt hydration
  geçmiş: viewRoomAnalysis → readOnly RoomReviewView
```

Sohbet yan kolu: `sendRoomChat` dirty taslağı önce PATCH ile kaydeder; `/api/analyze` yanıtını mevcut item'larla reconcile eder; tam snapshot POST yapar (`app/page.js:1117`). AUDIT-02 nedeniyle manual bilgisi daha önce kaybolmuşsa AI önerisi kullanıcının kararını değiştirebilir ve sonraki POST bu yeni değeri kalıcılaştırır.

Hata yan kolu: write hatası → `recoverRoomWrite` GET snapshot → yerel seçimler korunarak recovery paneli → kullanıcının sunucu sürümünü açması veya retry. Receipt bulunmaması ile mevcut taslağın güncellenmesi için ayrı kurtarma yolları gereklidir; AUDIT-01 bu ayrımın eksikliğidir.

## 7. Test Coverage Gaps

### Çalıştırılan mevcut testler

`npm test`: **87 test geçti, 0 başarısız**. İlk deneme sandbox içinde `C:\projects` erişimi için EPERM verdi; bu uygulama/test assertion hatası değildi. İzin verilen sandbox dışı çalıştırmada paket tamamlandı.

- `tests/room-client.test.cjs`: kaynak dosyadan gerçek fonksiyonları VM'e alır; state setter'ları senkron taklit eder. Fotoğraf yarışları, kayıt sırası, recovery, geç yanıtlar ve resume kapsanır. **React render/event batching ve gerçek browser lifecycle testi değildir.**
- `tests/room-decisions.test.cjs`: gerçek store, DB fonksiyonları ve API handler/validator'ları geçici SQLite ile sınar; kimlik/NextResponse adaptörü kontrollüdür. Gerçek ağ üzerinden HTTP E2E değildir.
- `tests/room-history-ui.test.cjs`: gerçek komponenti statik render eder. Test metadata'sında yalnızca Sat/Tut bulunur; gerçek beş seçenekli etkileşim yaşam döngüsü kapsanmaz.
- `tests/syntax.test.cjs`: syntax/compile kontrolüdür, davranış doğrulamaz.

### Bu incelemenin ek, kalıcı dosya oluşturmayan deneyleri

Mevcut test dosyaları bellekte yüklenip test kayıtları devre dışı bırakılarak helper'ları kullanıldı. Üretim DB bootstrap'ı mevcut fixture'ın yaptığı gibi geçici DB ile değiştirildi. Ürün veya test kaynak dosyaları düzenlenmedi.

| Deney | Sonuç |
| --- | --- |
| Gerçek client + PATCH route/store: aynı Sat tercihini kaydet | manual true → false; recommendation Sat kaldı; DB/response aynı hatayı taşıdı. |
| Aynı item'ın React görünümü | selected class kayıttan önce var, sonra yok. |
| Kaydedilen item'a sentetik sonraki AI önerisi | Sat → Bağışla; manuel tercih koruması kalkmıştı. |
| İlk snapshot 500, recovery analysis=null, ardından seçim | Taslak ve retry yeni write göndermedi; onay disabled kaldı. |
| Geciken PUT sırasında goTo(home), ardından yanıt/reset | roomConfirming true kaldı. |
| Oda olmadan dirty=false analizden çıkış | Uyarı çağrılmadı; item state temizlendi; Bölüm 5'te risk olarak sınıflandı. |
| Beş ayrı ID, beş karar, ters choice sırası, bir excluded item | PATCH → SQLite → resume eşleşmesi doğru; PUT 4 karar yazdı; history final snapshot korundu; tekrar PUT mükerrer üretmedi. |

Son kontrolün nihai DB kararları sırasıyla `sat, bagisla, geri_donustur, at` idi; beşinci item hariç tutuldu. Enum veya choice array sırası nedeniyle kayma gözlenmedi.

### Eksik regresyon testleri

1. Her beş karar için **mevcut öneriyle aynı değerin açık kullanıcı seçimi** → PATCH → render → sohbet → kalıcı kayıt.
2. Yeni snapshot'ın commit öncesi hata, commit sonrası kayıp yanıt ve boş recovery varyantları; kullanıcı hata sonrasında karar/exclusion değiştirdiğinde kurtarılabilirlik.
3. Gerçek tarayıcı geri/popstate ile pending PUT sırasında navigasyon; yeni scan/resume'un loading flag'lerinin temiz olması.
4. Kaydedilmemiş snapshot ile kaydedilmemiş seçim farkı; oda olmadan, mevcut odada ve failed-save sonrasında çıkış/refresh politikası.
5. Gerçek React state/render turuyla hızlı seçim→save, aynı karede tekrar tıklama ve delayed response kontrolleri. VM'deki senkron setter'lar yeterli değildir.
6. Gerçek beş seçeneği kullanan UI testinde selected görünüm ve erişilebilir seçim durumu; ayrı AI önerisi ile kullanıcı seçiminin karıştırılmaması.

## 8. Recommended Fix Plan

**Bu raporda hiçbir fix uygulanmadı.** Önerilen sıra:

| Öncelik / dosyalar | Öneri | Regresyon riski | Gerekli test |
| --- | --- | --- | --- |
| 1 — `app/page.js`, `lib/roomDecisionStore.cjs`, gerekirse scan route validator'ı | Açık kullanıcı tercihini payload/persistence sözleşmesinde koru. `manual` veya ayrı bir kullanıcı-seçimi alanının tam anlamını tanımla; eski değere eşitliği niyet yerine kullanma. Mevcut manual=true tercihi ve exclusion korunmalı. | Tüm AI önerilerinin yanlışlıkla manuel hale gelmesi; legacy kayıtların kaynak bilgisini uydurma; eski istemci payload uyumu. | Beş enum için aynı/değişik değer, A→B→A, hariç tut/dahil et, reload, sonraki AI önerisi. |
| 2 — `app/page.js`: retry/persist/recovery/footer | Receipt yoksa snapshot kaydı, receipt varsa draft güncellemesi seçen açık kurtarma akışı kur. Recovery paneli retry'ı körlemesine gizlememeli. Yerel seçimleri kaybetmeden sunucu revision/session durumu uzlaştırılmalı. | Gerçekte commit olmuş ilk POST'u tekrar ederek draft'ı ezme; eski session'ı diriltme. Mevcut idempotency/revision korumaları korunmalı. | Commit öncesi 500, commit sonrası lost response, recovery boş/dolu/409, dirty=true/false ve çift retry. |
| 3 — `app/page.js`: reset/confirm/browser back | Confirming durumunu oturum/işlem kimliğine bağla; reset yeni ekranı eski isteğin loading durumundan ayırsın. Geç cleanup yeni isteğin bayrağını söndürmemeli. Geri navigasyon politikası tutarlı olsun. | Eski yanıtın yeni isteğin kilidini erken kaldırması; yeniden PUT/çift celebration. | Pending PUT→popstate→yeni scan; eski success/error; yeni scan'in kendi pending PUT'u; replayed confirmation. |
| 4 — `app/page.js`: çıkış ve recovery | Kaydedilmemiş analiz, fotoğraf ve seçimleri ayrı ele alan çıkış uyarısı/koruma tanımla. Boş/kapalı recovery yerel değişiklikleri atacaksa bunu açıkça bildir. | Başarılı kayıt sonrası gereksiz uyarılar; kullanıcıyı sayfada kilitleme. | Oda seçilmemiş, failed save, dirty draft, saved draft, closed snapshot, refresh ve geri. |

`lib/roomItemSources.cjs` içindeki manual korumasını kaldırarak veya bütün item'ları koşulsuz manuel sayarak sorunu maskelemek önerilmez. `scanSaved=true` değerini hata durumunda zorla set etmek de veri bütünlüğünü bozar. Önce istemci/sunucu sözleşmesi düzeltilmelidir.

İzlenebilirlik için karar tablosuna analysis/item ilişkisi ekleme ayrı bir tasarım/migration işi olarak değerlendirilebilir; mevcut üç bug'ın ilk düzeltmesi için zorunlu olduğu kanıtlanmamıştır.

## 9. Verification Plan

### Otomatik

1. Mevcut 87 testin tamamı korunmalı ve geçmeli.
2. AUDIT-01/02/03 için düzeltmeden önce başarısız, sonra başarılı olan anlamlı regresyon testleri eklenmeli.
3. Aynı tercihi seçme testinde yalnızca recommendation değil `(id, recommendation, excluded, manual)` dörtlüsü her aşamada karşılaştırılmalı: UI state → payload → DB → response → resume → final snapshot.
4. Beş item'ın payload sırası ters çevrilmeli; her ID'nin kendi kararı korunmalı. Excluded item history'de görünmeli ama decisions sayısını/puanını artırmamalı.
5. Deferred network + gerçek browser/React testinde popstate, iki sekme revision conflict, repeated clicks ve save/chat çakışması denenmeli. Üretim AI yerine deterministik fixture kullanılmalı.
6. PUT tekrarında tek karar seti ve tek puan artışı; başarısız transaction'da karar/sayaç/finalization rollback; eski session ve owner izolasyonu yeniden doğrulanmalı.

### Manuel — ayrı, yazmaya izin verilen disposable test ortamında

Bu adımlar mevcut salt-inceleme turunda yapılmadı. Veri yazımına izin verilen ayrı test ortamı kurulunca:

- Guest ve hesaplı oturumda aynı senaryoyu yürüt: fotoğraf → analiz → beş karar → draft → onay → oda → geri dön → geçmiş. Ayrı owner verileri görünmemeli.
- Oda içinden yeni tarama, oda seçmeden mevcut odaya kaydetme, oda seçmeden yeni oda oluşturma ve kayıtlı taramaya devam yollarını ayrı dene.
- İlk öneriyi aynen seç; taslak kaydet; seçili görünüm ve değer aynı kalsın. Sohbetten aksi öneri getir; açık kullanıcı tercihi korunmalı.
- İlk snapshot kaydını commit öncesi başarısız yap; seçim değiştir; yerel veriyi atmadan retry ile kayıt ve onay tamamlanmalı.
- POST/PATCH/PUT yanıtını ayrı ayrı düşür; recovery ve tekrar deneme doğru kaydı hedeflemeli; başarı gösterilirse sunucu persistence'ı doğrulanmalı.
- PUT'u geciktir; telefon/tarayıcı geri yap; yeni tarama aç. Yeni ekran normal çalışmalı ve eski yanıt onu değiştirmemeli.
- Hepsini hariç tut: toplu onay kapalı kalmalı. Birini dahil et ve taslağı kaydet: geçerli receipt ile açılmalı.
- Kaydedilmiş taslakta refresh/reopen: aynı item/karar görünmeli. Kaydedilmemiş içerikte çıkış davranışı açık ürün politikasıyla uyuşmalı.
- Legacy bağlantısız/onay durumu bilinmeyen kayıtta koruma sürmeli; yeni analiz ile legacy yolunun durumları karışmamalı.

**Kabul ölçütü:** Kaydetme, aynı item'ın kullanıcı tarafından açıkça belirlenen tercihini veya bu tercihin kaynağını sessizce değiştirmemeli. Başarılı kayıt bildirimi kalıcı sunucu verisiyle eşleşmeli; eski oturumun yanıtı veya loading durumu yeni oturuma sızmamalı.
