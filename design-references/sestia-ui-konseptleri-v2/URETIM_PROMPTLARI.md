# Sestia UI konseptleri v2 — üretim promptları

**Tarih:** 25 Eylül 2026
**Amaç:** v1'deki 3 onaylı görsel ile 18 konsept ekranı, yeni marka kimliğine göre ChatGPT'de yeniden üretmek.
**Dayanak kararlar:**
- Karar 1: Yeni logo, düz versiyon.
- Karar 2: Petrol yeşili düğme ve başlık, karamel vurgu.
- Karar 3a: Ana slogan.
- Karar 3b: Alt satır.

---

## Nasıl kullanılır

1. ChatGPT'de **tek bir sohbet** aç ve tüm ekranları aynı sohbette üret. Bu, ekranlar arası tutarlılığı artırır.
2. İlk mesajda şu **üç referans görseli** ekle:
   - **Yeni düz logo:** `design-references/marka/logo-ana-duz.webp` (SESTIA + "Yaşam alanında, hep yanında." yazılı düz versiyon)
   - **Atmosfer referansı:** `design-references/ChatGPT Image Sep 22, 2026, 07_13_59 PM.png` (eski karşılama). Sadece ışık, doku ve kompozisyon için kullanılır.
   - **Tekrar eden örnek eşya:** `design-references/sestia-ui-konseptleri-v1/09-esya-degerlendirme.png` (ahşap kollu, krem döşemeli koltuk). 12–16 numaralı ekranlarda aynı eşya olarak kullanılır.
3. İlk mesaj olarak aşağıdaki **"Ortak tanım"** bölümünü gönder. Sonra her ekran için yalnızca ilgili **"Screen spec"** paragrafını tek tek gönder.
4. Logo her ekranda biraz farklı çıkarsa sorun değil. Gerçek logo kodda SVG olarak yerleştirilecek. Görsellerde logonun sadece yeri ve boyutu önemli.

### Karar bekleyen yerler

Metin içinde **[KARAR: …]** diye işaretlenmiş yerlerde hangi seçeneği istediğini seç, diğerini sil, sonra gönder. Bu yerler:

| İşaret | Nerede | Seçenekler |
|---|---|---|
| **[KARAR-1]** "Yaşam alanını istediğin hâle getirelim." | 04 Keşif, 17 Davet kodu | Kalsın / çıksın |
| **[KARAR-3]** "Tutmalı mı, satmalı mı, bağışlamalı mı? Son karar her daim senin." | 07 Oda/eşya seç | Kalsın / çıksın |
| **[KARAR-6]** "+5 puan" | 16 Karar kaydedildi | Kalsın / çıksın |

"Daha sakin, daha sen" türü sloganlar (**KARAR-2**) hiçbir ekranda kullanılmıyor. Onların yerine alt satır geldi.

### v1'e göre bilinçli değişiklikler

- **Marka:** Alev işareti → yeni logo. Başlıktaki "BİR ODA. BİR EŞYA." → **SESTIA**.
- **Renkler:** Karamel düğme → **petrol yeşili düğme**. Adaçayı yeşili onay/seçim → **petrol yeşili**.
- **Öneri görünümü:** Her yerde aynı dil kullanılıyor. Sestia'nın önerisi küçük **karamel "Öneri" etiketi** taşır. Kullanıcının kendi seçimi **petrol yeşili dolu** görünür. Böylece öneri, verilmiş bir karar gibi görünmez.
- **Hitap ekranı:** "1/3" sayacı ve "Atla" kaldırıldı.
- **Dekor:** Kitap sırtlarında yazı yok. "Yapay zekâ incelesin" yok.
- **17. ekran:** Yaprak logosu yok, yeni logo kullanılıyor.
- **Yapı kararı (Karar 5) henüz verilmedi.** Keşif ve Ana Sayfa, v1'deki gibi iki ayrı ekran olarak üretiliyor. Karar sonrası biri elenebilir.

---

## Ortak tanım (ilk mesaj)

