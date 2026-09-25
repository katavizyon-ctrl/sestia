# Bir Oda. Bir Eşya. — Codex Faz 1 bağımsız doğrulaması

**Tarih:** 24 Eylül 2026
**Proje:** `C:\projects\1_ODA_1_KARAR`, `668a1ef` üzerindeki commit edilmemiş çalışma ağacı
**Doğrulanan:** `docs/CODEX_KARAR_VE_KAYIT_BUTUNLUGU_FAZ1.md` (B15, N03, N05, N06)
**Denetçi:** Claude Code. Faz 1 kodunu Codex yazdı. Bu oturumda uygulama kodunda değişiklik yapılmadı.

## 0. Sonuç

**Faz 1'in çekirdek iddiası doğru.** Aynı analiz iki kez onaylandığında ikinci bir karar, puan ya da sayaç artışı oluşmuyor. Onay, nihai seçimler ve aktif taramanın silinmesi tek bir SQLite transaction'ı içinde yapılıyor. Bu adımlardan biri hata verirse hepsi birlikte geri alınıyor. Geç gelen bir kapatma isteği başka bir taramayı değiştiremiyor. Sestia'nın ilk önerisi, kaydedilmiş taslak ve nihai karar ayrı alanlarda tutuluyor. `npm test` bu oturumda da 25/25 geçti.

**Codex raporunda eksik ya da fazla iddialı kalan noktalar var.** Faz 2'ye geçmeden önce aşağıdakilerin kapatılmasını öneriyorum:

- **Y1 (P2):** Bir yeni tarama, odadaki aktif taramayı koşulsuz olarak değiştiriyor. Önceki taramanın ilk kaydı geç gelirse daha yeni taramanın yerine geçiyor. Aktif satır yoksa eski bir analiz yeniden aktif hâle gelebiliyor. Bu, B13/N02 ile doğrudan bağlantılı.
- **Y2 (P2):** `analysis_id` alanı boş olan eski aktif tarama ne onaylanabiliyor ne de kapatılabiliyor. Yerel veride bu durumda bir kayıt var (oda 5).
- **Y3 (P2):** İstemci `DELETE` isteğini hiç göndermiyor. Bu yüzden terk edilen analizler süresiz açık kalıyor ve geçmişte "henüz onaylanmadı" olarak görünüyor.
- **Y4 (P3):** "Sestia'nın ilk önerisi" bilgisi istemciden geliyor ve sunucuda doğrulanmıyor. Uzunluğu da sınırlanmıyor.

Hiçbir bulgu mükerrer karar ya da puan üretmiyor.

## 1. Yöntem ve sınırlar

- Üç rapor okundu. Güncel `lib/roomDecisionStore.cjs`, `lib/roomItemSources.cjs`, `lib/db.js`, `lib/anthropic.js`, `app/api/rooms/[id]/scan/route.js`, `app/api/decide/route.js`, `app/page.js` ve üç test dosyası satır satır incelendi. `git diff` de gözden geçirildi.
- `npm test` bu oturumda çalıştırıldı: 25 test, 25 başarılı.
- Ek davranış denemeleri scratchpad'deki `probe.cjs` ile yapıldı. Codex testleriyle aynı düzenek kullanıldı: `lib/db.js`'in gerçek şeması ve fonksiyonları `vm` içinde, işletim sisteminin geçici klasöründe açılan ayrı SQLite dosyalarında çalıştırıldı. Denemeler bitince geçici klasörler silindi.
- Yerel `data/app.db` yalnızca `readonly + query_only` bağlantıyla okundu. `app.db`, `-wal` ve `-shm` dosyalarının SHA-256 özetleri okumadan önce ve sonra aynıydı. Migrasyon çalıştırılmadı.
- Yapılmayanlar: kod değişikliği, gerçek DB'ye yazma, `next build` ya da `next dev`, ücretli API çağrısı, commit, deploy, production erişimi. `next build`, `lib/db.js`'i import edip gerçek DB'ye migrasyon uygulayabileceği için bilerek çalıştırılmadı.

## 2. Doğrulananlar

