---
belge_turu: kutuphane_mimarisi
durum: canonical
last_updated: 2026-09-25
---

# SESTIA Bilgi Kütüphanesi — Mimari

Bu belge, SESTIA Bilgi Kütüphanesi'nin klasör mimarisini ve bu mimariye bağlı kuralları tanımlar. Kütüphanenin mevcut yapısını tarif eder; bir migration veya durum raporu değildir.

---

## 1. Bu belgenin statüsü

- Kütüphane mimarisi için tek canonical referans bu belgedir.
- `02_KUTUPHANE/00_MIMARI_VE_PLANLAMA/` içindeki eski mimari ve devir raporları tarihsel belgelerdir. Bu belgeyle çeliştikleri noktada bu belge geçerlidir.
- Sayılar, audit sonuçları ve migration ayrıntıları gibi zamanla eskiyen operasyonel bilgiler bu belgede yer almaz.

---

## 2. Root mimari

```
SESTIA_BILGI_KUTUPHANESI/
├── _INBOX/
├── 01_ARASTIRMA/
├── 02_KUTUPHANE/
├── 03_ALTYAPI/
├── 99_ARSIV/
└── INBOX_AYIKLAMA_KAYDI.md
```

| Katman | Görevi |
|---|---|
| `_INBOX` | Hangi bilgi alanına ait olduğu henüz belirlenmemiş ham kaynakların genel havuzu |
| `01_ARASTIRMA` | Araştırma süreçleri, araştırma kayıtları, kaynak karşılaştırmaları, çalışma notları ve sentezler |
| `02_KUTUPHANE` | Düzenlenmiş, kalıcı, konu bazlı bilgi |
| `03_ALTYAPI` | Bilginin kendisi değil; kütüphanenin nasıl çalıştığını tanımlayan meta/sistem katmanı |
| `99_ARSIV` | Artık aktif olmayan ancak korunması gereken bilgi, eski yapı veya tarihsel materyal |
| `INBOX_AYIKLAMA_KAYDI.md` | `_INBOX`'lardan yapılan ayıklamaların kaydı ve kararlaştırılan ayıklama kuralları. Root'taki tek dosyadır. |

---

## 3. Katmanlar

### 3.1 `_INBOX` (root)

Kategorisi henüz belirlenmemiş ham kaynakların havuzudur. Buraya gelen materyalin ne olduğu bilinir, ama hangi bilgi alanına ait olduğuna henüz karar verilmemiştir.

### 3.2 `01_ARASTIRMA`

Henüz kütüphane bilgisine dönüştürülmemiş çalışmalar burada yaşar. Araştırma klasörleri gerektiğinde `02_KUTUPHANE` kategori adlarını birebir aynalar:

```
01_ARASTIRMA/05_RENK_VE_GORSEL_KOMPOZISYON/
02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/
```

Bu iki klasör aynı bilgi alanının iki farklı yaşam aşamasını temsil eder. Aynı adı taşımaları bilinçli bir ilişkidir.

Araştırma alanı kategori klasörleriyle önceden doldurulmaz. Bir kategori klasörü yalnızca o alanda gerçek araştırma materyali olduğunda açılır.

Tamamlanan araştırmalar, provenance veya referans değeri taşıdıkları sürece `01_ARASTIRMA` içinde kalır. Bir araştırmanın tamamlanmış olması tek başına arşivleme nedeni değildir.

### 3.3 `02_KUTUPHANE`

Ana bilgi kategorileri burada yaşar. Her ana kategori kendi alt hiyerarşisini taşır.

Ana kategorilerin numaraları ve sırası **henüz final değildir**. Güncel kategori listesi için belgeye değil, `02_KUTUPHANE/` klasörünün kendisine bakılır.

### 3.4 `03_ALTYAPI`

```
03_ALTYAPI/
├── 01_KUTUPHANE_KURALLARI/
├── 02_KAYNAK_VE_REFERANS_SISTEMI/
├── 03_BILGI_ILISKILERI/
├── 04_DOGRULAMA_VE_KALITE/
├── 05_SINIFLANDIRMA_VE_ETIKETLER/
└── 06_SABLONLAR/
```

- Bu belge `01_KUTUPHANE_KURALLARI/` içinde yaşar.
- Belge profilleri, metadata, `id`, `status` sözlüğü ve ilişki türleri [`03_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md`](../03_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md) belgesinde tanımlıdır.
- Alanlar arasındaki sorumluluk dağılımı §10'da tanımlıdır.

