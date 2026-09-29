# SESTIA Bilgi Kütüphanesi — Oturum Devir Brifingi (2026-09-25)

Bu belge, 25 Eylül 2026'daki uzun çalışma oturumunu yeni bir sohbete devretmek için yazıldı.

**Yeni sohbet bunu okuyup nereden devam edeceğini bilmeli.**
- Bu brifing bir özettir. Güncel gerçek her zaman dosyaların kendisidir.
- Çelişki görürsen dosyaya güven, bu brifinge değil.

---

## 1. Bağlam — neyin üzerinde çalışıyoruz?

**Proje:** *Bir Oda. Bir Karar.* — Next.js uygulaması.
- Yol: `C:\projects\SESTIA`
- Uygulamanın asistan karakteri **SESTIA**.

**SESTIA Bilgi Kütüphanesi** (`SESTIA_BILGI_KUTUPHANESI/`):
- SESTIA'nın ileride kullanacağı kalıcı bilgi tabanı: malzemeler, renk, iç mekân, DIY, dönüşüm vb.
- Bu oturumdaki bütün iş bu kütüphanenin yapısı, kuralları, ilk araştırmaları ve inbox iş akışı üzerineydi.
- **Uygulama koduna (`app/`, `lib/`, `components/`) dokunulmadı.** Kodda bu oturumdan önceki çalışmalardan kalma commit edilmemiş değişiklikler var. Kullanıcı ne olduklarını söyleyene kadar onlara dokunma.

**Çalışma felsefesi** (kullanıcının koyduğu):
- "Real use first. System rules later."
- "Breadth first. Evidence first. Architecture later."

---

## 2. Kütüphanenin güncel yapısı

```
SESTIA_BILGI_KUTUPHANESI/
├── _INBOX/                     genel giriş havuzu — kullanıcı HER ŞEYİ buraya atar
├── 01_ARASTIRMA/               araştırma kayıtları (kategori adlarını aynalar)
│   ├── 02_MALZEMELER/          malzeme araştırması (Round 1 + P1 doğrulaması)
│   └── 05_RENK_VE_GORSEL_KOMPOZISYON/RENK_ARASTIRMASI_01.md
├── 02_KUTUPHANE/               kalıcı bilgi; 11 ana kategori (00_…10_), her birinde _INBOX
│   └── 02_MALZEMELER/          12 malzeme ailesi, 74 alt kategori (01_AHSAP/01_MASIF_AHSAP …)
├── 03_ALTYAPI/                 kütüphanenin kuralları (meta katman)
│   ├── 01_KUTUPHANE_KURALLARI/ KUTUPHANE_MIMARISI.md, BILGI_YASAM_DONGUSU_VE_KABUL.md
│   ├── 02_KAYNAK_VE_REFERANS_SISTEMI/   (boş)
│   ├── 03_BILGI_ILISKILERI/    bilgi_tipleri_ve_iliski_semasi.md
│   ├── 04_DOGRULAMA_VE_KALITE/ (boş)
│   ├── 05_SINIFLANDIRMA_VE_ETIKETLER/   (boş)
│   └── 06_SABLONLAR/           (boş)
├── 99_ARSIV/                   (boş)
└── INBOX_AYIKLAMA_KAYDI.md     ayıklama kuralları + her taşımanın kaydı
```

**Temel ilkeler** (ayrıntı: `KUTUPHANE_MIMARISI.md`):
- **Numaralandırma:** Numaralar global kimlik değildir; her parent kendi içinde 01, 02… diye numaralandırır.
- **`_INBOX`:** Numarasızdır. Her ana kategoride zorunludur. Alt kategorilerde yalnızca ihtiyaç olursa açılır.
- **Git:** Ham `_INBOX` içeriği Git dışındadır (`.gitignore`); yalnızca `.gitkeep` izlenir. Markdown ve SVG Git'te izlenir.
- **Rapor yeri:** Proje geneli raporlar `docs/reports/SESTIA_BILGI_KUTUPHANESI/` altına yazılır; kütüphanenin içine değil.
- **Kategori sırası:** `02_KUTUPHANE` kategori numaraları ve sırası **henüz final değil**.

