# SESTIA BİLGİ KÜTÜPHANESİ — Kavramsal ve Fiziksel Mimari Tasarımı

**Proje:** Bir Oda. Bir Eşya.
**Tarih:** 22 Eylül 2026
**Durum:** Tasarım/onay aşaması. Hiçbir dizin/dosya oluşturulmadı, mevcut uygulama koduna dokunulmadı, hiçbir bağımlılık eklenmedi.

---

## İnceleme Notu (kod-doğrulanmış zemin)

- **Karakter/İçerik kütüphanesi** (`lib/sestiaLibrary.js`) zaten var ve net sınırlarla çalışıyor: `SESTIA_VOICE_COMPASS`, 12 karşılama, 15 ilham kıvılcımı — bu göreve dokunulmuyor.
- **Canlı AI** (`lib/anthropic.js`) şu an `SESTIA_CHARACTER_BASE` (paylaşılan karakter temeli) + `chatFreely` üzerinden çalışıyor; hiçbir dış bilgi kaynağına, arama motoruna veya kalıcı bir "bilgi deposuna" bağlı değil — sadece o anki konuşma geçmişini görüyor.
- **Keşif arayüzünde zaten bir emsal var**: `SECTION_CONTEXT_LABELS` mekanizması, kullanıcı bir kart/bölümden sohbete geçtiğinde sabit bir ETİKETİ (serbest metin değil) bağlam olarak taşıyor. Bu, "discovery item → sohbet bağlamı" ilişkisinin ilkel ama gerçek bir versiyonu — sıfırdan tasarlanmıyor, genişletiliyor.
- **Özel kullanıcı hafızası zaten kimlik bazında izole**: `rooms`, `room_photos`, `room_scans`, `room_analyses`, `decisions` — hepsi `device_id` (misafir token'ı ya da hesap id'si) ile sahiplenilmiş, `getIdentity()` dışında hiçbir kimlik kaynağına güvenilmiyor. Bu, "private memory asla genel bilgiye otomatik akmaz" ilkesinin zaten oturmuş bir mimari emsali.
- Proje kökünde `lib/` (kod), `app/` (route'lar), `data/` (runtime/kullanıcı verisi, muhtemelen kalıcı disk gerektiren, git'e commit edilmeyen), `docs/` (nesir kararlar/raporlar) var. Bunların hiçbiri "yapılandırılmış, versiyon kontrollü, hem insan hem AI'nin okuyacağı içerik verisi" için uygun bir ev değil — bu gözlem C1'in temelini oluşturuyor.

---

## DELIVERABLE A — Vizyonun Anlaşılması

Sestia Bilgi Kütüphanesi, Sestia'nın **ne bildiğinin, nereden bildiğinin ve bu bilgiyi nasıl birleştirebileceğinin** kalıcı, genişleyen temelidir. Onu ayırt eden şey içerik miktarı değil, üç şeyi AYNI ANDA yapabilmesidir: **bulmak, birleştirmek, yeni bir olasılık geliştirmek**. 100.000 DIY projesi içeren ama sadece bulan bir sistem bu vizyonu karşılamaz.

**Neden değil:**

