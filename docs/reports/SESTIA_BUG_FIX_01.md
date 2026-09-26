# SESTIA — Bug Fix 01

Tarih: 26 Eylül 2026  
Kaynak: `docs/reports/SESTIA_BUG_AUDIT_01.md`  
Başlangıç commit'i: `45b4817c0b29b5cb7c9e5cc411326bdc07a37230`  
Durum: Yerel düzeltmeler ve doğrulama tamamlandı. **Deploy yapılmadı.**

## 1. Fix Summary

İstenen sırayla AUDIT-02 → AUDIT-01 → AUDIT-03 düzeltildi. Her bug için önce regresyon testleri eklendi, mevcut davranışta FAIL görüldü, ardından düzeltme uygulandı ve PASS doğrulandı.

| Bug | Yeni durum | Sonuç |
| --- | --- | --- |
| AUDIT-02 | FIXED — yerel doğrulama tamamlandı | Açık kullanıcı seçimi `manual` boolean'ı ile PATCH'e taşınıyor; aynı recommendation seçilse de DB, response ve resume'da korunuyor. |
| AUDIT-01 | FIXED — yerel doğrulama tamamlandı | Receipt yoksa belirsiz ilk snapshot aynı içerikle yeniden deneniyor; kullanıcı seçimleri ardından PATCH ile kaydediliyor. Conflict otomatik overwrite yerine açık recovery olarak kalıyor. |
| AUDIT-03 | FIXED — gerçek React/browser doğrulaması dahil | Confirmation için session ve işlem sahipliği uygulanıyor. Reset eski işlemi geçersiz kılıyor; geç yanıt/cleanup yeni ekranı veya yeni isteğin loading state'ini değiştiremiyor. |

Sonuç: **109/109 otomatik test**, ayrıca **4/4 gerçek React + browser history/popstate senaryosu** başarılı. İzole üretim derlemesi başarılı. Gerçek DB/WAL/SHM dosyalarının parmak izleri değişmedi.

## 2. Root Cause → Fix Mapping

### AUDIT-02

Eski sözleşme yalnızca recommendation farkına bakarak kullanıcı niyeti türetiyordu. Aynı öneriye bilinçli tıklamak bu nedenle manuel sayılmıyordu.

- `app/page.js:740` içindeki `persistRoomDraft`, her choice için `manual` alanını gönderiyor.
- `lib/roomDecisionStore.cjs:133` içindeki `draft`, verilen `manual` alanını boolean olarak doğruluyor ve saklıyor.
- Daha önce saklanan `manual=true` bilgisi yeni `false` veya eski payload tarafından silinemiyor.
- Exact retry kontrolüne `manual` eşitliği eklendi. Eski revision ile gelen yeni bir manuel tercih, aynı recommendation/excluded değerleri yüzünden yanlışlıkla replay sayılmıyor.
- AI reconciliation koruması değiştirilmedi; tüm item'lar manuel yapılmadı.

### AUDIT-01

İlk POST başarısızken receipt oluşmuyor; dirty taslak PATCH'e yönlendiriliyor, snapshot retry UI'si recovery yüzünden gizleniyordu.

- `roomInitialSnapshotRef` ilk belirsiz isteğin item/message/photo/session içeriğini tutuyor.
- `persistRoomDraft`, receipt yoksa önce bu orijinal snapshot'ı yeniden gönderiyor. Başarılı receipt alındıktan sonra güncel yerel seçimleri PATCH ediyor.
- `preserveDraft` sayesinde ilk snapshot'ın başarısı, henüz kaydedilmemiş yeni seçimler için yanlış başarı bildirimi oluşturmuyor.
- `retryRoomScanSave`, receipt/ilk snapshot durumuna göre doğru persistence yolunu seçiyor.
- Recovery paneli artık dirty=false snapshot retry düğmesini gizlemiyor. Dirty=true durumda mevcut taslak düğmesi aynı kurtarma yolunu çalıştırıyor.
- Odaya kaydetme retry'ı da bekleyen ilk snapshot varsa aynı yolu kullanıyor.
- İlk kayıt başarısızken dirty seçimlerle sohbet gönderilmesi, AI çağrısından önce snapshot + draft kaydını tamamlıyor.
- Boş/kapalı/farklı aktif oturuma ait recovery kaydı nedeniyle odaya dönmek yerel seçimleri atacaksa mevcut çıkış onayı kullanılıyor; sessiz reset yapılmıyor.