| # | Soru | Sonuç | Kanıt |
|---|---|---|---|
| 1 | Aynı analizin tekrar onaylanması mükerrer karar, puan veya sayaç üretiyor mu? | **Üretmiyor.** | `confirm` fonksiyonu önce `confirmation_json` alanına bakıyor. Alan doluysa hiçbir şey yazmadan önceki sonucu ve güncel toplamları döndürüyor (`roomDecisionStore.cjs:79`). Testlerde ve denemede satır, puan ve sayaç yalnızca bir kez arttı. **İki ayrı bağlantıyla da denendi:** B bağlantısı, A'nın okuması ile yazması arasında onayladı. A `SQLITE_BUSY_SNAPSHOT` ile düştü ve karar satırı 1, puan 5 olarak kaldı. Yani iki süreç olsa bile çoğaltma olmuyor. Kaybeden istek 500 alıyor, tekrar denendiğinde replay sonucu dönüyor. |
| 2 | Gecikmiş onay veya kapatma başka bir aktif taramayı değiştirebiliyor mu? | **Değiştiremiyor.** | `DELETE` ve `PUT` artık `analysisId` istiyor. Aktif satır yalnızca `room_id + device_id + analysis_id` eşleşirse siliniyor (`:95`, `:104`). A'nın geç kapatılması B'nin satırını ve `final_items_json` alanını değiştirmiyor. Hem test hem deneme bunu gösteriyor. **Sınır:** Aynı koruma kayıt (POST) yolunda eksik. Ayrıntı Y1'de. |
| 3 | Transaction kararları, nihai seçimleri, puanları ve kapatmayı birlikte kapsıyor mu? Hata olursa hepsi geri alınıyor mu? | **Evet.** | `confirm` fonksiyonu `db.transaction` içinde çalışıyor. İçerideki `recordDecisions` transaction'ı savepoint olarak iç içe geçiyor. `getOrCreateUser` okuması, karar INSERT'leri, `users` ve `rooms` güncellemeleri, `final_items_json`, `confirmation_json`, `closed` ve scan DELETE aynı transaction içinde. Trigger ile zorlanan hatada karar, puan ve sayaç sıfırda kaldı, aktif scan korundu. |
| 4 | Revision kontrolü eski kayıtların yeni içeriği ezmesini engelliyor mu? | **Aynı analiz için evet.** | `editable` fonksiyonu revision tam eşleşmezse ya da analiz kapalıysa isteği reddediyor. Eski revision'la gelen POST veya PUT 409 alıyor. Onaylanmış analize geç gelen POST analizi yeniden açamıyor. "Aynı içeriğin tekrarı" istisnası yalnızca `revision === mevcut-1` ve içerik birebir aynıysa çalışıyor ve yazma yapmıyor. **Sınır:** Revision kontrolü analiz satırına bağlı. Aynı odadaki farklı analizler arasındaki sırayı korumuyor (Y1). |
| 5 | İlk öneri, kaydedilmiş taslak ve nihai karar ayrı tutuluyor mu? | **Evet.** | `suggestions_json` yalnızca ilk kayıtta oluşuyor. Daha sonra bilinen eşyalar için değişmiyor, yeni eşyalar ekleniyor (`:43-49`). `draft_items_json` ve `final_items_json` ayrı alanlar. Sohbet uzlaştırması `modelSuggestion` alanını koruyor. Geçmiş ekranı "ilk öneri", "Kaydedilmiş taslak" ve "Kararın" satırlarını ayrı gösteriyor. **Sınırlar:** Öneri bilgisinin kaynağı istemci (Y4). `items_json` hâlâ kullanıcının son seçimlerini içeriyor, yani özgün öneri olarak okunmamalı. Kodda da böyle okunmuyor. |
| 6 | Eski analizler ve eski aktif taramalar güvenli biçimde açılıyor mu? | **Güvenli: evet. Anlaşılır: kısmen.** | Eski satırlar okunuyor ve hiçbir tahmin yazılmıyor. Onay kapalı (`legacy_confirmation_unknown`). Ancak Y2, Y3 ve §5'teki gösterim kaybı var. |
| 7 | Migrasyon, API sözleşmeleri ve arayüz uyumlu mu? | **Büyük ölçüde evet.** | Migrasyon yalnızca sütun ekliyor ve tekrar çalıştırılabiliyor. Yerel DB'de henüz çalışmadı (sütunlar yok). İstemcinin çağrıları yeni sözleşmeyle uyumlu. İlk onay ile replay aynı `state` biçimini döndürüyor. Sınırlar Y5 ve Y6'da. |