```
Use case: ui-mockup. I will ask for a set of mobile app screens, one per message, for a Turkish home-and-living companion app called SESTIA. Keep EVERY screen in one consistent design system:

BRAND
- Name: SESTIA (wordmark in an elegant high-contrast classic serif, as in the attached logo). Never write "BİR ODA. BİR EŞYA." as a header or logo.
- Logo: use the attached flat SESTIA logo mark (house shape with speech-bubble tail, S-shaped path, arched window with sun). Reproduce it as faithfully as possible; never replace it with a flame, leaf or any other symbol. On working screens use it small (top-left or avatar size), never as a giant hero, except on the welcome screen.
- Tagline (only where specified): "Yaşam alanında, hep yanında."

COLORS (use exactly)
- Background: Warm Ivory #F4EFE7 with a subtle plaster-like texture.
- Primary buttons and headlines: Deep Teal #183C3F; button text white.
- Accent: Burnt Caramel #B26A3D — tagline, small links, the small "Öneri" (suggestion) label, thin divider lines. Never for primary buttons.
- Secondary surfaces / borders: Sand Stone #D8C7B0; cards in a slightly lighter ivory (#FBF8F3).
- Body text: dark espresso #2E2620; secondary text walnut #6A4A36 (keep readable contrast, never pale beige text).
- A user's own confirmed choice is shown with Deep Teal fill; Sestia's suggestion is shown with a small caramel "Öneri" label only — a suggestion must never look already selected or approved.
- No sage green, no other accent colors.

TYPOGRAPHY AND COMPONENTS
- Headlines: Fraunces-like warm serif in Deep Teal. Body: clean modern sans-serif. Exact Turkish diacritics (ı, İ, ş, ğ, ç, ö, ü, â).
- Primary button: Deep Teal pill, 48px equivalent height, white label with a thin right arrow. Secondary button: transparent pill with thin Deep Teal outline and teal text. Only ONE primary button per screen.
- Rounded ivory cards with very soft shadow, thin line icons, consistent 24px equivalent side margins.

ATMOSPHERE
- Soft afternoon light, feathered botanical leaf shadows at the top-right edge, tactile linen/knit textile and natural wood details only at the bottom corners. Decor never overlaps text or controls.
- Book spines in decor have NO readable text. No brand names, no English words anywhere.
- Photos look natural and lived-in, warm but realistic (not magazine-perfect).

FORMAT AND RULES
- Mobile portrait ~1024x1792, flat screen (no phone frame, no perspective), simple status bar "9:41" at top. No captions outside the screen, no watermarks.
- Use ONLY the Turkish copy I give. Do not invent features, menus, bottom navigation, step counters, promises of memory, shopping, ratings, or slogans like "daha iyi sen".
- The sample user's name is "Deniz". Recurring sample object: the wooden-armed cream upholstered armchair from the attached reference, called "Ahşap sandalye"; keep it identical wherever it appears.

Reply "Hazır" and wait for the first screen spec.
```

---

## Ekranlar

Her blok ayrı bir mesaj olarak gönderilir. Başlıktaki numaralar v2 sırasıdır, parantez içinde v1 karşılığı yazıyor.

### 01 — Karşılama (onaylı 07_13_59)

```
Screen spec 01 — Welcome. Centered composition like the atmosphere reference. Medium-large SESTIA logo mark, below it the SESTIA wordmark in Deep Teal, below it caramel tagline "Yaşam alanında, hep yanında." Then Deep Teal serif headline "Etrafına bir bak." Dark text "Her şey tam da istediğin gibi mi?" Walnut text on two lines "Belki değiştirmek istediğin bir şey vardır. Belki de henüz ne olduğunu bilmiyorsundur." Bold dark "Birlikte keşfedebiliriz." Primary teal pill "Hadi Başlayalım" with arrow. Below a short caramel divider line and small walnut text "Bir oda. Bir eşya. Sonsuz fikir." Knit throw on a wooden stool bottom-left, stack of blank-spined books bottom-right, leaf shadow top-right.
```

### 02 — Hitap (onaylı 07_13_06)

```
Screen spec 02 — How should I address you. Back arrow top-left only (no step counter, no skip). Small SESTIA logo mark and small wordmark centered. Large Deep Teal serif headline on two lines "Sana nasıl hitap etmemi istersin?" Supporting text "Böylece konuşmalarımız daha sana özel olabilir." Rounded ivory input with placeholder "Adın ya da tercih ettiğin hitap". Primary teal pill "Devam Et" with arrow. No slogan at the bottom. Olive branch in a speckled vase and blank-spined books bottom-left, leaf shadow top-right.
```

### 03 — Giriş yöntemi (v1 04-hesap)

