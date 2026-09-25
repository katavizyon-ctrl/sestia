# BİR ODA. BİR EŞYA. — Uygulama Geneli Keşif ve Denetim Raporu

*(Read-only inceleme. Hiçbir dosya değiştirilmedi, hiçbir komut/deploy çalıştırılmadı, hiçbir gerçek kullanıcı verisine dokunulmadı.)*

---

## BÖLÜM 1 — YÖNETİCİ ÖZETİ

Uygulama teknik olarak sağlam ve tutarlı bir mimariye sahip: Next.js 16 + Auth.js v5 (Resend magic-link) + Drizzle + `better-sqlite3` (tek dosya, yerel disk). Kod kalitesi yüksek, kritik akışlar (kimlik, oda/analiz kalıcılığı) özenle yazılmış. Ancak **"Sestia bir karakterdir" vizyonu uygulamanın her katmanına henüz eşit ölçüde ulaşmamış**:

- **Giriş kapısı tutarsız**: Prod kullanıcısının gördüğü İLK iki ekran (`/hosgeldin` → `/giris`) birbiriyle çelişen iki farklı ürün pitch'i sunuyor — biri Sestia/yaşam-alanı odaklı, diğeri eski "tut/sat/bağışla/at" decluttering pitch'i. Aynı eski pitch, `manifest.json` ve `layout.js`'nin meta açıklamasında da birebir tekrarlanıyor.
- **AI talimatları arasında karakter tutarsız**: 4 sistem promptundan (tek-eşya, oda, haftalık-ipucu, Keşif-sohbeti) sadece **1 tanesi** ("Keşif sohbeti") kendini "Sestia" olarak tanıtıyor ve karakter pusulasını kullanıyor. Diğer 3'ü ("declutter uygulaması" diyor) karaktersiz, görev-odaklı talimatlar.
- **"Her cümle soruyla bitmesin" ilkesi henüz kütüphaneye yansımamış**: 12 karşılamanın ~10'u, 15 ilham kıvılcımının 14'ü soru işaretiyle bitiyor — sayısal olarak doğrulandı.
- **Geri bildirim formu ÇALIŞIYOR ama hiçbir bildirim mekanizması yok**: Mesaj veritabanına yazılıyor (doğrulandı), ama size ulaşması için birinin `/admin` paneline MANUEL girmesi gerekiyor — e-posta/Slack/push YOK. "Ulaştığı doğrulanamadı" gözleminizin kod-kanıtlı açıklaması budur.
- **Supabase mevcut projede YOK** — sadece README'de gelecek bir seçenek olarak anılıyor. Aktif veritabanı tamamen yerel SQLite dosyası.
- **Tasarım sistemi merkezi ama içerik-türüne göre renk ayrımı yok** — CSS değişkenleri var, ama Oda/Köşe/Eşya şu an aynı nötr tonda; "karakterli görsel tasarım" için altyapı hazır, uygulanmamış.
- Kendi önceki oturumumdan kalan bir **gerileme** buldum ve burada raporluyorum: aktif-kullanıcı düzeltmesi (oda var, karar yok → HomeView) sonrası bu kullanıcılar hâlâ eski `01_ilk_karsilasma` mesaj kategorisini görüyor olabilir (aşağıda Bölüm 12'de detaylı).

Neyin doğrulandığı / doğrulanamadığı: Bu raporda geçen HER teknik iddia doğrudan kod okunarak doğrulandı (dosya/satır referanslarıyla). Doğrulayamadığım tek şey: production'da gerçek e-posta teslimatının/domain doğrulamasının çalışıp çalışmadığı (bu, kod incelemesiyle değil gerçek gönderimle test edilir — kasıtlı olarak dış servise istek atmadım).

---

## BÖLÜM 2 — UYGULAMANIN MEVCUT HARİTASI

**Giriş zinciri (prod):** `/hosgeldin` (Sestia pitch'i) → "Hadi Başlayalım" → `/giris` (eski declutter pitch'i + erişim kodu) → kod doğru → `access_ok` cookie → `/` → `WelcomeView` (isim + misafir/e-posta seçimi).
*(Yerelde `NODE_ENV≠'production'` olduğu için `/giris` adımı proxy.js ve app/hosgeldin/page.js tarafından bilinçli olarak atlanıyor.)*

**Kimlik:** lib/identity.js → önce Auth.js oturumu (`account`), yoksa imzalı `guest_session` cookie'si (`guest`, lib/guestToken.js). İkisi ayrı `device_id` alanı olarak tüm tabloları besliyor.

**Ana dallanma** (app/page.js:869): `showWelcome` → `WelcomeView`; değilse `!(totalDecisions>0 || hasStartedWork)` → **Keşif** (`KesifView`); değilse **Kişisel Çalışma Alanı** (`HomeView`). Bu ayrım lib/db.js `hasStartedRealWork()` fonksiyonuna dayanıyor (`total_decisions>0` VEYA bu cihaza ait bir `rooms` satırı var).

**Keşif deneyimi** (`KesifView`, sadece gerçek işi olmayan kullanıcı): kişisel karşılama + ilham kıvılcımı (Sestia Kütüphanesi'nden), serbest Sestia sohbeti, Oda/Köşe/Eşya kartları (her biri sohbete davet), Süreklilik kartı, iki gerçek CTA (Oda Taraması / Tek Eşya).

**Kişisel Çalışma Alanı** (`HomeView`, gerçek işi olan kullanıcı): eski 8-kategorili mesaj sistemi (lib/homeMessages.js), Odalarım, Bu Hafta (haftalık ipucu), Tek Eşya/Oda Taraması girişleri, puan/seri istatistikleri, hesap linki.

**Diğer akışlar:** Tek Eşya tarama+karar (ScanView/DecisionView), Oda Taraması (RoomScanView/RoomReviewView), Odalarım listesi/detayı (RoomsListView/RoomDetailView), Bu Hafta (InspirationView), Kutlama (CelebrationView), Hesap (WelcomeView `alreadyGuest` modu ile yeniden kullanılıyor), Admin paneli (app/admin/page.js).

---

## BÖLÜM 3 — TÜRKÇE METİN ENVANTERİ

### A. Sabit UI metinleri (component içinde, React JSX)

| Ekran/Bağlam | Metin | Kaynak |
|---|---|---|
| `/hosgeldin` (giriş öncesi) | "BİR ODA. BİR EŞYA." / "Etrafına bir bak." / "Her şey tam da istediğin gibi mi?" / "Belki değiştirmek istediğin bir şey vardır. Belki de henüz ne olduğunu bilmiyorsundur." / "Birlikte keşfedebiliriz." / "Hadi Başlayalım" | app/hosgeldin/page.js:31-45 |
| `/giris` (erişim kodu) | "Yaşam alanını mevcut hâlinden istediğin hâle getirmene yardım eden bir uygulama. Bir fotoğrafla başla, neyi değiştirmek istediğini konuşalım — kararı hep sen verirsin." + "Nasıl Çalışır?" (Fotoğrafını çek / Yapay zeka önersin: **Tut, sat, bağışla, geri dönüştür ya da at** / Sen karar ver) | app/giris/page.js:54-91 |
| WelcomeView (isim) | "Merhaba, ben Sestia!" / "Sana nasıl hitap etmemi istersin?" / "Devam Et" | app/page.js:1174-1189 |
| WelcomeView (yöntem) | "Memnun oldum, {isim}!" / "Nasıl devam etmek istersin?" / "E-posta ile Devam Et" / "İlerlemeni koru, farklı cihazlardan kaldığın yerden devam et." / "Misafir Olarak Dene" / "Önce biraz keşfetmek ister misin?" / "E-posta yolda" | app/page.js:1197-1261 |
| Keşif — karşılama | Kütüphaneden (12 karşılamadan biri) + isim | lib/sestiaLibrary.js:27-40 |
| Keşif — ilham kıvılcımı | Kütüphaneden (15 kıvılcımdan biri) | lib/sestiaLibrary.js:43-63 |
| Keşif — sohbet daveti | "SESTIA" / "Aklına takılan bir şey mi var?" / "Bir soruyla, bir fikirle ya da yalnızca merak ettiğin bir şeyle başlayabilirsin. Fotoğraf paylaşman gerekmiyor." / "Sestia'ya ne sormak istersin?" | app/page.js:1359-1390 |
| Keşif — giriş kartı | "Evinle ilgili aklında ne var?" + üç paragraflık sabit metin | app/page.js:1401-1412 |
| Keşif — 3 kart | "Bir odanın başka bir hayatı olabilir mi?" / "Ya bütün oda değil, yalnızca bir köşeyse?" / "Peki ya yalnızca bir eşya?" + açıklamalar + **her üçünde birebir aynı**: "Bu fikir üzerine konuşmak ister misin?" | app/page.js:1417-1451 |
| Keşif — süreklilik | "Birlikte düşündüklerimiz burada kalır." / "Fotoğraflarına, değerlendirmelerine ve verdiğin kararlara 'Odalarım'dan istediğin zaman geri dönebilirsin. Bugün başlayıp başka bir gün devam edebilirsin." | app/page.js:1457-1463 |
| Keşif — son davet | "Aklına bir yer ya da eşya geldi mi?" / "Nereden başlamak istersin?" / "Bir odaya bakalım mı?" / "Bir eşyayı değerlendirelim mi?" | app/page.js:1469-1475 |
| HomeView | Ana başlık kütüphaneden (lib/homeMessages.js); sabit: "Odalarım" / "Oluşturduğun odalara göz at" / "Bu Hafta" / "Kararlarına göre kişisel ipuçları" / "Tek Eşya" / "Bir eşyayı birlikte değerlendirelim." / "Oda Taraması" / "Yaşam alanına birlikte bakalım." / "Puan" / "Karar Verildi" / "İlerlemeni koru." / "Odalarına ve kararlarına diğer cihazlarından da eriş." | app/page.js:1483-1580 |
| ScanView/DecisionView | "Analiz Sonucu" / "Eklemek istediğin bir şey var mı? (opsiyonel)" / "Yapay zeka fotoğrafı inceliyor..." / "Oda (opsiyonel)" / "Tümünü Onayla" | app/page.js:1960-2090 |
| RoomScanView | "Oda Taraması" / "Odanın olabildiğince genelini gösteren bir fotoğrafla başla — **Sestia** yeterli olup olmadığına bakıp gerekirse tek bir ek açı ister." / "Bu Fotoğraflarla Devam Et" / "Bu kesin bir ölçüm değil — **Sestia** sadece fotoğraflarda gördüğü kadarıyla değerlendiriyor." | app/page.js:1869-1946 |
| RoomReviewView | "Oda hakkında konuşalım" / "Oda veya eşyalar hakkında eklemek istediğin bir şey var mı?" / speaker etiketi: **"Asistan"** (Sestia değil) / "Bu, daha önce kaydedilmiş bir tarama — sohbete devam etmek için fotoğraflar yeniden gerekiyor." | app/page.js:2117-2144 |
| CelebrationView | "Harika iş{isim}!" / "Bugünün görevini tamamladın" / "Bir Eşya Daha Tara" / "Yarın Görüşürüz" | app/page.js:2248-2272 |
| InspirationView (Bu Hafta) | Başlık/ipucu içerikleri **AI üretimi** (lib/anthropic.js `generateWeeklyTips`); sabit sadece "Bu Hafta" / "Kararlarına bakıp ipuçları hazırlıyoruz..." | app/page.js:1592-1613 |
| Genel hata sınırı | "Bir şeyler ters gitti" / "Sorun bizde, senin bir şey yapmana gerek yok. Tekrar dener misin?" | app/error.js:15-21 |
| Geri Bildirim formu | "Geri Bildirim" / "Bir şey mi tuhaf geldi, bir fikrin mi var? Yaz, direkt bize ulaşsın." / "Aklından ne geçiyor?" / "Gönderildi, teşekkürler!" | components/FeedbackButton.js:46-61 |
| Hata mesajları (tekrarlanan kalıp) | "X yüklenemedi/oluşturulamadı/kaydedilemedi. Tekrar dener misin?" — bu kalıp **~12 farklı yerde** tutarlı şekilde tekrarlanıyor (odalar, oda oluşturma, fotoğraf, kararlar, analiz, sohbet...) | app/page.js çeşitli |
| Admin paneli | "Sahibi Paneli" / "Aktif Cihaz (son 7 gün)" / "Günlük Karar Sayısı" / "Geri Bildirimler" / "Hatalar" | app/admin/page.js |

### B. Sestia Kütüphanesi (veri kaynağı, lib/sestiaLibrary.js)
12 karşılama (27-40. satırlar), 15 ilham kıvılcımı, 4 kategoride (43-63. satırlar), karakter pusulası (20-24. satırlar).

### C. Eski Ana Ekran mesaj sistemi (lib/homeMessages.js)
8 kategori × ~7 satırlık havuz (toplam ~56 satır), + `07_ilerleme`'nin 3 alt-koşulu. Örnek ton: "Patron sensin ;)" / "Talimatlarını bekliyorum, patron! ;)" / "İlk hamle senden ;)" — emoji ve oyunbaz "ton" etiketleri kullanıyor, "Sestia" ismini hiç geçirmiyor.

### D. AI tarafından üretilen dinamik içerik
- Tek-eşya/oda analiz yanıtları (`category`, `reasoning`, `reply`, `question`) — lib/anthropic.js
- Haftalık ipucu (`headline`, `subtext`, `tips`) — aynı dosya
- Keşif serbest sohbet yanıtları — aynı dosya, `chatFreely`

### E. E-posta içeriği
**Türkçe DEĞİL.** Magic-link e-postası Auth.js/Resend sağlayıcısının varsayılan İngilizce şablonunu kullanıyor: konu satırı `"Sign in to ${host}"`, gövde "Sign in to **host**" / "Sign in" butonu / "If you did not request this email you can safely ignore it." — hiçbir özelleştirme yok (node_modules/@auth/core/providers/resend.js:22, node_modules/@auth/core/lib/utils/email.js). `lib/auth.js`'de `sendVerificationRequest` override'ı YOK.

### F. Aynı metnin birden fazla yerde tekrarı (doğrulanmış)
- **Meta açıklama = manifest açıklaması** (birebir aynı cümle): "Bir eşyaya karar ver: tut, sat, bağışla, at ya da geri dönüştür — AI önerisiyle." — hem app/layout.js:7 hem public/manifest.json.
- **"Bu fikir üzerine konuşmak ister misin?"** — Keşif'te 3 kartın hepsinde birebir aynı.
- **"Kod yanlış görünüyor, tekrar dener misin?"** — `/giris` ve `/admin-giris`'te birebir aynı.
- **"X yüklenemedi/oluşturulamadı. Tekrar dener misin?"** kalıbı — ~12 yerde tutarlı biçimde tekrarlanıyor (bu OLUMLU bir tutarlılık örneği, sorun değil).

---

## BÖLÜM 4 — DİL VE KARAKTER TUTARLILIĞI

**Not:** Verdiğiniz 4 örnekten 2'si (greetings/giriş-kartı) aslında **önceki görevde birebir kullanılması istenen kütüphane/kart metinleri** — o zaman "verilen metni değiştirme" talimatı vardı. Şimdi doğallık sorunu olarak işaretlendiler; bu, revize kararının kasıtlı olarak önceki kilitli metne dokunmayı gerektireceği anlamına geliyor.

**1. Doğal olmayan / çeviri kokan ifadeler (ek örnekler, sizin verdiklerinize ek olarak):**
- "O eşyayla ne yapacağına karar veremiyor olabilirsin" tipi yapılar kütüphanede zaten yok, ama **"Bir eşyanın tek bir işi olmak zorunda mı?"** (spark id 8) ve **"Bir odanın ne için kullanıldığı, ne için kullanılabileceğini belirlemek zorunda mı?"** (spark id 3) aynı "...zorunda mı?" kalıbının art arda 2 kez kullanılması, kısa mesafede tekrar hissi yaratıyor.
- "Kararı hep sen verirsin" (`/giris`) ile Keşif'teki "son karar hep sende" (spark bağlamı) aynı fikri iki farklı kelime seçimiyle anlatıyor — küçük ama fark edilebilir bir tutarsızlık.

**2. Gereksiz varsayım içeren cümleler:**
- Sizin Örnek 3'ünüze ek: greeting id 5 "Nereden başlayacağına henüz karar vermedin mi?" ve id 12 "Henüz neyi değiştirmek istediğinden emin değil misin?" — ikisi de kullanıcının KARARSIZ olduğunu varsayıyor; kullanıcı aslında net bir fikirle gelmiş olabilir (uygulamanın "kullanıcı adına karar verme" ilkesiyle gerilimli).

**3. Tekrarlanan soru kalıpları (sayısal doğrulama):**
- **12 karşılamadan 9-10'u** soru işaretiyle bitiyor (id 4, 7'nin bir kısmı hariç).
- **15 kıvılcımdan 14'ü** soru işaretiyle bitiyor (sadece id 5 düz cümle).
- Keşif'teki 3 kart daveti **birebir aynı** soru ("Bu fikir üzerine konuşmak ister misin?") — hem tekrar hem "her cümle soru" sorunu.
- Bu, Bölüm 2'de belirttiğiniz "sürekli 'ister misin?' ile konuşan karakter istemiyoruz" ilkesiyle doğrudan çelişen, kod üzerinden sayılabilir bir bulgudur.

**4. Çeviri metni gibi duyulan ifadeler:** Magic-link e-postası (İngilizce, Bölüm 3-E) hariç kod içinde başka açık "çeviri" izine rastlamadım — genel olarak metinler orijinal Türkçe yazılmış hissi veriyor.

**5. Gereksiz resmî/mekanik dil:** `/giris` sayfasının "Nasıl Çalışır? 1. Fotoğrafını çek 2. Yapay zeka önersin 3. Sen karar ver" formatı, uygulamanın geri kalanının sıcak/davetkâr tonuna göre bir ürün broşürü gibi mekanik duruyor.

**6. Karakterden uzaklaşan ifadeler:**
- `homeMessages.js`'in oyunbaz/emoji tonu ("Patron sensin ;)") ile Sestia Kütüphanesi'nin sakin pusulası arasında belirgin ton farkı.
- `RoomReviewView`'daki sohbet konuşmacı etiketi **"Asistan"** — Keşif sohbetindeki **"Sestia"** etiketiyle tutarsız; aynı karakter iki farklı isimle anılıyor.
- `/giris` sayfası Sestia'yı hiç karakter olarak tanıtmıyor, sadece "Yapay zeka önersin" diyor.

**7. Aynı deneyimde tutarsız konuşma biçimleri:**
- Üç farklı "sohbet" arayüzü üç farklı görsel/sözel kalıp kullanıyor: tek-eşya'da sade bir not alanı (konuşmacı etiketi yok, "Eklemek istediğin bir şey var mı? (opsiyonel)"), oda'da "Oda hakkında konuşalım" başlıklı tam sohbet günlüğü ("Asistan"/"Sen"), Keşif'te "SESTIA" başlıklı ayrı bir kutu ("Sestia"/"Sen"). Aynı ürün içinde üç farklı sohbet deneyimi.
- Limit-doldu mesajları da farklı: tek-eşya "Not ekleme sınırına ulaştın.", oda "Bu oda için sohbet sınırına ulaştın. Kararlarını seçip devam edebilirsin.", Keşif'te hiç mesaj yok (buton sessizce devre dışı kalıyor).

---

## BÖLÜM 5 — SESTIA'NIN AI MİMARİSİ

**4 ayrı sistem talimatı var**, tamamı lib/anthropic.js içinde, birbirinden bağımsız sabit string'ler:

| Talimat | Kullanan akış | "Sestia" der mi? | Karakter pusulasını kullanır mı? | Türkçe doğallık talimatı var mı? |
|---|---|---|---|---|
| `SINGLE_PROMPT` satır 13-35 | Tek Eşya analiz+sohbet | Hayır | Hayır | Hayır |
| `ROOM_PROMPT` satır 37-63 | Oda Taraması analiz+sohbet | Hayır | Hayır | Hayır — kendini "eşyalardan kurtulma (declutter) uygulaması" olarak tanımlıyor |
| `TIPS_PROMPT` satır 67-84 | Bu Hafta (haftalık ipucu) | Hayır | Hayır | Kısmen ("sahiplenici, sıcak, kısa Türkçe ton" — ama pusulaya bağlı değil) |
| `CHAT_PROMPT` satır 90-99 | Keşif serbest sohbet | **Evet** ("Sen Sestia'sın") | **Evet**, `SESTIA_VOICE_COMPASS` birebir gömülü | Kısmen ("kısa, sıcak, doğal Türkçe... resmi ya da robotik olma" — ama "Türkçe düşünerek konuşma" ilkesi henüz hiçbir promptta yok) |

**Sonuç: ortak/paylaşılan bir karakter talimatı YOK.** Her prompt kendi başına yazılmış; 4'ten sadece 1'i (`chatFreely`) karakteri açıkça taşıyor. Aynı Sestia'nın "sesi" tek-eşya ve oda sohbetlerinde AI'ya hiç tanıtılmıyor — UI bu etkileşimleri Sestia'ya atfetse de (örn. RoomScanView metni, "Asistan" etiketi), AI modeline gönderilen talimat bunu bilmiyor.

**Çelişen ifadeler:** Doğrudan çelişki yok, ama `ROOM_PROMPT`/`TIPS_PROMPT`'un kendini "declutter uygulaması" olarak tanımlaması, ürünün "yaşam alanını yeniden düşünme" vizyonuyla (Bölüm 1'inizdeki tanım) örtüşmüyor.