### 3.5 `99_ARSIV`

Arşiv root seviyesinde ve her zaman en sonda durur. `03_ALTYAPI`'nin altında değildir.

- `99_ARSIV` fiziksel bir saklama katmanıdır. Aktif kullanılmayan, tarihsel veya korunması gereken materyal içindir.
- Bir bilginin artık aktif kullanılmadığı arşivdeki konumuyla değil, kaydın `lifecycle` alanıyla ifade edilir. Alanın değerleri [şemada](../03_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md) tanımlıdır.
- İşlenmiş ham kaynaklar arşive taşınmaz (bkz. §5).
- Arşivin iç mimarisi bu aşamada tasarlanmamıştır.

---

## 4. Hiyerarşi ve numaralandırma

### 4.1 Numaralar yalnızca sıra gösterir

- Numaralar global bir kimlik (ID) değildir.
- Her parent klasör, kendi doğrudan alt klasörlerini bağımsız olarak numaralandırır.
- Her seviyede numaralandırma yeniden `01`'den başlayabilir.
- Aynı numaranın farklı parent'lar altında tekrar etmesi normaldir; bu bir çakışma değildir.

Örnek (`02_MALZEMELER`):

```
02_KUTUPHANE/
└── 02_MALZEMELER/
    ├── _INBOX/
    ├── 01_AHSAP/
    │   ├── 01_MASIF_AHSAP/
    │   ├── 02_KONTRPLAK_PLYWOOD/
    │   ├── 03_MDF/
    │   └── ...
    ├── 02_TAS_VE_TAS_ESASLI_MALZEMELER/
    │   ├── 01_MERMER/
    │   ├── 02_TRAVERTEN/
    │   └── ...
    └── ...
```

Bu örnekte `02` hem `02_KUTUPHANE` hem `02_MALZEMELER` hem de `02_TAS_…` için kullanılır. `01` ise üç farklı seviyede üç farklı anlama gelir.

### 4.2 Önekler

| Önek | Anlamı |
|---|---|
| `_` | Numaralandırılmayan özel sistem klasörü (`_INBOX`) |
| `01`, `02`, … | Aynı parent içindeki sıra |
| `99` | Root'ta arşiv; her zaman sonda durur |

`00` önekini kullanan klasörler de vardır: `02_KUTUPHANE/00_MIMARI_VE_PLANLAMA` ve `Kartela_Referanslari/00_ENVANTER`.

### 4.3 İsimlendirme

**Klasörler:**
- Klasör adları ASCII karakterlerden oluşur; Türkçe karakterler kullanılmaz (`ARSIV`, `ESYALAR`, `KUTUPHANE`).
- Numaralı klasörler `NN_BUYUK_HARF_SNAKE_CASE` biçimindedir.
- Bazı kategorilerin içinde numarasız `Title_Case` alt klasörler de bulunur (örn. `05_RENK_VE_GORSEL_KOMPOZISYON/Paletler/`, `03_DIY_ONARIM_VE_URETIM/Dosemecilik/`).

**Dosyalar:**
- Bilgi dosyaları küçük harf `snake_case` ile adlandırılır (`renk_cemberi_ve_iliskiler.md`).
- Kayıt, rapor ve envanter belgeleri büyük harf ve sıra ekiyle adlandırılır (`RENK_ARASTIRMASI_01.md`, `RENK_REFERANS_ENVANTERI_01.md`).
- `03_ALTYAPI` altındaki kural, standart ve şablon belgeleri büyük harfle adlandırılır (`KUTUPHANE_MIMARISI.md`). İstisna: `bilgi_tipleri_ve_iliski_semasi.md` mevcut adıyla korunur.
- Bir bilgi dosyasına eşlik eden görsel dosya aynı temel adı taşır (`palet_01_toprak_tonlari.md` + `palet_01_toprak_tonlari.svg`).

### 4.4 Dosyaların yaşadığı seviye

Dosyalar yalnızca en alt klasörlerde değil, hiyerarşinin her seviyesinde yaşayabilir. Örneğin `01_AHSAP/ahsap_alt_tonlari_ve_renk_egilimi.md` bir malzeme ailesi seviyesinde durur.

---

## 5. Inbox sistemi