```
Screen spec 03 — How to continue. Back arrow. Deep Teal serif headline "Nasıl devam etmek istersin?" Supporting "Memnun oldum, Deniz." An elevated ivory card with a small Deep Teal rounded-square envelope icon and serif title "E-posta ile devam et", field label "E-posta adresin", placeholder "ornek@email.com", primary teal pill "Giriş bağlantısı gönder". Below the card a clearly button-shaped secondary outlined pill "Misafir olarak devam et" with arrow. Small walnut text "İlerlemeni hesabınla koru." No passwords, no social logins.
```

### 04 — Keşif / ilk kullanım (v1 01-kesif)

```
Screen spec 04 — Discover, first use. Top row: small SESTIA logo mark with wordmark "Sestia" left, thin profile outline icon right. Large Deep Teal serif headline [KARAR-1: KALSIN → "Yaşam alanını istediğin hâle getirelim." | ÇIKSIN → "Birlikte bakalım."] Supporting walnut text "Bir fikirle, bir soruyla ya da sadece merakla başlayabiliriz." Ivory card "Aklına takılan bir şey var mı?" with rounded input "Sestia'ya yaz…" and a round teal send button. Below an editorial photo card of a sunny reading corner titled "Bir köşenin başka bir hayatı" with caramel link "Birlikte düşünelim →". Bottom: small text "Bir fotoğrafla başlayabilirsin." and ONE primary teal pill "Kamera ile çek" with camera icon.
```

### 05 — Ana sayfa / geri dönen kullanıcı (v1 02-ana-sayfa)

```
Screen spec 05 — Home, returning user. Top row: small SESTIA logo mark left, profile icon right (no "BİR ODA. BİR EŞYA." text). Large Deep Teal serif "Merhaba, Deniz." Supporting "Bugün yaşam alanında neye bakalım?" Rounded conversation input with chat icon "Aklındakini paylaş…" and round teal arrow button. Section serif "Odalarım" with caramel link "Tümünü Gör >", two photo cards "Salon" and "Çalışma odası". Section serif "Bu haftanın fikirleri" with caramel link "Tümünü Gör >", one horizontal editorial card: photo left, small caramel label "İLHAM", serif title "Küçük dokunuşlarla büyük değişim", text "Yaşam alanına taze bir bakış kazandırabilecek fikirler." Bottom ONE primary teal pill "Fotoğrafla birlikte bakalım" with camera icon.
```

### 06 — Sestia ile sohbet (v1 03-sohbet)

```
Screen spec 06 — Chat with Sestia. Back arrow, small SESTIA logo mark as avatar, serif "Sestia" and walnut subtitle "Birlikte bakalım". User message in a sand-toned bubble on the right "Pencere önünü okuma köşesi yapmak istiyorum." Sestia reply on the left in an ivory bubble next to the small logo avatar "Koltuğu ışığı yandan alacak şekilde çevirebiliriz. Yanına küçük bir sehpa, akşam için de bir okuma lambası düşünülebilir." Below it a photo card of a realistic reading corner with small caption "Bir yerleşim fikri". Bottom input "Aklındakini yaz…" with round teal send button. No decision controls.
```

### 07 — Bir oda veya bir eşya seç (onaylı 07_14_12)

```
Screen spec 07 — Choose a room or an object. Back arrow, small SESTIA logo mark centered. Deep Teal serif headline "Bir oda veya bir eşya seç." Text "Fotoğrafını çek ya da galerinden yükle." Walnut text "Neler yapabileceğimize birlikte bakalım." Two large ivory cards with chevrons: soft illustration of the armchair + serif title "Tek Eşya" + "Bir eşyayı birlikte değerlendirelim."; small isometric room illustration + serif title "Oda Taraması" + "Odanın genel hâline birlikte bakalım." Below: primary teal pill "Kamera ile çek" and secondary outlined pill "Galeriden yükle" side by side. [KARAR-3: KALSIN → bottom caramel divider and small text "Tutmalı mı, satmalı mı, bağışlamalı mı? Son karar her daim senin." | ÇIKSIN → nothing below the buttons.]
```

### 08 — Odalarım (v1 05-odalarim)

```
Screen spec 08 — My rooms. Back arrow, centered serif title "Odalarım", supporting "Birlikte baktığımız alanlar." Two large landscape photo cards with realistic, slightly imperfect home photos (as if taken by the user with a phone): "Salon" with "3 fotoğraf · 2 analiz", "Çalışma odası" with "2 fotoğraf · 1 analiz". Bottom: rounded input with house icon "Yeni oda adı" and teal pill "Oda ekle".
```