### AUDIT-03

Eski cleanup receipt eşitliğine bağlıydı. Reset receipt'i silince eski PUT kendi confirming bayrağını temizleyemiyor, bayrak sonraki taramaya taşınıyordu.

- `roomConfirmationRef` her PUT'un tekil işlem kimliğini tutuyor.
- Handler state render'ını beklemeden ref kilidi alıyor; aynı render içindeki tekrar çağrı ikinci PUT göndermiyor.
- Response uygulaması hem session/operation sahipliği hem receipt eşitliği arıyor.
- Cleanup session/operation sahipliğini arıyor. Receipt değişmiş olsa bile hâlâ aynı işlemin loading state'i temizlenebiliyor; farklı session/operation'ın state'ine dokunulamıyor.
- Reset önce eski operation sahipliğini iptal ediyor ve yeni ekran için `roomConfirming=false` yayımlıyor. Mevcut saving/chat/request reset korumaları korunuyor.

## 3. Files Changed

| Dosya | Değişiklik amacı |
| --- | --- |
| `app/page.js` | Explicit manual payload; ilk snapshot recovery; retry UI koşulu; kayıp seçim önlemi; confirmation operation sahipliği. |
| `lib/roomDecisionStore.cjs` | Manual doğrulama/persistence ve metadata'yı da karşılaştıran idempotent PATCH kontrolü. |
| `tests/room-client.test.cjs` | Payload/hydration/resume, failure recovery, sohbet sırası, browser-back handler ve stale PUT testleri. VM yardımcı fonksiyonu artık sonraki hook bloğunu yanlışlıkla çalıştırmadan fonksiyon sınırında duruyor. |
| `tests/room-decisions.test.cjs` | Gerçek route/store/SQLite ile beş enum, legacy payload, manual-only conflict ve ters sıralı ID testleri. |
| `tests/room-history-ui.test.cjs` | Boş recovery varken snapshot retry düğmesinin görünürlüğü. |
| `tests/room-browser-lifecycle.cjs` — yeni | Yerel, veritabanısız browser test sunucusu ve gerçek uygulama bundle'ı. |
| `tests/fixtures/room-browser-lifecycle.js` — yeni | Gerçek Page + React DOM + history.back/popstate ile dört deterministik async lifecycle senaryosu. Bütün fetch çağrıları fixture'dır. |
| `tests/helpers/browser-swc-loader.cjs` — yeni | Browser testi için mevcut kurulu Next/SWC ile JSX derleme yardımcısı; uygulama kaynağını değiştirmez. |
| `docs/reports/SESTIA_BUG_FIX_01.md` — yeni | Bu rapor. |

Yeni bağımlılık, DB migration, route/protocol sürüm değişikliği veya UI redesign yapılmadı. Test araçları mevcut React/React DOM/Next paketlerini kullanır. Ürün metni yenilenmedi; recovery çıkışında mevcut uyarı tekrar kullanıldı.

Önceki audit raporu değiştirilmedi. Görev başlangıcında mevcut olan `design-references/ChatGPT Image Sep 22, 2026, 07_13_59 PM.png` silinmesi bu fix'e ait değildir; dosyaya müdahale edilmedi. Commit/push/deploy yapılmadı.

## 4. Persistence Contract Changes

Yeni istemcinin PATCH choice biçimi:

```json
{
  "id": "item-1",
  "recommendation": "sat",
  "excluded": false,
  "manual": true
}
```

`manual=true`, kullanıcının karar düğmesine açıkça bastığını taşır. Recommendation'ın değişmesi şart değildir. A → B → A seçiminde de true kalır. Hariç tutma/dahil etme tek başına bütün item'ları manuel yapmaz.