Kütüphanede iki tür `_INBOX` vardır ve ikisi birlikte yaşar; birleştirilmezler.

| | Root `_INBOX` | Kategori `_INBOX` |
|---|---|---|
| Konum | `SESTIA_BILGI_KUTUPHANESI/_INBOX/` | `02_KUTUPHANE/<kategori>/_INBOX/` |
| Anlamı | Kategorisi henüz belirlenmemiş ham kaynak havuzu | Kategorisi belli ham kaynak havuzu |

`_INBOX` yalnızca "henüz hiç işlenmemiş" anlamına gelmez. Bir ham kaynak analiz edilmiş veya araştırmada kullanılmış olsa bile ham kaynak niteliğini kaybetmez. Bu nedenle işlenmiş ham kaynaklar kategori `_INBOX`'ında kalır; `99_ARSIV`'e taşınmaz. Ham kaynaktan üretilen referans analizleri, ham kaynağa `orijinal_dosya` alanında dosya adıyla referans verir.

**Kurallar:**
- `02_KUTUPHANE` altındaki **her ana bilgi kategorisinde** bir `_INBOX` bulunur.
- Alt ve daha derin uzmanlık klasörlerinde `_INBOX` otomatik açılmaz. Yalnızca ihtiyaç duyulduğunda oluşturulur.
- `_INBOX` hiçbir seviyede numaralandırılmaz.
- Ham kaynaklar PDF, görsel, katalog, ekran görüntüsü, üretici dokümanı, web çıktısı veya ham not olabilir.
---

## 6. Bilginin yaşam döngüsü

Katman tanımları bilginin şu yönde ilerlediğini gösterir:

```
_INBOX (root)            kategorisi belirsiz ham kaynak
      ↓
<kategori>/_INBOX        kategorisi belli ham kaynak
      ↓
01_ARASTIRMA             araştırma, karşılaştırma, sentez
      ↓
02_KUTUPHANE             düzenlenmiş, kalıcı bilgi
      ↓
99_ARSIV                 aktif olmayan, korunan
```

Bu akışta ilerleyen şey, ham kaynaktan üretilen bilgidir. Ham kaynak ise kategorisi belirlendiğinde kategori `_INBOX`'ına taşınır ve orada kalır.

`03_ALTYAPI` bu akışın bir aşaması değildir. Akışın tamamının nasıl çalıştığını tanımlar.

---

## 7. Kimlik, path ve link bakımı

### 7.1 Kimlik path'e bağlı değildir

- Bilgi dosyalarının frontmatter'ındaki `id` alanı, dosya yolundan bağımsız ve kalıcı bir kimliktir.
- `related:` ilişkileri path ile değil, `id` ile kurulur.
- `primary_domain` alanı, dosyanın fiziksel olarak yaşadığı ana kategori klasörünün adını taşır.
- Ayrıntılar: [`03_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md`](../03_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md).

Kütüphanede bugün birden fazla frontmatter biçimi bulunur:
- Bilgi dosyaları ortak iskeleti kullanır (`id`, `type`, `status`, `primary_domain`, …).
- Kartela analiz dosyaları kendi alanlarını kullanır (`sira_no`, `orijinal_dosya`, `referans_turu`, …).
- Kayıt ve rapor belgeleri `belge_turu` alanını kullanır.

### 7.2 Relative referanslar

- Belgeler arası referanslar, belgenin kendi konumuna göre relative path olarak yazılır.
- Bu path'ler klasör adlarını, dolayısıyla numaraları da içerir. Örneğin palet dosyalarından ahşap bilgisine giden referanslar `02_MALZEMELER/01_AHSAP/` klasör adını taşır. Klasör taşıma veya rename işlemlerinde, etkilenen gerçek path referansları yeni konuma göre güncellenir.
- Tarihsel belgelerin metnindeki eski path örnekleri, klasörler taşındığı için geriye dönük olarak yeniden yazılmaz.

---

## 8. Git politikası

- Ham `_INBOX` kaynakları Git'e girmez. Bu kural root `_INBOX` ile `02_KUTUPHANE` altındaki her seviyedeki `_INBOX` için geçerlidir.
- Boş klasörlerin fiziksel olarak korunması için `.gitkeep` dosyaları takip edilir.
- `01_ARASTIRMA`, `02_KUTUPHANE`, `03_ALTYAPI` ve `99_ARSIV` içindeki kalıcı Markdown ve SVG dosyaları Git tarafından izlenir.
- İşlenmiş ham kaynaklar da `_INBOX` içinde kaldıkları için Git dışında kalır. `_INBOX` dışına taşınan bir ham kaynak bu kurallarla otomatik olarak dışlanmaz.
- Ham kaynakların yedeği Git dışında, yerelde tutulur.