---

## 3. Bu oturumda ne yapıldı (kronolojik)

### 3.1 İki klasör migration'ı
1. **Eski düz yapı → ilk yeni yapı:**
   - Eski yapı: 00–10 kategorileri + 90/91/92/99.
   - İlk yeni yapı: `_INBOX`, `_ARASTIRMA`, `_KUTUPHANE`, `_ALTYAPI`, `_ARSIV`.
   - Kategori içi inbox'lar tek kökte toplandı; 29 renk referans görseli korundu.
2. **İlk yeni yapı → numaralı root:**
   - Numaralı root: `_INBOX`, `01_ARASTIRMA`, `02_KUTUPHANE`, `03_ALTYAPI`, `99_ARSIV`.
   - Her ana kategoriye yeniden `_INBOX` açıldı. 29 görsel `05_RENK…/_INBOX`'a taşındı.
   - `RENK_ARASTIRMASI_01.md` `01_ARASTIRMA/05_…`'e taşındı. Kırık iki relative link düzeltildi.
   - Windows klasör kilidi yüzünden bazı rename'ler tek tek yapıldı; kayıp yok.

### 3.2 Canonical belgeler
- **`KUTUPHANE_MIMARISI.md`:** Önce yalnızca mevcut filesystem'i anlatan bir belge olarak yazıldı. Sonra kullanıcı kararlarıyla güncellendi.
- **Codex'in "03_ALTYAPI V1" raporu:** Kullanıcı kararlarıyla **13 belgelik V1 planı** kabul edildi. Mimari §10'da tablo olarak duruyor; belgelerin çoğu henüz "oluşturulacak".
- **`bilgi_tipleri_ve_iliski_semasi.md`:**
  - Gerçek kullanımla uzlaştırıldı: taslak → canonical, 5 belge profili, `91_` bağımlılığı kaldırıldı.
  - Kullanıcı onayıyla `lifecycle` eklendi (`draft` / `active` / `deprecated` / `superseded` + `superseded_by`).
  - `schema_version: 1` eklendi.
  - Mevcut dosyalara toplu geçiş **yapılmadı**; onlar "legacy profil".
- **`BILGI_YASAM_DONGUSU_VE_KABUL.md`:** Araştırmadan kalıcı bilgiye geçiş, kabul, düzeltme, duplicate, deprecated/superseded, arşiv sınırı. Kullanıcının kararını bekleyen 11 açık karar var (A1–A11).

### 3.3 Malzeme araştırması — Round 1 (kaynak keşfi, **donduruldu**)
- **Kapsam:** 12 malzeme ailesinden 36 malzeme; ~110 aday kaynak; görsel aday envanteri; bilgi boşluğu haritası; `_INBOX` kısa listesi (27 belge); 5 NotebookLM paketi (P1–P5); sorgu bankası; mimari gözlemler.
- **Dosyalar:** `01_ARASTIRMA/02_MALZEMELER/MALZEME_ARASTIRMASI_01.md` (ana kayıt), `…_KAYNAK_ENVANTERI.md`, `…_GORSEL_ENVANTERI.md`.
- **Doğrulama durumu:** Round 1'de yalnızca 2 kaynak baştan sona okundu. Kalanlar "I" (yalnızca tanımlandı) etiketli.
- **Kural:** Round 1 dondu. Örneklem genişletilmeyecek.

### 3.4 Kaynak Doğrulama Turu 1 — Paket P1 (ahşap, paneller, yüzey bitişleri) — **tamamlandı**
- **İndirilen:**
  - FPL Wood Handbook Ch. 4, 11, 13 ve 16: resmi USDA TreeSearch adresinden alındı (`fpl.fs.usda.gov` 403 veriyor).
  - Osmo Polyx-Oil ürün belgesi.
  - Minwax föyü. Yanlış ürün çıktı: "Water Based **Oil-Modified** Polyurethane", ve belge kendi içinde tutarsız.
  - Hepsi `02_KUTUPHANE/02_MALZEMELER/_INBOX/` içinde.