Ek olarak doğrulananlar:
- Kapatılmış analize taslak yazılamıyor (`analysis_closed`).
- `PUT` gövdesinde gönderilen `finalItems` dikkate alınmıyor.
- Başka bir kullanıcı `draft`, `confirm`, `close` ve `save` yollarında 404 alıyor.
- `resetRoomScan`, önceki taramanın receipt'ini ve yazma kilidini temizliyor. Böylece yeni tarama eski analizin taslağını hedefleyemiyor (`page.js:746-749`).
- Taslak düğmeleri `chatBusy`, `confirming` ve `scanSaving` sırasında kilitli. Bu nedenle, kayıt sürerken yapılan bir seçimin "kaydedildi" olarak işaretlenip onaya sunucudaki farklı bir taslakla girmesi normal UI yolunda mümkün değil.

## 3. Doğrulanamayanlar

- **Gerçek Next.js paketlemesi.** Sözdizimi testi dosyaları yalnızca SWC ile dönüştürüyor. `import roomDecisionStore from './roomDecisionStore.cjs'` (sunucu) ve `import roomItemSources from '@/lib/roomItemSources.cjs'` (istemci bileşeni) için CJS/ESM uyumu, `@/` alias çözümü ve istemci paketine girmesi derlenmeden doğrulanamadı. Yüksek olasılıkla çalışıyor, ancak kanıt yok.
- **İstemci akışlarının gerçek zamanlaması.** `persistRoomScanIfActive`, `persistRoomDraft`, `confirmRoomDecisions`, `sendRoomChat` ve `resumeRoomScan` fonksiyonlarını hiçbir test çalıştırmıyor. §2'deki istemci sonuçları kod okumasına dayanıyor.
- **Tarayıcıda ağ kesintisi, `beforeunload` ve mobil yaşam döngüsü.**
- **Production verisi.** Yerel DB'deki eski kayıt sayıları production'ı temsil etmeyebilir.
- **Yüksek eşzamanlılık.** İki bağlantılı tek senaryo güvenli çıktı. Dosya kilidi beklemeleri ve `busy_timeout` ayarsızlığının yük altındaki etkisi ölçülmedi.

## 4. Yeni bulgular

### Y1 — Yeni tarama kaydı odadaki aktif taramayı koşulsuz değiştiriyor (P2, B13/N02 ile bağlantılı)

**Yer:** `roomDecisionStore.cjs:37-39` ve `:52`, `db.js` içindeki `saveRoomScan` (`ON CONFLICT(room_id) DO UPDATE`).

`different_active_scan` kontrolü yalnızca **daha önce var olan** bir analiz güncellenirken çalışıyor. Yeni bir `sessionKey` ile yapılan ilk kayıt, odanın `room_scans` satırını kontrol etmeden üzerine yazıyor. Aktif satır hiç yoksa, eski bir analizin güncellenmesi de satırı yeniden oluşturuyor.

Geçici DB'de yapılan denemeler:
- **Geç gelen ilk kayıt:** Önce B kaydedildi, ardından eski A'nın ilk kaydı geldi. Aktif tarama A oldu. B onaylandıktan sonra da aktif satır A olarak kaldı. Sonuçta kullanıcı odaya döndüğünde eski A'yı "devam edilecek tarama" olarak görüyor.
- **Diriltme:** A açıkken B başlatılıp onaylandı. Sonra A'nın sekmesinden bir sohbet kaydı geldi. A yeniden aktif tarama oldu.
- **Kapanmayan analiz:** B, A'nın yerine geçtiğinde A kapatılmıyor (`closed=0`). A, eski sekmedeki receipt ile hâlâ onaylanabiliyor.

