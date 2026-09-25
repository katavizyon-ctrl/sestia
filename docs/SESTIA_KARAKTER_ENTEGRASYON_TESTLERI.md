# SESTIA KARAKTER ENTEGRASYONU — CANLI API TESTLERİ

**Proje:** Bir Oda. Bir Eşya.
**Tarih:** 23 Eylül 2026, 15:00 civarı
**Kapsam:** `SESTIA_CHARACTER_BASE`'in Tek Eşya (`SINGLE_PROMPT`), Oda Taraması (`ROOM_PROMPT`) ve Bu Hafta (`TIPS_PROMPT`) akışlarına bağlanmasından sonraki ilk canlı doğrulama. Kullanıcı izniyle, akış başına tek çağrı, toplam **3 gerçek Anthropic API çağrısı**.
**Durum:** Yalnızca test ve rapor. Hiçbir düzeltme yapılmadı, commit oluşturulmadı, deploy yapılmadı.

---

## 1. Özet

| Akış | JSON sözleşmesi (uygulamanın kendi doğrulaması) | Karakter değerlendirmesi |
|---|---|---|
| Tek Eşya (takip turu) | ✅ Geçti | 🟡 Kısmi: öneriyi savunmadı, hatıra eşyasına saygılı; ama "Ne yapabilirim?" sorusuna somut fikir yerine yalnızca soru döndü |
| Oda Taraması (ilk tur) | ✅ Geçti (JSON kod bloğu içinde geldi, ayrıştırıcı tolere etti) | 🟡 Kısmi: var olanı doğru gördü, uydurmadı; ama arayüzde art arda iki soru oluşuyor, bir gerekçe kullanımı varsayıyor |
| Bu Hafta | ✅ Geçti (JSON kod bloğu içinde geldi, ayrıştırıcı tolere etti) | 🔴 Kısmi başarısız: prompta yeni eklenen "kaydedilmiş karar ≠ yapılmış iş" kuralına rağmen, iki yerde kararı gerçekleşmiş gibi anlattı |

**Kısa sonuç:** JSON sözleşmeleri karakter temeli eklendikten sonra da korunuyor; üç çağrının üçü de uygulamanın üretimdeki doğrulayıcılarından geçti ve `max_tokens` sınırına yaklaşılmadı. Karakter tarafında temel ilkelerin bir kısmı görünür biçimde yerleşti (öneriyi dayatmama, gördüğüne dayanma, hatıra eşyasında geri dönüşsüz müdahale önermeme, soru işaretsiz ipuçları). Ancak dört somut sorun var (bkz. §6): somut fikir eksikliği Faz 1'deki bulgunun Tek Eşya'da da tekrarlandığını gösteriyor; Bu Hafta'da karar ile uygulama karıştırılıyor; Oda'da iki soru art arda gösteriliyor; iki akışta model JSON'u kod bloğuna sarıyor.

---

## 2. Yöntem ve izolasyon

- **Çağrılan kod:** Üretimdeki fonksiyonların kendisi — `analyzeSingleItem`, `analyzeRoom`, `generateWeeklyTips` — güncel `lib/anthropic.js`'in birebir kopyasından çağrıldı. Kopyada değişen tek şey: (1) `@/lib/...` import yollarının dosya yollarına çevrilmesi, (2) `anthropic.messages.create`'in ham yanıtı ve token kullanımını kaydeden bir sarmalayıcıyla sarılması. Promptlar, doğrulayıcılar, kırpma sınırları ve `max_tokens` değerleri değiştirilmedi.
- **Doğrulama:** "JSON geçti" ifadesi, uygulamanın kendi doğrulama koşullarının (`invalid_analysis` / `invalid_room_analysis` / `invalid_tips` hatası fırlatılmaması) sağlandığı anlamına gelir. Bu, kullanıcının ekranda gördüğü sonucun tam olarak bu olduğu anlamına gelir.
- **İzolasyon:** Veritabanı, kimlik sistemi, dev sunucusu ve API rotaları kullanılmadı. Hiçbir tabloya yazılmadı, hiçbir gerçek kullanıcı verisi okunmadı. Test dosyaları oturumun geçici çalışma klasöründe tutuldu.
- **Test görselleri:** Gerçek kullanıcı fotoğrafı kullanılmadı. Görseller, projedeki yapay zekâ ile üretilmiş UI konsept görsellerinden (`design-references/sestia-ui-konseptleri-v1/`) arayüz öğeleri kalmayacak şekilde kırpıldı:
  - Tek Eşya: `09-esya-degerlendirme.png` içindeki koltuk fotoğrafı (566×484) — ahşap iskeletli, açık renk döşemeli, üzerinde örgü yastık olan bir koltuk; yanında ahşap yan sehpa, bitki ve kitaplar.
  - Oda: `08-oda-fotograflari.png` içindeki aynı salonun üç küçük görseli (her biri ~250×264) — açık renk kanepe, ahşap orta sehpa, ahşap konsol, TV, lambader, bitkiler, çerçeveli tablo, battaniye.
  - Not: Görseller düşük çözünürlüklü ve stilize (üretilmiş) fotoğraflardır; gerçek telefon fotoğrafındaki dağınıklık ve ışık koşullarını temsil etmez.
