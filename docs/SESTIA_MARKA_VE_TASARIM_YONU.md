# SESTIA — Marka ve tasarım yönü

**Tarih:** 25 Eylül 2026
**Kapsam:** Tasarım yönü değerlendirmesi. Kod, metin, logo ve arayüz değiştirilmedi. Görsel üretilmedi.
**Dayanak:**
- `design-references/` altındaki 3 onaylı PNG ile `sestia-ui-konseptleri-v1` içindeki 18 ekran, `INCELEME.md` ve `URETIM_PROMPTLARI.md`.
- Çalışan uygulamanın izole ortamda, açık temada ve 375 px mobil genişlikte alınan güncel ekran görüntüleri (24 Eylül).
- Kaynak kod.

**Marka:** **SESTIA**
- *Yaşam alanında, hep yanında.*
- *Bir oda. Bir eşya. Sonsuz fikir.*

## 0. Özet

- **Görsel dil zaten doğru ailede.** Fraunces + Plus Jakarta Sans, krem zemin ve karamel/kahve hap düğmeler referanslarla örtüşüyor. Eksik olanlar atmosfer (doğal ışık, fotoğraf, doku), fildişi kartlar ve güçlü serif başlık hiyerarşisi.
- **Marka adı uygulamada iki farklı şekilde duruyor.** Karşılama ekranı eski ürün adını ("BİR ODA. BİR EŞYA.") başlık olarak kullanıyor. Sekme başlığı, manifest ve karakter ise "Sestia". Yeni kimliğin üç satırı henüz hiçbir yerde yok.
- **İlk üç ekran işlevsel olarak hedefe yakın; anlatım ve görsel ağırlık olarak uzak.**
  - Karşılama, onaylı PNG'ye yakın ama uygulamanın ne işe yaradığını anlatmıyor.
  - Hitap ekranı doğru kurgulanmış ama zayıf.
  - Giriş yöntemi ekranında misafir seçeneği düğme gibi görünmüyor.
- **Alev işareti iki anlamda kullanılıyor.** Hem marka işareti hem de "seri/gün" oyunlaştırma ikonu.
- **Keşif, Ana Sayfa, Sohbet ve Odalarım bugün birbirinin yerine geçiyor.** İlk çalışma başladığında Keşif kayboluyor. Sohbet yalnızca Keşif içinde duruyor. Ana Sayfa'da sohbet girişi yok.

## 1. Referansları nasıl okudum

| Katman | Kaynak | Kullanım |
|---|---|---|
| Nihai/onaylı | `07_13_59` karşılama, `07_13_06` hitap, `07_14_12` "Bir oda veya bir eşya seç" | Atmosfer, hiyerarşi ve kompozisyon için ana çıpa. Birebir kopya değil. |
| İkinci sınıf öneri | 18 konsept ekran | Fotoğraf kullanımı, kart dili, ekran içi düzen için fikir havuzu. |
| Eski üretim talimatları | `URETIM_PROMPTLARI.md`, `INCELEME.md` | Kalite ilkeleri (kontrast, dokunma alanı, uydurma özellik yok) geçerli. Ürün kısıtları yeni kararların altında kalıyor. |

**Yeni kararla çelişen eski talimat ve görsel öğeler:**
- **Hitap PNG'sindeki "1/3" sayacı ve "Atla":** Yeni karara göre kullanılmayacak.
- **PNG sloganları:** "Aynı alan, daha güzel bir sen", "Daha sakin, daha sen", "Tutmalı mı, satmalı mı…". Yeni marka dili bunların yerini almalı. Eski talimat da "daha iyi sen" sloganlarını dışlıyordu.
- **"Yapay zekâ incelesin"** (PNG 3): Makine anlatımı, "Sestia yanında" diline uymuyor.
- **Eski talimattaki "zorunlu oda/eşya kapısı yok" kuralı:** PNG 3 onaylı. Bu kapının yeri artık ilk akış değil, Ana Sayfa/Keşif tasarımında belirlenecek (§4, karar 11).
- **Konsept 17'deki yaprak işareti:** `INCELEME.md`'ye göre yeni logo kararı değil. Mevcut alev işareti geçerli.