**Etki:** Aynı analiz iki kez sayılmıyor, B15 geri gelmiyor. Ancak bir odada birden fazla açık ve onaylanabilir analiz bulunabiliyor. "Aktif tarama" bilgisi de gerçek son çalışmayı göstermeyebiliyor. Faz 1 raporundaki "Başka aktif taramanın yerine eski analiz güncellemesi geçirilemez" ifadesi yalnızca var olan analizler için geçerli.

**Öneri:** Oda başına "açık tarama" kuralını açıkça tanımlayın. Ardından bu kuralı store içinde uygulayın. Örneğin: var olan bir analiz, aktif satır kendisi değilse (satır hiç yoksa bile) yazamasın. Yeni analiz başka bir açık analizin yerine geçtiğinde, bu değişiklik aynı transaction içinde açıkça kaydedilsin. Bunu N02'deki oturum ve oda snapshot düzeltmesiyle birlikte tasarlayın. Yalnızca sunucuda sıralama yapmak, istemcinin eski oturum yanıtlarını uygulamasını engellemez.

### Y2 — `analysis_id` alanı boş eski aktif tarama temizlenemiyor (P2, eski veri)

**Yer:** `route.js:18` (`analysisId` zorunlu), `page.js:479-500` ve `:518-525`.

`getRoomScan` bu satır için `analysisId: null` ve `sessionKey: null` döndürüyor. `PUT` ve `DELETE` `analysisId` olmadan 400 veriyor. Onay düğmesi kapalı. Kullanıcı eşya seçimlerini değiştirebiliyor, ancak "Taslak Seçimlerini Kaydet" düğmesi "Önce analizin kaydını tamamla" hatası veriyor. "Tekrar Dene" düğmesi "yeni bir tarama başlat" diyor. Aynı ekranda üç ayrı uyarı görünüyor.

Kullanıcının bu taramadan kurtulmasının tek yolu aynı odada yeni tarama başlatmak. Bu da Y1'deki koşulsuz üzerine yazma sayesinde çalışıyor.

**Yerel veri:** `room_scans` tablosunda tek satır var: oda 5, `analysis_id` boş.

**Öneri:** Eski ve bağlantısız tarama için karar yazmayan, açık bir "Bu eski taramayı kapat" yolu ekleyin. Bu durumda seçim düğmelerini de salt okunur yapın.

### Y3 — İstemcide kapatma yolu yok; terk edilen analizler süresiz açık (P2 ürün ve veri tutarlılığı)

`app/page.js` hiçbir yerde `DELETE` çağırmıyor. Store'daki `close` fonksiyonu yalnızca testlerden erişilebilir durumda.

Kullanıcı taramadan onaylamadan çıkarsa ya da yeni bir tarama başlatırsa önceki analiz `closed=0` olarak kalıyor. Geçmişte her eşyası için "Kaydedilmiş taslak: … — henüz onaylanmadı." yazıyor (`page.js:2434`). Oysa arayüzde bu analizi onaylamanın bir yolu yok.

**Öneri:** "Vazgeç / kapat" politikasını belirleyin. Yerine başka tarama geçmiş analizleri "kapatıldı" ya da "yerine yeni tarama geçti" olarak etiketleyin.

### Y4 — "Sestia'nın ilk önerisi" istemciden geliyor ve sınırsız (P3)

**Yer:** `roomDecisionStore.cjs:44` ve `:47`, `anthropic.js:320-326` (`validRoomItems`).

Model çıktısı istemciye gidiyor, istemci de onu `items[].modelSuggestion` alanıyla POST ediyor. `validRoomItems` bu alanı hiç kontrol etmiyor. Denemede, istemcinin gönderdiği `{recommendation:'at', reasoning: 50.000 karakter}` değeri "ilk öneri" olarak olduğu gibi saklandı.

Kullanıcı yalnızca kendi verisini değiştirebildiği için bu bir güvenlik açığı değil. Ancak Faz 1 raporundaki "İstemci özgün öneriyi değiştiremez" ifadesi yalnızca PATCH için doğru. POST yolu tüm taslağı istemciden alıyor. Ayrıca bu alanın boyutu sınırsız olduğu için depolama ve model isteği şişebilir. `currentItems` bir sonraki sohbette modele geri gönderiliyor.

