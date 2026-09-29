# SESTIA HAFIZA MİMARİSİ — YENİDEN DENETİM

**Proje:** Bir Oda. Bir Eşya. — Çalışma dizini: `C:\projects\SESTIA`
**Denetim tarihi:** 22 Eylül 2026
**Kapsam:** READ-ONLY. Kod değiştirilmedi, migration çalıştırılmadı, veritabanına yazılmadı, ücretli API çağrısı yapılmadı, deploy edilmedi.
**Yöntem:** Bu rapor, önceki denetim raporlarının bulgularını GÜVENİLİR kabul etmeden, mevcut çalışma kopyasını (kaydedilmemiş değişiklikler dahil) sıfırdan yeniden okuyarak hazırlanmıştır. Her teknik iddia dosya+satır referansıyla desteklenmiştir. Production'da doğrulanamayan hiçbir şey doğrulanmış gibi sunulmamıştır.

---

## Ön not: çalışma kopyasının durumu

`git status` çalıştırıldı (2026-09-22). Şu anda **commit edilmemiş** değişiklikler var:
- Değiştirilmiş: `app/api/state/route.js`, `app/globals.css`, `app/hosgeldin/page.js`, `app/page.js`, `lib/anthropic.js`, `lib/db.js`, `proxy.js`
- Takip dışı (untracked): `SESTIA_BILGI_KUTUPHANESI/`, `SESTIA_UYGULAMA_DENETIM_RAPORU.md`, `app/api/sestia-chat/`, `design-references/`, `docs/`, `lib/sestiaLibrary.js`

Bu rapor, bu **kaydedilmemiş hâliyle** çalışma kopyasını esas almıştır — yani Keşif sohbeti (`app/api/sestia-chat/`, `lib/sestiaLibrary.js`) gibi henüz commit edilmemiş özellikler de bu denetimin kapsamındadır, çünkü "kodun bugün ne yaptığı" budur.

---

## A — Yönetici Özeti

Sestia bugün **kısa vadeli, tek-oturumluk bir hafızaya** sahiptir; **uzun vadeli, güvenilir bir hafızaya SAHİP DEĞİLDİR.**

Somut olarak:
- **Konuşmaların/fikirlerin ham metni** (Tek Eşya ve Keşif sohbetlerinde) kalıcı olarak SAKLANMIYOR. Sayfa yenilenince ya da uygulamadan çıkılınca kayboluyor.
- **Oda Taraması** kısmen istisna: bir odanın TÜM geçmiş analizleri (`room_analyses` tablosu) kalıcı olarak saklanıyor ve kullanıcı aylar sonra dönse bile görüntülenebiliyor — AMA bu geçmiş, yeni bir AI çağrısına OTOMATİK olarak AKTARILMIYOR (yeni bir tarama, geçmişi hiç görmeden sıfırdan başlıyor).
- **Nihai kararlar** (`decisions` tablosu) kalıcı ve güvenilir biçimde saklanıyor — AMA bu tablo yalnızca "kategori + öneri + gerekçe" tutuyor; ÖNERİ, TERCİH, ONAY, RED, UYGULANMIŞ DEĞİŞİKLİK gibi durumlar birbirinden AYRIŞTIRILMIYOR (bkz. Bölüm D, C).
- **Misafirden hesaba geçişte önceki veri aktarılmıyor** — bu, kod incelemesiyle KESİN olarak doğrulanmış, kritik bir süreklilik kırığıdır (bkz. Bölüm C.5).
- **Geçmiş bilgiyi yeni bir AI çağrısına besleyen TEK mekanizma**, haftalık ilham özelliğidir (`app/api/inspiration/route.js`) — son 30 kararın düz bir özetini AI'ya veriyor. Bu, sohbetlerle hiç bağlantılı değil, tek yönlü ve çok dar kapsamlı.
- **Token/maliyet ölçümü SIFIR** — hiçbir API çağrısının `usage` alanı okunmuyor/kaydedilmiyor.
- **Kullanıcı verisini silme imkânı KODDA YOK** — ne bir API rotası ne bir veritabanı fonksiyonu bulundu.
- **Otomatik yedekleme mekanizması KODDA YOK** — bulunan tek yedek, elle alınmış tek bir SQLite kopyası (`backups/`, tek dosya, 2026-09-21 tarihli).

Sonuç: mevcut mimari, "Sestia aylarca aynı kullanıcıyla çalışabilir, geçmişi güvenilir biçimde hatırlar" hedefinin **çok gerisindedir**. Ancak bu, sıfırdan başlamak anlamına gelmez — `rooms`/`room_analyses`/`decisions` şeması, doğru ilişkilendirmelerle GENİŞLETİLEBİLECEK sağlam bir temel sunuyor (bkz. Bölüm E).

---

## B — Doğrulanmış Mevcut Mimari

### B.1 Sürümler (node_modules'ten doğrulandı, sadece package.json'a güvenilmedi)

| Paket | package.json | node_modules'te fiilen kurulu |
|---|---|---|
| next | 16.3.5 | 16.3.5 |
| react / react-dom | 19.3.0 | 19.3.0 |
| next-auth | ^5.0.0-beta.32 | 5.0.0-beta.32 |
| @auth/drizzle-adapter | ^1.11.3 | 1.11.3 |
| drizzle-orm | ^0.45.3 | 0.45.3 |
| better-sqlite3 | 13.0.3 | 13.0.3 |
| @anthropic-ai/sdk | 0.127.0 | 0.127.0 |
| resend | ^6.28.1 | 6.28.1 |

