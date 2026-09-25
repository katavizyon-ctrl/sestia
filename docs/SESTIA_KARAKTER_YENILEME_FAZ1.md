# SESTIA KARAKTER YENİLEMESİ — FAZ 1 ÇALIŞMA RAPORU

**Proje:** Bir Oda. Bir Eşya.
**Tarih:** 22 Eylül 2026
**Referans belgeler:** `docs/SESTIA_KARAKTER_DOSYASI_v1.md` (Sürüm 1.0), `docs/SESTIA_KARAKTER_ENTEGRASYONU_ON_DENETIM.md`
**Durum:** Faz 1 tamamlandı. Bu bir çalışma raporudur — karakter kanonu değildir, Karakter Dosyası v1'in üzerine yazılmamıştır.

---

## 1. Çalışmanın amacı ve kapsamı

Bu faz, Karakter Dosyası v1'de onaylanmış karakter kararlarını mevcut uygulamaya **ilk, kontrollü** adımla aktarmak içindi:

- Sestia'nın kimliğini, sesini ve davranış ilkelerini tek bir ortak, yeniden kullanılabilir karakter temelinde toplamak.
- Bu temeli **yalnızca Keşif serbest sohbetine** (`CHAT_PROMPT` / `chatFreely`) bağlamak.
- Ön denetimde tespit edilen iki somut Türkçe çelişkiyi düzeltmek.
- Tek Eşya, Oda Taraması ve Bu Hafta akışlarına, veritabanı şemasına, sohbet hafızasına, kütüphane rotasyon mekanizmasına ve ilham kıvılcımı bağlam aktarımına **dokunmamak**.

Çalışmaya başlamadan önce `docs/SESTIA_KARAKTER_DOSYASI_v1.md` ve `docs/SESTIA_KARAKTER_ENTEGRASYONU_ON_DENETIM.md` baştan sona yeniden okundu; ardından `lib/anthropic.js`, `lib/sestiaLibrary.js`, `app/page.js` ve `app/api/sestia-chat/route.js` güncel hâlleriyle yeniden incelendi. Ön denetimdeki satır numaraları taze kod okumasıyla doğrulandı — hepsi hâlâ geçerliydi (değişmemişti).

---

## 2. Oluşturulan ortak karakter yapısı

**Konum:** `lib/anthropic.js`, yeni dışa aktarılan sabit `SESTIA_CHARACTER_BASE`.

**Neden burada, `lib/sestiaLibrary.js`'de değil:** `lib/sestiaLibrary.js`'nin dosya başı yorumu bilinçli olarak şunu söylüyor: *"Karakter çekirdeği: SESTIA_VOICE_COMPASS — ... Bu dosyada GENİŞLETİLMİYOR, sadece referans olarak tutuluyor."* ve *"Canlı asistan davranışı ... bkz. lib/anthropic.js, BURADA DEĞİL."* Bu, önceki bir fazda bilinçli olarak konmuş bir mimari sınır. `SESTIA_CHARACTER_BASE`'i `lib/anthropic.js`'e koymak bu sınırı bozmuyor: `SESTIA_VOICE_COMPASS` hâlâ `sestiaLibrary.js`'de, sade ve genişletilmemiş kalıyor; genişletilmiş karakter metni AI talimatlarının zaten yaşadığı dosyada toplanıyor.

**İçerik:** Karakter Dosyası v1'in şu bölümlerinin AI'ya aktarılabilir, tek bir prompt bloğu hâline getirilmiş hâli:
- Sestia kimdir + ürün vaadi ("Yaşam alanını istediğin hâle getirelim.")
- Karakter pusulası (`SESTIA_VOICE_COMPASS` içe aktarılıp gömülüyor — metin burada da tekrar yazılmadı, aynı kaynaktan referanslanıyor)
- "Birlikte bakabiliriz" davranış ilkeleri (dinleme, varsaymama, kontrolü elden almama, ama pasif kalmama)
- "Bir fikrim var" (somut fikir üretme, gerekçelendirme, yerleşim/renk/malzeme/dekorasyon/ışık/DIY ile derinleştirme — kontrol listesi gibi dayatılmadan)
- "Aynı eşya, farklı yaşamlar" (onarım/restorasyon/yenileme/yeniden işlevlendirme/dönüştürme/malzeme değerlendirme; hatıra değeri olan eşyada geri dönüşsüz müdahaleyi kendiliğinden önermeme)
- "Fikri vardır, dayatmaz" — **açıkça "deneysel ilke — henüz v1 kanonu değil, v2 adayı" olarak etiketlendi**, Karakter Dosyası'nın kendi uyarısına uygun olarak v1'e sessizce kanon gibi eklenmedi.
- Ses ve Türkçe kuralları (doğal/bağlama uygun Türkçe, her cevabın soruyla bitmemesi, "ister misin/ne dersin/hazır mısın" refleks olmaması, tekrar etmeme, kısalık, ölçülü mizah, uydurmama, hata kabulü, otomatik övgü yapmama)