- **Statik ansiklopedi değil** — çünkü her girdi sadece tanım taşımaz; ilişkiler (başka hangi bilgiyle bağlantılı), kanıt durumu (doğrulanmış mı, sadece belgelenmiş mi, Sestia'nın kendi önerisi mi) ve uygulanabilirlik sınırları taşır. Bir ansiklopedi maddesi "sonuçtur"; bir kütüphane girdisi "muhakemenin bir parçasıdır".
- **DIY proje dizini değil** — proje sadece 7 bilgi tipinden biridir (Project). Asıl değer, bir projenin BAŞKA bilgiyle (malzeme, teknik, mekân ihtiyacı) yeniden birleştirilip kullanıcının KENDİ nesnesine uyarlanabilmesidir.
- **Pinterest klonu değil** — görsel ilham, kanıt hiyerarşisinde EN ZAYIF kategoridedir ("bir görsel, benzer bir sonucun var olduğunu kanıtlar; nasıl yapıldığını, dayanıklı olup olmadığını ya da güvenli olup olmadığını kanıtlamaz"). Kütüphane bu ayrımı açıkça taşımak zorunda; salt görsel besleme değildir.
- **Genel öneri motoru değil** — sabit bir listeden (tut/sat/bağışla/at/geri dönüştür gibi) seçim yapmaz; muhakeme eder. Aynı sandalye için "Preserve/Change/Separate/Combine/Reimagine" gibi FARKLI düşünme biçimleri arasında gezinebilir.
- **Özel kullanıcı hafızası değil** — `rooms`/`decisions` gibi kimliğe bağlı, paylaşılmayan veriden kesin biçimde ayrı; ama Sestia ikisini bir sohbette BİRLEŞTİREBİLİR.
- **Karakter kütüphanesi değil** — `lib/sestiaLibrary.js`/`SESTIA_CHARACTER_BASE` Sestia'nın "nasıl konuştuğunu" tanımlıyor; bu yeni kütüphane "ne bildiğini" besleyecek. İkisi ayrı katmanlar, ama AYNI Sestia'ya ait.

**Ayırt edici yetenek:** Bilgiyi BULMAK (retrieval), farklı alanlardan bilgiyi BİRLEŞTİRMEK (ör. eski çekmece + ahşap bakım bilgisi + duvara montaj tekniği + kullanıcının depolama ihtiyacı → yeni bir çözüm), ve kütüphanede henüz TAM PROJE olarak bulunmayan yeni bir olasılığı GELİŞTİRMEK — bunu yaparken doğrulanmış bilgi ile spekülatif öneriyi hep ayrı tutarak.

---

## DELIVERABLE B — 10 Bilgi Alanının Değerlendirmesi

| # | Alan | Değerlendirme |
|---|---|---|
| 01 | Eşyalar ve Bileşenler | İyi tanımlı, çekirdek. `Object`/`Component` tipleriyle doğrudan örtüşüyor. |
| 02 | Malzemeler | İyi tanımlı, çekirdek. Neredeyse her diğer alandan referans alacak "hub" niteliğinde. |
| 03 | DIY, Onarım ve Üretim | `Method` tipiyle örtüşüyor. "Nasıl yapılır" sorusuna cevap verir. |
| 04 | Dönüşüm ve Yeniden Kullanım | En çok vurgulanan alan; 03'ten BİLİNÇLİ ayrılması doğru — biri "teknik nasıl uygulanır", diğeri "ne olabilir" sorusuna cevap verir. Chair Test'in kalbi burada. |
| 05 | Renk ve Görsel Kompozisyon | 06 (Işık) ile güçlü karşılıklı bağımlılık var (renk, ışığın altında farklı görünür) — ayrı domain kalmalı ama İLİŞKİ zorunlu. |
| 06 | Işık ve Aydınlatma | 07 (İç Mekân) ile örtüşme riski var (ör. "task lighting" ikisine de değer). Bu bir SORUN değil — aynı bilginin iki yerde KOPYALANMASI sorun olurdu; tek bir yerde yaşayıp iki taraftan referans alması doğru çözüm. |
| 07 | İç Mekân ve Yerleşim | 09 (Yaşam/Kullanım) ile yakın ilişkili; "workspace design" örneği ikisine de değiyor — aynı ilke (tek ev, çapraz referans). |
| 08 | Tasarım Tarihi ve Kültür | Bağımsız; diğer alanlara `Reference` tipi üzerinden ilham/köken bilgisi sağlar. |
| 09 | Yaşam, Kullanım ve İhtiyaçlar | Kullanıcı ihtiyaçlarını genel bilgiye bağlayan doğru konumlanmış bir katman. |
| 10 | Sürdürülebilirlik | "İzole dekoratif kategori olmamalı" ilkesi DOĞRU, ama bu, bağımsız bir DİZİN olmaması gerektiği anlamına gelmiyor. Kendi başına aranabilir bilgi var (malzeme geri dönüştürülebilirlik oranları, atık azaltma teknikleri); "gömülü olmalı" ilkesi dizinin kendisi için değil, İLİŞKİLERİ için geçerli — her method/material/project girdisi sürdürülebilirlik bilgisine referans verebilmeli. |

**Eksik alanlar** (hangisinin bağımsız domain hangisinin cross-cutting olması gerektiğine dair değerlendirme):

- **Araçlar ve Ekipman** → Başlangıçta 03 (DIY) altında bir alt kategori olarak yeterli. Zamanla (elektrikli aletler, ölçüm aletleri, güvenlik ekipmanı) büyürse bağımsız 11. domain adayı — şimdi ayırmaya gerek yok.
- **Ölçüm ve Ergonomi** → Bağımsız domain gerektirmiyor; 07 ve 09'un doğal bir parçası, gerektiğinde her `Method`/`Project` girdisine eklenebilecek bir alt-alan.
- **Güvenlik ve Uygulanabilirlik (Safety & Feasibility)** → **En kritik cross-cutting alan.** Hibrit yaklaşım öneriliyor: (a) temel güvenlik prensipleri (elektrik, kimyasal, yük taşıma, duvar montajı) için KENDİ küçük bir referans havuzu olsun, AMA (b) her `Method`/`Project` girdisinin de kendi `safety:` alanı olsun ve gerektiğinde o havuza REFERANS versin — duplikasyon değil, atıf.
- **Bütçe ve Erişilebilirlik** → Bağımsız domain değil; her `Method`/`Project` girdisinin bir alanı.
- **Bakım ve Ömür** → 02 (Malzemeler) ve 10 (Sürdürülebilirlik) arasında zaten yaşıyor; cross-cutting attribute.
- **Görsel tanıma / nesne tanıma** → Bu bir bilgi ALANI değil, bir uygulama YETENEĞİ (AI'nin fotoğraftan eşya tanıması) — `lib/anthropic.js`'in analiz akışlarının işi, kütüphane organizasyonunun kapsamı dışında.
- **Yerel koşullar / malzeme erişilebilirliği** → Henüz erken; gerçek kullanıcı konumu/erişim verisi geldiğinde private memory ile genel bilginin KESİŞTİĞİ bir alan olacak. Şimdilik not, bağımsız domain açılmıyor.

**Pratik sonuç:** 10 kategoriyi değiştirmek önerilmiyor (somut bir fayda yok). Asıl kritik iş kategorileri yeniden çizmek değil, ARALARINDAKİ İLİŞKİ mekanizmasını (Deliverable C5/D) doğru kurmak.

---

## DELIVERABLE C — Fiziksel Dizin Yapısı Tasarımı

### C1 — Konum

Mevcut proje kökünde dört farklı "yaşam döngüsü" var:
- `lib/` — çalıştırılabilir kod (.js modülleri)
- `app/` — Next.js route'ları
- `data/` — RUNTIME'da üretilen kullanıcı verisi (SQLite dosyası + yüklenen fotoğraflar), muhtemelen deploy'da kalıcı disk gerektiren, git'e commit edilmeyen bir katman
- `docs/` — nesir hâlinde proje/karakter KARARLARI (rapor, kanon belgesi)

Sestia Bilgi Kütüphanesi bunların hiçbirine tam oturmuyor: kod değil, kullanıcı runtime verisi değil, nesir karar raporu da değil — **yapılandırılmış, versiyon kontrollü, editoryal olarak büyüyen içerik verisi**. Bu, kendine özgü dördüncü bir kategori. Doğru yer: **proje kökünde, `lib/`/`app/`/`data/`/`docs/` ile eş seviyede, bağımsız bir `SESTIA_BILGI_KUTUPHANESI/` dizini.**

Bunun somut faydaları:
- `lib/` içine gömülseydi, bir gün bir geliştirme aracı ya da build süreci onu "kod" sanıp yanlış işleyebilirdi.
- `data/`'ya gömülseydi, kullanıcı verisiyle aynı yaşam döngüsüne (gitignore, kalıcı disk, silinebilirlik) tabi olma riski taşırdı — oysa bu içerik editoryal ve KALICI olmalı, kullanıcı verisiyle asla aynı muameleyi görmemeli.
- `docs/`'a gömülseydi, "karar raporu" ile "sorgulanabilir bilgi verisi" birbirine karışırdı.

### C2 — Ana kategoriler

Önerilen 10 kategori aynen korunuyor (bkz. Deliverable B). Sadece numaralandırma önekleri (`01_`, `02_`...) korunuyor — bu, dosya sisteminde alfabetik sırayı anlamlı tutuyor ve gelecekte `11_`, `12_` eklemeyi (mevcut sırayı bozmadan) kolaylaştırıyor.

### C3 — Alt kategoriler (üç somut örnek)

**`02_MALZEMELER/AHSAP/`**:
```
AHSAP/
├── Ahsap_Turleri/       (Mese, Cam_Agaci, Kontrplak, MDF...)
├── Ozellikler/
├── Isleme_Teknikleri/
└── Bakim_Ve_Koruma/
```

**`04_DONUSUM_VE_YENIDEN_KULLANIM/`** — Chair Test'in 5 modundan 4'ü ("Preserve" 03'e ait olduğu için hariç) doğrudan alt kategoriye dönüşüyor, çünkü kavramsal modelle birebir örtüşüyor:
```
04_DONUSUM_VE_YENIDEN_KULLANIM/
├── Tum_Esya_Donusumu/        (Change: bütün nesne, yeni işlev)
├── Bilesen_Yeniden_Kullanimi/ (Separate: parça bazlı)
├── Malzeme_Geri_Kazanimi/     (Combine: sökülen malzeme, başka nesneyle)
└── Yeniden_Tasarim/           (Reimagine: form/yapıdan yeni tasarım)
```

**`03_DIY_ONARIM_VE_URETIM/`**:
```
03_DIY_ONARIM_VE_URETIM/
├── Temel_Teknikler/     (Kesme, Zimparalama, Delme, Yapistirma...)
├── Dosemecilik/
├── Yuzey_Bitirme/       (boyama, vernik, lake)
├── Onarim_Ve_Restorasyon/
└── Araclar_Ve_Ekipman/   (bkz. Deliverable B — burada başlar, büyürse ayrılır)
```

### C4 — Bireysel bilgi dosyaları

Yedi bilgi tipi (Object/Component/Material/Method/Function/Project/Reference) FARKLI içerik gerektirir ama ORTAK bir "iskelet" paylaşmalı. Önerilen desen: **Markdown gövde + YAML frontmatter** (dosyanın en üstünde yapılandırılmış meta veri, altında serbest insan-okur metin — Obsidian/Hugo/Jekyll'de yaygın, kanıtlanmış bir desen).

Ortak frontmatter alanları (her tipte olması gereken):
```yaml
id: <stabil, taşınmaya dayanıklı kimlik>
type: material | object | component | method | function | project | reference
title: <başlık>
status: source_supported | documented | creative_proposal | user_experience
primary_domain: <hangi ana klasörde yaşıyor>
related_domains: [<ilgili diğer alanlar>]
related: [{id: <başka-bir-id>, relation: <ilişki türü>}]
sources: [<varsa kaynaklar>]
last_updated: <tarih>
tags: [<serbest etiketler>]
```

Tipine özgü ek alanlar (hepsi zorunlu değil — esneklik, ama şablonsuzluk değil):
- **Material**: fiziksel özellikler, dayanıklılık, işlenebilirlik, bakım, güvenlik notu
- **Method**: gerekli malzeme/araç, süreç adımları, beceri seviyesi, yaygın hatalar, güvenlik
- **Project**: başlangıç nesnesi, hedef işlev, gereken bilgi, uygulanabilirlik notları, kaynak/durum
- **Reference**: köken, dönem, bağlam, hangi fikirlere ilham verdiği

Gövde (frontmatter altındaki serbest metin) her tipte aynı: insan-okur açıklama, muhakeme, bağlam — makine bunu ayrıştırmaya çalışmaz, olduğu gibi okur/özetler.

### C5 — Çapraz dizin ilişkileri

Duplikasyon yerine **referans**. Kritik tasarım kararı: **`id` ≠ dosya yolu.** Her girdinin frontmatter'da stabil bir `id`'si olur; dosya taşınsa/yeniden adlandırılsa bile diğer girdilerdeki `related:` alanları KIRILMAZ, çünkü onlar path'e değil id'ye referans verir.

Bunu çalıştırmak için TEK bir hafif, merkezi indeks dosyası yeterli (ör. `_INDEX/relations.json` — id → gerçek dosya yolu eşleşmesi + ilişki listesi). Bu, **grafik veritabanı ya da vektör veritabanı GEREKTİRMEZ**: dosya sayısı binlerle ifade edilecek ölçeğe gelene kadar, JSON bir indeks + Markdown içerik + basit okuma/arama yeterli. Karmaşıklık gerçek ihtiyaçla birlikte büyümeli.

İlişki türleri başta KÜÇÜK, SABİT bir sözlükle sınırlı tutulmalı (10-15 tür: `HAS_COMPONENT`, `IS_MADE_OF`, `SUPPORTS_METHOD`, `MAY_SUPPORT_FUNCTION`, `USES_COMPONENT`, `USES_METHOD`, `DOCUMENTS`, `MAY_BE_INSPIRED_BY`, `RELATED_TO` gibi) — aşırı esneklik erken karmaşıklık yaratır.

### C6 — Genişleme

Yeni domain = yeni üst düzey numaralı klasör (`11_`, `12_`...) eklemek. `id != path` kararı sayesinde mevcut hiçbir referans bozulmaz — genişleme, var olanı yeniden düzenlemeyi GEREKTİRMEZ.

### C7 — İnsan ve AI kullanılabilirliği

Üç format, üç farklı iş için gerekçeli seçildi:
- **Markdown (gövde)** — insan okur/yazar, muhakeme ve bağlam burada.
- **YAML (frontmatter)** — aranabilir/filtrelenebilir yapılandırılmış meta veri, hem insan hem makine okur.
- **JSON (merkezi indeks)** — sadece makine için, insanlar nadiren doğrudan açar.

### C8 — Önerilen ağaç (illüstratif — henüz OLUŞTURULMADI)

```text
SESTIA_BILGI_KUTUPHANESI/
│
├── _INDEX/
│   └── relations.json          (ÖRNEK — id→yol eşleşmesi + ilişki kayıtları)
│
├── 01_ESYALAR_VE_BILESENLER/
│   ├── Oturma_Grubu/
│   │   └── sandalye_ahsap_klasik.md      (ÖRNEK dosya adı)
│   └── Depolama/
│       └── cekmece_standart.md           (ÖRNEK)
│
├── 02_MALZEMELER/
│   └── AHSAP/
│       ├── Ahsap_Turleri/
│       │   └── mese.md                    (ÖRNEK)
│       ├── Ozellikler/
│       ├── Isleme_Teknikleri/
│       └── Bakim_Ve_Koruma/
│
├── 03_DIY_ONARIM_VE_URETIM/
│   ├── Temel_Teknikler/
│   │   └── zimparalama.md                 (ÖRNEK)
│   ├── Dosemecilik/
│   ├── Yuzey_Bitirme/
│   ├── Onarim_Ve_Restorasyon/
│   └── Araclar_Ve_Ekipman/
│
├── 04_DONUSUM_VE_YENIDEN_KULLANIM/
│   ├── Tum_Esya_Donusumu/
│   │   └── sandalyeden_bitki_standi.md    (ÖRNEK — proje modeli)
│   ├── Bilesen_Yeniden_Kullanimi/
│   ├── Malzeme_Geri_Kazanimi/
│   └── Yeniden_Tasarim/
│
├── 05_RENK_VE_GORSEL_KOMPOZISYON/
├── 06_ISIK_VE_AYDINLATMA/
├── 07_IC_MEKAN_VE_YERLESIM/
│   ├── Oda_Turleri/
│   ├── Kucuk_Alan_Cozumleri/
│   ├── Cok_Islevli_Mekanlar/
│   └── Depolama_Ve_Erisilebilirlik/
│
├── 08_TASARIM_TARIHI_VE_KULTUR/
├── 09_YASAM_VE_KULLANIM/
├── 10_SURDURULEBILIRLIK/
│
└── _SEMA/
    └── frontmatter_semasi.md    (ÖRNEK — ortak alan tanımları, insan-okur referans)
```

`_INDEX/` ve `_SEMA/` alt çizgiyle başlıyor ki alfabetik sırada numaralı domain klasörlerinden ayrı, kolayca tanınabilir dursun — bu bir kural değil, okunabilirlik tercihi.

---

## DELIVERABLE D — Kavramsal Bilgi Mimarisi

7 tip (Object, Component, Material, Method, Function, Project, Reference) korunuyor, ama **dizin kategorisi (domain) ile bilgi tipini KARIŞTIRMAMAK kritik**:

- **Domain** = bilginin FİZİKSEL olarak nerede yaşadığı (hangi klasör).
- **Type** = bilginin YAPISAL olarak ne tür bir şey olduğu (kavramsal).

Basit durumda hizalanırlar (bir `Material` girdisi `02_MALZEMELER`'de yaşar). Ama `Project` ve `Reference` tipleri DOĞASI gereği çok-domainli: bir proje 04'te (ana evi) yaşayabilir ama 02/03/07'ye referans verir. Bunun çözümü frontmatter'daki `primary_domain` (fiziksel konum) + `related_domains` (ilgili diğer alanlar) ayrımı.

**8. tip gerekli mi?** Hayır. Kanıt/doğrulama sınıflandırması (source-supported / documented / creative proposal / user experience) bir TİP değil, her tipe uygulanan bir **status/evidence boyutu**. Bunu ayrı bir "tip" gibi modellemek yanlış olurdu; doğru yer her girdinin `status:` alanı (+ `sources:`, `limitations:`, `safety:` gibi kardeş alanlar) — tek bir güven skoru yetmez, çok boyutlu tutmak bu yüzden doğru.

**Ayrım özeti:**
- Dizin kategorileri → organizasyon (nerede arayacağım)
- Bilgi tipleri → yapı (bu girdi neyi tanımlıyor)
- İlişkiler → bağlantı (bu girdi neyle bağlantılı, nasıl)
- Kanıt/doğrulama → güvenilirlik (bu bilgiye ne kadar güvenebilirim)
- Yaratıcı öneri → Sestia'nın ÜRETTİĞİ, henüz `status: creative_proposal` olan yeni bir `Project` ya da `Function` girdisi — mevcut tiplerin dışında değil, içinde, sadece `status` alanıyla işaretli.

---

## DELIVERABLE E — Dört Test Senaryosu

### Case 1 — Eski ahşap sandalye

1. **İlgili domainler:** 01 (Eşyalar), 02 (Malzemeler/Ahşap), 03 (DIY/Döşemecilik), 04 (Dönüşüm), 07 (İç Mekân — nereye konacağı), 10 (Sürdürülebilirlik).
2. **İlgili tipler:** Object (sandalye), Component (ayaklar, oturma yeri, sırtlık), Material (ahşap türü, varsa döşeme kumaşı), Method (zımparalama, cilalama, döşemecilik), Function (oturma / farklı işlev), Project (somut bir dönüşüm).
3. **Bağlantılar:** Sandalye `HAS_COMPONENT` sırtlık; sırtlık `IS_MADE_OF` ahşap; ahşap `SUPPORTS_METHOD` zımparalama; sırtlık `MAY_SUPPORT_FUNCTION` duvar askısı.
4. **Sestia nasıl fikir geliştirir:** Preserve/Change/Separate/Combine/Reimagine modları arasında kullanıcının hedefine göre gezinir — beşini birden sıralamaz, duruma uygun olanı önerir, gerekçelendirir.
5. **Belgelenmiş vs varsayımsal:** "Sandalyeyi zımparalayıp yeniden cilalamak" `documented` bir yöntemdir (yaygın, kanıtlanmış). "Sırtlığı duvar askısına dönüştürmek" muhtemelen `creative_proposal` olarak başlar — dayanıklılık/montaj güvenliği doğrulanmadan `documented` sayılmamalı.
6. **Kütüphanede yeri:** Ana proje girdisi `04_DONUSUM_VE_YENIDEN_KULLANIM/Bilesen_Yeniden_Kullanimi/`'de yaşar; `02_MALZEMELER/AHSAP/` ve `03_DIY_ONARIM_VE_URETIM/`'e referans verir.

### Case 2 — Kullanılmayan ahşap kapı

1. **Domainler:** 01, 02 (Ahşap), 03 (kesme/sabitleme), 04, 07 (çalışma alanı ihtiyacı), 09 (Yaşam/Kullanım — "çalışma" ihtiyacı).
2. **Tipler:** Object (kapı), Component (panel, menteşe yuvaları, kulp), Material (ahşap türü/kalınlığı), Method (bacak/ayak montajı, yüzey bitirme), Function (masa yüzeyi), Project (kapıdan çalışma masası).
3. **Bağlantılar:** Kapı `IS_MADE_OF` ahşap panel; panel `MAY_SUPPORT_FUNCTION` masa yüzeyi; proje `USES_METHOD` bacak montajı, `USES_COMPONENT` uygun bacak/ayak kaynağı (başka bir nesneden gelebilir — ör. Case 3'teki çekmece ile bile ilişkilenebilir).
4. **Fikir geliştirme:** Atölye → ev ofisi örneği burada tam örtüşüyor — kapının düzlüğü/boyutu bir masa yüzeyi için elverişli mi, hangi bacak/destek sistemi gerekir sorusu Method+Component bilgisini birleştirir.
5. **Belgelenmiş vs varsayımsal:** "Kapıdan masa yapmak" yaygın belgelenmiş bir yöntem (`documented`); ama belirli bir kapının kalınlığı/ağırlığı için "şu bacak sistemi güvenle taşır" iddiası, ölçü doğrulanmadan `creative_proposal` + açık bir belirsizlik notu taşımalı.
6. **Yeri:** `04_DONUSUM_VE_YENIDEN_KULLANIM/Tum_Esya_Donusumu/`; `02_MALZEMELER/AHSAP/` ve `07_IC_MEKAN_VE_YERLESIM/`'e referans.

### Case 3 — Eski çekmece

1. **Domainler:** 01, 02, 03, 04, 07 (depolama/sergileme), 05 (görsel kompozisyon — sergileme kullanımında).
2. **Tipler:** Object (çekmece), Component (gövde, kulp, ray sistemi), Material, Method (montaj/sökme), Function (depolama / sergileme / duvar rafı / mobilya), Project.
3. **Bağlantılar:** Çekmece `HAS_COMPONENT` gövde; gövde `MAY_SUPPORT_FUNCTION` duvar rafı VEYA bağımsız mini mobilya; proje `MAY_BE_INSPIRED_BY` başka bir dönüşüm projesi (ör. Case 2'nin bacak/destek yaklaşımı).
4. **Fikir geliştirme:** "Depolama" tek çıkış değil — sergileme (açık raf), bağımsız mobilya (tekerlek eklenmiş sehpa), duvara monte edilmiş obje gibi FARKLI Function seçenekleri arasında kullanıcının alanına/ihtiyacına göre gezinir.
5. **Belgelenmiş vs varsayımsal:** Çekmeceyi duvara raf olarak monte etmek yaygın belgelenmiş; ama montajın GÜVENLİ olması (duvar tipi, ağırlık) kullanıcının kendi koşuluna bağlı — Sestia "belgelenmiş yöntem var, ama senin duvarın için doğrulama gerekir" ayrımını açıkça yapmalı.
6. **Yeri:** `04_DONUSUM_VE_YENIDEN_KULLANIM/Tum_Esya_Donusumu/`; `07_IC_MEKAN_VE_YERLESIM/Depolama_Ve_Erisilebilirlik/`'e referans.

### Case 4 — Artan kumaş

1. **Domainler:** 02 (Kumaş ve Tekstil), 03 (dikiş/döşemecilik), 04 (kombinasyon/yeniden kullanım), 05 (renk/doku).
2. **Tipler:** Material (kumaş türü), Method (dikiş, döşeme), Function (yastık kılıfı, döşeme kaplaması, duvar objesi), Project, Reference (varsa bir tekstil tekniği tarihi/kökeni).
3. **Bağlantılar:** Kumaş `SUPPORTS_METHOD` döşemecilik; döşemecilik `USES_COMPONENT` (ör. Case 1'in sandalye oturma yeri); proje `USES_METHOD` dikiş + `IS_MADE_OF` kumaş türü.
4. **Fikir geliştirme:** Burada özellikle "birleştirme" yeteneği devreye girer — artan kumaş TEK BAŞINA sınırlı bir bilgi, ama Case 1'deki sandalyenin döşeme ihtiyacıyla birleştiğinde somut bir proje ortaya çıkar. Bu, kütüphanenin "silolara ayrılmama" ilkesinin en net örneği.
5. **Belgelenmiş vs varsayımsal:** Kumaş miktarı/dayanıklılığının belirli bir döşeme işine YETİP yetmeyeceği kullanıcıya özel bir doğrulama gerektirir — genel yöntem `documented`, spesifik uygulama `creative_proposal` seviyesinde kalmalı ta ki ölçü/miktar netleşene kadar.
6. **Yeri:** `02_MALZEMELER/KUMAS_VE_TEKSTIL/`; `03_DIY_ONARIM_VE_URETIM/Dosemecilik/` ve `04_DONUSUM_VE_YENIDEN_KULLANIM/Malzeme_Geri_Kazanimi/`'e referans.

---

## DELIVERABLE F — Discovery → Sohbet İlişkisi

Mevcut Keşif arayüzünde ZATEN bir emsal var: `SECTION_CONTEXT_LABELS` — kullanıcı bir bölümden sohbete geçtiğinde sabit bir ETİKET AI'ya bağlam olarak taşınıyor (`lib/anthropic.js`, `app/api/sestia-chat`). Bilgi Kütüphanesi'nin keşif deneyimi bunu GENİŞLETİR, yeniden icat etmez.

Bir kullanıcı bir kütüphane maddesini (ör. "Eski sandalyeden bitki standı") açıp sohbete geçtiğinde, taşınması gereken bağlam:

1. **Seçilen maddenin kendisi** — stable `id`, `type`, başlık, özet (tam gövde değil — token maliyeti, sadece ilgili özet).
2. **Doğrudan bağlı bilgi** — `related:` alanındaki en yakın 2-3 girdi (ör. ahşap bakımı, uygun yapıştırma yöntemi).
3. **Kanıt/durum bilgisi** — bu belgelenmiş bir yöntem mi, yoksa Sestia'nın kendi önerisi mi (kullanıcıya dürüstçe iletilebilmesi için).
4. **Kullanıcının GERÇEK bağlamı** (varsa, private memory'den) — kendi sandalyesi/odası, önceki kararları — ama bu OTOMATİK genel bilgiye YAZILMAZ, sadece OKUNUP o sohbete taşınır.

**Uyarlama, kopyalama değil:** Kullanıcının nesnesi referans maddeden YAPISAL olarak farklı olabilir (farklı sandalye türü, farklı boyut). Sestia bunu tanımalı ve "bu referans senin sandalyene birebir uymayabilir, şöyle bir fark var" diyebilmeli.

Bu tamamen kavramsal kalıyor; hangi API'nin hangi alanı taşıyacağı, ne zaman private memory sorgulanacağı gibi teknik detaylar implementasyon aşamasının işi.

---

## DELIVERABLE G — Araştırma ve Öğrenme Soruları (yanıtlanmadı, sadece açık sorular)

- **Kaynak kalitesi:** Hangi kaynak türleri (teknik dokümantasyon, tasarım yayını, DIY rehberi, forum, sosyal medya) hangi iddia türü için yeterli sayılacak?
- **Araştırma derinliği kriterleri:** "Hızlı bakış" ile "çok kaynaklı doğrulama" arasındaki eşik neye göre belirlenecek — iddianın sonucu (estetik ilham vs yapısal güvenlik) mu, kullanıcının niyeti mi?
- **Önceki araştırmanın yeniden kullanımı:** Bir konu daha önce araştırılmışsa, "hâlâ geçerli" olduğuna nasıl karar verilecek?
- **Güncellik (freshness):** Hangi bilgi türleri "zamana dayanıklı" (malzeme özellikleri) sayılacak, hangileri düzenli yeniden doğrulama gerektirecek (fiyat, ürün mevcudiyeti)?
- **Çelişki yönetimi:** İki kaynak çelişirse hangisi öncelikli sayılacak, çelişki kullanıcıya nasıl gösterilecek?
- **Kalıcı öğrenme:** Bir kullanıcı geri bildirimi ne zaman "genel bilgiye aday" sayılacak, tek bir anekdot ne zaman genel kural sanılmaktan korunacak?
- **Tekrar önleme (deduplication):** Aynı konunun farklı sohbetlerde ayrı ayrı araştırılmasını nasıl önleyeceğiz?
- **Geri bildirim entegrasyonu:** Kullanıcı deneyimleri kütüphaneye nasıl bir onay/inceleme sürecinden geçerek girecek?
- **Maliyet kontrolü:** API/token maliyeti araştırma derinliği kararına nasıl somut biçimde dahil edilecek?
- **Kaynak atfı:** Her girdi kaynağını nasıl, ne ayrıntıda gösterecek?
- **Kullanıcı gizliliği:** Bir kullanıcının deneyimi genel bilgiye aday olacaksa, hangi onay/anonimleştirme adımından geçecek?

Bunların hiçbiri bu aşamada cevaplanmıyor/kodlanmıyor — sadece gelecekte karar verilmesi gereken sorular olarak kayıt altına alınıyor.

---

## DELIVERABLE H — Önerilen Sıradaki Adımlar

**Şimdi karar verilmesi gerekenler** (bu tasarımın onayı kapsamında):
1. C1-C8'deki dizin/dosya modeli onaylanıyor mu (`id != path`, frontmatter şeması, ilişki sözlüğü)?
2. 10 domain + Deliverable B'deki cross-cutting ayrımı (özellikle güvenlik) onaylanıyor mu?
3. `status` sınıflandırması (source_supported/documented/creative_proposal/user_experience) kabul ediliyor mu?

**Temel kütüphane yapısı onaylandıktan sonra tasarlanabilecekler:**
4. Frontmatter şemasının tam alan listesi (tip başına) — `_SEMA/` dosyasının içeriği.
5. İlk "çekirdek" içerik kapsamı — hangi malzemeler/nesneler/teknikler ilk dolgu olarak araştırılacak, hangi kaynaklardan.
6. `_INDEX/relations.json`'ın gerçek formatı ve kim/ne zaman güncelleyecek (elle mi, bir araçla mı).

**Gelecek implementasyona ait olanlar** (bu aşamada tasarlanmıyor bile):
7. Araştırma mimarisi (Deliverable G'deki tüm sorular).
8. `lib/anthropic.js`'in bu kütüphaneyi nasıl okuyacağı/sorgulayacağı (retrieval mekanizması).
9. Discovery arayüzünün (Deliverable F) gerçek UI/API tasarımı.
10. Private memory ↔ genel bilgi köprüsünün teknik detayları.

**Öneri:** Onay sırası (4) → (5, küçük bir pilot: sadece `02_MALZEMELER/AHSAP` altında 3-5 gerçek dosya, şema doğrulaması için) → geri kalan domainlerin kademeli doldurulması. Vizyonu destekleyen en küçük tutarlı temel, baştan aşırı büyük bir teknik sistem değil.

---

*Bu rapor bir tasarım/onay belgesidir. Hazırlanması sırasında hiçbir dizin/dosya oluşturulmadı, mevcut uygulama koduna dokunulmadı, hiçbir bağımlılık eklenmedi.*