Sunucu sözleşmesi:

1. ID/enum/excluded kontrolleri korunur. `manual` verilmişse kesinlikle boolean olmalıdır; string, sayı ve null 400 `invalid_choices` döndürür. Bu kontrol scan API'nin çağırdığı store içinde, transaction'da yapılır.
2. Yeni istemcide niyet payload'dan okunur; recommendation farkından yeniden tahmin edilmez.
3. Önceden saklanmış manual=true korunur. Kullanıcı tercihini AI'ye geri devreden yeni bir ürün davranışı eklenmemiştir.
4. PATCH replay kontrolü `(recommendation, excluded, manual)` üçlüsünü karşılaştırır. Revision/session/owner kontrolleri korunur.
5. DB şeması değişmez: `draft_items_json` ve `room_scans.items_json` mevcut alanı saklar. Response aynı item'ları döndürür; `setRoomItems(saved.items)` ve resume aynı metadata'yı alır.
6. `reconcileRoomItems` zaten manual item'ı korur. Bu koruma artık aynı-değer seçimi için de geçerli veri alır.

### Eski client ve legacy kararı

Protocol 2 kullanan fakat `manual` göndermeyen eski istemciler reddedilmiyor; **yalnız bu eski payload yolu** önceki değer-farkı davranışını koruyor. Sunucuda zaten manual=true olan tercihleri silemezler. Bu bilinçli, geriye uyumlu bir geçiş kararıdır; yeni istemci için heuristic çözüm değildir.

Eski istemci aynı recommendation'ı açıkça seçip alanı göndermiyorsa sunucu bu niyeti bilemez. Bu vakada tam garanti için istemcinin yenilenmesi gerekir. Geçmiş kayıtlara niyet uyduran migration yapılmadı. Legacy/onay durumu belirsiz analizlerin mevcut korumaları aynen kaldı.

## 5. Recovery Changes

| Durum | Yeni davranış |
| --- | --- |
| İlk POST commit öncesi 500 | İlk body saklanır. Aynı session/revision ile tekrar gönderilir; başarılı olursa receipt alınır. |
| İlk POST commit oldu, response kayboldu | Değiştirilmemiş ilk body tekrar gönderilir; mevcut server idempotency aynı analizin receipt'ini döndürür. Yeni analiz/karar üretilmez. |
| Receipt yok, dirty=false | Snapshot retry yeterlidir. Başarılı receipt olmadan scanSaved true olmaz. |
| Receipt yok, dirty=true | İlk snapshot replay → receipt → güncel ID/karar/excluded/manual seçimleriyle PATCH. Yerel seçimler snapshot response'u yüzünden geri alınmaz. |
| Snapshot başarılı, sonraki PATCH başarısız | Receipt korunur; dirty seçimler korunur, saved=false kalır. Sonraki retry normal PATCH yoludur. |
| Recovery snapshot boş | Retry gizlenmez; belirsiz ilk request yeniden denenebilir. |
| Recovery mevcut ve orijinal ilk kayıtla aynı | Idempotent replay ile devam edilir; kullanıcının sunucu verisini açmak zorunda kalıp yeni seçimlerini atması gerekmez. |
| Recovery mevcut ama revision/session değişmiş | Mevcut sunucu 409 koruması çalışır. Otomatik son-revision overwrite yapılmaz. Yerel seçimler ve recovery paneli korunur. |
| Repeated retry | Write ref kilidi eşzamanlı isteği engeller; daha sonra tekrarlanan aynı request mevcut idempotency sözleşmesini kullanır. |
| Yeni session / kullanıcı sunucu kaydını yüklemeyi seçer | Eski ilk-snapshot referansı temizlenir. Eski istek yeni session state'ini değiştiremez. |

Başarı bildirimi ancak gerçek POST/PATCH başarı response'uyla açılır. Recovery GET tek başına yerel seçimleri kayıtlı ilan etmez. Boş/kapalı snapshot'ın açılması yerel değişiklikleri atacaksa iptal edilebilir çıkış uyarısı vardır.