**Kullanım deseni:** Diğer akışlar ileride karaktere bağlanmak istediğinde bu sabiti import edip kendi görev talimatlarını sonuna ekleyecek — karakter tanımı tek kopya olarak kalacak, kopyalanmayacak. Bu fazda bu deseni yalnızca `CHAT_PROMPT` kullanıyor.

---

## 3. Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `lib/anthropic.js` | `SESTIA_CHARACTER_BASE` sabiti eklendi; `CHAT_PROMPT` bu sabiti kullanacak şekilde yeniden kuruldu (karakter tanımı + Keşif'e özgü görev bağlamı olarak ikiye ayrıldı). `SINGLE_PROMPT`, `ROOM_PROMPT`, `TIPS_PROMPT` **dokunulmadı**. |
| `lib/sestiaLibrary.js` | Sadece greeting id 12'nin metni değiştirildi (bkz. Bölüm 4). 12 karşılamanın diğer 11'i ve 15 ilham kıvılcımının tamamı **dokunulmadı**. |
| `app/page.js` | Yalnızca tek bir satır: Keşif sohbet daveti başlığı düzeltildi (bkz. Bölüm 4). Keşif'in UI düzeni, sohbet state yönetimi, bölüm davetleri, CTA'lar — hepsi **dokunulmadı**. |

`app/api/sestia-chat/route.js`, `lib/identity.js`, veritabanı şeması, `message_state`/`sestia_visit` mekanizması, `SECTION_CONTEXT_LABELS` — hiçbiri değiştirilmedi.

---

## 4. Türkçe metin düzeltmeleri

**Düzeltme 1 — Keşif sohbet daveti**
`app/page.js:1363`
Önceki: *"Aklına takılan bir şey mi var?"*
Yeni: *"Aklına takılan bir şey var mı?"*
Kaynak: Karakter Dosyası v1 §5, "Türkçede önemli anlam ayrımı" — bu tam ifade için kabul edilen yön olarak belirtilmiş.

**Düzeltme 2 — Karşılama mesajı, id 12**
`lib/sestiaLibrary.js`, `SESTIA_GREETINGS[11]` (id: 12)
Önceki: *"Henüz neyi değiştirmek istediğinden emin değil misin?\nSorun değil, birlikte bulabiliriz."*
Yeni: *"Belki de nereden başlayacağına henüz karar vermedin.\nBirlikte bulabiliriz."*
Kaynak: Karakter Dosyası v1 §5 bu tam kalıbı (dolaşık, kullanıcıyı kararsız ilan eden) örnek olarak kaçınılması gereken bir ifade diye veriyor ve alternatif olarak birebir "Belki de nereden başlayacağına henüz karar vermedin." cümlesini öneriyor — bu cümle aynen kullanıldı. İşlev/bağlam (`ton: 'kararsizlikta_destek'`) ve ikinci satırın daveti ("birlikte bulabiliriz") korundu, ilk cümledeki soru işareti kaldırıldı.

Diğer 11 karşılama ve 15 ilham kıvılcımı bu fazda topluca yeniden yazılmadı — bu, ayrı bir editoryal iş olarak Faz 2'ye bırakıldı (bkz. Bölüm 9).

---

## 5. Keşif sohbetine yapılan entegrasyon