**Öneri:** `validRoomItems` içinde `modelSuggestion` alanı için şunları doğrulayın: `recommendation ∈ RECOMMENDATIONS` ve `reasoning ≤ 300`. Raporun ifadesini de buna göre düzeltin. Daha güçlü çözüm, ilk öneriyi sunucunun `/api/analyze` yanıtından kendisinin kaydetmesidir. Bu ancak analiz ile kayıt aynı yerde birleşirse mümkün (Faz 2 kapsamında düşünülebilir).

### Y5 — Kaybolan ilk kayıt yanıtında tekrar deneme 409 ile kilitlenebiliyor (P3, N04 ile bağlantılı)

"Aynı içeriğin tekrarı" kontrolü `photo_ids_json` değerini metin olarak karşılaştırıyor. Saklanan liste, sunucunun doğruladığı ve SQL'in döndürdüğü sırada. Tekrar denemede giden liste ise istemcinin ref'inden geliyor.

Odasız akışta tekrar deneme `saveRoomScanToRoom` fonksiyonunu yeniden çalıştırıyor. Fotoğraf yanıtı kaybolduysa (N04) yeni fotoğraf kimlikleri oluşuyor ve liste değişiyor. Doğrulanmamış bir kimlik ya da farklı bir sıralama da aynı sonucu veriyor. Sonuç `revision_conflict`. Kullanıcı "Analiz odaya kaydedilemedi" mesajıyla takılıyor, oysa analiz sunucuda kaydedilmiş durumda. Denemede doğrulanmamış bir fotoğraf kimliği ile 409 alındı.

PATCH tarafında da benzer bir durum var: yanıt kaybından sonra seçim değişirse 409 alınıyor ve mesaj "başka sekmede değiştiyse" diyor.

**Öneri:** 409 alındığında istemci güncel receipt'i sunucudan yeniden okusun. Kullanıcıya doğru bir durum mesajı gösterilsin.

### Y6 — Dağıtım anında açık kalan eski istemciler (P3)

Yeni POST için `revision` alanı zorunlu, bu yüzden eski istemci 409 alıyor. `/api/decide` üzerinden `source:'oda'` isteği 409, `analysisId` olmadan DELETE 400 alıyor. Yani deploy sırasında açık olan eski sayfalar oda taramasını kaydedemiyor ve onaylayamıyor. Çoğaltma riski yok, çünkü güvenli tarafta başarısız oluyorlar. Ancak kullanıcı sayfayı yenilemesi gerektiğini anlayamıyor.

**Öneri:** Sürüm uyuşmazlığı için ayrı bir hata kodu ve "sayfayı yenile" mesajı ekleyin.

### Y7 — Küçük gözlemler (P3)

- `route.js:24`: 500 hataları loglanmıyor. `SQLITE_BUSY_SNAPSHOT` gibi hatalar izsiz kalıyor.
- Oda onayı artık `decisions.room` alanına gerçek oda adını yazıyor (`:90`). Bu, N07'yi oda yolu için fiilen kısmen düzeltiyor, ancak raporda belirtilmemiş. Haftalık özet artık "Genel" yerine serbest oda adlarını görüyor.
- Onayda `category` en fazla 300 karakter olabiliyor (`validRoomItems`). Eski `/api/decide` yolundaki 60 karakter kesmesi burada uygulanmıyor.
- Geçmiş ekranındaki "excluded" görünümü `items_json` alanından geliyor, nihai karardan değil. Bu yüzden son POST'tan sonra hariç tutulan bir eşyanın kartı soluk görünmeyebiliyor. Etkisi yalnızca görsel.
- `/api/decide` kapısı yalnızca `source` etiketine bakıyor. `source:'tekli'` ve `roomId` ile gönderilen bir istek analizden bağımsız oda kararı yazabiliyor. Bu Tek Eşya'nın meşru yolu, bir regresyon değil. Ancak "eski yol kapatıldı" ifadesi etiket düzeyinde geçerli.

## 5. Eski veri etkileri