Projedeki `.gitignore` kuralları:

```
SESTIA_BILGI_KUTUPHANESI/_INBOX/*
!SESTIA_BILGI_KUTUPHANESI/_INBOX/.gitkeep
SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/**/_INBOX/*
!SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/**/_INBOX/.gitkeep
```

---

## 9. Belge türlerinin yeri

| Belge türü | Yeri |
|---|---|
| Kategorisi belirlenmemiş ham kaynak | `_INBOX/` |
| Inbox taşıma kaydı | `INBOX_AYIKLAMA_KAYDI.md` (root) |
| Kategorisi belli ham kaynak (işlenmiş veya işlenmemiş) | `02_KUTUPHANE/<kategori>/_INBOX/` |
| Konu bazlı bilgi dosyası | `02_KUTUPHANE/<kategori>/…` |
| Araştırma kaydı, kaynak karşılaştırması, çalışma notu | `01_ARASTIRMA/<kategori>/…` |
| Kütüphane kuralı, şema, şablon | `03_ALTYAPI/<alan>/…` |
| Aktif olmayan, korunan materyal | `99_ARSIV/` |
| Proje geneli rapor ve audit | Kütüphane dışında: `docs/reports/SESTIA_BILGI_KUTUPHANESI/` |
| Kütüphane hakkındaki eski rapor ve planlama belgeleri | `02_KUTUPHANE/00_MIMARI_VE_PLANLAMA/` (tarihsel, yerinde korunur) |

---

## 10. Canonical sorumluluk dağılımı

Her konunun tek bir yetkili tanımı vardır. Aynı kararın ikinci bir tanımı yazılmaz. Başka belgeler o konuya değindiğinde kuralı kopyalamaz, yetkili belgeye referans verir.

Bir konunun veri biçimi, iş kararı ve uygulama prosedürü farklı belgelerde bulunabilir. Ancak her biri yalnızca kendi payını tanımlar.

### 10.1 V1 belge seti

Aşağıdaki path'ler `03_ALTYAPI/` tabanına göredir.

| Belge | Tek yetkili tanımı olduğu konu | Durum |
|---|---|---|
| `01_KUTUPHANE_KURALLARI/KUTUPHANE_MIMARISI.md` | Root ve klasör düzeni, fiziksel yerleşim, dosya/klasör adlandırması, inbox, numaralandırma, relative link ilkesi, kütüphaneye özgü Git kapsamı | mevcut |
| [`01_KUTUPHANE_KURALLARI/BILGI_YASAM_DONGUSU_VE_KABUL.md`](BILGI_YASAM_DONGUSU_VE_KABUL.md) | Kabul ve araştırmaya geri dönüş geçişleri, ana kayıt seçimi, duplicate birleştirme, kullanım dışına alma ve arşivleme koşulları | mevcut |
| `01_KUTUPHANE_KURALLARI/BAKIM_VE_DEGISIKLIK_YONETIMI.md` | Taşıma/rename, etki analizi, şema değişikliklerinin uygulanması, değişiklik sonrası kontrol prosedürü | oluşturulacak |
| `02_KAYNAK_VE_REFERANS_SISTEMI/KAYNAK_VE_ATIF_STANDARDI.md` | Kaynak seçimi ve değerlendirmesi, kaynak künyesi, kaynak kaydı kullanımı, atıf biçimi, iddia–kaynak ve ham materyal eşleşmesi | oluşturulacak |
| `03_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md` | Belge profilleri, metadata alanlarının veri biçimi, `id`, bilgi tipleri, `status` ve yaşam durumu değerleri, ilişki sözlüğü, şema sürümü | mevcut |
| `04_DOGRULAMA_VE_KALITE/DOGRULAMA_VE_KALITE_STANDARDI.md` | İddia doğrulama, kalite ölçütleri, çelişki çözümü, belirsizlik, yeniden doğrulama, kalite kontrol listeleri | oluşturulacak |
| `05_SINIFLANDIRMA_VE_ETIKETLER/SINIFLANDIRMA_STANDARDI.md` | Ana kategori seçimi, `primary_domain` kararı, ikincil alanlar, kategori ekleme/bölme | oluşturulacak |
| `05_SINIFLANDIRMA_VE_ETIKETLER/ETIKET_VE_ADLANDIRMA_SOZLUGU.md` | Tercih edilen etiketler, etiket yazımı, alternatif adlar, dil eşleşmeleri | oluşturulacak |
| `06_SABLONLAR/BILGI_DOSYASI_SABLONU.md` | Bilgi dosyası iskeleti | oluşturulacak |
| `06_SABLONLAR/ARASTIRMA_KAYDI_SABLONU.md` | Araştırma kaydı iskeleti | oluşturulacak |
| `06_SABLONLAR/KAYNAK_KAYDI_SABLONU.md` | Ayrı kayıt gerektiren kaynak için kayıt iskeleti | oluşturulacak |
| `06_SABLONLAR/REFERANS_ANALIZI_SABLONU.md` | Kartela/görsel referans analizi iskeleti | oluşturulacak |
| `06_SABLONLAR/ENVANTER_SABLONU.md` | Envanter iskeleti | oluşturulacak |