Conflict halinde otomatik birleştirme eklenmedi: kullanıcı retry edebilir veya açık onayla sunucudaki sürümü açabilir. Hangi tercihin kazanacağını sessizce belirlemekten kaçınıldı.

## 6. Async Lifecycle Changes

Confirmation sahipliği üç parçadan oluşur:

- `roomContext()` ile yakalanan yerel session sayacı ve scan sessionKey;
- `roomConfirmationRef.current` içindeki tekil operation nesnesi;
- Sonucun uygulanması için ilgili receipt nesnesi.

Akış:

```text
PUT A başlar → operation A ref'e yazılır → confirming=true
browser back → gerçek popstate handler → goTo(home) → resetRoomScan
  operation A invalidated; receipt temizlenir; confirming/saving/chat state reset
scan B açılır → normal idle state
PUT B başlar → operation B ref'e yazılır → confirming=true
PUT A geç success/error/finally → session/operation sahibi değil → B'ye dokunmaz
PUT B biter → yalnız B sonucu ve cleanup'ı uygulanır
```

Sadece `setRoomConfirming(false)` eklenmedi: senkron ref kilidi, result ownership, error/recovery ownership ve finally ownership birlikte değiştirildi. Sunucudaki atomic confirmation/replay davranışı değiştirilmedi. Ağ isteğinin client navigasyonuyla iptal edildiği varsayılmıyor; eski PUT sunucuda tamamlanmış olabilir, odayı yeniden açarken sunucu durumu okunur.

## 7. Tests Added

**22 yeni Node test vakası** eklendi; önceki 87 test kaldırılmadı veya atlanmadı.

| Bug / dosya | Yeni vaka sayısı | Korunan davranış |
| --- | ---: | --- |
| AUDIT-02 / `room-client.test.cjs` | 1 | Beş enum üzerinde aynı seçim, kaydetmeden önce A→B→A, exclusion aç/kapat, PATCH manual payload, hydration, resume ve sonraki AI önerisi. |
| AUDIT-02 / `room-decisions.test.cjs` | 5 | Her enum için aynı önerinin açık seçimi: gerçek API handler → store → DB → response → resume → AI reconciliation; aynı PATCH retry'ı. |
| AUDIT-02 / `room-decisions.test.cjs` | 1 | Farklı tercih, A→B→A, exclusion geçişleri ve yanlış manual tiplerinin 400 alması. |
| AUDIT-02 / `room-decisions.test.cjs` | 1 | Yalnız manual'ı değiştiren stale revision exact replay sayılamaz. |
| AUDIT-02 / `room-decisions.test.cjs` | 1 | Eski payload uyumu; dokunulmamış item false kalır, bilinen manuel niyet silinmez. |
| AUDIT-02 / `room-decisions.test.cjs` | 1 | Ters sıralı beş item/enum payload'ı ID bazında korunur; hariç item final history'de kalır ama decisions'a eklenmez. |
| AUDIT-01 / `room-client.test.cjs` | 4 | Commit öncesi 500 / commit sonrası kayıp yanıt × dirty=false / true; empty/existing recovery ve orijinal snapshot'ın tam replay'i. |
| AUDIT-01 / `room-client.test.cjs` | 1 | Receipt yokken taslak düğmesi kurtarır; tekrarlı tıklama eşzamanlı ikinci retry göndermez. |
| AUDIT-01 / `room-client.test.cjs` | 1 | Daha yeni sunucu revision'ı otomatik ezilmez; repeated retry yerel seçimleri korur. |
| AUDIT-01 / `room-client.test.cjs` | 1 | Boş/kapalı recovery, yerel seçimleri onaysız atamaz. |
| AUDIT-01 / `room-client.test.cjs` | 1 | İlk kayıt hatasından sonra sohbet: snapshot → PATCH → AI → sonraki snapshot sırası. |
| AUDIT-01 / `room-history-ui.test.cjs` | 1 | Empty recovery varken snapshot retry görünür; onay hâlâ disabled. |
| AUDIT-03 / `room-client.test.cjs` | 2 | Browser-back handler sonrası yeni session ve yeni pending PUT; eski success/failure yanıtı, cleanup ve recovery izolasyonu. |
| AUDIT-03 / `room-client.test.cjs` | 1 | React rerender olmadan yinelenen confirmation çağrısı tek PUT gönderir. |

