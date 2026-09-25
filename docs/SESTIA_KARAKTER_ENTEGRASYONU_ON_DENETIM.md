# SESTIA KARAKTER ENTEGRASYONU — ÖN DENETİM RAPORU

**Proje:** Bir Oda. Bir Eşya.
**Denetim tarihi:** 22 Eylül 2026
**İncelenen Karakter Dosyası:** `docs/SESTIA_KARAKTER_DOSYASI_v1.md` — Sürüm 1.0, 22 Eylül 2026
**Kapsam:** Read-only ön denetim. Bu çalışma sırasında hiçbir uygulama kodu, AI promptu, kütüphane içeriği, veritabanı ya da Karakter Dosyası'nın kendisi değiştirilmedi.
**Amaç:** Mevcut Sestia mimarisini (uygulama kodu) Karakter Dosyası v1'in onaylanmış kararlarıyla karşılaştırmak; ilk karakter yenilemesinin kapsamını birlikte kararlaştırabilmek için somut, kod-doğrulanmış bir zemin sunmak.

---

## A. Mevcut Sestia Mimarisi

**4 ayrı, birbirinden bağımsız sistem talimatı** (`lib/anthropic.js`):

| Talimat | Akış | Karakteri taşıyor mu |
|---|---|---|
| `SINGLE_PROMPT` (satır 13-35) | Tek Eşya | Hayır — saf karar sınıflandırıcı (`category`/`recommendation`/`reasoning`/`question`) |
| `ROOM_PROMPT` (satır 37-63) | Oda Taraması | Hayır — kendini "eşyalardan kurtulma (declutter) uygulaması" olarak tanımlıyor |
| `TIPS_PROMPT` (satır 67-84) | Bu Hafta (haftalık ipucu) | Kısmen — "sahiplenici, sıcak" ton talimatı var ama isimsiz, pusulasız |
| `CHAT_PROMPT` (satır 90-99) | Keşif serbest sohbeti | Evet — `SESTIA_VOICE_COMPASS` birebir gömülü, kendini "Sen Sestia'sın" diye tanıtıyor |

Ortak/paylaşılan bir karakter modülü **yok** — 4 prompt 4 ayrı sabit string olarak yazılmış. Sestia Kütüphanesi (`lib/sestiaLibrary.js`: karakter pusulası + 12 karşılama + 15 ilham kıvılcımı) AI'ya hiç aktarılmıyor; sadece Keşif ekranında statik metin olarak gösteriliyor. Uygulama arayüzü evrensel olarak "Sestia" adını kullanıyor (Oda Taraması ekran metni, kutlama ekranı vb.) ama bu isim ve karakter yalnızca 4 AI çağrısından 1'ine gerçekten ulaşıyor.

---

## B. Karakter Dosyası ile Karşılaştırma

**§2 — Kabul edilmiş karakter pusulası**
Kod var (`SESTIA_VOICE_COMPASS`, `lib/sestiaLibrary.js`), ama sadece `CHAT_PROMPT` kullanıyor. **Kısmi uyum.**

**§3 — "Birlikte bakabiliriz" (iç referans)**
Kodda hiçbir yerde yok. Dosya bunun bilinçli olarak bir "iç referans" (dışa gösterilmeyecek bir manifesto) olduğunu söylüyor; bu açıdan UI'da doğrudan görünmemesi beklenen bir durum. Ancak ruhu — kontrolün kullanıcıda kalması, kararın zorunlu olmaması — hiçbir AI talimatına da sızmamış durumda. **Eksik.**

**§4 — "Bir fikrim var"**
**Bulduğum en büyük boşluk.** Hiçbir promptta Sestia'dan somut, gerekçeli, yerleşim/dekorasyon/renk/malzeme/ışık/DIY ile derinleştirilebilir bir FİKİR üretmesi istenmiyor. `SINGLE_PROMPT`/`ROOM_PROMPT` yalnızca 5 sabit kategoriden (tut/sat/bağışla/at/geri dönüştür) birini seçtiriyor — yaratıcı öneri şeması hiç yok. `CHAT_PROMPT` "ilham ver" diyor ama "somut fikir geliştir, gerekçelendir, derinleştir" düzeyine çıkmıyor. **Eksik.**
- "Fikri vardır, dayatmaz" (v2 için geliştirilen aday ilke) — Karakter Dosyası'nın kendisi bunu henüz tamamlanmış v2 kanonu saymıyor; bu aşamada ayrıca değerlendirmeye gerek görmedim.