`chatFreely` fonksiyonu ve `app/api/sestia-chat/route.js` **değişmedi** — sadece çağırdıkları `CHAT_PROMPT` sabitinin içeriği değişti (artık `SESTIA_CHARACTER_BASE` + Keşif'e özgü kısa bir ek). Bu sayede:

- **Serbest sohbet:** Korundu — `validChatMessages`, mesaj doğrulama, API sözleşmesi (`{messages, sectionContext}` → `{reply, messages}`) aynı.
- **Oda/Köşe/Eşya üzerinden konuşmaya başlama:** Korundu — `SECTION_CONTEXT_LABELS` ve bağlam aktarım mantığı dokunulmadı.
- **Fotoğrafla çalışma:** Bu akışın zaten fotoğraf gerektirmediği değişmedi (Keşif sohbeti hâlâ fotoğrafsız).
- **Mevcut konuşma bağlamının kullanımı:** Korundu — istemci hâlâ tam mesaj geçmişini gönderiyor, sunucu hâlâ stateless.
- **Kullanıcının seçmediği bir fikri seçmiş gibi göstermeme:** Korundu — `SECTION_CONTEXT_LABELS` hâlâ sabit etiketler taşıyor, serbest metin enjeksiyonu yok.

UI düzeni, sohbet hafızası/kalıcılık mimarisi, web araştırma altyapısı, Bilgi Kütüphanesi — hiçbiri eklenmedi ya da değiştirilmedi (talimata uygun).

---

## 6. Korunan mevcut işlevler

- `SINGLE_PROMPT`, `ROOM_PROMPT`, `TIPS_PROMPT` — birebir aynı, karaktere bağlanmadı.
- Tek Eşya ve Oda Taraması'nın JSON çıktı şemaları — dokunulmadı.
- Veritabanı şeması — dokunulmadı.
- Konuşma hafızası/kalıcılık sistemi — dokunulmadı (Keşif sohbeti hâlâ sayfa yenilenince kayboluyor, bu bilinçli olarak bu fazın kapsamı dışında).
- Kullanıcı hesapları ve erişim sistemi — dokunulmadı.
- Sestia Kütüphanesi'nin rotasyon/ziyaret mekanizması (`message_state`, `sestia_visit`) — dokunulmadı.
- İlham kıvılcımlarının sohbet bağlamına aktarım sistemi — dokunulmadı (ön denetimde tespit edilen "kivilcim" anahtarının UI'da tetiklenmediği durum hâlâ aynı, bilinçli olarak düzeltilmedi).
- Bilgi Kütüphanesi mimarisi — eklenmedi.

---

## 7. Gerçekten çalıştırılan testler ve sonuçları

### 7.1 Statik doğrulama (kod okuması + derleme, gerçek API çağrısı yok)
- `lib/anthropic.js`, `lib/sestiaLibrary.js`, `app/page.js` değişikliklerinden sonra proje dosyaları söz dizimi hatası içermiyor — geliştirme sunucusu (`next dev`) hatasız ayakta kaldı, `GET /` isteği 307 (beklenen erişim yönlendirmesi) döndürdü, çökme/derleme hatası yok.
- Mevcut misafir kimliğiyle (`Ruh`, 5 kararlı, gerçek işi olan kullanıcı) `HomeView` sorunsuz render edildi — bu ekran zaten `SINGLE_PROMPT`/`ROOM_PROMPT`'a bağlı, dokunulmadıklarını ve genel sayfanın bozulmadığını dolaylı olarak doğruluyor.
- `Aklına takılan bir şey var mı?` ve greeting id 12'nin yeni metninin dosyalarda doğru şekilde yer aldığı satır satır yeniden okunarak doğrulandı.

### 7.2 Canlı AI testleri (gerçek Anthropic API çağrıları — kullanıcı izniyle, izole bir test misafir kimliğiyle, gerçek kullanıcı/misafir verisine dokunmadan; toplam 4 çağrı)

**Test 1 — Kullanıcı somut bir yaratıcı fikir istiyor (2 turlu):**
Sorulan: *"Atölyemi ev ofisine dönüştürmek istiyorum ama yeni mobilya alacak bütçem yok. Elimdekilerle bir fikrin var mı?"*
Sonuç: Sestia doğrudan bir fikir vermek yerine önce atölyede ne olduğunu sordu ("Şu an ne var? Tezgâh, raf, sandalye, depolama...").
Devam turunda detay verildiğinde ("büyük ahşap tezgah, birkaç açık raf, eski ofis sandalyesi") yine somut bir öneri sunmak yerine ek sorular sordu (tezgahın büyüklüğü, rafların ne tuttuğu, "ev ofisi" ile ne kastedildiği).
**Değerlendirme — dürüst:** Bu, §8 ilke 1 ("önce anla, sonra öner") ve §6.3 ("sezgili ama varsayımsız") ile uyumlu bir davranış — model görmediği ayrıntıları uydurmuyor. Ama aynı zamanda "Bir fikrim var" ilkesinin beklediği gibi somut bir fikri henüz ÜRETMEDİ; iki turda da soru sormayı sürdürdü. Bu, karakter temelinin "önce anla" ile "somut fikir sun" arasındaki dengeyi bu senaryoda "anlama" tarafına kaydırdığını gösteriyor — **kısmi/karışık sonuç**, tam bir başarı olarak raporlamıyorum.

**Test 2 — Kullanıcı farklı bir yön seçtiğinde Sestia eski önerisini dayatmıyor mu (3 turlu, önceki Sestia turu elle kurgulanmış bağlam olarak verildi):**
Kurgu: Kullanıcı "eski sehpayı satmayı düşünüyorum" diyor, (kurgulanmış) önceki Sestia yanıtı "satmak bir seçenek ama farklı kullanım da olabilir" diyor, kullanıcı "Hayır, satmak istemiyorum, sadece yerini değiştirmek istiyorum" diyor.
Sonuç: *"Anladım. Şu an nerede duruyor, hangi odaya taşımayı düşünüyorsun?"*
**Değerlendirme:** Geçti. Önceki öneriyi savunmadı, tekrarlamadı; kullanıcının yeni yönüne (yer değiştirme) doğrudan ve kısa geçti.

**Test 3 — Kullanıcı yalnızca tek bir adım istiyor (brevity testi):**
Sorulan: *"Uzun uzun konuşacak halim yok bugün. Şu dolabı toparlamak için bana tek bir şey söyle, nereden başlayayım?"*
Sonuç: *"Bir köşeyi seç — kapıyı açınca gözüne ilk çarpan yer. Oradan başla."*
**Değerlendirme:** Geçti. Tek cümle, doğrudan, soru işareti yok, "ister misin/hazır mısın" refleksi yok, emoji/"patron" hitabı yok.

**Test sonrası temizlik:** `/api/sestia-chat`'in hiçbir veritabanı yazma fonksiyonu çağırmadığı doğrulandı (kod okuması + test sonrası DB sorgusu) — test misafir kimliği için `users`/`message_state`/`rooms` tablolarında hiçbir satır oluşmadı, temizlenecek bir şey yoktu.

---

## 8. Henüz test edilmemiş davranışlar

Kullanıcıyla üzerinde anlaşılan ~3-4 çağrılık bütçe gereği, aşağıdaki senaryolar **hazırlandı ama canlı çalıştırılmadı**:
2. Sestia kendi gerekçeli görüşünü ifade ediyor (Test 1'de dolaylı gözlemlendi ama ayrı, hedefli bir senaryo olarak koşulmadı).
6. Kullanıcı Sestia'nın yanlışını düzeltiyor (Karakter Laboratuvarı §13.4 tipi bir senaryo).
7. Kullanıcı hatırası olan bir eşyayı dönüştürmeyi düşünüyor (Karakter Laboratuvarı §13.9 tipi bir senaryo — dosyanın kendisi de bu sahnenin nihai replik olarak henüz kilitlenmediğini belirtiyor).
8. Kullanıcı daha önce düşünmüş olduğu bir değişiklikten vazgeçiyor (Karakter Laboratuvarı §13.5 tipi bir senaryo).

Ayrıca **Karakter Laboratuvarı'nın 16. karşılaşması** (atölye → dijital çalışma alanı, §13.10) için: Karakter Dosyası'nda bu sahnenin birebir kilitlenmiş bir nihai repliği yok — sadece onaylı bir yaklaşım tarifi var. Bu yüzden bu sahneyi birebir yeniden üretmeye çalışmadım; Test 1 bu sahneyle KONU olarak örtüşüyor (atölye→ev ofisi) ama kurgusu/detayları farklı, doğrudan bir "onaylı sahneyi tekrarlama" testi değil.

---

## 9. Bilinen eksikler ve riskler

- **Test 1'in karışık sonucu:** Karakter temeli "Bir fikrim var" ile "önce anla, sonra öner"i dengelerken, en az bir gerçek örnekte model "anlama" tarafına fazla ağırlık verdi ve somut bir fikri iki turda da üretmedi. Bu, prompt ifadesinin (özellikle "somut fikir sun" ile "varsayma" arasındaki denge) ileride ince ayar gerektirebileceğine işaret ediyor — şu an kesin bir sonuca varmak için tek bir test yeterli değil, daha fazla örnek gerekir.
- **12 karşılama/15 kıvılcımın geri kalanı** hâlâ eski, soru-ağırlıklı ve bazı yerlerde varsayımsı dille yazılı (ön denetimde belgelenmişti) — bu fazda topluca düzeltilmedi, ayrı bir editoryal iş.
- **Diğer 3 AI akışı (Tek Eşya, Oda Taraması, Bu Hafta)** hâlâ karaktersiz — kendilerini "declutter uygulaması" olarak tanımlıyorlar, `SESTIA_CHARACTER_BASE`'e bağlı değiller. Kullanıcı bu akışlarda hâlâ farklı bir "Sestia" ile karşılaşıyor (bkz. önceki denetim raporu, Bölüm C).
- **İlham kıvılcımı bağlamı hâlâ UI'da tetiklenmiyor** ve sabit etikete dayanıyor — bilinçli olarak bu fazda dokunulmadı, ama bilinen bir açık olarak kalıyor.
- **Sohbet hafızası hâlâ yok** — Keşif sohbeti sayfa yenilenince kayboluyor; Karakter Dosyası v1 §9'un beklediği üç katmanlı hafıza (konuşma geçmişi/yaşam alanı bağlamı/çalışma durumu) kodda yok.
- **"Fikri vardır, dayatmaz" ilkesi** bilinçli olarak deneysel/v2-adayı etiketiyle eklendi — eğer bu ilke sonradan reddedilir ya da değiştirilirse, `SESTIA_CHARACTER_BASE`'deki ilgili paragrafın çıkarılması/güncellenmesi gerekir.
- **Token/uzunluk riski:** `CHAT_PROMPT` artık önemli ölçüde uzadı (yaklaşık 3 kat). `chatFreely`'nin `max_tokens: 400` sınırı değiştirilmedi — sistem promptunun uzaması yanıt bütçesini azaltmaz (girdi/çıktı token'ları ayrı sayılır) ama maliyeti artırır; canlı testlerde bu bir soruna yol açmadı, gözlemlenmedi.

---

## 10. Faz 2 için öneriler

(Yalnızca öneri — bu raporla birlikte karar verilmedi.)

1. Test 1'in karışık sonucunu netleştirmek için birkaç ek, hedefli "somut fikir" senaryosu çalıştırmak (izin alınarak).
2. Karakter Laboratuvarı'nın kalan senaryolarını (§13.4, §13.5, §13.9, §13.10'un kendi kurgusuyla) canlı test etmek.
3. 12 karşılama + 15 ilham kıvılcımının tam editoryal revizyonu — ayrı bir içerik incelemesi olarak.
4. `SESTIA_CHARACTER_BASE`'in `TIPS_PROMPT`'a genişletilmesi (ön denetimde önerilen sıradaki, orta riskli adım).
5. İlham kıvılcımı kutusuna gerçek bir sohbet tetikleyicisi eklenmesi ve `SECTION_CONTEXT_LABELS`'in gerçek kart/kıvılcım metnini taşıyacak şekilde genişletilmesi.
6. Sohbet hafızası/kalıcılık tasarımı — Karakter Dosyası'nın kendi yol haritasındaki ayrı bir iş.

---

*Bu rapor bir çalışma raporudur; Karakter Dosyası v1'in (`docs/SESTIA_KARAKTER_DOSYASI_v1.md`) yerini almaz ve onu değiştirmez. Faz 1 tamamlanmıştır — bir sonraki faza kendiliğinden geçilmemiştir.*