## 2. SESTIA adı ve marka dilinin yeri

### 2.1 Bugün marka adı nerede geçiyor

| Yer | Bugünkü metin | Durum |
|---|---|---|
| Karşılama `app/hosgeldin/page.js:47` | Başlık: **"BİR ODA. BİR EŞYA."** | Eski ürün adı ana marka konumunda. |
| Sekme başlığı ve PWA `app/layout.js:6,12`, `public/manifest.json` | "Sestia" | Yeni adla uyumlu (yazım: §7-1). |
| Meta açıklama `app/layout.js:7` | "Bir eşyaya karar ver: tut, sat, bağışla, at ya da geri dönüştür — AI önerisiyle." | Eski ve dar kapsam. |
| Hitap `app/page.js:1461` | "Merhaba, ben Sestia!" | Marka = karakter kararına uygun. |
| Giriş e-postası `lib/auth.js:37,40` | Konu: "Bir Oda. Bir Eşya. — giriş bağlantın"; gövde: "Merhaba, ben Sestia." | Konu eski marka. |
| Karakter talimatı `lib/anthropic.js:21` | "Sen Sestia'sın — "Bir Oda. Bir Eşya." uygulamasının karakterisin." | Artık marka ile karakter aynı. Karakter dosyası kapsamında ayrı güncelleme gerekir. |
| Davet kodu `/giris` `app/giris/page.js:52–55` | "Sestia" + eski açıklama + karar çipleri (Tut/Sat/…) | Eski kapsamı anlatıyor. |
| Paket adı `package.json` | `bir-oda-bir-karar` | Dahili; kullanıcı görmüyor, değişmesi gerekmiyor. |

### 2.2 Üç satırın önerilen yeri