### 09 — Oda detayı (v1 06-oda-detay)

```
Screen spec 09 — Room detail. Back arrow, large Deep Teal serif "Salon", text "Bu odada görmek, anlamak, değiştirmek istediğin her şeye birlikte bakalım." Hero room photo, a strip with two thumbnails and a quiet tile "Fotoğraf ekle". Actions: ONE primary teal pill "Odaya birlikte bakalım" and ONE secondary outlined pill "Bir eşyaya bakalım" side by side. Section serif "Önceki analizler": row with thumbnail, "Pencere önü", walnut "22 Eylül ·" and caramel link "Görüntüle". Section serif "Kararlarım": row with the armchair thumbnail, "Ahşap sandalye" and a small teal filled chip "Tut".
```

### 10 — Tek fotoğraf ekleme (v1 07-fotograf)

```
Screen spec 10 — Add a photo of one object. Back arrow, Deep Teal serif "Birlikte bakalım." Text "Üzerine konuşmak istediğin eşyanın fotoğrafını paylaş." Large rounded dashed placeholder with thin camera line icon and "Fotoğrafını buraya ekle". Primary teal pill "Fotoğraf çek", secondary outlined pill "Galeriden seç". Small walnut text "Eşyanın tamamı ve ayrıntıları görünsün."
```

### 11 — Oda fotoğrafları (v1 08-oda-fotograflari)

```
Screen spec 11 — Room photos. Back arrow, Deep Teal serif "Alanı birlikte görelim.", walnut subtitle "Salon". Three thumbnails of the same living room from different angles with small round remove buttons, a dashed tile "+ Fotoğraf ekle". Text "Farklı açılar, alanı daha iyi anlamamıza yardımcı olur." Two small outlined buttons "Kamera" and "Galeri". Primary teal pill "Bu fotoğraflarla devam et". Small caramel progress line and "3 / 6 fotoğraf".
```

### 12 — Eşya değerlendirmesi (v1 09-esya-degerlendirme)

```
Screen spec 12 — Evaluate an object. Back arrow. Medium photo of the reference armchair, small caption "Salon · Ahşap sandalye". Deep Teal serif "Birlikte değerlendirelim." Sestia observation "Ahşap gövde ve açık renk döşeme, farklı köşelere uyum sağlayabilir." Ivory card titled "Mevcut eşya kararı" with five equal outlined choice tiles with thin icons: "Tut", "Sat", "Bağışla", "Geri dönüştür", "At". NONE is selected; the "Tut" tile only carries a small caramel "Öneri" label on its top edge. Text "Eklemek istediğin bir şey var mı?" and a text area "Notunu buraya yazabilirsin…". Primary teal pill "Kararımı kaydet".
```

### 13 — Oda değerlendirmesi (v1 10-oda-degerlendirme)

```
Screen spec 13 — Room review. Back arrow, Deep Teal serif "Salona birlikte bakalım." Room photo banner. Small caramel label "Sestia" and text "Pencere önü, farklı bir yerleşimi denemek için iyi bir başlangıç olabilir." Divider. Serif "Eşyalar üzerine", walnut "Bu odadaki bazı eşyalar için ne düşünüyorsun?" Two ivory cards with object thumbnails: "Ahşap sandalye" (the reference armchair) and "Küçük sehpa"; each has a small caramel "Öneri: Tut" label and two outlined pills "Değiştir" and "Hariç tut" (nothing filled). Input with chat icon "Oda hakkında bir not ekle…". Primary teal pill "Seçimlerimi onayla".
```

### 14 — Geçmiş analiz, salt okunur (v1 11-analiz-gecmisi)

```
Screen spec 14 — Past analysis, read-only. Back arrow, small caramel label "Geçmiş analiz", Deep Teal serif "Birlikte baktıklarımız", walnut "Salon · 22 Eylül 2026". Photo strip of the room. Card with armchair thumbnail: small caramel "Sestia'nın önerisi" and serif "Ahşap sandalye: Tut". Card with the same armchair: small teal "Senin seçimin" and serif "Ahşap sandalye: Tut". Section "Notun" with a quote card "Bu sandalye benim için hatıra." Primary teal pill "Odaya dön". No text input.
```

### 15 — Haftalık ilham (v1 12-ilham)