- **Model:** `claude-sonnet-4-6` (`.env.local`'deki `ANTHROPIC_MODEL`; yanıtlardaki `model` alanıyla doğrulandı).
- **Tekrar:** Her test tek kez çalıştırıldı. SDK'nın varsayılan otomatik yeniden denemesi tetiklenmedi (her test için kaydedilen çağrı sayısı 1).
- **Karşılaştırma sınırı:** Değişiklikten önceki promptlarla aynı girdilerle bir karşılaştırma (baseline) çalıştırılmadı. Bu yüzden bazı gözlemlerin (ör. JSON'un kod bloğuna sarılması) yeni değişiklikten mi kaynaklandığı, yoksa önceden de var mı olduğu bu testle bilinemez.

### Maliyet

| Test | Girdi token | Çıktı token | Süre |
|---|---|---|---|
| Tek Eşya | 2.892 | 105 | 3,9 sn |
| Oda | 2.764 | 1.089 | 21,6 sn |
| Bu Hafta | 2.226 | 352 | 9,7 sn |
| **Toplam** | **7.882** | **1.546** | |

Sistem promptu uzunlukları: Tek Eşya 5.446, Oda 5.713, Bu Hafta 4.814 karakter (karakter temeli ~3.900 karakter ekliyor). Prompt caching kullanılmadığı için bu ek, her çağrıda yeniden ödeniyor.

---

## 3. Test 1 — Tek Eşya (takip turu, hatıra eşyası)

### Neden bu senaryo

Tek Eşya'nın en riskli anı, kullanıcının önceki öneriye itiraz ettiği takip turudur. Senaryo, Karakter Dosyası v1'deki iki onaylı laboratuvar sahnesini birleştirir: **13.1** (kullanıcı satılması önerilen eşyayı savunuyor) ve **13.9** (dededen kalma koltuk — yaklaşımı onaylı, nihai repliği kilitli değil).

### Girdi

Görsel: koltuk (bkz. §2). Konuşma geçmişi (uygulamanın gerçekte gönderdiği biçimde; ilk asistan turu test için kurgulandı):

1. **Kullanıcı (uygulamanın otomatik başlangıç mesajı):** `Bu eşyayı birlikte değerlendirelim.`
2. **Asistan (kurgulanmış önceki tur):**
   ```json
   {"category":"Mobilya · Koltuk","recommendation":"sat","reasoning":"İyi durumda ve değerli görünüyor; artık kullanılmıyorsa ikinci elde kolayca alıcı bulabilir.","question":"Bu koltuğu en son ne zaman kullandın?"}
   ```
3. **Kullanıcı:** `Bu koltuk dedemden kaldı, satmayı hiç düşünmüyorum. Ama salonda epey yer kaplıyor. Ne yapabilirim?`

### Ham yanıt

```json
{"category":"Mobilya · Koltuk","recommendation":"tut","reasoning":"Manevi değeri olan bir eşya — zaten satmak masada değil. Asıl mesele salonda yarattığı yer sorunu.","question":"Salonda tam olarak neyi zorlaştırıyor — geçiş mi daralıyor, başka bir eşyayla mı çakışıyor?"}
```

`stop_reason: end_turn`, 105 çıktı token (sınır 600).

### JSON doğrulaması

| Kontrol | Sonuç |
|---|---|
| Yanıt yalnızca JSON mu | ✅ Kod bloğu veya ek metin yok |
| `category` dolu metin | ✅ `Mobilya · Koltuk` |
| `recommendation` beş değerden biri | ✅ `tut` |
| `reasoning` dolu metin | ✅ |
| `question` metin | ✅ |
| `max_tokens`'a takılmadı | ✅ |
| Uygulama doğrulayıcısı | ✅ Hata yok; kırpma gerekmedi |

### Karakter değerlendirmesi

| İlke (kaynak) | Sonuç | Gözlem |
|---|---|---|
| Önerisini savunmaz, yeni bilgiyi kullanır (§8.4, 13.1) | ✅ | `sat` → `tut`; önceki öneriyi yeniden gerekçelendirmeye çalışmadı. |
| Eşyanın anlamını dikkate alır (§8.5, 13.9) | ✅ | Manevi değeri tanıdı; sorunu doğru yere taşıdı: "Asıl mesele salonda yarattığı yer sorunu." |
| Hatıra eşyasında geri dönüşsüz müdahale önermez (13.9) | ✅ | Kumaş değiştirme, parçalama gibi bir öneri yok. |
| Önce anla, sonra öner (§8.1) | ✅ | Sorunun türünü (geçiş mi, çakışma mı) ayırt etmeye çalışan, eşyaya özgü tek bir soru. |
| **Somut fikir sun (§4, §8.2)** | ❌ | Kullanıcı açıkça "Ne yapabilirim?" diye sordu; yanıtta tek bir fikir yok, yalnızca soru var. Brifing §5: "Eldeki bilgiye dayalı geçici ama somut öneri, ardından gerçekten gerekli tek açıklık sorusu çoğu kez daha uygundur." Faz 1 Test 1'deki "fazla soruya kayma" bulgusu burada da tekrarlandı. |
| Bilgiyi papağan gibi tekrarlamaz (§5) | 🟡 | "Manevi değeri olan bir eşya — zaten satmak masada değil" kullanıcının az önce söylediğini geri anlatıyor. Kısa ama gereksiz. |
| Türkçe doğal (§5) | 🟡 | "satmak masada değil" İngilizce "on the table" deyiminin çevirisi gibi duruyor; "satmak zaten söz konusu değil" daha doğal olurdu. |
| Emoji / "patron" / otomatik övgü yok | ✅ | |

**Yapısal not:** `SINGLE_PROMPT`'un şemasında fikir için ayrı bir alan yok. `reasoning` "1-2 cümlelik gerekçe" olarak tanımlı; prompt da takip turlarında "yalnızca gerçekten eksik bilgi varsa tek bir soru sor" diyor. Yani model, fikir vermek için ya `reasoning`'i gerekçe dışında kullanmak ya da hiç vermemek zorunda kalıyor. Somut fikir eksikliği kısmen bu şema sınırından kaynaklanıyor olabilir; tek testle kesinleşmez.

---

## 4. Test 2 — Oda Taraması (ilk tur, 3 fotoğraf)

### Neden bu senaryo

Oda akışının en geniş JSON'u ilk turda üretilir (en fazla 10 eşya). Aynı odanın üç açısı, eşyaları tekrar saymama kuralını da sınar. Oda zaten düzenli ve bakımlı olduğu için Karakter Dosyası 13.2 ("önce var olanı gör") ve §8.7 ("kullanıcı hiçbir şeyi değiştirmemeyi seçebilir") da test edilmiş olur.

### Girdi

Görseller: aynı salonun üç açısı (bkz. §2). Geçmiş boş; uygulamanın otomatik başlangıç mesajı: `Bu odayı birlikte değerlendirelim.`

### Ham yanıt

Model yanıtı bir Markdown kod bloğunun içinde döndü (```` ```json ... ``` ````). İçerik:

```json
{
  "items": [
    {"id": "item_01", "label": "krem rengi köşe koltuk", "category": "oturma grubu", "recommendation": "tut", "reasoning": "Odanın merkezini oluşturuyor, iyi durumda görünüyor ve renk paleti ile tam uyumlu."},
    {"id": "item_02", "label": "ahşap sehpa (orta boy, açık raflı)", "category": "orta sehpa", "recommendation": "tut", "reasoning": "Rafları işlevsel, malzeme kalitesi iyi görünüyor ve odanın genel tonuyla bütünleşiyor."},
    {"id": "item_03", "label": "koltuğun üzerindeki örgü plaid/battaniye", "category": "tekstil aksesuar", "recommendation": "tut", "reasoning": "Hem kullanışlı hem de odaya sıcaklık katıyor."},
    {"id": "item_04", "label": "kahverengi ve krem minderler (koltuktaki)", "category": "dekoratif yastık", "recommendation": "tut", "reasoning": "Renk dengesi tutarlı, iyi durumda görünüyorlar."},
    {"id": "item_05", "label": "sehpa üzerindeki kitap yığını", "category": "kitap", "recommendation": "tut", "reasoning": "Dekoratif işlev görüyor olabilir ama kullanım sıklığını bilmeden tutmak daha güvenli."},
    {"id": "item_06", "label": "seramik vazo ve kurumuş/taze çiçek (sehpa üzerinde)", "category": "dekoratif obje", "recommendation": "tut", "reasoning": "Odanın doğal, organik havasını tamamlıyor."},
    {"id": "item_07", "label": "büyük iç mekan bitkisi (köşede, saksıda)", "category": "iç mekan bitkisi", "recommendation": "tut", "reasoning": "Odaya hacim ve canlılık katıyor, iki fotoğrafta da belirgin."},
    {"id": "item_08", "label": "ahşap şifonyer/konsol (TV altında, çekmeceli)", "category": "depolama mobilyası", "recommendation": "tut", "reasoning": "Hem depolama işlevi görüyor hem de odanın ahşap tonunu taşıyor."},
    {"id": "item_09", "label": "düz ekran TV (şifonyer üzerinde)", "category": "elektronik", "recommendation": "tut", "reasoning": "Aktif kullanımda olduğu varsayılabilir."},
    {"id": "item_10", "label": "ayaklı lambader (bitki yanında)", "category": "aydınlatma", "recommendation": "tut", "reasoning": "Taşınabilir bir aydınlatma olarak işlevsel ve odanın sıcak tonlarıyla uyumlu."}
  ],
  "reply": "Üç fotoğrafı birlikte inceledim. Bej-toprak tonları ve ahşap detaylarıyla tutarlı, sakin bir oda. Şu haliyle büyük bir sorun göremiyorum — ama sen bu odada neyi değiştirmek ya da iyileştirmek istiyorsun?",
  "question": "Daha çok estetik bir dönüşüm mü düşünüyorsun, yoksa işlevsellikte mi bir sıkıntı var?"
}
```

`stop_reason: end_turn`, 1.089 çıktı token (sınır 3.000).

### JSON doğrulaması

| Kontrol | Sonuç |
|---|---|
| Yanıt yalnızca JSON mu | 🟡 Hayır — kod bloğuna sarılı. Prompt "başka hiçbir metin yazma" diyor. `safeParseJSON`'daki `/\{[\s\S]*\}/` araması bunu tolere ettiği için işlevsel bir sorun oluşmadı. |
| `items` dizi, ≤ 10 | ✅ Tam 10 (üst sınırda) |
| Her eşyada `label`/`category`/`reasoning` dolu, `recommendation` geçerli | ✅ |
| `reply`, `question` metin | ✅ |
| Kimlikler | 🟡 Model `item_01` biçimini kullandı. İlk turda kod kimlikleri zaten `item-1`… olarak yeniden yazdığı için sonuç doğru. Takip turlarında modelin mevcut `item-N` kimliklerini koruması gerekiyor; bu test takip turunu kapsamıyor. |
| `max_tokens`'a takılmadı | ✅ |
| Uygulama doğrulayıcısı | ✅ Hata yok; son liste geçerli |

### Karakter ve görev değerlendirmesi

| İlke (kaynak) | Sonuç | Gözlem |
|---|---|---|
| Önce var olanı gör (§6.6, 13.2) | ✅ | Odayı olduğu gibi tarif etti: "Bej-toprak tonları ve ahşap detaylarıyla tutarlı, sakin bir oda." Sorun uydurmadı. |
| Hiçbir şeyi değiştirmemek de bir seçenek (§1, §8.7) | ✅ | Bakımlı bir odada ayıklama dayatmadı; 10 eşyanın hepsi `tut`. |
| Eski "declutter" çerçevesinden çıkış | ✅ | Yanıtta atma/ayıklama baskısı yok; kullanıcıya estetik mi işlevsel mi bir değişiklik istediğini soruyor. |
| Aynı eşyayı birden fazla saymama | ✅ | Üç açıdan görünen kanepe, sehpa ve konsol birer kez sayıldı. |
| Sabit/yapı öğelerini eşya saymama | ✅ | Pencere, perde rayı, duvar yok. |
| Uydurmama (§6.5) | ✅ | Kesin olmayan yerde ihtiyatlı: "kurumuş/taze çiçek", "plaid/battaniye". |
| **Kullanımı fotoğraftan varsaymama** (`ROOM_PROMPT`) | 🟡 | TV için "Aktif kullanımda olduğu varsayılabilir." Prompt kullanım sıklığını fotoğraftan varsaymamayı istiyor. Kitaplar için ise doğru ifade kullanılmış ("kullanım sıklığını bilmeden"). |
| Övgü gördüğüne dayanır (§5) | 🟡 | Estetik gerekçeler görülebilir özelliklere dayanıyor, ama 10 gerekçenin çoğu renk/ton uyumu övgüsü; karar gerekçesinden çok beğeni cümlesi gibi. |
| **Her cevap soruyla bitmez; tek soru** (§5, `ROOM_PROMPT`) | ❌ | `reply` soruyla bitiyor ("…neyi değiştirmek ya da iyileştirmek istiyorsun?") ve `question` alanı ikinci bir soru içeriyor. Arayüz ikisini birleştirerek gösteriyor (`app/page.js`, RoomReviewView: `[reply.reply, reply.question].filter(Boolean).join(' ')`). Kullanıcı art arda iki soru görüyor. Prompt ise soruyu yalnızca `question` alanında ve tek olarak istiyor. |
| Somut fikir (§4) | — | İlk turda kullanıcı fikir istemedi; bu ilke burada ölçülmedi. |

---

## 5. Test 3 — Bu Hafta (haftalık ipuçları)

### Neden bu senaryo

Bu Hafta, karakter temeline yeni bağlanan ve prompta **"Kaydedilmiş bir karar, işin gerçekten yapıldığı anlamına gelmez; kullanıcının bir şeyi bitirdiğini, sattığını ya da attığını varsayma."** kuralı açıkça eklenen akış. Test özeti, gerçek kullanıma benzesin diye çoğunluğu Ev Ofisi'nden gelen (projenin çıkış senaryosu) 7 karardan oluşuyor; uygulamanın `app/api/inspiration/route.js`'de kurduğu biçimle aynı.

### Girdi

```text
- Mobilya · Masa · Ev Ofisi · tut
- Elektronik · Kablo · Ev Ofisi · geri_donustur
- Kırtasiye · Dosya · Ev Ofisi · geri_donustur
- Mobilya · Sandalye · Ev Ofisi · tut
- Aydınlatma · Masa Lambası · Ev Ofisi · bagisla
- Mutfak · Kupa · Mutfak · bagisla
- Tekstil · Örtü · Salon · tut
```

### Ham yanıt

Kod bloğuna sarılı (```` ```json ... ``` ````). İçerik:

```json
{"headline": "Ev ofisinde ciddi bir temizlik", "subtext": "Kablo ve dosyaları göndermeye, masanı ve sandalyeni tutmaya karar verdin — çalışma alanın sadeleşiyor. Masa lambası da gittiğine göre aydınlatma tarafında bir boşluk açılmış olabilir.", "tips": [{"icon": "duzenle", "title": "Aydınlatmayı yeniden değerlendir", "description": "Masa lambası gidince çalışma yüzeyindeki ışık dengeleri değişir — doğal ışık yetmiyorsa küçük bir şerit led bile fark yaratabilir."},{"icon": "kutu", "title": "Kabloları göndermeden önce say", "description": "Geri dönüşüme gitmeden hangi cihazlara ait olduklarını bir kez kontrol et; bazıları hâlâ kullandığın bir şeye ait olabilir."},{"icon": "temizlik", "title": "Masa yüzeyini bir sil", "description": "Eşyalar azalınca altında biriken toz ve iz görünür hale gelir — masa boşalırken yüzeyi de temizlemek iyi bir an."}]}
```

`stop_reason: end_turn`, 352 çıktı token (sınır 500).

### JSON doğrulaması

| Kontrol | Sonuç |
|---|---|
| Yanıt yalnızca JSON mu | 🟡 Hayır — kod bloğuna sarılı; ayrıştırıcı tolere etti |
| `headline` dolu, ≤ 6 kelime | ✅ 5 kelime |
| `subtext` dolu | ✅ (kırpma sınırı 200 karakter; bu metin 183 karakter, kesilmedi) |
| `tips` 2–3 adet | ✅ 3 |
| `icon` izinli dört değerden biri | ✅ `duzenle`, `kutu`, `temizlik` |
| `title`/`description` dolu | ✅ |
| Uygulama doğrulayıcısı | ✅ Hata yok |

### Karakter değerlendirmesi

| İlke (kaynak) | Sonuç | Gözlem |
|---|---|---|
| **Karar ≠ uygulanmış değişiklik** (§6.7, §9; prompttaki yeni kural) | ❌ | `subtext` önce doğru başlıyor ("…göndermeye… tutmaya **karar verdin**"), ama hemen ardından "Masa lambası da **gittiğine göre**" diyor. İlk ipucu "Masa lambası **gidince**", üçüncüsü "Eşyalar **azalınca**… masa **boşalırken**". Kullanıcı yalnızca bağışlama kararı kaydetti; lambanın gittiği bilinmiyor. Prompttaki açık kurala rağmen bu ihlal oluştu. |
| Kullanıcıyı koruyan somut, işe yarar fikir (§4) | ✅ | "Kabloları göndermeden… hangi cihazlara ait olduklarını kontrol et" iyi, gerçek bir riski yakalayan ipucu. Aydınlatma boşluğunu fark etmesi de karar desenine dayanan somut bir gözlem. |
| Övgü görülene dayanır, abartmaz (§5) | 🟡 | "ciddi bir temizlik" 7 karar için abartılı; "temizlik" kelimesi de eski ayıklama çerçevesini geri getiriyor. |
| Öğreticilik / didaktiklik yok | 🟡 | "Masa yüzeyini bir sil" genel ve düşük değerli bir tavsiye; ev ofisi senaryosuna özgü bir şey söylemiyor. |
| Başlık ile açıklama tutarlılığı | 🟡 | "Kabloları göndermeden önce say" başlığı "say" diyor, açıklama "hangi cihaza ait olduğunu kontrol et" diyor. |
| Her cümle soruyla bitmez | ✅ | Hiç soru yok. |
| Emoji / "patron" / aşırı coşku yok | ✅ | |
| Baskın odaya odaklanma (`TIPS_PROMPT`) | ✅ | 7 kararın 5'i Ev Ofisi; ipuçlarının üçü de ev ofisine dönük. |

---

## 6. Bulunan sorunlar

Önem sırasına göre. **Hiçbiri bu raporla birlikte düzeltilmedi.**

### S1 — Bu Hafta: kaydedilmiş karar, gerçekleşmiş iş gibi anlatılıyor
- **Kanıt:** "Masa lambası da gittiğine göre", "Masa lambası gidince", "Eşyalar azalınca… masa boşalırken" (Test 3).
- **Neden önemli:** Karakter Dosyası §6.7 ve §9, brifing §5 ve §11'deki temel ayrımı (düşünce ≠ karar ≠ uygulanmış değişiklik) doğrudan ihlal ediyor. Üstelik prompta tam bu durum için açık bir kural eklenmişti; tek başına kural yetmedi.
- **Olası yön (uygulanmadı):** Girdi özetinin kendisi bu dili taşıyabilir (ör. `bagisla` yerine "bağışlama kararı verildi"), ya da kural örnekli yazılabilir. Etkisi ayrıca test edilmeli.

### S2 — Tek Eşya: kullanıcı fikir istediğinde fikir yok, yalnızca soru var
- **Kanıt:** "Ne yapabilirim?" sorusuna yalnızca açıklık sorusu döndü (Test 1).
- **Neden önemli:** Faz 1 Test 1'deki "somut fikir yerine soru" bulgusu, karakter temeli eklenmiş başka bir akışta da tekrarlandı; "Bir fikrim var" iç referansı bu akışta henüz karşılanmıyor. Şema bunu kısmen zorlaştırıyor: fikir için alan yok, `reasoning` gerekçe olarak tanımlı (bkz. §3 yapısal not).
- **Olası yön (uygulanmadı):** Bu bir şema/ürün kararı: mevcut alanlarda mı kalınacağı yoksa fikir için alan mı açılacağı. Tek testle kesin hüküm verilemez.

### S3 — Oda: arayüzde art arda iki soru
- **Kanıt:** `reply` soruyla bitiyor, `question` ikinci bir soru; `RoomReviewView` ikisini birleştirip tek balonda gösteriyor (Test 2).
- **Neden önemli:** "Her cevap soruyla bitmez" ve "tek soru" kurallarının ikisi de ihlal ediliyor; kullanıcıya sorgu gibi görünüyor.
- **Olası yön (uygulanmadı):** Promptta `reply`'ın soru içermemesi açıkça istenebilir ya da arayüz yalnızca birini gösterebilir.

### S4 — İki akışta JSON kod bloğuna sarılıyor
- **Kanıt:** Oda ve Bu Hafta yanıtları ```` ```json ```` bloğunun içinde geldi; Tek Eşya gelmedi.
- **Neden önemli:** Şu an zararsız, çünkü `safeParseJSON` ilk `{`'den son `}`'ye kadar olan kısmı alıyor. Ama "başka hiçbir metin yazma" talimatına uyulmadığını gösteriyor ve ayrıştırıcı esnekliğine bağımlılık yaratıyor. Değişiklikten önce de böyle olup olmadığı bilinmiyor (baseline çalıştırılmadı).

### Küçük gözlemler
- Oda: TV için "Aktif kullanımda olduğu varsayılabilir" — prompt kullanımı fotoğraftan varsaymamayı istiyor.
- Tek Eşya: "satmak masada değil" çeviri kokan bir deyim; kullanıcının söylediğini geri anlatma eğilimi.
- Bu Hafta: "ciddi bir temizlik" abartılı ve eski çerçeveye yakın; "Masa yüzeyini bir sil" düşük değerli; bir ipucunda başlık ile açıklama tutarsız.

---

## 7. Test edilmeyenler

Üç çağrıyla sınırlı bütçe gereği şunlar ölçülmedi:
- **Tek Eşya ilk turu** (kullanıcıların en sık gördüğü an). Bu test yalnızca takip turunu ölçtü.
- **Oda takip turu:** modelin `item-N` kimliklerini koruması, manuel/hariç tutulan eşyaları bozmaması ve uzlaştırma mantığı. JSON açısından Oda'nın en riskli kısmı budur.
- **Oda kapsam kontrolü** (`ROOM_COVERAGE_PROMPT`): bilinçli olarak karakter temeline bağlanmadı; değişmedi.
- **Keşif sohbeti** (`CHAT_PROMPT`): bu değişiklikle değişmedi; Faz 1'de test edilmişti.
- **Tekrarlanabilirlik:** her senaryo bir kez çalıştı. Model çıktıları değişken olduğu için tek örnek eğilim gösterir, kesin sonuç vermez.
- **Gerçek telefon fotoğrafı:** test görselleri üretilmiş, düşük çözünürlüklü ve fazla düzenli.
- **Baseline:** eski promptlarla karşılaştırma yapılmadı.

---

## 8. Dosyalar ve durum

- Test edilen kod: `lib/anthropic.js` (commit edilmemiş hâli, bu raporun tarihindeki çalışma kopyası).
- Test düzeneği, kırpılmış görseller ve ham sonuç dosyası (`results.json`) oturumun geçici çalışma klasöründe duruyor; repoya eklenmedi.
- Veritabanına yazılmadı, deploy edilmedi, commit oluşturulmadı.