**§5 — Ses ve Türkçe**
İki **somut, dosya+satır düzeyinde doğrulanmış çelişki** buldum:
1. `app/page.js:1363` — Keşif sohbet daveti hâlâ **"Aklına takılan bir şey mi var?"** diyor. Karakter Dosyası'nın kabul ettiği yön ise **"Aklına takılan bir şey var mı?"** (§5, "Türkçede önemli anlam ayrımı").
2. `lib/sestiaLibrary.js`, greeting id 12: **"Henüz neyi değiştirmek istediğinden emin değil misin?"** — Karakter Dosyası'nın örnek olarak verip kaçınılmasını istediği tam o kalıp. Önerilen alternatif ("Belki de nereden başlayacağına henüz karar vermedin.") kodda yok.
"Sestia Türkçeyi Türkçe düşünerek konuşur" ilkesi hiçbir promptta yazılı değil.

**§6 — Davranış özellikleri (Doğal, Meraklı, Sezgili ama varsayımsız, Az-öz mizah, Her zaman dürüst, Gördüğüne/duyduğuna karşılık veren, Değişebilen kullanıcıya uyum)**
Bu 7 özellikten hiçbiri ayrı ayrı isimlendirilmiş veya talimatlandırılmış değil. `CHAT_PROMPT` ruhen birkaçına (dürüstlük, kısalık) kısmen değiniyor ama "az-öz mizah", "sezgili ama varsayımsız" gibi incelikler kodda yok. **Büyük ölçüde eksik.**

**§7 — Konuşma ritmi: İhtimal · Gözlem · Davet**
Kodda hiç yok — ne bir yapı ne de gevşek bir referans olarak.

**§8 — Etkileşimde temel ilkeler (10 madde)**
İlginç bir bulgu: `SINGLE_PROMPT`/`ROOM_PROMPT`, bu Karakter Dosyası'ndan bağımsız olarak zaten bazı ilkeleri kısmen karşılıyor (ör. "hediye, manevi bağ... dikkate al, baskı yapma" ifadesi ilke 5 ve 9 ile örtüşüyor). Ama ilke 2-3 (somut fikir sunma + yerleşim/dekorasyon/renk/malzeme/DIY ile derinleştirme) ve ilke 8 (hata kabulü) hiçbir promptta karşılık bulmuyor.

**§9 — Hafıza: Hatırlar ama uydurmaz**
Karakter Dosyası'nın kendisi bunu zaten "hedef davranış, mevcut teknik durum değil" diye işaretlemiş (§9 sonu, önceki denetim raporuma açıkça referans vererek). Bunu taze kod okumasıyla doğruladım — hâlâ tam olarak doğru: üç sohbet bağlamı (Tek Eşya, Oda Taraması, Keşif) birbirinden tamamen izole; Keşif sohbeti hâlâ sayfa yenilenince kayboluyor; hiçbir yerde kalıcı bir "konuşma geçmişi / yaşam alanı bağlamı / çalışma durumu" üçlü hafıza katmanı yok.

**§10 — İlhamın bağlamını bilmek**
**Somut, kod-doğrulanmış boşluk:** `lib/anthropic.js` içindeki `SECTION_CONTEXT_LABELS` sabitinde `kivilcim: 'İlham kıvılcımı'` anahtarı TANIMLI, ama **hiçbir UI elemanı bu anahtarı tetiklemiyor** — `app/page.js:1349-1354`'teki ilham kıvılcımı kutusunun tıklanabilir bir "bu fikir üzerine konuşalım" düğmesi yok (bu özelliğe sahip olan yalnızca 3 kart: Oda/Köşe/Eşya). Yani "kivilcim" bağlamı şu an fiilen ölü/kullanılmayan kod. Ayrıca aktarılan bağlam her durumda sadece SABİT bir ETİKET (ör. "Bir odanın başka bir hayatı olabilir mi?") — Karakter Dosyası'nın istediği gibi kartın/kıvılcımın TAM METNİ değil.

**§11 — Araştırma, yaratıcılık ve öğrenme**
Kodda web araştırma yeteneği, "Sestia Bilgi Kütüphanesi" içerik yapısı, kaynak/güvenilirlik kaydı — hiçbiri yok. Bu, Karakter Dosyası'nın kendi yol haritasında (§16) zaten AYRI, sonraki bir iş olarak tanımlanmış; bu aşamada eksiklik olarak değil, henüz sırası gelmemiş bir kapsam olarak not ediyorum.

**§12 — İki kütüphane; ayrı bir kullanıcı hafızası**
"A. Sestia karakteri ve mevcut içerik kütüphanesi" karşılığı: `lib/sestiaLibrary.js` (var, çalışıyor). "B. Sestia Bilgi Kütüphanesi" (renk/malzeme/DIY vb. bilgi tabanı): **kodda hiç yok.** "C. Kullanıcı hafızası": `decisions`/`rooms` tabloları VAR ve doğru işliyor, ama bu veriler AI çağrılarına (chatFreely/analyze) hiç beslenmiyor — kullanıcının geçmiş kararları Sestia'nın hiçbir canlı yanıtına girmiyor.