### Gerçek React/browser testleri

VM testlerine ek olarak gerçek `app/page.js`, komponentleri, React ve React DOM bundle edilip yalnız `127.0.0.1:3002` üzerinde çalıştırıldı. Uygulama kodu test için değiştirilmedi. Bütün fetch çağrıları deterministik fixture'lardır; beklenmeyen API çağrısı hata üretir. Gerçek DB veya production AI kullanılmaz.

Test sayfası gerçek DOM click olayları, React render/effect döngüsü ve **`history.back()` ile gerçek popstate** kullanır. Dört varyant:

1. Eski PUT success, yeni scan'in kendi PUT'u pending.
2. Eski PUT failure, yeni scan'in kendi PUT'u pending.
3. Eski PUT success, yeni scan önce idle, ardından kendi PUT'unu başlatır.
4. Eski PUT failure, yeni scan önce idle, ardından kendi PUT'unu başlatır.

Her varyant iki hızlı confirmation click'ini, geç cleanup izolasyonunu ve `replayed:true` sonucunu da kontrol eder. Sonuçlarda `PUT count=2` (A ve B için birer istek), `stale recovery reads=0` gözlendi.

Tekrar çalıştırma:

```text
node tests/room-browser-lifecycle.cjs
http://127.0.0.1:3002/?case=success
http://127.0.0.1:3002/?case=failure
http://127.0.0.1:3002/?case=success&idle=1
http://127.0.0.1:3002/?case=failure&idle=1
```

Sayfa kendisi senaryoyu yürütüp PASS/FAIL gösterir. Bu dört vaka `npm test` sayısına dahil değildir; tarayıcı gerektiren ayrı regresyon aracıdır.

## 8. Test Results

### Red → Green kanıtı

| Aşama | Düzeltme öncesi | Düzeltme sonrası |
| --- | --- | --- |
| AUDIT-02 | 8 yeni assertion başarısız: payload'da manual yok, DB manual=false, invalid tip kabulü, manual-only stale replay. Legacy uyum kontrolü zaten geçti. | 96/96 test geçti. |
| AUDIT-01 ilk paket | 7 yeni test başarısız: retry ilerlemiyor / dönüş değeri yok / retry UI gizli. | 103/103 test geçti. |
| AUDIT-03 | Test helper sınırı düzeltildikten sonra 3 gerçek assertion başarısız: confirming=true kalıyor, double call iki PUT gönderiyor. | 106/106 test geçti. |
| AUDIT-01 yan yolları | 2 yeni test başarısız: empty/closed recovery'de onaysız çıkış; recovery yapılmadan AI çağrısı. | 108/108 test geçti. |
| ID eşleme ek kontrolü | Yeni sözleşmeye ters sıralı beş-item persistence/finalization kontrolü eklendi. | **109/109 test geçti.** |
| Gerçek browser AUDIT-03 | Eski kodda `FAIL: new scan inherited old confirming state`; yeni ekranda disabled “Kaydediliyor...” görüldü. | Nihai kodla dört varyantın tamamı PASS. |

### Son doğrulamalar

- `npm test`: **109 test, 109 pass, 0 fail, 0 skipped, 0 cancelled**.
- Gerçek React/browser: **4/4 PASS**.
- `node tests/build-isolated.cjs`: **PASS**, production Next.js derlemesi ve 20 statik sayfa üretimi tamamlandı. Kaynaklar geçici klasöre kopyalandı; gerçek kimlik bilgileri/data taşınmadı, fetch engellendi. Gerçek DB/WAL/SHM parmak izleri değişmedi.
- `git diff --check`: PASS. Git yalnız Windows LF/CRLF uyarıları verdi.
- Staging/production'a istek gönderilmedi; deploy yapılmadı.