| Öğe | Nerede | Not |
|---|---|---|
| **SESTIA** (kelime işareti) | Karşılamada alev işaretinin altında, bugünkü "BİR ODA. BİR EŞYA." yerinde. Çalışan ekranlarda üstte küçük boyutta ya da hiç. | Onaylı PNG'deki serif, büyük harfli, geniş aralıklı dizgi doğrudan taşınabilir. |
| **Yaşam alanında, hep yanında.** | Karşılamada kelime işaretinin hemen altında (slogan). Meta açıklama, manifest açıklaması, giriş e-postası imzası. | Vaat cümlesi. Her ekranda tekrarlanmamalı. |
| **Bir oda. Bir eşya. Sonsuz fikir.** | Karşılama altındaki küçük satır (PNG'deki "Daha sakin, daha sen." konumu). Keşif başlığında ya da boş durumlarda kapsam cümlesi olarak. | Kapsamı ve ürün kökenini anlatır. Başlık değil, imza satırı. |

Çalışan ekranlarda (tarama, değerlendirme, Odalarım) marka satırlarına gerek yok. Oralarda marka, Sestia'nın sesi ve görsel dil üzerinden hissedilmeli.

## 3. İlk üç ekran: bugün ve hedef

### 3.1 Karşılama (`/hosgeldin`) — referans `07_13_59`

| Konu | Bugün | Hedef ile fark |
|---|---|---|
| Kompozisyon | Logo, başlık, metinler ve CTA PNG ile neredeyse birebir. | Yakın. |
| Marka | Başlık "BİR ODA. BİR EŞYA." | SESTIA + slogan olmalı (§2.2). |
| Ne işe yaradığı | "Etrafına bir bak. Her şey tam da istediğin gibi mi? … Birlikte keşfedebiliriz." | Duygusal ama işlevi anlatmıyor. Düzenleme, yerleşim, dekorasyon, yeniden kullanım, ilham ve ev/ofis/atölye kapsamı hiç geçmiyor. 1–2 kısa açıklayıcı cümle eksik. |
| Atmosfer | Tek bir çizgi dal süslemesi, düz degrade. | PNG'deki doğal ışık, gölge, kumaş/ahşap/kitap köşesi yok. |
| Alt imza | Yok. | "Bir oda. Bir eşya. Sonsuz fikir." bu konuma uygun. |
| CTA | "Hadi Başlayalım →" hap düğme. | Uygun. |

### 3.2 Hitap — referans `07_13_06`

| Konu | Bugün | Hedef ile fark |
|---|---|---|
| Kurgu | Tek alan + "Devam Et". Sayaç, "Atla" ve çip yok. | Karara uygun. |
| Başlık | Küçük (22 px) "Merhaba, ben Sestia!" ve altında soluk "Sana nasıl hitap etmemi istersin?" | PNG'de soru büyük serif başlık, altında gerekçe satırı ("Böylece konuşmalarımız daha sana özel olabilir."). Bugün hiyerarşi ters ve zayıf. |
| Logo | Kodda 64 px alev işareti var. | 24 Eylül ekran görüntüsünde görünmedi; tasarım sırasında doğrulanmalı. |
| Düğme | Ad yazılmadan soluk bej, devre dışı. | Pasif durum PNG'deki hap düğme dilinde tasarlanmalı. |
| Atmosfer | Düz zemin, dekor yok. | PNG'deki bitki/kitap/ışık köşesi yok. |

### 3.3 Giriş yöntemi — onaylı PNG yok; en yakın öneri konsept 04

| Konu | Bugün | Hedef ile fark |
|---|---|---|
| Başlık | Ortalanmış küçük "Memnun oldum, X!" ve soluk "Nasıl devam etmek istersin?" | Konsept 04'teki büyük serif soru ve altındaki kişisel satır daha güçlü. |
| E-posta hazır | Birincil "E-posta ile Devam Et" düğmesi. Tıklayınca form açılıyor. Altında "İlerlemeni koru…" satırı. | İki adımlı. Konsept 04 etiketli alanı tek kartta gösteriyor. |
| E-posta hazır değil | Yalnızca soluk bir satır: "E-posta ile giriş yakında burada olacak." | Ekran neredeyse boş kalıyor. |
| Misafir | `btn-secondary`: kenarlıksız, soluk renk. Ekranda düz metin gibi görünüyor. Etiket "Misafir Olarak Dene". | Belirgin ikincil düğme olmalı (konsept 04'teki kenarlıklı hap). Etiket kararı: "dene" mi "devam et" mi. |
| E-posta sonrası | "E-posta yolda" kartı. | Uygun; marka dili eklenebilir. |

## 4. Keşif, Ana Sayfa, Sohbet ve Odalarım

### 4.1 Bugünkü ilişki

- **Keşif:** Yalnızca henüz çalışması olmayan kullanıcıya gösteriliyor. Oda, fotoğraf, analiz ya da karar oluşunca bir daha görünmüyor (`isKesifActive`, `app/page.js:1099`). Uzun, metin ağırlıklı ve fotoğrafsız. İçinde Sestia sohbet kartı, fikir kartları ve iki başlangıç düğmesi var.
- **Ana Sayfa:** Geri dönen kullanıcı için. En üstte seri, puan ve karar sayaçları ile "Tek Eşya / Oda Taraması" kutuları. Sohbet girişi yok. Odalar tek satırlık bağlantı.
- **Sohbet:** Ayrı ekranı yok. Serbest sohbet yalnızca Keşif kartında. Oda sohbeti yalnızca oda değerlendirmesi içinde.
- **Odalarım:** İkon ve sayıdan oluşan liste. Detayda dört eylem düğmesi, geçmiş analizler ve kategori bazlı karar listesi.

**Sonuç:** Kullanıcı ilk çalışmasını yaptığında Keşif'i ve Sestia ile serbest konuşma yolunu kaybediyor. "Hep yanında" vaadi Ana Sayfa'da görünmüyor.

### 4.2 Önerilen görev ayrımı

| Yüzey | Görevi | Vazgeçmemesi gereken | Yapmaması gereken |
|---|---|---|---|
| **Ana Sayfa** | Kişisel merkez: "bugün nereden devam edelim?" | Kişisel selam; Sestia'ya giriş; yarım kalan işler; oda önizlemesi; hızlı başlangıç. | Keşif'in editoryal içeriğini tekrar etmek; oyunlaştırmayı kahraman öğe yapmak. |
| **Keşif** | İlham ve olasılıklar: "neler yapılabilir?" | Fotoğraflı fikir kartları; farklı alan türleri (ev, ofis, atölye); her kartın Sestia'ya bağlanması. | Yalnızca ilk kullanıcıya özel bir ekran olmak. Her zaman erişilebilir olmalı. |
| **Sohbet** | Sestia ile birlikte çalışma yüzeyi. | Her yüzeyden açılabilmesi; bağlam taşıması (hangi oda/eşya/fikirden geldiği); öneri sunması ama dayatmaması. | Kalıcı hafıza ya da araştırma yeteneğini arayüzde henüz olmadan vaat etmek. |
| **Odalarım** | Kalıcı kayıt: alanlar, fotoğraflar, analizler, kararlar. | Fotoğraflı alan kartları; analiz ile kararın açık ayrımı; eşya adıyla karar listesi. | Sohbet ekranına ya da görev listesine dönüşmek. |

**Tutarlılık için ortak unsurlar:**
- Her yüzeyde aynı başlık yapısı (büyük serif başlık + kısa yardımcı satır).
- Aynı Sestia sesi ve konuşma balonu dili.
- Aynı fotoğraf kartı bileşeni.
- Tek bir "Sestia'ya yaz" girişi deseni.

"Hep yanında" vaadinin görünür karşılığı: Sestia'nın her ana yüzeyde tek dokunuşla erişilebilir olması.

## 5. Görsel dil ile ürün akışı kararları

**Görsel dil** (akıştan bağımsız; bir kez karar verilip tüm ekranlara uygulanır):
1. Palet: Mevcut değişkenler uygun. Kart rengi beyaz mı fildişi mi?
2. Tipografi: Fraunces + Plus Jakarta Sans korunur. Ekran başlıkları daha büyük ve belirgin.
3. Fotoğraf ve ışık/doku: Hangi ekranlarda? Yoğunluk kuralı: sade ekranlarda kenarda, çalışan ekranlarda hiç ya da çok az.
4. Düğme dili: Hap şekli, ok ikonu, birincil/ikincil/metin düğmesi hiyerarşisi.
5. İkon dili: İnce çizgi. Karar seçeneklerinde ikon + görünür etiket.
6. Koyu tema: Bugün sistem ayarına göre otomatik açılıyor; bütün referanslar açık tema.
7. Oyunlaştırma görselleri (seri/puan kartları): Görsel ağırlıkları.
8. Marka işaretinin boyutu ve yerleşimi.

**Ürün akışı** (hangi ekran ne yapar, kullanıcı nereden nereye gider):
1. Keşif'in görünürlüğü (her zaman mı, yalnızca başta mı).
2. Sohbetin giriş noktaları ve ayrı bir sohbet ekranı olup olmayacağı.
3. Ana Sayfa'nın içeriği ve sırası.
4. Oda/eşya seçim kapısının yeri (onaylı PNG 3).
5. Oyunlaştırmanın ürün içindeki rolü.
6. Hesap önerisinin zamanlaması (ilk akışta mı, değer gördükten sonra mı).
7. Davet kodu ve erişim kapısının beta süresince kalıp kalmayacağı.
8. "Oda" ve "alan" adlandırması: ofis ve atölyeyi de kapsayan bir ürün için "Odalarım" yeterli mi?

## 6. Alev işaretinin kullanımı (tespit, değişiklik yok)

| Yer | Kullanım | Not |
|---|---|---|
| `public/icon.svg` | 512×512, `rx=112` köşeli kare, zemin `#A67C5A`, beyaz alev | Tek kaynak dosya. |
| `app/layout.js:35–36`, `public/manifest.json:12` | Favicon, apple-touch-icon, PWA ikonu | Marka işareti. |
| `app/hosgeldin/page.js:46` | 72 px, karşılama logosu | Marka işareti. |
| `app/page.js:1460` (`WelcomeView`) | 64 px, hitap ekranı | Marka işareti (görünürlüğü doğrulanmalı, §3.2). |
| `app/giris/page.js:51` | 56 px, davet kodu sayfası | Marka işareti. |
| `components/icons.js:18` `FlameIcon` | Ana Sayfa "1. Gün / N gün" kartı (`app/page.js:1818`); kutlama ekranı "Seri" (`:2672`) | **Aynı alev biçimi oyunlaştırma ikonu olarak kullanılıyor.** Marka işareti ile seri göstergesi aynı sembol. |
| `.flamewrap-compact` CSS sınıfı | Izgara, kutu, yıldız ve onay ikonlarının yuvarlak kabı | Yalnızca isim; alev içermiyor. |
| Sohbet | Konuşmacı etiketi metin olarak "Sestia"; avatar yok | Konsept 01/03'te alev, Sestia'nın avatarı ve başlık işareti olarak öneriliyor. |
| Yönetici giriş ve paneli | Alev yok | Konsept 17'deki yaprak işareti onaylı değil. |

## 7. İlk üç ekrandan önce verilmesi gereken kararlar

1. **Yazım:** Kelime işareti "SESTIA" (büyük harf) mi? Metin içinde ve karakter adında "Sestia" mı kalacak? Sekme başlığı ve manifestte hangisi?
2. **Karşılamadaki hiyerarşi:**
   - Başlık "SESTIA" + "Yaşam alanında, hep yanında." mı?
   - "Bir oda. Bir eşya. Sonsuz fikir." alt imza mı, ikinci satır mı?
   - "Etrafına bir bak." metni korunacak mı, açıklayıcı metinle mi değişecek?
3. **Açıklayıcı metin:** Karşılamada uygulamanın ne yaptığını anlatan onaylı 1–2 cümle. Kapsam (ev, ofis, atölye) açıkça yazılacak mı?
4. **PNG sloganları:** "Aynı alan, daha güzel bir sen" ve "Daha sakin, daha sen" kullanılmayacak, doğru mu?
5. **Atmosfer kaynağı:** İlk üç ekranda fotoğraf ve doku kullanılacak mı? Kaynak ne olacak (lisanslı gerçek fotoğraf, üretilmiş görsel, illüstrasyon)? Üç ekranın hepsinde mi, yalnızca karşılamada mı?
6. **Hitap başlığı:** Büyük başlık "Sana nasıl hitap etmemi istersin?" mi (PNG), "Merhaba, ben Sestia!" mı? Alev işareti bu ekranda tekrar gösterilecek mi?
7. **Giriş yöntemi:**
   - E-posta ile misafir eşit ağırlıkta mı, e-posta öncelikli mi?
   - E-posta hazır değilken ne gösterilecek?
   - Misafir etiketi: "Misafir olarak devam et" mi?
   - Hesap fayda cümlesinin metni.
8. **Davet kodu sayfası (`/giris`):** Beta boyunca akışta kalıyor mu? Kalıyorsa yeni markayla aynı dilde tasarlanmalı mı?
9. **Koyu tema:** İlk üç ekranda (ve genelde) desteklenecek mi?
10. **Alev işaretinin anlamı:** Yalnızca marka/Sestia işareti mi olacak? Seri göstergesi için ayrı bir sembol mü kullanılacak?
11. **Onaylı PNG 3'ün yeri:** "Bir oda veya bir eşya seç" ilk akışta yer almıyor. Ana Sayfa'da mı, Keşif'te mi, yoksa fotoğrafla başlama anında mı kullanılacak? (İlk üç ekranı engellemez; Ana Sayfa tasarımından önce gerekir.)
12. **Karakter talimatı:** Sestia'nın kendini "SESTIA uygulaması" olarak tanıtması için karakter dosyası güncellenecek mi? (Metin/prompt değişikliği; ayrı iş.)

## 8. Bu çalışmada yapılmayanlar

Kod, metin, marka adı, logo ve arayüz değiştirilmedi. Görsel üretilmedi. Gerçek veriye dokunulmadı. Commit ya da deploy yapılmadı. Ekran bulguları, 24 Eylül'de izole geçici veritabanıyla alınan ekran görüntülerine ve güncel kaynak koda dayanıyor.