**§13 — Karakter Laboratuvarı: kabul edilmiş örnekler ve düzeltmeler**
10 örnek (13.1-13.10) var; hiçbiri şu an promptlara işlenmemiş, hepsi test/onay senaryosu olarak kalıyor. **13.10** ("Bu atölyeyi nasıl bir home office'e dönüştürürdün?") atölye→dijital çalışma alanı dönüşümü sahnesiyle içerik olarak eşleşiyor; dosyada "Kabul edilen yaklaşım" olarak onaylı duruyor. **Önemli not:** Bu sahne için, 13.1-13.9'un aksine, TEK ve birebir kilitli bir nihai "Sestia:" repliği Karakter Dosyası'nda yok — sadece yaklaşım tarif edilmiş, kelimesi kelimesine onaylı bir cevap verilmemiş. Bu yüzden onaylı birebir bir yanıt metnini burada uydurmadım; sahneyi TAMAMLANMIŞ ve onaylı bir YAKLAŞIM olarak, ama net/nihai metni henüz kilitlenmemiş şekilde raporluyorum.

**§14 — Kütüphane, canlı AI ve ekranlar arasında tutarlılık**
Karakter Dosyası'nın kendisi, önceki denetim raporumu kaynak göstererek şu 4 açığı zaten özetlemiş: (1) pusulayı taşıyan tek prompt Keşif sohbeti, (2) eski giriş/meta metinlerinde hâlâ dar "tut/sat/bağışla/at" ürün tanımı yaşıyor, (3) ilham kıvılcımının tam metni sohbete aktarılmıyor, (4) Keşif sohbeti kalıcı değil. **Dördünü de bu turda taze kod okumasıyla yeniden doğruladım — hâlâ tam olarak doğru.**

**§15 — Karakter için kabul testleri**
Şu an bu testlerin çoğu `SINGLE_PROMPT`/`ROOM_PROMPT`/`TIPS_PROMPT` için anlamsız kalıyor (karakter tanımlı olmadığı için "Sestia gibi davrandı mı" sorusu bu akışlarda sorulamaz). `CHAT_PROMPT` için kısmen uygulanabilir durumda — ama dosyanın listelediği ölçütlerin (mizah yerinde mi, geçmiş fikir/karar/uygulama karışıyor mu vb.) sistematik biçimde test edildiğine dair kodda bir iz yok.

---

## C. Karakter Bütünlüğü

**Hayır, aynı Sestia ekranlar arasında korunmuyor** — sadece UI seviyesinde (isim/etiket) korunuyor, AI seviyesinde korunmuyor:

- **Keşif sohbeti:** Gerçekten Sestia — pusula var, model kendini "Sen Sestia'sın" talimatıyla tanıyor.
- **Tek Eşya / Oda Taraması sohbetleri:** AI'ya göre isimsiz bir "sen" — sadece sabit karar şemasını yürütüyor, Sestia olduğunu bilmiyor. Uygulama arayüzü bunu "Asistan" (Oda Taraması) ya da hiç isimlendirmeden (Tek Eşya, sadece düz bir not alanı) gösteriyor — bu da Keşif'teki "Sestia" etiketiyle kendi içinde tutarsız.
- **Bu Hafta (haftalık ipucu):** AI'ya göre yine isimsiz; sadece "sıcak ton" talimatı var, karakter kimliği yok.

Üç farklı sohbet arayüzü de görsel/sözel olarak birbirinden farklı: konuşmacı etiketleri (Sestia / Asistan / hiçbiri), limit-doldu mesajları, kutu tasarımı ve davet metinleri hepsi ayrı ayrı yazılmış, ortak bir şablonu paylaşmıyor.

---

## D. İlk Yenileme İçin Önerilen Kapsam

*(Yalnızca öneri — bu denetimde hiçbir şey uygulanmadı.)*

**Etkilenecek dosyalar (gelecekteki iş için):**
- `lib/anthropic.js` — 4 promptun ortak bir karakter ön-ekini (pusula + temel ilkeler + Türkçe ses kuralları) paylaşacak şekilde yeniden düzenlenmesi; `SECTION_CONTEXT_LABELS`'in gerçek kıvılcım/kart metnini taşıyacak şekilde genişletilmesi.
- `lib/sestiaLibrary.js` — 12 karşılama + 15 ilham kıvılcımının §5/§15 kriterlerine göre editoryal gözden geçirilmesi (özellikle greeting id 12 gibi somut, tespit edilmiş örnekler).
- `app/page.js` — KesifView'daki "mi var" → "var mı" metin düzeltmesi; ilham kıvılcımı kutusuna bir sohbet tetikleyicisi (buton) eklenmesi.