## 9. Remaining Risks

1. **Eski açık istemciler:** `manual` alanını göndermeyen eski bundle, aynı-değer açık tercihini sunucuya anlatamaz. Deploy kararı sonrasında istemci yenileme gereklidir. Protokol zorunlu yükseltmesi bu fix'te seçilmedi; legacy uyumu yukarıda açıklandı.
2. **Tam cihaz/oturum matrisi:** Gerçek tarayıcı testi account kimliğini fixture'la temsil eder; gerçek guest cookie, hesap girişi, mobil cihaz ve çok-sekme etkileşimleri disposable ortamda ayrıca denenmeli. Mevcut server owner/revision testleri geçiyor.
3. **Gerçek AI'nin eşya semantiği:** ID'si doğru görünen fakat farklı fiziksel eşyayı temsil eden model çıktısı bu üç bug'ın kapsamı dışındadır. Deterministik AI fixture'ları seçim korumasını doğrular; gerçek model kalitesini ölçmez.
4. **Sayfa kapanması:** İlk belirsiz snapshot ref'i bellektedir; hard refresh sonrasında kaydedilmemiş seçimleri kalıcılaştıran offline storage eklenmedi. Mevcut dirty beforeunload davranışı korunur. Hiç seçim değiştirilmemiş, odaya kaydedilmemiş ilk analizin çıkış politikası audit'teki ayrı ürün riski olarak kalır.
5. **Revision conflict:** Otomatik merge yoktur. Sunucu sürümünü açmak kullanıcının açık seçimiyle yerel değişikliklerin yerine geçer. Conflict'e rağmen zorla başarı gösterilmez.
6. **İzlenebilirlik:** `decisions` tablosuna item/analysis foreign key eklenmedi; final snapshot ID'leri korur. Bu ayrı migration/tasarım konusudur.

Bu sınırlar dışında yeni bir P1 açık kaldığına dair test bulgusu yoktur; üç fix'in production'da doğrulandığı iddia edilmemektedir.

## 10. Manual Verification Checklist

Yalnız veri yazmaya izin verilen disposable staging ortamında:

- [ ] Misafir ve hesaplı kullanıcıyla; mevcut oda, yeni oda ve odaya sonradan bağlama yollarında tarama yap.
- [ ] AI'nin önerdiği karara aynen bas; taslak kaydet. “Senin seçimin” ve seçili buton kaybolmasın. Beş kararı ve A→B→A'yı dene.
- [ ] Hariç tut/dahil et, taslak kaydet, sayfayı yenile ve taramaya devam et. ID/karar/manual/excluded aynı kalsın.
- [ ] Sohbette farklı AI önerisi getir. Açık kullanıcı tercihi korunmalı; dokunulmamış önerilerin davranışı bozulmamalı.
- [ ] İlk snapshot POST'u commit öncesi başarısız yap; seçim değiştir; taslak kaydet/retry ile ilerle. İlk kayıt ve güncel seçimler kayıpsız tamamlanmalı.
- [ ] Commit sonrası POST response'unu düşür; retry et. Tek analiz ve doğru revision oluşmalı; seçimler geri dönmemeli.
- [ ] Başka sekmeden revision değiştir; conflict halinde yerel seçimler görünür kalmalı. Recovery'de vazgeçmek yerel veriyi silmemeli.
- [ ] PUT'u geciktir; telefon/tarayıcı geri yap; yeni tarama aç ve onun PUT'unu başlat. Eski success/error yeni ekranı veya yeni loading state'ini değiştirmemeli.
- [ ] Onaya hızlıca iki kez bas; kayıp PUT response'unu retry et. Tek karar seti/tek puan artışı oluşmalı.
- [ ] Onay sonrası oda/geçmiş görünümünü yeniden aç. Son kararlar, exclusion ve puanlar DB ile eşleşmeli.

**Deploy sonraki ayrı kullanıcı kararına bırakılmıştır.**