Yerel DB salt okunur okundu. Faz 1 migrasyonu henüz uygulanmamış.

| Veri | Durum | Yeni kodla davranış |
|---|---|---|
| `room_analyses`: 14 satır (10'u nihai kararlı) | Migrasyonla hepsi `suggestions_json = NULL` olacak | Hepsi "eski kayıt" sayılacak. Nihai kararlılar "özgün öneri saklanmamış" ve "Kararın: X" olarak gösterilecek. |
| Nihai kararı olmayan 4 eski analiz | Taslak ve nihai karar alanları boş | **Geçmişte hiçbir öneri ya da seçim görünmeyecek.** Yalnızca "özgün öneri saklanmamış" metni ve gerekçe kalacak. Önceden (yanlış etiketle de olsa) "Sestia'nın önerisi: X" görünüyordu. Veri duruyor, ancak ekrandan bilgi kayboluyor. Kaynağı belirsiz olarak işaretleyip "kayıtlı son öneri" şeklinde göstermek düşünülebilir. |
| `room_scans`: 1 satır (oda 5, `analysis_id` boş) | Eski ve bağlantısız | Y2: Onaylanamıyor ve kapatılamıyor. Ancak yeni taramayla değiştirilebiliyor. |
| Nihai kararlı analize bağlı aktif scan | 0 | Tipik B15 kalıntısı yerelde yok. Production için bilinmiyor. |
| Eski ve bağlantılı aktif scan'ler (production'da olabilir) | Hepsi `legacy_confirmation_unknown` | **Hiç onaylanmamış eski taramalar da kalıcı olarak onaylanamaz hâle geliyor.** Codex raporu bunu "onay geçmişi belirsiz" olarak tanımlıyor. Pratikte deploy öncesinde başlatılmış her tarama için onay kapanıyor. Kullanıcı taramayı yeniden yapmak zorunda. Bu güvenli bir tercih, ancak ürün kararı olarak açıkça onaylanmalı. |

Migrasyon `lib/db.js` modülü ilk yüklendiğinde otomatik çalışıyor. İki süreç aynı anda açılırsa ikinci `ALTER` "duplicate column" hatası verebilir. Bu, projedeki mevcut migrasyon kalıbıyla aynı risk. Tek süreçli dağıtımda sorun beklenmiyor.

## 6. Test açıkları

`25/25` sonucu doğru, ancak kapsamı raporda anlatılandan dar:

1. **İstemci kodunun hiçbiri test edilmiyor.** Faz 1 raporunun §8'indeki istemci korumaları (receipt kullanımı, yazma kilidi, oturum kontrolleri, kayıt sırasında kilitlenen kontroller, `beforeunload`) test dışında. UI testi yalnızca `RoomReviewView` bileşeninin statik çıktısını kontrol ediyor. `ACTION_ORDER=[]` verildiği için seçim düğmeleri ve bunların `disabled` durumları hiç render edilmiyor.
2. **POST ve PATCH route'ları test edilmiyor.** Route testinde yalnızca `PUT` ve `DELETE` çalıştırılıyor. `validRoomItems` ve `validRoomScanMessages` da `() => true` ile değiştirilmiş. Gerçek POST doğrulaması (Y4) ve `invalid_scan` yolu test edilmiyor.
3. **İki test aynı işi yapıyor.** "same confirmation twice" ve "lost HTTP response" testleri aynı çağrı dizisini içeriyor. Yanıt kaybı, dönüş değerinin atılmasıyla simüle ediliyor.
4. **Eşzamanlılık testi yok.** İki bağlantılı senaryo bu denetimde elle denendi ve güvenli çıktı. Kalıcı test olarak eklenmesi öneriliyor.
5. **Y1, Y2 ve Y3 senaryolarının hiçbiri test edilmiyor:** Geç gelen ilk kayıt, aktif satırsız eski analiz güncellemesi, bağlantısız eski scan'i kapatma, kapatma sonrası geçmiş etiketi.
6. **Test edilmeyen hata yolları:** `different_active_scan`, `no_items`, `invalid_choices`, kapatma sonrası onay, eski analizi kapatma.
7. **Sözdizimi testi derleme yerine geçmiyor** (§3). Modül çözümü ve CJS uyumu doğrulanmıyor.
8. **Test düzeneği gerçek uygulamadan ayrılıyor.** `lib/db.js` metin üzerinde dilimlenip `vm` içinde çalıştırılıyor ve `import` satırları siliniyor. `homeMessages` ve `sestiaLibrary` bağımlılıkları yüklenmiyor. Bunları kullanan fonksiyonlar çağrılsaydı testler hata verirdi. Düzenek, bağlantı kurulumunun değişmesine karşı bir assertion ile korunuyor, bu iyi.