**Bağlam aktarımı (chatFreely):** Keşif kartlarından açılan sohbete, hangi bölümden geldiği sabit bir etiket haritasından (`SECTION_CONTEXT_LABELS`, satır 105-110) sistem promptuna EK not olarak ekleniyor — istemciden gelen serbest metin DEĞİL, prompt injection riskine karşı sabit anahtar. Diğer üç akışta (tek-eşya/oda/ipucu) böyle bir "hangi ekrandan geldin" bağlamı yok — zaten o akışlar zaten kendi fotoğraf/karar bağlamlarını taşıyor.

**Hafıza/hatırlama:**
- **Sunucu tarafında SIFIR kalıcı hafıza.** Her `/api/analyze` ve `/api/sestia-chat` çağrısı stateless — istemci HER turda TAM mesaj geçmişini (ve tek-eşya/oda için fotoğrafı yeniden) gönderiyor.
- Üç sohbet bağlamı (tek-eşya, oda, Keşif) **birbirinden tamamen izole** — Keşif'te konuşulan hiçbir şey oda/tek-eşya analizine, ya da tam tersi, hiçbir şekilde sızmıyor.
- Oda sohbeti `room_scans`/`room_analyses`'e yazılıyor ve bir odaya dönüldüğünde METİN olarak geri gösterilebiliyor ("Taramaya Devam Et" — app/page.js:376-392), ama devam etmek için fotoğrafların YENİDEN gönderilmesi gerekiyor (`roomFilesRef.current = []` satırı, 380) — uygulama bunu kullanıcıya dürüstçe söylüyor ("sohbete devam etmek için fotoğraflar yeniden gerekiyor").
- Tek-eşya sohbeti ve Keşif sohbeti hiç kalıcı değil (Bölüm 11'de detay).

**Risk değerlendirmesi (kod üzerinden):**
- `chatFreely`'nin promptu açıkça "bilmediğin bir şeyi biliyormuş gibi davranma" diyor ve bağlamı SADECE o oturumdaki mesajlarla sınırlıyor — kullanıcının gerçek geçmiş kararlarını/odalarını modele hiç göndermiyor, dolayısıyla "bilmediğini biliyormuş gibi davranma" ilkesini yapısal olarak destekliyor.
- `SINGLE_PROMPT`/`ROOM_PROMPT` karar dayatma riskine karşı zaten önlemli (ör. "baskı yapma", "varsayma" ifadeleri var), ama bunlar karakter pusulasından değil, bağımsız yazılmış.

---

## BÖLÜM 6 — SESTIA KÜTÜPHANESİ

**Konum:** Tek dosya, lib/sestiaLibrary.js — veri (`SESTIA_VOICE_COMPASS`, `SESTIA_GREETINGS[12]`, `SESTIA_SPARKS[15]`) + tek yardımcı fonksiyon (`pickLibraryIndex`).

**Düzenleme kolaylığı:** Yeni içerik eklemek, diziye yeni bir `{id, ton, metin}` (veya spark için `{id, kategori, metin}`) nesnesi eklemekten ibaret — kod değişikliği gerektirmiyor, ama bir geliştirici müdahalesi gerekiyor (kullanıcı arayüzünden yönetilebilen bir CMS/panel yok).

**Seçim mekanizması** (lib/db.js:611-643):
- `message_state` tablosu (`device_id`, `category`, `last_index`, `visit_token`) hem eski Ana Ekran sistemi hem Kütüphane tarafından paylaşılıyor (farklı `category` değerleriyle ayrılıyor: `sestia_karsilama`, `sestia_kivilcim`).
- Karşılama ve kıvılcım **bağımsız** seçiliyor (ayrı satırlar) — biri değişirken diğeri sabit kalabilir.
- `pickLibraryIndex`: son gösterilenden farklı rastgele bir index seçer.

**Ziyaret davranışı** (`sestia_visit` / `visit_token`):
- proxy.js:57-68: oturum-ömürlü (maxAge yok) bir cookie, SADECE yoksa mint edilir.
- Aynı `sestia_visit` değeriyle gelen istek → aynı index (yenileme = aynı içerik).
- Farklı/eksik `visit_token` → yeni index (yeni ziyaret = potansiyel değişim).
- Bu mekanizmayı gerçek tarayıcı sırasıyla (curl ile GET / → sonra /api/state) test ettim, doğru çalışıyor.

**Kütüphane ile canlı AI arasında bağlantı:** **YOK.** `getSestiaLibrarySelection` sadece istatik metin döndürür; `chatFreely`'ye hangi karşılama/kıvılcım gösterildiği hiç aktarılmıyor. Kullanıcı bir kıvılcımı okuyup ondan sohbete geçse bile ("kivilcim" bağlam etiketi haricinde), AI o kıvılcımın TAM METNİNİ görmüyor, sadece "kullanıcı İlham Kıvılcımı bölümünden geldi" notunu görüyor.

**Farklı ekranlar kütüphaneyi kullanıyor mu:** Sadece Keşif ekranı (`totalDecisions/hasStartedWork` false olan kullanıcı). HomeView, RoomDetailView vb. hiçbir zaman bu kütüphaneyi kullanmıyor — onlar `homeMessages.js`'i kullanıyor.

**Kütüphane, karakteri mi taşıyor yoksa karakter tarafından mı yönetiliyor?** Kütüphane şu an **karakterin SESİNİ taşıyan editoryal bir içerik kaynağı** — karakter talimatları (Bölüm 5) tarafından "yönetilmiyor" (yani AI, bu metinleri üretmiyor veya denetlemiyor); insan tarafından önceden yazılmış, sabit bir koleksiyon. `SESTIA_VOICE_COMPASS` her ikisinin de (kütüphane + `chatFreely` talimatı) ortak referans noktası, ama kütüphane metinleri pusulaya göre otomatik doğrulanmıyor — biri pusulaya aykırı bir satır eklese, kod bunu engellemez.

---

## BÖLÜM 7 — KEŞİF DENEYİMİ

**Ekran yapısı** (app/page.js:1339-1478, `KesifView`): karşılama → ilham kıvılcımı → Sestia sohbet daveti → giriş kartı → Oda/Köşe/Eşya kartları → süreklilik → son CTA'lar.

**Üç kartın altındaki tekrarlanan davet:** Kaynağı app/page.js:1417-1451 — üç ayrı JSX bloğunda, `openChatFrom('oda'|'kose'|'esya')` çağıran üç ayrı `<button>`, üçünde de **hardcoded aynı metin**: `"Bu fikir üzerine konuşmak ister misin?"`. Özelleştirme şu an YOK ama teknik olarak kolay: her buton zaten kendi bölüm anahtarını (`'oda'`/`'kose'`/`'esya'`) biliyor, bu üç metni `SECTION_CONTEXT_LABELS`'e benzer bir haritayla (veya doğrudan JSX'te) ayrıştırmak küçük bir değişiklik olurdu.