Şablonların yetkisi belge iskeletiyle sınırlıdır. Şablonlar kural üretmez; ilgili standartları uygular ve onlara referans verir.

V1 bu belgelerle sınırlıdır. Yeni alt klasör veya ayrı standart belgesi yalnızca somut bir kullanım ihtiyacı doğduğunda eklenir; gelecek için boş yapı açılmaz.

### 10.2 Birden fazla belgeye değen konular

| Konu | Yetkili sahip | Diğer belgelerdeki sınır |
|---|---|---|
| Metadata / frontmatter | `bilgi_tipleri_ve_iliski_semasi.md` | Diğer standartlar alanları yeniden tanımlamaz. |
| `id` | `bilgi_tipleri_ve_iliski_semasi.md` | — |
| `primary_domain` seçimi | `SINIFLANDIRMA_STANDARDI.md` | Şema yalnızca alanın biçimini tanımlar. Bu belge yalnızca fiziksel kategoriyle eşleşme ilkesini taşır. |
| `tags` değerleri | `ETIKET_VE_ADLANDIRMA_SOZLUGU.md` | Şema yalnızca liste biçimini tanımlar. |
| Kaynak yeterliliği | `KAYNAK_VE_ATIF_STANDARDI.md` | Kaynağın bir amaç için yeterliliğini değerlendirir. |
| Doğrulama | `DOGRULAMA_VE_KALITE_STANDARDI.md` | Kaynağın belirli bir iddiayı destekleyip desteklemediğini değerlendirir. |
| Yaşam döngüsü | `BILGI_YASAM_DONGUSU_VE_KABUL.md` | Değerlerin teknik sözlüğü şemadadır. |
| Arşivleme ve kullanım dışına alma | `BILGI_YASAM_DONGUSU_VE_KABUL.md` | Arşivin fiziksel yeri ve Git kapsamı bu belgededir. |
| Relative linkler | Bu belge (§7.2) | Taşıma sonrası güncelleme prosedürü `BAKIM_VE_DEGISIKLIK_YONETIMI.md`'dedir. |

---

## 11. Henüz tanımlanmamış konular

Aşağıdaki konular için bugün bir kural yoktur. Karar verildiğinde bu belge güncellenir.

- `00` önekinin özel bir anlamı olup olmadığı. Bu soru `00_MIMARI_VE_PLANLAMA`'nın bir bilgi kategorisi mi, yoksa kütüphane meta alanı mı olduğu sorusuyla bağlantılıdır.
- Kategori içi alt klasörlerde numaralandırmanın ve `Title_Case` / `UPPER_SNAKE` biçimlerinden hangisinin kullanılacağı.
- `02_KUTUPHANE` ana kategorilerinin final numaraları ve sırası.
- `99_ARSIV`'in iç düzeni.
- Inbox ayıklama süreci — kısmen tanımlandı. Görseller için yönlendirme ve adlandırma kuralları [`INBOX_AYIKLAMA_KAYDI.md`](../../INBOX_AYIKLAMA_KAYDI.md) içinde kararlaştırıldı. Ayıklamayı kimin ve ne zaman yapacağı ile görsel dışı materyalin nasıl ayıklanacağı henüz tanımlanmadı.