`package.json`'da `devDependencies` bölümü YOK — test çerçevesi (jest/vitest/playwright vb.) **kurulu değil**. `find` ile `.test.js`/`.spec.js` uzantılı hiçbir dosya bulunamadı — **proje genelinde otomatik test SIFIR**.

### B.2 Veritabanı — `lib/db.js` (671 satır), SQLite (`better-sqlite3`), WAL modu

Bağlantı: `lib/db.js:10` — `new Database(path.join(dataDir, 'app.db'))`, dosya `data/app.db`. Ortam değişkeni tabanlı bir DB URL yok, yol koda sabitlenmiş.

**16 tablo** (`lib/db.js:14-177`): `users`, `decisions`, `events`, `feedback`, `errors`, `message_state`, `inspiration_cache`, `auth_user`, `auth_account`, `auth_verificationToken`, `pending_signup`, `rooms`, `room_photos`, `room_scans`, `room_analyses`, `sqlite_sequence`.

Hafıza açısından kritik olanlar:

- **`decisions`** (`lib/db.js:23-31`): `id, device_id, category, recommendation, reasoning, source, room, room_id, created_at`. **INSERT-ONLY** — kodda hiçbir `UPDATE decisions` ya da `DELETE FROM decisions` ifadesi YOK (grep ile doğrulandı). Bir karar bir kez yazıldıktan sonra asla değiştirilemez/geri alınamaz; "vazgeçtim" durumu için YENİ bir satır eklemekten başka mekanizma yok, ve eski/yeni satırı birbirine bağlayan bir alan da yok.
- **`rooms`** (`lib/db.js:121-129`): `id, device_id, name, cover_photo_id, created_at, updated_at`. Oda kimliği KALICI ve sahiplik `device_id` ile iki kez doğrulanıyor (`lib/db.js:338-339` gibi fonksiyonlarda).
- **`room_photos`** (`lib/db.js:135-143`): Fotoğraf BAYTLARI diskte (`data/room-photos/<uuid>.<ext>`), DB sadece dosya adı+sahiplik tutuyor.
- **`room_scans`** (`lib/db.js:149-156`): Oda başına TEK satır — "tamamlanmış ama karara bağlanmamış" tarama. Yeniden taranırsa ÜZERİNE YAZILIR.
- **`room_analyses`** (`lib/db.js:166-177`): Oda başına ÇOK satır — her tamamlanmış analiz kalıcı, `session_key UNIQUE` ile idempotent (`lib/db.js:438-459`). `items_json` (Sestia'nın orijinal değerlendirmesi) ile `final_items_json` (kullanıcının nihai düzenlemesi) AYRI sütunlar — bu, "öneri ≠ karar" ayrımının kodda GERÇEKTEN VAR OLAN tek örneğidir, ama SADECE Oda Taraması için, Tek Eşya için YOK.
- **`message_state`**: Sestia Kütüphanesi'nin karşılama/kıvılcım rotasyonu için — sohbet mesajı DEĞİL, sadece bir index sayacı.

Hiçbir tabloda kullanıcı verisi SİLME fonksiyonu yok (grep ile doğrulandı — `DELETE FROM` yalnızca `room_scans` ve `pending_signup` için var, ikisi de kullanıcı geçmişi değil, geçici/ara durum).

### B.3 Kimlik — `lib/identity.js`, `lib/guestToken.js`, `lib/auth.js`

`getIdentity()` (`lib/identity.js:16-29`): önce Auth.js JWT oturumu (`account`), yoksa imzalı misafir cookie'si (`guest`, HMAC-SHA256, `AUTH_SECRET` ile). Guest token 180 gün (`lib/guestToken.js:10`), JWT oturum 30 gün (`lib/auth.js:39`).

**Kritik bulgu — misafir→hesap geçişinde veri SÜREKLİLİĞİ YOK:** `lib/auth.js`'deki `createUser` olayı (`lib/auth.js:71-77`) SADECE `pending_signup` tablosundan (e-posta ile anahtarlı) bekleyen bir görünen ismi uyguluyor. `auth_user.id`, DrizzleAdapter tarafından BAĞIMSIZ üretiliyor — misafirin `device_id`'siyle HİÇBİR ilişkisi yok. Kod tabanında `migrateGuest`/`mergeGuest`/benzeri hiçbir fonksiyon YOK (grep ile doğrulandı). Sonuç: bir misafir hesap oluşturduğunda, TÜM `rooms`/`decisions`/`room_analyses`/`users` satırları eski `device_id`'ye bağlı kalır ve yeni hesabın `device_id`'si (auth_user.id) farklı olduğu için bu veriler ARTIK ERİŞİLEMEZ hâle gelir.

### B.4 Anthropic entegrasyonu — `lib/anthropic.js` (398 satır)

Model: `process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'` (`lib/anthropic.js:9`). İstemci: `new Anthropic({ apiKey, timeout: 45_000 })` (`lib/anthropic.js:8`) — **`maxRetries` açıkça ayarlanmamış**, SDK'nın kendi varsayılanı geçerli: `node_modules/@anthropic-ai/sdk/client.js:112` → **varsayılan 2 tekrar deneme** (yani bir başarısız çağrı toplamda 3 denemeye kadar çıkabilir, sessizce).

**Prompt caching (`cache_control`) hiçbir çağrıda KULLANILMIYOR** — grep ile doğrulandı, sıfır eşleşme. Bu, her turda TÜM sistem promptunun (artık `SESTIA_CHARACTER_BASE` eklenmiş hâliyle daha da uzun, `lib/anthropic.js:19-38`) ve — fotoğraflı akışlarda — TÜM önceki mesaj geçmişinin + görsel(ler)in YENİDEN gönderildiği anlamına gelir.

**5 farklı sistem promptu var, karakter tutarlılığı eşit değil:**
- `SINGLE_PROMPT` (`lib/anthropic.js:41-63`, Tek Eşya) — karaktersiz, saf karar şeması.
- `ROOM_PROMPT` (`lib/anthropic.js:65-91`, Oda Taraması) — karaktersiz, kendini "declutter uygulaması" tanımlıyor.
- `TIPS_PROMPT` (`lib/anthropic.js:95-112`, haftalık ilham) — kısmi ton talimatı var, karaktersiz.
- `ROOM_COVERAGE_PROMPT` (fotoğraf yeterlilik kontrolü) — karaktersiz, görev-odaklı.
- `CHAT_PROMPT` (`lib/anthropic.js:126-131`, Keşif sohbeti) — `SESTIA_CHARACTER_BASE`'i kullanan TEK prompt.

**Token kullanımı hiçbir yerde okunmuyor/loglanmıyor** — grep ile doğrulandı (`usage`, `input_tokens`, `output_tokens` sıfır eşleşme tüm projede).

### B.5 API rotaları (hafızayla ilgili olanlar)

| Rota | Dosya | Kalıcı yazma yapıyor mu |
|---|---|---|
| `POST /api/analyze` | `app/api/analyze/route.js` (78 satır) | **Hayır** — stateless, sadece AI çağrısı yapıp sonucu döner |
| `POST /api/decide` | `app/api/decide/route.js` | Evet — `recordDecisions` çağırır |
| `POST /api/sestia-chat` | `app/api/sestia-chat/route.js` (37 satır) | **Hayır** — stateless, `chatFreely` çağırıp döner |
| `GET/POST /api/rooms`, `/api/rooms/[id]`, `/api/rooms/[id]/photos`, `/api/rooms/[id]/scan` | ilgili dosyalar | Evet — oda/fotoğraf/tarama/analiz kayıtları |
| `GET /api/inspiration` | `app/api/inspiration/route.js` (43 satır) | Evet — `inspiration_cache`, ama SADECE özet metni |

### B.6 Railway / veri sürekliliği (KOD ÜZERİNDEN DOĞRULANABİLEN KISIM)

`railway.json` yalnızca `build`/`deploy` (startCommand, restart policy) tanımlıyor — **hiçbir volume/kalıcı disk yapılandırması dosyada YOK**. `README.md` (önceki bir fazda okunmuştu) `better-sqlite3`'ün kalıcı disk GEREKTİRDİĞİNİ, bunun Railway dashboard'unda AYRI olarak yapılandırılması gerektiğini not ediyor. **Bu ayar Railway'in kendi panelinde olduğu için REPO KODUNDAN doğrulanamaz** — production'da gerçekten bir volume bağlı mı, bilinmiyor; bu raporda doğrulanmış gibi SUNULMUYOR.

`.gitignore`: `data/*.db*` ve `data/room-photos/` git dışı — yani DB dosyası ve fotoğraflar HİÇ commit edilmiyor, tamamen runtime diskine bağımlı.

`backups/` klasörü: **TEK** bir elle alınmış SQLite kopyası bulundu (`bir-oda-bir-karar-2026-09-21T13-41-12.db`, 2026-09-21 16:41 tarihli). Kod tabanında bu dosyayı üreten hiçbir script/otomasyon bulunamadı (grep ile "backup" kelimesi arandı, sıfır eşleşme kod dosyalarında). **Bu bir kerelik manuel bir kopya gibi görünüyor, tekrarlanan bir yedekleme sistemi DEĞİL.**

---

## C — Akış Bazında Hafıza Durumu

Her akış için 4 kategori ayrı ayrı değerlendirildi: (1) DB'de kalıcı, (2) sadece tarayıcı/geçici state, (3) sonradan kullanıcıya gösterilebilir, (4) yeni bir AI çağrısında GERÇEKTEN kullanılabilir.

### C.1 Keşif (`KesifView`, `app/page.js:1339` civarı, `app/api/sestia-chat/route.js`)

- **(1) DB'de kalıcı:** Yok. `chatFreely` (`lib/anthropic.js`) hiçbir DB yazma fonksiyonu çağırmıyor.
- **(2) Sadece geçici state:** TÜM sohbet. `chatMessages` React `useState` (`app/page.js` KesifView içinde) — sayfa yenilenince/view değişince sıfırlanır. Bu, önceki bir oturumda gerçek tarayıcıda TEST EDİLEREK doğrulanmıştı (yenileme sonrası sohbet boş geldi).
- **(3) Sonradan gösterilebilir:** Hayır — hiçbir yerde saklanmadığı için gösterilecek bir şey yok.
- **(4) Yeni AI çağrısında kullanılabilir:** Sadece AYNI sayfa oturumu içinde (istemci tam geçmişi her turda gönderiyor). Farklı bir oturumda SIFIR.
- **Kullanıcı sayfayı yenilerse/çıkarsa/geri gelirse:** Sohbet tamamen kaybolur. Karşılama/ilham kıvılcımı ROTASYONU (`message_state` tablosu) kalıcıdır ama bu içerik seçimidir, konuşma değil.

### C.2 Tek Eşya (`ScanView`/`DecisionView`, `sendChat` — `app/page.js:518`)

- **(1) DB'de kalıcı:** Yalnızca NİHAİ karar (`confirmSingleDecision` → `POST /api/decide` → `decisions` tablosu: category/recommendation/reasoning). Fotoğrafın kendisi, AI'nin ilk analizi, kullanıcının itirazları/sohbeti — HİÇBİRİ kalıcı değil.
- **(2) Sadece geçici state:** Fotoğraf (`singleFileRef`), analiz sonucu, TÜM sohbet geçmişi (`messages` state). `resetSingleScan` (`app/page.js:438`) yeni bir tarama başlatıldığında bunları sıfırlıyor.
- **(3) Sonradan gösterilebilir:** Sadece nihai karar (kategori+öneri), `Odalarım`'daki oda detayında (eğer bir odaya bağlıysa) ya da genel `decisions` istatistiklerinde. Fotoğraf/muhakeme YOK.
- **(4) Yeni AI çağrısında kullanılabilir:** Hayır — bir sonraki Tek Eşya taramasında önceki hiçbir sohbet/karar AI'ya aktarılmıyor.
- **Sonuç:** Bu akış "aylar sonra dönme" senaryosunu HİÇ desteklemiyor — her tarama sıfırdan başlıyor, geçmişle bağlantısız.

### C.3 Oda Taraması / Odalarım (`app/api/rooms/*`, `sendRoomChat` — `app/page.js:739`, `resumeRoomScan` — `app/page.js:376`)

- **(1) DB'de kalıcı:** Oda kimliği (`rooms`), fotoğraflar (`room_photos`), TÜM tamamlanmış analizler + sohbet transkriptleri (`room_analyses.items_json`/`messages_json`, oda başına SINIRSIZ sayıda satır), o odaya bağlı kararlar (`decisions.room_id`).
- **(2) Sadece geçici state:** Aktif tarama sırasındaki YÜKLENMEKTE olan fotoğraf dosyaları (`roomFilesRef`) — bunlar `/api/analyze`'e HER turda yeniden gönderiliyor (base64), DB'ye asla yazılmıyor (sadece nihai onaylanmış fotoğraflar `room_photos`'a kaydediliyor).
- **(3) Sonradan gösterilebilir:** Evet, güçlü biçimde — `getRoomDetail` (`lib/db.js:338-350`) fotoğrafları, kararları, aktif taramayı VE tüm geçmiş analizleri birlikte döndürüyor; `viewRoomAnalysis` (`app/page.js`) salt-okunur olarak gösteriyor.
- **(4) Yeni AI çağrısında GERÇEKTEN kullanılabilir mi:** **Kısmen, ve KIRIK bir biçimde.** `resumeRoomScan` (`app/page.js:376-392`) geçmiş `items`/`messages`'ı state'e yükler AMA `roomFilesRef.current = []` satırıyla (`app/page.js:380`) fotoğraf referanslarını BOŞALTIR. `/api/analyze`'in her turda fotoğraf İSTEMESİ nedeniyle (stateless tasarım), resume sonrası sohbete YENİ mesaj eklenemiyor — UI bunu `chatDisabled` ile engelliyor ve kullanıcıya açıkça söylüyor ("fotoğraflar yeniden gerekiyor"). Yani: geçmiş METİN olarak GÖRÜNTÜLENEBİLİYOR ama AI'nin YENİ bir yanıt üretirken bu geçmişi devam ettirmesi mümkün DEĞİL — kullanıcı fotoğrafları yeniden yüklemek zorunda, ve o noktada `analyzeRoom` YENİ bir `session_key` ile TAMAMEN yeni bir analiz başlatıyor (eski analizi "biliyormuş" gibi davranmıyor, sadece eski kararları `currentItems` parametresiyle uzlaştırıyor — bkz. `lib/anthropic.js` `analyzeRoom`, `history.length` dalı).
- **Aynı odaya aylar sonra dönme:** Fotoğraflar ve geçmiş metin GÖRÜNÜR kalır (dürüst bir kayıt). Ama Sestia'nın bu geçmişi "hatırlayarak" konuşmaya devam etmesi teknik olarak MÜMKÜN DEĞİL — her yeni analiz, geçmişten BAĞIMSIZ bir AI çağrısıdır (sadece `currentItems` listesi — kategori/öneri, muhakeme DEĞİL — bir sonraki turda "mevcut liste" olarak API'ye gönderiliyor).

### C.4 Kullanıcı hesabı (`lib/auth.js`, `WelcomeView` — `app/page.js:1058`)

Bkz. B.3 — misafirden hesaba geçişte **veri süreklilik KIRIĞI kesin olarak doğrulandı**. Bunun DIŞINDA: hesap oturumu 30 gün JWT + `/api/auth/session` mount-effect yenilemesiyle (`app/page.js:123`, `lib/auth.js:29-38` yorumunda açıklanmış) pratikte süresiz uzatılabiliyor (kullanıcı en az 30 günde bir uygulamayı açtığı sürece). Hesaba bağlı isim `auth_user.name`'den geliyor (misafirdeki gibi localStorage değil) — bu KISIM doğru tasarlanmış, cihazlar arası tutarlı.

### C.5 Karar durumlarının ayrışması (Bölüm 5'in beş örneği)

> "Bu sandalyeyi maviye boyayabiliriz." / "Belki mavi olur." / "Maviye boyamaya karar verdim." / "Vazgeçtim." / "Sandalyeyi maviye boyadım."

Kod üzerinden doğrulanan gerçek: **`decisions` şeması bu 5 durumdan sadece BİRİNİ modelleyebilir** — "karar verildi" (`recommendation` alanı, 5 sabit değerden biri: tut/sat/bağışla/at/geri_dönüştür). Kod tabanında YOK:
- Bir "öneri" (Sestia'nın fikri) ile "onaylanan karar" arasında yapısal bir alan farkı — `analyzeSingleItem`'ın `recommendation` alanı ile kullanıcının SEÇTİĞİ `selectedRec` (`app/page.js`) AYNI değişken tipini paylaşıyor, kullanıcı hiç değiştirmese bile ikisi ayrım gözetmeden `decisions`'a yazılıyor.
- "Reddedilen öneri" kaydı — sadece SON durum yazılıyor, ret edilen ara öneriler asla kalıcı olmuyor (konuşma DB'ye hiç yazılmıyorsa kayboluyor; yazılıyorsa bile — Oda Taraması'nda — JSON blob içinde gömülü, YAPISAL bir alan değil).
- "Gerçekten uygulanmış değişiklik" — **kod tabanında bu kavram HİÇ YOK.** Bir karar `decisions`'a yazıldığı an "tamamlanmış" sayılıyor; kullanıcının GERÇEKTEN o sandalyeyi boyayıp boyamadığını takip eden hiçbir alan/akış bulunamadı.

---

## D — Güvenilir Hafızanın Önündeki Eksikler (koda dayalı)

1. **Konuşma kalıcılığı yok (Keşif, Tek Eşya)** — bkz. C.1, C.2.
2. **Misafir→hesap veri sürekliliği KIRIK** — bkz. B.3. Bu muhtemelen en ciddi bulgudur: bir kullanıcı aylarca misafir olarak çalışıp sonra hesap oluşturursa TÜM geçmişini kaybeder.
3. **`decisions` tablosu tek-durumlu, immutable, ilişkisiz** — öneri/tercih/onay/ret/uygulama ayrımı yok, eski karardan yeni karara geçiş izlenemiyor (bkz. C.5).
4. **Oda geçmişi "görülebilir" ama "hatırlanarak devam ettirilemez"** — bkz. C.3, mimari sebep: `/api/analyze`'in stateless + fotoğraf-zorunlu tasarımı.
5. **Kütüphane (yeni `SESTIA_BILGI_KUTUPHANESI/`) ile kullanıcı geçmişi arasında SIFIR bağlantı** — kod bu klasörün varlığından habersiz (ayrı bir görev kapsamında, entegre edilmedi).
6. **Aynı eşyanın farklı taramalar arasında eşleştirilmesi için hiçbir mekanizma yok** — `room_analyses`'daki `items[].id` alanı (`item-1`, `item-2`...) SADECE tek bir analiz OTURUMU içinde tutarlı (bkz. `lib/anthropic.js` `analyzeRoom`, `history.length` dalındaki id uzlaştırma mantığı); farklı GÜNLERDE yapılan iki ayrı taramanın (iki ayrı `session_key`) eşyalarını birbirine bağlayan hiçbir kimlik/karşılaştırma yok (bkz. Bölüm 6 için ayrıca aşağıda).
7. **Token/maliyet ölçümü yok** — bkz. B.4.
8. **Prompt caching yok** — her turda tam prompt+geçmiş+görsel yeniden gönderiliyor.
9. **Kullanıcı verisi silme/düzeltme akışı yok** — bkz. B.2 sonu.
10. **Otomatik yedekleme yok** — bkz. B.6.
11. **Duplicate-kayıt riski** — `decisions` tablosunda `device_id+category+timestamp` gibi bir tekillik kısıtı YOK; `/api/decide`'da idempotency key yok. İstemci tarafında `confirming` bayrağıyla çift-tıklama engelleniyor (`app/page.js`, `confirmSingleDecision`) ama bu SADECE UI seviyesinde — ağ tekrar denemesi/çift istek sunucu tarafında engellenmiyor.
12. **Otomatik test SIFIR** — hiçbir değişikliğin hafızayı bozup bozmadığını doğrulayacak bir test paketi yok.

---

## E — Önerilen Hafıza Mimarisi (aşamalı, mevcut altyapıyla uyumlu)

Öncelik: **önce hangi bilgi güvenilir biçimde KAYDEDİLMELİ, sonra Sestia bunu nasıl GERİ GETİRİR.** Büyük bir agent mimarisi ya da ayrı bir vektör veritabanı BAŞLANGIÇ VARSAYIMI olarak alınmamıştır.

### E.1 Aşama 1 — Durum ayrımını veri modeline taşımak (DB şema genişletmesi, mevcut tabloları BOZMADAN)

**Problem:** C.5'teki 5 durum ayrımı yok.
**Neden mevcut sistem yetersiz:** `decisions` tek bir `recommendation` alanına indirgiyor.
**Basit çözüm var mı:** Evet — YENİ bir tablo (`decision_events` gibi) eklemek, MEVCUT `decisions` tablosunu bozmadan; her satır bir "olay" olur: `{device_id, target_id, event_type: öneri|tercih|onay|ret|uygulama, content, created_at}`. `decisions` tablosu "nihai onay" görünümü olarak kalabilir, `decision_events` ONUN ARKASINDAKİ TARİHÇEYİ tutar.
**Ne zaman gerekli:** Sestia'nın "daha önce mavi önermiştim ama sen vazgeçmiştin" diyebilmesi GERÇEKTEN isteniyorsa.
**Maliyet/bakım etkisi:** Düşük — tek yeni tablo, mevcut INSERT akışlarına bir satır daha eklemek.

### E.2 Aşama 2 — Tek Eşya ve Keşif sohbetlerini kalıcı hâle getirmek

**Problem:** C.1, C.2 — iki akışta hiçbir konuşma saklanmıyor.
**Neden mevcut sistem yetersiz:** Sadece React state var, DB tablosu yok.
**Basit çözüm var mı:** Evet — `room_analyses`'daki DESENİ (id+device_id+session_key+messages_json) AYNEN kopyalayan yeni tablolar: `single_item_sessions`, `kesif_sessions`. Yeni bir mimari İCAT ETMEK gerekmiyor, VAR OLAN kalıp tekrarlanabilir.
**Ne zaman gerekli:** Kullanıcı "geçen hafta konuştuğumuz o sandalye" diyebilmeli hedefi onaylanırsa.
**Maliyet/bakım etkisi:** Orta — yeni tablolar + ilgili API rotalarına yazma eklenmesi + `chatFreely`/`analyzeSingleItem`'ın çağrıldığı yerlerde persist çağrısı.

### E.3 Aşama 3 — Misafir→hesap veri taşıma

**Problem:** B.3 — en kritik süreklilik kırığı.
**Neden mevcut sistem yetersiz:** `createUser` olayı sadece isim taşıyor.
**Basit çözüm var mı:** Nispeten evet — `createUser` olayına, o anki misafir cookie'sinden okunan `device_id`'yi ALIP `rooms`/`decisions`/`users`/`room_*` tablolarındaki `device_id` sütunlarını TOPLU olarak yeni `auth_user.id`'ye UPDATE eden bir fonksiyon eklenebilir. Bu, YENİ bir mimari değil, MEVCUT tabloların `device_id` sütununu bir kez güncellemek.
**Ne zaman gerekli:** ÜRÜN KARARI GEREKTİRİR (bkz. Bölüm I) — bazı ürünler bilinçli olarak bunu YAPMAMAYI tercih edebilir (ör. gizlilik/kasıtlı "temiz başlangıç").
**Maliyet/bakım etkisi:** Orta-düşük teknik olarak, ama DİKKATLİ test gerektirir (yanlış migration = veri kaybı riski).

### E.4 Aşama 4 — Geçmişin yeni AI çağrılarına GÜVENLİ, ÖLÇÜLÜ biçimde aktarılması

**Problem:** "Sestia geçmişi hatırlıyor ama her turda TÜM geçmişi yeniden göndermek pahalı" gerilimi.
**Değerlendirilen seçenekler:**

- **Yapılandırılmış özet (önerilen ilk adım):** `inspiration_cache` DESENİNİN genişletilmesi — kullanıcının son N kararının/oda durumunun kısa, yapılandırılmış bir özeti (ör. "Salon: 3 karar, çoğunlukla tut; Mutfak: 1 karar, sat") her sohbet başlangıcında sisteme EKLENİR. Bu, TAM transkripti değil, ÖZETİ gönderir — token maliyetini sınırlı tutar. **Mevcut altyapıya en yakın, en ucuz seçenek.**
- **SQLite tam metin arama (FTS5):** `better-sqlite3` FTS5'i destekler (ayrı paket gerekmez). Kullanıcı "geçen ay bahsettiğim o masa" derse, kayıtlı sohbet/karar metinlerinde anahtar kelime araması yapılabilir. **Orta karmaşıklık, mevcut SQLite'a native.**
- **Konuşma özetleri (AI ile üretilmiş):** Her sohbet sonunda KISA bir özet ÜRETİP saklamak (ekstra bir model çağrısı gerektirir — maliyet artışı). Yalnızca transkript çok uzadığında (ör. Oda sohbeti 42 mesaj sınırına yaklaştığında) anlamlı olur.
- **Anlamsal arama (embedding/vektör):** **Bu aşamada gerekli DEĞİL.** Kullanıcı sayısı ve veri hacmi küçükken FTS5 + yapılandırılmış özet yeterli olur. Embedding, YÜZLERCE kayıtlı proje/konuşma arasında "anlamca benzer" arama gerçek bir ihtiyaç hâline geldiğinde (muhtemelen kullanıcı başına değil, kütüphane ölçeğinde) değerlendirilmeli — bugünden BAŞLANGIÇ VARSAYIMI olarak alınmamalı, talimata uygun.

**Öneri sırası:** Yapılandırılmış özet → FTS5 (ihtiyaç ortaya çıkarsa) → AI-üretimli özet (transkript büyürse) → anlamsal arama (SADECE ölçek gerçekten gerektirirse).

### E.5 Aşama 5 — Eşya/oda kimlik eşleştirme (Bölüm 6)

**Mevcut durum:** Kalıcı ODA kimliği VAR (`rooms.id`). Kalıcı EŞYA kimliği YOK — bir eşya sadece o TEK analiz oturumu içinde `item-N` kimliğine sahip; farklı taramalar arasında hiçbir eşleştirme yapılmıyor.
**Neden mevcut sistem yetersiz:** İki farklı tarihte çekilen aynı sandalyenin fotoğrafı, sistemde iki BAĞIMSIZ "eşya" olarak görünür.
**Basit çözüm var mı:** Kısmen — KESİN görsel eşleştirme (aynı fotoğraftaki nesneyi tanıma) AI/görüntü işleme gerektirir, bu raporun kapsamı dışında karmaşık bir problem. Ama DAHA BASİT bir ADIM: kullanıcıya "bu, önceden [X] olarak işaretlediğin eşya mı?" diye SORMAK (otomatik eşleştirme değil, kullanıcı ONAYLI eşleştirme) — teknik olarak küçük bir özellik, YANLIŞ eşleştirme riskini ortadan kaldırır.
**Kritik ilke (brief'in kendi talimatı ile uyumlu):** Sistem KESİN olarak eşleştiremediği iki eşyayı ASLA aynı eşya varsaymamalı — bu, "basit ama YANLIŞ" bir otomatik eşleştirmeden daha güvenli bir tasarım kararıdır.
**Ne zaman gerekli:** Kullanıcı deneyimi "bu odadaki masayı hatırlıyor musun" düzeyine çıkmak isterse ÖNCELİKLENDİRİLMELİ — şu an bu YOK.

---

## F — Maliyet, Güvenlik ve Veri Sürekliliği

### F.1 Maliyet (gerçek kod bulgusu vs varsayım AYRIMI net tutularak)

**Gerçek kod bulgusu:**
- Prompt caching YOK → her turda tam sistem promptu + geçmiş + görsel tekrar gönderiliyor (B.4).
- `maxRetries` varsayılan 2 → başarısız bir çağrı sessizce 3 kata kadar tekrarlanabilir (B.4).
- Token kullanımı hiç ölçülmüyor (B.4) — bu yüzden **gerçek maliyet rakamı bu denetimde ÜRETİLEMEZ**, sadece YAPISAL risk faktörleri listelenebilir.
- Fotoğraflar her sohbet turunda YENİDEN base64 kodlanıp gönderiliyor (Tek Eşya: `app/page.js:530` `formData.append('image', singleFileRef.current)`; Oda: `app/page.js:750` `roomFilesRef.current.forEach(...)`) — görsel input token maliyeti her turda TEKRARLANIYOR, ilk turdakiyle aynı.

**Varsayımsal (bu denetimde DOĞRULANMADI, sadece işaretleniyor):** Tam maliyet tahmini için gerçek kullanım hacmi (günlük istek sayısı, ortalama görsel boyutu, ortalama sohbet uzunluğu) gerekir — bu veri şu an ölçülmediği için TAHMİN ÜRETİLMEMİŞTİR.

**Somut öneri:** `msg.usage` alanının `events` tablosuna (zaten var olan telemetri tablosu) loglanması — YENİ bir tablo bile gerekmez, mevcut `events` şeması (`event_type`, `payload_json`) bunu zaten destekliyor.

### F.2 Güvenlik / mahremiyet

- **Kullanıcılar arası izolasyon:** Güçlü — her sorguda `device_id` çift kontrol ediliyor (`lib/db.js` genelinde tutarlı desen, ör. `getRoomDetail`, `getRoomPhotoFile`). Client'in gönderdiği hiçbir kimlik doğrudan güvenilmiyor (`getIdentity()` tek kaynak).
- **Misafir/hesap ayrımı:** Kriptografik olarak sağlam (imzalı token, `lib/guestToken.js`).
- **Veri silme:** YOK (D.9) — GDPR/KVKK türü bir "verilerimi sil" talebini karşılayacak hiçbir kod yolu bulunamadı.
- **Yanlış bilgiyi düzeltme:** `decisions` immutable olduğu için YOK — kullanıcı yanlış bir kararı DB'de düzeltemez, sadece YENİ bir karar ekleyebilir (eğer UI buna izin veriyorsa; aynı eşya için tekrar karar verme akışı bu denetimde ayrıca doğrulanmadı).
- **Kayıtlı sohbetlere erişim:** Sadece Oda Taraması için var (`getRoomDetail`), sahiplik kontrolü doğru.
- **Eşzamanlı istekler:** `room_analyses` için `session_key UNIQUE` + `ON CONFLICT` ile idempotent (B.2) — İYİ tasarlanmış. `decisions` için YOK (D.11).
- **Sestia Bilgi Kütüphanesi ile kullanıcı verisi karışması:** Kod seviyesinde risk YOK çünkü ikisi arasında HİÇBİR bağlantı yok (henüz entegre edilmedi) — ama bu aynı zamanda "izolasyon iyi çalışıyor" değil, "henüz bağlanmadığı için sorun ortaya çıkmadı" anlamına geliyor; entegrasyon aşamasında bu sınırın BİLİNÇLİ olarak korunması gerekecek.

---

## G — Test ve Doğrulama Stratejisi

Şu an SIFIR otomatik test var (B.1). Sestia'nın "doğru hatırladığını" kanıtlamak için önerilen, mevcut altyapıya uygun bir strateji:

1. **Veri katmanı testleri (en ucuz, en öncelikli):** `lib/db.js` fonksiyonları için gerçek API çağrısı GEREKTİRMEYEN, saf SQLite testleri (ör. `node:test` + geçici bir test DB dosyası — yeni bir framework kurmaya bile gerek yok, Node'un kendi `node:test` modülü yeterli). Örnek: "aynı `session_key` ile iki kez `saveRoomAnalysis` çağırmak tek satır üretir mi", "misafir device_id'si başka bir misafirin odasını göremiyor mu".
2. **Durum ayrımı testleri (E.1 uygulanırsa):** Öneri→tercih→onay→ret→uygulama zincirinin her adımının AYRI kayıt olarak tutulduğunu doğrulayan testler.
3. **Manuel senaryo testleri (AI çağrısı GEREKTİRİR, bu yüzden ücretli — bu denetimde ÇALIŞTIRILMADI, sadece ÖNERİLİYOR):** "Kullanıcı bir fikri reddediyor → Sestia eski fikri dayatmadan yeni yöne geçiyor mu" gibi senaryolar (önceki bir görevde, kullanıcı izniyle, sınırlı sayıda böyle bir test zaten yapılmıştı — bkz. `docs/SESTIA_KARAKTER_YENILEME_FAZ1.md`; bu YÖNTEM hafıza özellikleri eklendiğinde tekrarlanabilir).
4. **Migration testi (E.3 uygulanırsa, KRİTİK):** Misafir→hesap veri taşıma fonksiyonu, GERÇEK veri kaybı riski taşıdığı için, canlıya çıkmadan önce izole bir test veritabanında ayrıntılı doğrulanmalı — "taşıma sonrası eski device_id'ye ait hiçbir satır kalmadı", "yeni device_id tüm eski satırları görüyor" gibi.

---

## H — Öncelik Sıralı Uygulama Yol Haritası

*(Yalnızca öneri — implementasyon bu aşamada yapılmadı.)*

**Önce kurulmalı (diğerlerinin dayandığı temel):**
1. Token/usage loglama (F.1) — bağımsız, düşük riskli, HEMEN yapılabilir; sonraki maliyet kararlarının hepsi buna dayanır.
2. `decision_events` tablosu (E.1) — durum ayrımının temeli; bundan sonraki her "hafıza" özelliği bu ayrımı varsayacak.

**Bunlara bağımlı, ikinci sırada:**
3. Tek Eşya + Keşif sohbet kalıcılığı (E.2) — `decision_events` deseniyle tutarlı biçimde tasarlanmalı.
4. Yapılandırılmış özetin sohbete enjeksiyonu (E.4, ilk seçenek) — E.2'deki kalıcı veri olmadan özetlenecek bir şey sınırlı kalır.

**Ürün kararı bekleyen, teknik olarak bağımsız:**
5. Misafir→hesap veri taşıma (E.3) — Bölüm I'de kullanıcıya bırakılan bir karar.
6. Eşya kimlik eşleştirme (E.5) — kullanıcı onaylı versiyonu bağımsız eklenebilir.

**Sonraya bırakılabilir (ölçek gerektirmedikçe):**
7. FTS5 tam metin arama — veri hacmi arttıkça.
8. AI-üretimli konuşma özetleri — transkriptler gerçekten uzadıkça.
9. Anlamsal/vektör arama — talimata uygun olarak BAŞLANGIÇ VARSAYIMI değil, yalnızca somut bir ölçek ihtiyacı doğarsa.
10. Otomatik test paketi kurulumu — idealde 1-4 ile birlikte YAZILMALI (sonradan eklemek daha maliyetli), ama bu rapor kapsamında "hemen" değil "yol haritasının başında" olarak işaretleniyor.

---

## I — Karar Vermemiz Gereken Konular

Aşağıdakiler TEKNİK olarak mümkün olsa da ÜRÜN kararı gerektirir — bu rapor bu kararları VERMEMİŞTİR:

1. **Misafir→hesap veri taşıma (E.3) gerçekten isteniyor mu?** Bazı ürünler bunu KASITLI olarak yapmaz (ör. "hesap oluşturmak temiz bir başlangıçtır" felsefesi). Bu, teknik bir sınırlama değil, açık bir üstünlük kararı gerektiriyor.
2. **Ne kadar geçmiş "hatırlanmalı"?** Sınırsız mı, son N konuşma mı, son N ay mı? Bu hem maliyeti hem kullanıcı deneyimini doğrudan etkiler.
3. **Kullanıcı "unutmamı iste" diyebilmeli mi?** (Karakter Dosyası'nın §9'u — "kullanıcı hatırlanan bilgileri görebilmeli, düzeltebilmeli ve silebilmeli" diyor ama bu HENÜZ implementasyona bağlanmadı; hangi GRANÜLERLİKTE — tek bir konuşma mı, tek bir eşya mı, her şey mi — ürün kararı gerektirir.)
4. **Reddedilen öneriler ne kadar süreyle "hatırlanmalı"?** Sestia'nın 6 ay önce reddedilen bir fikri tekrar önermesi bazen YARARLI (kullanıcı fikrini değiştirmiş olabilir) bazen RAHATSIZ EDİCİ olabilir — bu bir denge kararı.
5. **Eşya eşleştirme kullanıcıya mı bırakılmalı, hiç mi yapılmamalı?** (E.5) — otomatik eşleştirme YANLIŞ pozitif riski taşıyor, kullanıcı onaylı eşleştirme ekstra bir etkileşim adımı ekliyor. Hangisi tercih ediliyor?
6. **Token/maliyet loglaması nereye gösterilecek?** Sadece iç ölçüm mü (mevcut `/admin` paneline eklenecek), yoksa kullanıcıya da mı gösterilecek?
7. **FTS5/AI-özet/anlamsal arama sırası, gerçek kullanım verisi görülmeden ÖN-KARARLANDIRILMALI mı, yoksa E.4'teki "ölçekle büyü" önerisi mi izlenmeli?**

---

*Bu rapor, `SESTIA_KARAKTER_ENTEGRASYONU_ON_DENETIM.md` ve `SESTIA_UYGULAMA_DENETIM_RAPORU.md` gibi önceki denetimlerin bulgularını GÜNCEL GERÇEK olarak KABUL ETMEDEN, kodun bugünkü (kaydedilmemiş değişiklikler dahil) hâlini yeniden okuyarak hazırlanmıştır. Karakter kanonu (`docs/SESTIA_KARAKTER_DOSYASI_v1.md`) değiştirilmedi. Hiçbir kod/veritabanı değişikliği yapılmadı, ücretli API çağrısı yapılmadı, deploy edilmedi.*