**Korunması gerekenler:**
- `SINGLE_PROMPT`/`ROOM_PROMPT`'un katı JSON şeması (`app/page.js`'teki `safeParseJSON` ve alan doğrulamaları buna bağlı) — karakter eklenirken şema kesinlikle bozulmamalı.
- Üç sohbetin (Tek Eşya / Oda Taraması / Keşif) şu anki izolasyonu — hafıza/bağlam birleştirme, Karakter Dosyası'nın kendi yol haritasında AYRI, sonraki bir iş olarak tanımlanmış (§16).
- Sestia Kütüphanesi'nin mevcut rotasyon/ziyaret mekanizması (`message_state` tablosu, `sestia_visit` cookie'si) — sağlam çalışıyor, dokunulmamalı.

---

## E. Riskler ve Bağımlılıklar

- `SINGLE_PROMPT`/`ROOM_PROMPT`'a yaratıcı/karakterli dil eklemek, modelin `reasoning`/`reply` alanlarını uzatıp mevcut `.slice()` kırpma sınırlarını veya beklenen şemayı zorlayabilir — kademeli, dikkatli test gerekir.
- Soru-sonlanma kalıbının azaltılması yanıt UZUNLUĞUNU/yapısını değiştirebilir — mevcut `max_tokens` sınırları (Tek Eşya 600, Oda Taraması 3000, Keşif sohbeti 400) yeniden ayarlanması gerekebilir.
- Sestia Kütüphanesi içeriği önceki bir görevde "birebir kullan, değiştirme" diye kilitlenmişti — editoryal revizyon, o önceki kararın bilinçli olarak birlikte gözden geçirilmesini gerektiriyor; sessizce yeniden yazılmamalı.
- İlham kıvılcımı kutusuna tetikleyici eklemek düşük riskli, saf ekleme niteliğinde (UI + zaten var olan `SECTION_CONTEXT_LABELS` anahtarını canlandırmak).
- Araştırma/Bilgi Kütüphanesi (§11, §12-B) çok daha büyük bir kapsam — şu an hiçbir web-araştırma altyapısı kodda yok; bu "ilk yenileme"nin dışında tutulmalı (Karakter Dosyası'nın kendi §16 planıyla uyumlu bir sınır).
- Hafıza/kalıcılık (§9) da Karakter Dosyası'nın kendisi tarafından AYRI bir iş olarak işaretlenmiş — bu sınırın korunması kapsam kaymasını (scope creep) önler.

---

## F. Önerilen Uygulama Sırası

*(En az müdahale, kontrollü ve test edilebilir artışlarla — yalnızca öneri, henüz uygulanmadı.)*

1. **Sıfır şema riski, saf metin düzeltmeleri:** `app/page.js:1363` "mi var" → "var mı"; ardından Sestia Kütüphanesi'ndeki soru-ağırlıklı satırların (greeting id 12 gibi somut, tespit edilmiş örnekler) editoryal bir listesi çıkarılıp birlikte gözden geçirilir.
2. **Ortak karakter ön-eki, önce EN DÜŞÜK riskli promptta denenir:** `CHAT_PROMPT` zaten pusulayı taşıyor — yeni ortak modül önce burada denenir, çünkü çıktı serbest metin (JSON şema riski yok).
3. **`TIPS_PROMPT`'a genişletme:** Basit şema (headline/subtext/tips), orta risk seviyesi.
4. **`SINGLE_PROMPT`/`ROOM_PROMPT`'a genişletme:** En yüksek şema riski — JSON sözleşmesinin bozulmadığından kapsamlı test sonrası emin olunmalı.
5. **İlham kıvılcımı kutusuna sohbet tetikleyicisi + gerçek metin aktarımı** — küçük, katkısal (additive) bir UI+prompt değişikliği.
6. **Sestia Kütüphanesi içeriğinin (12 karşılama + 15 kıvılcım) tam editoryal revizyonu** — bu bir içerik incelemesi işidir, kod değişikliği değildir; ayrı ele alınmalı.
7. **Hafıza/kalıcılık ve Sestia Bilgi Kütüphanesi** — Karakter Dosyası'nın kendi yol haritasındaki 2. ve 3. sıradaki işler (§16); bu ilk yenilemenin kapsamı dışında bırakılır.

---

*Bu rapor read-only bir incelemenin ürünüdür. Hazırlanması sırasında hiçbir uygulama kodu, AI promptu, Sestia Kütüphanesi içeriği, veritabanı ya da `docs/SESTIA_KARAKTER_DOSYASI_v1.md` dosyasının kendisi değiştirilmemiştir.*