- **İndirilemeyen:** Feist 1987 (403), BWF MDF rehberi (500).
- **Sonuç:** 37 iddia kontrol edildi → 27 doğrulandı (8'i koşullu), 5 düzeltildi, 1 boşluk kısmen kapandı, 4 açık.
- **Önemli düzeltmeler:**
  - Feist aslında bir Fine Woodworking makalesi.
  - Yağlı bez tutuşma riski üretan ve alkid bitişleri de kapsıyor.
  - FPL mobilya bitiş yöntemlerini kapsamıyor.
  - "Mobilya kontrplağı" = HP-1 dekoratif kontrplak sınıfı; çekirdeği MDF veya yonga levha olabilir.
  - FPL'deki bazı şekiller üçüncü taraf telifli.
- **Kayıt:** `01_ARASTIRMA/02_MALZEMELER/MALZEME_ARASTIRMASI_01_DOGRULAMA_P1.md` (iddia bazında karar, alıntı, sayfa numarası).

### 3.5 Inbox ayıklama — kurallar ve iki gerçek test
- **Kayıt dosyası:** `INBOX_AYIKLAMA_KAYDI.md` kütüphane kökünde (kullanıcının kararı).
- **Test 1:** Web'den gelen 6 mermer görseli. Bu test kuralları doğurdu (bkz. §4).
  - 4 görsel malzemede kaldı.
  - 2'si (koridor, banyo) `07_IC_MEKAN…/_INBOX`'a taşındı.
- **Test 2:** Kullanıcının evinden çektiği 13 fotoğraf. Hepsi `02_MALZEMELER/_INBOX`'a gitti, adlandırıldı ve kaydedildi:
  - gri çizgili mermer zemin (3 fotoğraf + 1 birebir kopya);
  - meşe parke (4);
  - bej mermer zemin (3);
  - bej mermer merdiven (2).
- **Kayıttaki satır sayısı:** 19.
- **Kullanıcıya bırakılan notlar:**
  - `IMG_7108` kopyası silinmedi, `_kopya` ekiyle işaretlendi.
  - Merdiven fotoğrafları malzemeye kondu, "ilgili: iç mekân" notu düşüldü; kullanıcı farklı düşünürse taşınır.
- **Tek eksik kare:** Parkenin kenarı veya kesiti. Masif mi katmanlı mı ancak oradan anlaşılır. Acelesi yok.

---

## 4. Kullanıcının verdiği kararlar (bunlara uy)

**Yapı:**
- Root = `_INBOX`, `01_ARASTIRMA`, `02_KUTUPHANE`, `03_ALTYAPI`, `99_ARSIV` + `INBOX_AYIKLAMA_KAYDI.md`.
- Her ana kategoride `_INBOX` var. Kullanıcı bunları silmek istemiyor; kategoriye göre malzeme ekleyecek.

**Ham kaynak ve arşiv:**
- İşlenmiş ham kaynak da kategori `_INBOX`'ında kalır; `99_ARSIV`'e gitmez.
- Tamamlanmış araştırma, provenance değeri taşıdığı sürece `01_ARASTIRMA`'da kalır.
- `99_ARSIV` fiziksel saklama katmanıdır. "Neden aktif değil" bilgisini `lifecycle` taşır.

**Şema ve V1:**
- V1 altyapı planı 13 belge.
- Şemada `status` ≠ `lifecycle`. `schema_version: 1`. Legacy dosyalara toplu geçiş yok.
- İlişki tekrarı, ters ilişkiler ve indeks/registry: SESTIA'nın host/retrieval mimarisiyle birlikte ele alınacak, şimdi değil.

**Ayıklama kuralları** (`INBOX_AYIKLAMA_KAYDI.md`):
1. Kullanıcı her şeyi kök `_INBOX`'a atar. Klasör seçmez, isim koymak zorunda değildir.
2. Taşıma kararını **içerik** belirler; dosya adı veya bırakıldığı yer belirlemez.
3. **Görselde bir mekân varsa → `07_IC_MEKAN`.** Örnek: mutfak + mermer = mutfak, banyo + mermer = banyo.
4. **Görselde sadece malzeme varsa → `02_MALZEMELER`.** Örnek: seramik + mermer = malzemeler.
5. Gerçek mi yapay zekâ mı sorusu klasörü **değiştirmez**. Yalnızca etikettir: adda `_ai-olabilir`, ayrıca kayıtta.
6. Belirsizse (örnek: pencere var ama hangi oda belli değil) **kullanıcıyla konuşup birlikte karar verilir**; o zamana kadar dosya yerinde kalır.
7. Ayıklayan, dosyayı gideceği klasöre göre yeniden adlandırır: `<klasör-kelimesi>_<konu>_<ayrıntı>[_ai-olabilir]`. Klasör kelimesi örnekleri: `malzeme_`, `icmekan_`. Kategori numarası kullanılmaz. Eski ad kayıtta saklanır.
8. İlgili diğer kategoriler kayda yazılır.

**İş bölümü:**
- **Kullanıcı:** görsel toplar (Pinterest, kendi fotoğrafları), engelli belgeleri tarayıcıdan indirir, NotebookLM'i kullanır, kararları verir.
- **Claude:** kaynak toplar ve doğrular, ayıklar, kayıt tutar.
- **Odak aileler:** taş, ahşap, kumaş.

---

## 5. Açık kararlar — kullanıcıya sorulacak, kendi başına karar verme

**Mimari (`KUTUPHANE_MIMARISI.md` §11):**
- `00` önekinin özel bir anlamı var mı? (`00_MIMARI_VE_PLANLAMA` bilgi kategorisi mi, meta alan mı?)
- Alt klasör isimlendirmesi: `Title_Case` mi, `UPPER_SNAKE` mi? Numaralı mı?
- `02_KUTUPHANE` kategorilerinin final sırası.
- `99_ARSIV`'in iç düzeni.
- Ayıklamayı kim ve ne zaman yapacak? Görsel dışı materyal (makale, PDF, NotebookLM çıktısı) nasıl ayıklanacak?

**Yaşam döngüsü (`BILGI_YASAM_DONGUSU_VE_KABUL.md` §12, A1–A11):**
- A1 — Kalite standardı yazılana kadar `active` için ölçüt ne?
- A2 — `active` yapma yetkisi kimde?
- A3 — `deprecated` bir kayıt yeniden geçerli olursa ne olur?
- A4 — `active` → `draft` geri dönüşü olur mu?
- A5 — Duplicate'lerde ana kaydın seçim ölçütü ne?
- A6 — `deprecated` ve `superseded` kayıtların fiziksel yeri.
- A7 — `superseded` kayda gelen linkler güncellenir mi?
- A8 — Legacy kayıtlar kullanımda nasıl ele alınır?
- A9 — Vazgeçilen `draft` nasıl kapatılır?
- A10 — Provenance bağı metadata ile standartlaştırılacak mı?
- A11 — Her bilgi dosyası araştırmadan geçmek zorunda mı?

**Şema (§8):**
- Diğer profillerde (referans analizi, küme, kayıt) `schema_version` ve `lifecycle` olacak mı?

**P1'den kalanlar:**
- **Feist ve BWF:** Kullanıcı tarayıcıdan indirip `_INBOX`'a koyarsa, iki açık iddia doğrulanır.
- **Suyla çalışan PU:** Güvenilir bir föy yok. Resmi föy aranacak mı, açık mı bırakılacak?
- **PDF metin çıkarıcı:** Scratchpad'deydi ve **artık yok**. Yeniden yazılacak mı; `tools/` altında mı tutulacak?

---

## 6. Sıradaki adımlar

1. **P2 — taş** (mermer, traverten, mühendislik kuvarsı):
   - NSI *Dimension Stone Design Manual*, NIOSH silika uyarısı ve üretici bakım rehberlerini indirip oku.
   - Round 1 iddialarını tek tek doğrula; `…_DOGRULAMA_P2.md` yaz.
   - Kullanıcının bej mermer fotoğraflarındaki matlaşmanın aşınma mı, asitle yenme (etching) mi olduğu P2'nin doğal sorusu.
2. **Kullanıcı görsel yükledikçe ayıkla:** §4'teki kurallarla, belirsizleri sorarak.
3. **Ardından** ahşap (P1'de açık kalanlar, Avrupa/Türkiye kaynakları) ve kumaş (P4).
4. **Hiçbir yerde kalıcı bilgi dosyası oluşturma;** kullanıcı açıkça isteyene kadar.

---

## 7. Çalışma tercihleri (önemli)

- **Kurallar:** Sen karar vermeden kurallara ve canonical belgelere bir şey yazma. Öneriyi sohbette tut; belirsizse "açık karar" olarak işaretle.
- **Sorular:** Az ve net olsun. Uzun seçenek listeleri yorucu. Kullanıcı birlikte ve kısa adımlarla ilerlemeyi seviyor.
- **Uyarılar:** Aynı uyarıyı tekrar etme. Özellikle "Git'te commit edilmemiş iş var" uyarısı zaten birkaç kez söylendi; kullanıcı biliyor.
- **Dil:** Kullanıcı Türkçe ve İngilizce karışık yazıyor. Yanıtlar Türkçe, sıcak ve samimi.
- **Görsel değerlendirme:** Kullanıcının kendi fotoğrafları değerli; "hepsi zemin" gibi soğuk özetlerden kaçın. Neyin neden işe yaradığını söyle.
- **Kullanıcı ruh hali:** Uzun oturum kullanıcıyı yordu ("siz LLM'ler beni tükettiniz"). Tempoyu kullanıcı belirler.

---

## 8. Teknik notlar

- **Git:** Son commit `0c7ac1a`. Bu oturumdaki kütüphane işi **commit edilmedi**; kullanıcı biliyor. Commit / stage / push kullanıcı isteyince yapılır.
- **`.gitignore` kuralları** (test edildi):
  ```
  SESTIA_BILGI_KUTUPHANESI/_INBOX/*
  !SESTIA_BILGI_KUTUPHANESI/_INBOX/.gitkeep
  SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/**/_INBOX/*
  !SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/**/_INBOX/.gitkeep
  ```
- **FPL Wood Handbook indirme:** `https://research.fs.usda.gov/treesearch/download/<id>.pdf` çalışıyor. Bölüm kimlikleri: Ch. 4 = 62243, Ch. 11 = 62258, Ch. 13 = 62261, Ch. 16 = 62269.
- **PDF okuma:** Makinede Python veya poppler yok. P1'de Node'un yerleşik `zlib`'iyle bağımlılıksız bir çıkarıcı yazıldı: FlateDecode, object stream, ToUnicode CMap, Tj/TJ. Basit TrueType fontlarda 1 bayt, Type0 fontlarda 2 bayt okunmalı.
- **Relative link kontrolü:** Her yapısal değişiklikten sonra kütüphanedeki `../` linkleri taranıyordu. Son durumda kırık yok.
- **İlk bakılacak dosyalar:**
  - bu brifing;
  - `03_ALTYAPI/01_KUTUPHANE_KURALLARI/KUTUPHANE_MIMARISI.md`;
  - `INBOX_AYIKLAMA_KAYDI.md`;
  - `01_ARASTIRMA/02_MALZEMELER/MALZEME_ARASTIRMASI_01.md` (§9 paket durumu).

---

## 9. Küçük ama anlamlı

Kullanıcının oturum içindeki buluşu: **"hepiniz → happiness"**. Bu proje bir ekip işi: kullanıcı, Claude, Codex, NotebookLM ve ileride SESTIA. "Bir Oda, Bir Karar" da tek başına değil, birlikte verilen kararlar.