**Sayfa sonu daveti:** Şu an "Aklına bir yer ya da eşya geldi mi?" (app/page.js:1469) — konuştuğunuz "Aklına bir oda, bir köşe, bir pencere önü ya da bir eşya geldi mi?" cümlesi **henüz uygulanmadı**. Mevcut metin `onScanRoom`/`onScanSingle` handler'larına bağlı iki gerçek butona bağlanıyor; yeni cümledeki "pencere önü" için ayrı bir CTA/akış yok (zaten "Köşe" gibi bağımsız bir akış değil).

**Gerçekten çalışan vs. sadece görünen etkileşimler:**
- ✅ Gerçek: Karşılama/kıvılcım rotasyonu, Sestia serbest sohbeti (gerçek AI yanıtı), Oda/Eşya CTA'ları (gerçek tarama akışlarına gider), bölüm davetleri (odaklanma+bağlam taşıma).
- ⚠️ Görünür ama akışsız: "Köşe" kartı — hiçbir CTA'sı yok, sadece sohbete davet ediyor (kasıtlı, brief'e uygun).

**Sohbet açıldığında:**
- **Hangi bağlam aktarılıyor:** Sadece sohbet BOŞSA, sabit bölüm etiketi (Bölüm 5/6'da detay). Sohbet zaten başlamışsa yeni bir bölüm daveti SADECE input'a odaklanır, bağlam değiştirmez (app/page.js:1303-1307).
- **Otomatik mesaj gönderiliyor mu:** Hayır — kod hiçbir yerde kullanıcı adına `sendSestiaChat` çağırmıyor; kullanıcı kendi yazıp göndermeli.
- **Sohbet hangi durumda sıfırlanıyor:** Sadece bileşen yeniden mount edildiğinde (sayfa yenileme, view değişimi) — state tamamen React state'inde, kalıcı değil.
- **Hangi durumda korunuyor:** Sadece AYNI sayfa oturumunda (React state), navigasyonlar arası korunmuyor.
- **Fotoğrafsız serbest konuşma:** ✅ Evet, doğrulandı (önceki test raporunda gerçek AI yanıtıyla teyit edilmişti; kod da `/api/sestia-chat`'in hiç `image` alanı beklemediğini doğruluyor, app/api/sestia-chat/route.js).

---

## BÖLÜM 8 — TASARIM SİSTEMİ

**Merkezi mi, dağınık mı:** Merkezi. Tüm renkler app/globals.css `:root` içinde CSS değişkeni olarak tanımlı (1-20. satırlar), açık/koyu tema varyantlarıyla (`prefers-color-scheme` + kullanılmayan `[data-theme]` altyapısı — kodda `data-theme`'i SET eden hiçbir JS yok, şu an fiilen kullanılmıyor).

**Renk paleti:** `--bg`, `--surface`, `--surface-alt`, `--border`, `--text`, `--text-muted` (nötr) + 5 "aksiyon" rengi: `--eucalyptus` (tut), `--terracotta` (sat), `--slate` (bağışla), `--stone` (at), `--recycle` (geri dönüştür) — her biri bir `-tint` (açık ton) varyantıyla. **Bu 5 renk, Oda/Köşe/Eşya için DEĞİL, 5 karar türü (tut/sat/bağışla/at/geri dönüştür) için tanımlanmış** — "karakterli görsel tasarım" isteğiniz için bu paletin yeniden mi kullanılacağı yoksa yeni token'lar mı ekleneceği bir karar konusu (Bölüm 12).

**Tipografi:** Başlıklar `'Fraunces', serif` (Google Fonts, app/layout.js:33), gövde `'Plus Jakarta Sans'`. Başlık hiyerarşisi component'ler içinde INLINE `style={{fontSize, fontWeight}}` ile veriliyor — CSS class tabanlı bir `.h1/.h2/.h3` sistemi yok, her component kendi büyüklüğünü seçiyor (ör. KesifView h1: 28px, DecisionView h2: 19px).

**Component yapısı:** Kart (`.card`), buton (`.btn-primary`/`.btn-secondary`/`.btn-outline`), sohbet (`.chat-*`), oda çipi (`.roomchip`), mod seçenekleri (`.modeoption`), istatistik çipi (`.statchip`), foto grid (`.photogrid`) — tümü globals.css'te tek merkezi dosyada, class tabanlı, component'ler arası paylaşılıyor.

**Masaüstü/mobil:** Uygulamanın TAMAMI `.app { max-width: 460px }` ile mobil-öncelikli, sabit dar bir sütun — SADECE Keşif ekranı, önceki turda eklediğim `.app-wide` sınıfıyla (app/globals.css sonlarına doğru) 720px+ genişlikte 760px'e çıkıyor. Diğer TÜM ekranlar (HomeView dahil) masaüstünde de 460px'de kalıyor.

**Oda/Köşe/Eşya kartlarının mevcut renkleri:** Hiç renk ayrımı yok — üçü de aynı `.kesif-possibility` sınıfını (nötr `--surface`/`--border`) ve aynı `.flamewrap-compact` ikon sarmalayıcısını (nötr `--eucalyptus-tint` arkaplan) kullanıyor (app/globals.css, `.kesif-possibility`). **Görsel olarak yeterince ayrışmıyorlar** — sadece ikon (Grid/Layers/Box) ve başlık metniyle ayırt ediliyorlar.

**"Karakterli görsel tasarım" için ele alınması gereken alanlar:**
1. Yeni CSS değişkenleri (Oda=mavi, Köşe=yeşil, Eşya=toprak) — mevcut 5 aksiyon rengiyle çakışmaması için muhtemelen yeni token adları gerekir.
2. `.kesif-possibility` sınıfının arka plan/kenarlık rengini içerik türüne göre değiştirmesi.
3. Sohbet daveti (`.kesif-chat`), ilham kıvılcımı (`.kesif-spark`) için de kendi ton kimlikleri düşünülebilir (şu an kıvılcım `--terracotta-tint`, sohbet nötr `--surface`).

---

## BÖLÜM 9 — GERİ BİLDİRİM SİSTEMİ

**Uçtan uca akış (kod üzerinden doğrulandı):**

1. Kullanıcı sağ alttaki `.feedback-fab` simgesine tıklar → components/FeedbackButton.js:38 → form açılır.
2. Mesaj yazıp gönderir → `submit()` → `fetch('/api/feedback', {method:'POST', body:{message, screen}})` (satır 18-22).
3. app/api/feedback/route.js: `getIdentity()` ile kimlik doğrulanır (401 yoksa), mesaj 2000 karaktere kırpılır, boşsa reddedilir.
4. `recordFeedback(identity.id, message, screen)` çağrılır → lib/db.js:550-552 → **`feedback` tablosuna INSERT** (`device_id`, `message`, `screen`, `created_at`).
5. **Hiçbir e-posta/webhook/bildirim GÖNDERİLMİYOR.** `/api/feedback/route.js` `resend` paketini hiç import etmiyor.
6. Başarı yanıtı: `{ok:true}` → istemci `setSent(true)` → "Gönderildi, teşekkürler!" gösterir → 1.2sn sonra form kapanır.
7. **Bu başarı mesajı gerçek bir başarılı DB yazımından SONRA gösteriliyor** — `recordFeedback` `try` bloğu içinde, hata olursa `catch` sessizce yutuyor (yorum: "testçi butonu tekrar deneyebilir", satır 29-31) VE `setSent` çağrılmıyor demek — **düzeltme:** `submit()`'in try/catch yapısına bakınca, `fetch` başarısız olursa (network hatası, 401, 500) catch bloğu çalışır ve `setSent(true)` ASLA çağrılmaz, kullanıcı sessizce hiçbir geri bildirim görmez (ne hata ne başarı) — bu bir UX boşluğu.

**Geri bildirim kaybolabilir mi?** Ağ hatası durumunda: form içeriği state'te kalır (mesaj silinmez), kullanıcı tekrar deneyebilir — hiçbir şey sessizce kaybolmaz, ama kullanıcıya "başarısız oldu" da denmiyor (sessiz `catch`).

**Sonradan incelenebilir mi:** Evet — `/admin` paneli, `getRecentFeedback(50)` ile son 50 kaydı `device_id`(kısaltılmış)/`screen`/`message`/`created_at` sütunlu bir tabloda gösteriyor (app/admin/page.js:58,79-89). Panel `dynamic='force-dynamic'` — her ziyarette DB'den taze okur, ama **PUSH bildirimi yok** — birinin bilinçli olarak `/admin-giris`'e kod girip `/admin`'i açması gerekiyor.

**"Bize neden ulaşmıyor olabileceği" — kanıta dayalı açıklama:**
Form açılması ile geri bildirimin size ulaşması FARKLI şeyler, doğru gözlemlemişsiniz. Kod kanıtlıyor ki: **form gerçekten çalışıyor ve veri gerçekten kaydediliyor** — "kayboluyor" değil. Ama "ulaşmıyor" hissi doğru, çünkü sistem tamamen **pull (çek)** modelinde: kimse size AKTİF olarak haber vermiyor. `/admin`'i düzenli kontrol etmediğiniz sürece, birikmiş geri bildirimlerden haberiniz olmaz. Bu tahmin değil — `recordFeedback`'in hiçbir yerde bir e-posta/webhook fonksiyonu çağırmadığı doğrudan kod okumasıyla doğrulandı.

---

## BÖLÜM 10 — VERİTABANI / RESEND / SUPABASE

**Veritabanı sağlayıcısı:** `better-sqlite3` — yerel, tek dosyalık SQLite (lib/db.js:10, `data/app.db`). Drizzle ORM sadece Auth.js'in `@auth/drizzle-adapter`'ı için kullanılıyor (lib/auth.js:10, `drizzle(rawDb)` — aynı SQLite dosyasına bağlanıyor, ayrı bir bağlantı değil).

**Bağlantı nerede tanımlı:** lib/db.js:1-11 — `new Database(path.join(process.cwd(), 'data', 'app.db'))`, `WAL` modu. Ortam değişkeni tabanlı bir DB URL YOK — yol sabit kod içinde.

**Mevcut tablolar (16 adet, doğrulandı):** `users`, `decisions`, `events`, `feedback`, `errors`, `message_state`, `inspiration_cache`, `auth_user`, `auth_account`, `auth_verificationToken`, `pending_signup`, `rooms`, `room_photos`, `room_scans`, `room_analyses`, `sqlite_sequence`.

**Geri bildirim tablosu var mı:** Evet, `feedback` (lib/db.js:42-48).

**Keşif sohbeti için tablo var mı:** **Hayır.** Ne `message_state` (sadece rotasyon index'i tutar, mesaj metni değil) ne başka bir tablo Keşif serbest sohbetinin mesajlarını saklıyor.

**Resend nerede kullanılıyor:** SADECE lib/auth.js:2,58-61 — Auth.js'in kendi `Resend` provider'ı, magic-link e-postası için. `isEmailReady()` fonksiyonu (satır 17-21) sadece `RESEND_API_KEY` + `AUTH_EMAIL_FROM` env değişkenlerinin DOLU olup olmadığına bakıyor — gerçek teslimatı garanti etmiyor (kod yorumunda bu açıkça belirtilmiş).

**Genel e-posta gönderme altyapısı var mı:** **Hayır.** `resend` paketi projede sadece bu tek entegrasyon noktasında kullanılıyor; başka hiçbir route'ta `Resend` istemcisi import edilmiyor. Geri bildirim bildirimi için "hazır" bir fonksiyon yok — sıfırdan eklenmesi gerekir.

**Supabase:** Paket listesinde YOK (package.json — `@supabase/*` hiç geçmiyor). Kod tabanında `supabase` kelimesi SADECE README.md:145'te geçiyor, gelecekteki bir "Postgres'e taşıma" önerisi olarak ("`lib/db.js`'i bir Postgres bağlantısına, ör. Supabase, taşı"). **Aktif entegrasyon yok, bağlantı yok, env değişkeni yok.**

**Ortam değişkenleri (isimler, değerler gösterilmedi):** `.env.local`'de tanımlı 7 değişken: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ACCESS_CODE`, `ADMIN_ACCESS_CODE`, `AUTH_SECRET`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`. `.env.example` ile birebir eşleşiyor. `DATABASE_URL`/`SUPABASE_*` YOK.

**Mevcut altyapı geri bildirim bildirimi ihtiyacını karşılar mı:** Kısmen — `feedback` tablosu VERİYİ zaten doğru saklıyor (yeni tabloya gerek yok). Eksik olan, kayıt anında Resend ile size bir e-posta atacak birkaç satırlık bir çağrı (app/api/feedback/route.js'e eklenecek) — bu, MEVCUT Resend entegrasyonunun (magic-link için zaten kurulu `RESEND_API_KEY`) basitçe ikinci bir amaç için kullanılması demek, yeni bir servise ihtiyaç yok.

---

## BÖLÜM 11 — KEŞİF SOHBETİ VE VERİ KALICILIĞI

**Mesajlar nerede tutuluyor:** Sadece tarayıcı belleğinde, React `useState` içinde (app/page.js:1310-1314, `chatMessages`/`chatDraft` KesifView component state'i). Hiçbir `localStorage`, hiçbir DB tablosu, hiçbir sunucu tarafı önbellek YOK.

**Sayfa yenilendiğinde:** Component yeniden mount olur, state sıfırlanır → sohbet tamamen kaybolur. (Bunu bu oturumda gerçek tarayıcıda test ettim: yenileme sonrası KesifView'e geri dönüldüğünde sohbet boştu, sadece karşılama/kıvılcım rotasyon kuralına uygun şekilde korundu/değişti.)

**Kullanıcı yeniden giriş yaptığında:** Aynı — yeni bir sayfa yüklemesi olduğu için sohbet baştan başlar. Misafir/hesaplı kullanıcı arasında **fark yok** — ikisi de aynı ephemeral React state modelini kullanıyor (`/api/sestia-chat` kimlik türüne bakmaksızın aynı davranır).

**Oda Taraması/Tek Eşya geçmişiyle ilişkisi:** **Yok.** Üç sohbet bağlamı birbirinden tamamen izole (Bölüm 5'te detaylandırıldı) — Keşif'te konuşulanlar bir odaya/eşyaya hiçbir şekilde aktarılmıyor, ne otomatik ne manuel.

**Mevcut veri modelinde kullanılabilir bir yapı var mı:** `message_state` tablosu YAPISAL OLARAK sohbet mesajı saklamaya uygun değil (sadece `last_index` bir tamsayı tutuyor). `room_analyses.messages_json` PATTERN'i (JSON string olarak mesaj dizisi saklama) teknik olarak ÖRNEK alınabilir bir emsal — ama Keşif sohbeti bir `room_id`'ye bağlı değil, bu yüzden doğrudan aynı tablo kullanılamaz; yeni bir tablo (`device_id`'ye bağlı, `room_id` gerektirmeyen) tasarlanması gerekir. **Bu bir geliştirme kararı, bu raporda karar verilmedi.**

**Önemli sınır (Bölüm 12'nizdeki talimata uygun, doğrulandı):** `/api/sestia-chat`, lib/db.js'deki HİÇBİR yazma fonksiyonunu çağırmıyor — ne `rooms`, ne `decisions`, ne `users.total_decisions`. Yani **sadece Keşif'te sohbet etmiş bir kullanıcı, `hasStartedRealWork()`'e göre hâlâ "gerçek işi olmayan" sayılır** ve bir sonraki ziyaretinde yine Keşif'i görür — Kişisel Çalışma Alanı'na otomatik geçmez. Keşif/Kişisel Çalışma Alanı ayrımı bu açıdan sağlam.

---

## BÖLÜM 12 — GELİŞTİRME ÖNCESİ KARAR VERMEMİZ GEREKEN KONULAR

**1. Giriş zincirindeki iki çelişen pitch**
- *Mevcut durum:* `/hosgeldin` Sestia/yaşam-alanı pitch'i sunuyor, hemen ardından `/giris` eski "tut/sat/bağışla/at" declutter pitch'i sunuyor.
- *Eksiklik:* Prod kullanıcısının gördüğü ilk 2 ekran arasında ton/vizyon çelişkisi.
- *İlgili dosyalar:* app/hosgeldin/page.js, app/giris/page.js, public/manifest.json, app/layout.js (meta açıklama).
- *Bilinmesi gerekenler:* `/giris` sadece production'da görünüyor, yerelde test edilemez (kod değişikliği olmadan) — bu ekranı değerlendirmek için ya `NODE_ENV=production` ile yerel build, ya da doğrudan kod okuması gerekir. Manifest/meta description'ı değiştirmek PWA/SEO görünümünü de etkiler.

**2. AI talimatları arasında karakter tutarsızlığı**
- *Mevcut durum:* 4 sistem promptundan sadece 1'i Sestia'yı/pusulayı taşıyor.
- *Eksiklik:* Tek-eşya ve oda sohbetlerinde AI'nın "kim olduğu" hiç tanımlı değil; UI bunu Sestia'ya atfediyor ama model bilmiyor.
- *İlgili dosyalar:* lib/anthropic.js (4 prompt).
- *Bilinmesi gerekenler:* Bu promptlar aynı zamanda KATI bir JSON şeması zorluyor (category/recommendation/reasoning) — pusulayı eklemek görev başarımını (şema uyumunu) bozmamalı; dikkatli test gerekir. Ayrıca "Türkçe düşünerek konuşma" ilkesi HİÇBİR promptta yok — nereye/nasıl ekleneceği (ortak bir ön-ek mi, her promptta ayrı mı) bir tasarım kararı.

**3. Kütüphanenin "her cümle soru bitmesin" ilkesiyle uyuşmaması**
- *Mevcut durum:* 12 karşılamanın ~10'u, 15 kıvılcımın 14'ü soruyla bitiyor.
- *Eksiklik:* Yeni dil ilkesiyle nicel olarak çelişiyor.
- *İlgili dosyalar:* lib/sestiaLibrary.js.
- *Bilinmesi gerekenler:* Bu içerik önceki bir görevde "birebir, değiştirmeden kullan" talimatıyla kilitlenmişti — revizyon, o önceki kararın bilinçli olarak gözden geçirilmesini gerektirir.

**4. Aktif kullanıcı geçişinde eski mesaj kategorisi uyumsuzluğu (kendi önceki işimden gerileme)**
- *Mevcut durum:* `hasStartedRealWork()` (oda var, karar yok → HomeView) düzeltmesi önceki turda yapıldı, ama `lib/homeMessages.js`'in `selectCategory()` fonksiyonu hâlâ SADECE `totalDecisions===0`'a bakarak `01_ilk_karsilasma` kategorisini seçiyor (lib/homeMessages.js:138-140).
- *Eksiklik:* Oda oluşturmuş ama henüz karar vermemiş bir kullanıcı artık HomeView'i görüyor (doğru), ama HomeView'in gösterdiği başlık hâlâ "İlk hamle senden ;)" tarzı, gerçekten YENİ bir kullanıcı için tasarlanmış mesajlar olabilir — bu kişi artık "ilk karşılaşma" değil.
- *İlgili dosyalar:* lib/homeMessages.js:137-161 (`selectCategory`), lib/db.js:591 (`getHomeMessage`'ın çağrısı).
- *Bilinmesi gerekenler:* Bu, kod okunarak TESPİT edildi ama DOĞRULANMADI (canlı test edilmedi — bu görev read-only olduğu için gerçek bir "oda var, karar yok" HomeView ekran görüntüsü almadım). Düzeltme küçük olabilir (`selectCategory`'ye `hasStartedWork`/oda varlığı bilgisini de geçirmek) ama HANGİ kategorinin daha doğru olacağı bir ürün kararı.

**5. Karakterli görsel tasarım için renk paleti çakışması**
- *Mevcut durum:* 5 mevcut renk (`eucalyptus`/`terracotta`/`slate`/`stone`/`recycle`) zaten tut/sat/bağışla/at/geri-dönüştür kararlarına atanmış.
- *Eksiklik:* Oda/Köşe/Eşya için "soluk mavi/adaçayı yeşili/sıcak toprak" gibi yeni bir anlam katmanı, mevcut renklerle (özellikle "adaçayı yeşili" ~ `eucalyptus`'a çok yakın olabilir) karışabilir.
- *İlgili dosyalar:* app/globals.css (`:root` renk tanımları), app/page.js (`.kesif-possibility` kullanımı).
- *Bilinmesi gerekenler:* Yeni token'lar mı eklenecek yoksa mevcutlar mı yeniden yorumlanacak — bu, ileride "tut/sat/bağışla" renklerinin Keşif bağlamında farklı bir anlamda görünüp görünmeyeceğini belirler.

**6. Geri bildirim bildirimi**
- *Mevcut durum:* Veri güvenle kaydediliyor, hiçbir push/e-posta yok.
- *Eksiklik:* Ekibin haberdar olması için `/admin`'i manuel kontrol etmesi gerekiyor.
- *İlgili dosyalar:* app/api/feedback/route.js, lib/auth.js (mevcut Resend kurulumu referans alınabilir).
- *Bilinmesi gerekenler:* Mevcut `RESEND_API_KEY`/`AUTH_EMAIL_FROM` zaten var — teknik engel yok, sadece hangi adrese/ne sıklıkta bildirim gideceği bir ürün kararı (her mesajda anlık e-posta mı, günlük özet mi).

**7. Keşif sohbetinin kalıcılığı**
- *Mevcut durum:* Tamamen ephemeral, hiçbir yerde saklanmıyor.
- *Eksiklik:* Kullanıcı sayfayı kapatırsa konuşma tamamen kaybolur.
- *İlgili dosyalar:* lib/db.js (yeni tablo ihtiyacı), app/api/sestia-chat/route.js.
- *Bilinmesi gerekenler:* Kalıcı hale getirmek isteniyorsa, bunun "gerçek iş başladı" sayılıp sayılmayacağı AYRICA netleştirilmeli (Bölüm 11'de belirtildiği gibi şu an sohbet asla `hasStartedRealWork`'ü tetiklemiyor — bu kasıtlı ve korunmalı mı?).