```
Screen spec 15 — This week's ideas. Back arrow, Deep Teal serif "Bu haftanın fikirleri", walnut "Yaşam alanına küçük dokunuşlar." Large realistic sunny room-corner photo (no readable book titles). Two editorial cards with photo left: serif "Işığa yer aç" + "Pencere önündeki küçük eşyaları bir araya getir."; serif "Bir arada, daha kolay" + "Sık kullandıklarını erişebileceğin yerde tut." Small caramel divider and serif walnut text "Elindekilere yeniden bak."
```

### 16 — Karar kaydedildi (v1 13-tamamlandi)

```
Screen spec 16 — Decision saved. Small check mark in a Deep Teal circle. Deep Teal serif "Kararın kaydedildi." Text "Ahşap sandalye için seçimin: Tut." Photo vignette of the SAME reference armchair (wooden arms, cream upholstery) in warm sunlight. [KARAR-6: KALSIN → tiny low-emphasis sand chip "+5 puan" | ÇIKSIN → no points.] Primary teal pill "Odama dön", below a caramel underlined text link "Başka bir eşyaya bak". No confetti.
```

### 17 — Davet kodu / erişim (v1 14-erisim)

```
Screen spec 17 — Invite code. Centered SESTIA logo mark and SESTIA wordmark, caramel tagline "Yaşam alanında, hep yanında." Deep Teal serif headline "Hoş geldin." [KARAR-1: KALSIN → text "Yaşam alanını istediğin hâle getirelim." | ÇIKSIN → no text under the headline.] Field label "Davet kodun", input placeholder "Kodunu yaz". Primary teal pill "Devam et".
```

### 18 — Geri bildirim paneli (v1 15-geri-bildirim)

```
Screen spec 18 — Feedback sheet. Behind: screen 05 (Home) softly dimmed, with NO hamburger menu. Bottom sheet covering the lower half in light ivory with drag handle and close icon. Deep Teal serif "Geri bildirim", text "Bir fikrin ya da paylaşmak istediğin bir şey var mı?" Text area "Aklındakini yaz…". Primary teal pill "Gönder".
```

### 19 — Hata / yeniden deneme (v1 16-hata)

```
Screen spec 19 — Error. Very calm. Small Deep Teal rounded square with a thin white cloud-with-exclamation line icon. Deep Teal serif "Bir şeyler yolunda gitmedi." Text "Birazdan yeniden deneyebilirsin." Primary teal pill "Tekrar dene". No red, no error codes.
```

### 20 — Yönetici girişi (v1 17-yonetici-giris)

```
Screen spec 20 — Owner login. Top-left small SESTIA logo mark with SESTIA wordmark (no leaf symbol). Centered Deep Teal serif "Sahibi Paneli", text "Yönetici erişim kodunu gir." Input with lock icon "Yönetici kodu". Primary teal pill "Giriş yap". Minimal decor.
```

### 21 — Yönetici paneli (v1 18-yonetici-paneli)

```
Screen spec 21 — Owner dashboard. DESKTOP landscape 1536x1024. Top-left small SESTIA logo and wordmark, top-right avatar "SK" and "Sahip". Deep Teal serif "Sahibi Paneli", walnut subtitle "Örnek veriler". Card "Aktif cihaz" with large "24" and "Son 7 gün". Card "Günlük karar sayısı" with a bar chart of 7 Deep Teal bars dated "19 Eyl" to "25 Eyl". Two tables "Geri bildirimler" and "Hatalar" with columns Tarih / Kullanıcı or Tür / Mesaj, short fictional entries dated September 2026, caramel links "Tümünü gör →". Very subtle decor, nothing over the data.
```

---

## Üretim sonrası kontrol listesi

Her görsel için:

- [ ] "BİR ODA. BİR EŞYA." başlıkta yok. Sadece 01'in altında, alt satır olarak var.
- [ ] Alev ya da yaprak simgesi yok.
- [ ] Birincil düğme petrol yeşili ve ekranda tek.
- [ ] Öneri karamel etiketle gösteriliyor ve seçili görünmüyor.
- [ ] Türkçe karakterler doğru.
- [ ] İngilizce yazı ya da kitap başlığı yok.
- [ ] 12–16 numaralı ekranlarda koltuk aynı.
- [ ] Uydurulmuş bir menü, sayaç ya da özellik yok.

Üretilen görseller bu klasöre `01-karsilama.png`, `02-hitap.png`, … şeklinde kaydedilir.