## 7. B01/N01, B13/N02 ve N04 ile bağlantılar

- **N02 ve B13 → Y1:** Eski oturumun geç gelen ilk POST'u sunucuda aktif taramayı değiştirebiliyor. İstemci bu yanıtı yok sayıyor (`page.js:405`), ancak sunucudaki yazma zaten gerçekleşmiş oluyor. Faz 1'in "aktif tarama hedefleme" güvencesi bu yüzden eksik kalıyor.
- **N04 → Y5:** Fotoğraf yanıtı kaybolup yeniden yüklenirse kayıt tekrarı 409 alıyor.
- **B01 ve N01:** Onaylanan analizin kimliği doğru. Ancak analizin fotoğraf ve içerik bağlamı yanlış oturumdan gelmiş olabilir. Faz 1, "doğru analiz bir kez onaylanır" garantisini veriyor. "Analiz doğru girdiden üretildi" garantisini vermiyor. Codex raporu bu sınırı doğru belirtiyor.

## 8. Faz 2'ye geçmeden önce düzeltilmesi gerekenler

**Zorunlu (Faz 1'in güvenilirliğini doğrudan etkileyen):**
1. **Y1:** Oda başına açık tarama kuralını store'da uygulayın. Var olan bir analiz, aktif satır kendisi değilse (satır yoksa bile) yazamasın. Yeni analizin başka bir açık analizin yerine geçmesi açık ve denetlenebilir olsun. Bunun için test ekleyin.
2. **Y2 ve Y3:** Bağlantısız eski scan için ve genel olarak "onaylamadan kapat" için istemci yolu ekleyin. Kapatılmış ya da yerine başka tarama geçmiş analizler geçmişte "henüz onaylanmadı" olarak görünmesin.
3. **Commit kapsamı (B04):** `lib/roomDecisionStore.cjs`, `lib/roomItemSources.cjs` ve `tests/` takip dışı. `lib/db.js`, `lib/anthropic.js` ve `app/page.js` bu dosyaları import ediyor. Bu dosyalar olmadan yapılan bir commit derlenmez. Temiz checkout'ta, gerçek DB'ye dokunmayan bir veri klasörüyle `next build` çalıştırılarak doğrulanmalı.

**Kısa vadede önerilen:**
4. **Y4:** `modelSuggestion` şeklini ve uzunluğunu doğrulayın. Rapordaki iddiayı düzeltin.
5. **Y5:** 409 alındığında receipt'i sunucudan yeniden okuyun ve kullanıcıya doğru mesaj gösterin.
6. **§5:** Deploy öncesinde başlatılmış açık taramaların onaylanamayacağını bir ürün kararı olarak onaylayın. Nihai kararı olmayan eski analizlerde kaybolan öneri bilgisini "kaynağı belirsiz" etiketiyle gösterin.
7. **Y6 ve Y7:** Sürüm uyuşmazlığı mesajı ekleyin ve 500 hatalarını loglayın.
8. **Testler (§6):** Gerçek doğrulayıcılarla POST/PATCH route testleri, iki bağlantılı onay testi, Y1–Y3 senaryoları ve hiç değilse `confirmRoomDecisions` ile `persistRoomDraft` için sahte fetch ile istemci sıralama testleri ekleyin.

B15 ve N03'ün kapsamındaki mükerrer karar ve yanlış tarama kapatma riskleri kapanmış durumda. N05 ve N06 sunucu tarafında çözülmüş. N06'nın kalan zayıf noktası, öneri kaynağının istemciye güvenmesi (Y4).
