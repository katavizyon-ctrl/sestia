---
belge_turu: bilgi_semasi
durum: canonical
onceki_belge: ../../02_KUTUPHANE/00_MIMARI_VE_PLANLAMA/SESTIA_BILGI_KUTUPHANESI_RAPOR.md
tarih: 2026-09-22
last_updated: 2026-09-25
---

# Bilgi Tipleri ve İlişki Şeması

Bu belge, SESTIA Bilgi Kütüphanesi'ndeki belgelerin metadata (frontmatter) yapısının canonical tanımıdır. Aşağıdaki konuların tek yetkili tanımı burasıdır:
- belge profilleri,
- metadata alanlarının veri biçimi,
- `id` kuralları,
- bilgi tipleri,
- `status` ve `lifecycle` değerleri,
- şema sürümü,
- ilişki sözlüğü.

İlk sürümü 2026-09-22'de, gerçek bilgi dosyaları yazılmadan önce bir şema önerisi olarak hazırlandı. 2026-09-25'te kütüphanedeki gerçek kullanımla uzlaştırıldı. Değişikliklerin ayrıntısı §9'daki belge geçmişinde yer alır.

---

## 0. Sorumluluk sınırı

Bu belge bir alanın **nasıl temsil edildiğini** tanımlar. Aşağıdaki konuların yetkili tanımı başka belgelerdedir; bu belge onları yeniden tanımlamaz:

| Konu | Yetkili belge |
|---|---|
| Klasör yapısı, fiziksel yerleşim, `primary_domain` ile fiziksel kategori eşleşmesi ilkesi | `01_KUTUPHANE_KURALLARI/KUTUPHANE_MIMARISI.md` |
| Hangi ana kategorinin `primary_domain` olarak seçileceği | `05_SINIFLANDIRMA_VE_ETIKETLER/SINIFLANDIRMA_STANDARDI.md` (V1'de oluşturulacak) |
| Tercih edilen etiket değerleri ve yazımı | `05_SINIFLANDIRMA_VE_ETIKETLER/ETIKET_VE_ADLANDIRMA_SOZLUGU.md` (V1'de oluşturulacak) |
| Yaşam durumu geçişleri, kabul, duplicate birleştirme, kullanım dışına alma | `01_KUTUPHANE_KURALLARI/BILGI_YASAM_DONGUSU_VE_KABUL.md` (V1'de oluşturulacak) |
| Kaynak künyesinin içeriği ve atıf biçimi | `02_KAYNAK_VE_REFERANS_SISTEMI/KAYNAK_VE_ATIF_STANDARDI.md` (V1'de oluşturulacak) |

---

## 1. Belge profilleri

Kütüphanede tek bir frontmatter kalıbı yoktur. Belgeler türlerine göre farklı profiller kullanır ve her profil kendi türü için geçerlidir. Profiller tek bir bilgi dosyası kalıbına zorlanmaz.

| Profil | Nerede kullanılır | Ayırt edici alanlar |
|---|---|---|
| **Bilgi dosyası** | `02_KUTUPHANE` altındaki konu bazlı bilgi dosyaları | `id`, `type`, `status` ve §2'deki ortak iskelet |
| **Referans analizi** | Kartela / görsel referans analiz dosyaları | `sira_no`, `orijinal_dosya`, `gecici_baslik`, `referans_turu`, `etiketler` |
| **Küme** | Referans analizlerini gruplayan küme dosyaları | `kume_no`, `kume_adi` |
| **Kayıt / rapor** | Araştırma kayıtları, envanterler, raporlar, altyapı belgeleri | `belge_turu` ve türe göre değişen alanlar (`durum`, `tarih`, `kapsam`, `konu`, …) |
| **Frontmatter'sız** | `README.md` dosyaları ve bazı eski raporlar | — |

Referans analizi profilindeki `orijinal_dosya` alanı, analiz edilen ham kaynağın dosya adını taşır. Bu ham kaynak ilgili kategori `_INBOX`'ında yaşar ve Git dışındadır.

Mevcut `belge_turu` değerleri: `arastirma_kaydi`, `envanter`, `organizasyon_raporu`, `devir_raporu`, `kutuphane_mimarisi`, `bilgi_semasi`.

---

## 2. Bilgi dosyası profili — ortak iskelet (7 tipin tamamında bulunur)

```yaml
id: <stabil, taşınmaya dayanıklı kimlik — dosya yolundan BAĞIMSIZ>
type: object | component | material | method | function | project | reference
title: <kısa başlık>
status: source_supported | documented | creative_proposal | user_experience
primary_domain: <bu dosyanın fiziksel olarak yaşadığı ana kategori, ör. 02_MALZEMELER>
related_domains: [<ilgili diğer kategoriler>]
related: [{id: <başka bir girdinin id'si>, relation: <aşağıdaki sözlükten bir tür>}]
sources: [<varsa kaynak referansları>]
last_updated: <YYYY-MM-DD>
tags: [<serbest arama etiketleri>]
schema_version: 1
lifecycle: draft | active | deprecated | superseded
superseded_by: <yerine geçen kaydın id'si — yalnızca lifecycle: superseded ise zorunlu>
```

- İlk on alan (`id` … `tags`) ortak iskeletin özgün alanlarıdır. Mevcut bilgi dosyalarının tamamı bu on alanı taşır.
- `schema_version`, `lifecycle` ve `superseded_by` şema sürümü 1 ile eklenmiştir (bkz. §2.2 ve §3.1).

**`primary_domain` ve `related_domains`:**
- Değerleri, `02_KUTUPHANE` altındaki ana kategori klasörlerinin tam adıdır (ör. `05_RENK_VE_GORSEL_KOMPOZISYON`).
- `primary_domain`, dosyanın fiziksel olarak içinde bulunduğu kategoriyle aynıdır.
- `related_domains` boş liste (`[]`) olabilir.

**`sources`:** Kaynak dayanağı olmayan dosyalarda (ör. `creative_proposal`) boş liste (`[]`) olabilir.

### 2.1 `id`

- `id` konvansiyonu `<tip>_<kısa-slug>` biçimindedir: insan-okur ama benzersiz (ör. `material_mese`, `object_ahsap-sandalye-klasik`, `project_sandalyeden-bitki-standi`).
- Slug küçük harf ve tire ile yazılır.
- UUID gibi opak bir kimlik yerine okunabilir slug tercih edilir, çünkü kütüphane insan tarafından da doğrudan taranır.
- Her `id` kütüphane genelinde benzersizdir. Bugün merkezi bir indeks yoktur; benzersizlik, dosyalardaki `id` alanlarının taranmasıyla kontrol edilir.

**Önemli:**
- `id` hiçbir zaman dosya yoluna eşit varsayılmaz.
- Bir dosya taşındığında veya yeniden adlandırıldığında `id` değişmez ve `related:` alanlarındaki referanslar kırılmaz.
- Her `related[].id` değeri kütüphanede var olan bir `id`'yi göstermelidir. Aynı kural `superseded_by` için de geçerlidir.

### 2.2 `schema_version`

- **Güncel şema sürümü: `1`.**
- Değer düz bir tam sayıdır (`schema_version: 1`). Semantic versioning veya `1.0` / `1.1` biçimi kullanılmaz.
- Yeni oluşturulan ve bu şemaya göre uyarlanan bilgi dosyaları `schema_version` alanını taşır.
- `schema_version` alanı bulunmayan bir kayıt **legacy profildir**. Yani bu alan tanımlanmadan önce yazılmıştır ve kendi yazıldığı dönemin şemasıyla geçerli kalır.
- `schema_version` ile `last_updated` aynı şey değildir. `last_updated` içeriğin son güncellendiği tarihi, `schema_version` ise kaydın hangi şema sürümüne göre yazıldığını gösterir. Biri diğerinden çıkarılmaz.

---

## 3. `status` sözlüğü (4 değer, sabit)

| Değer | Anlamı |
|---|---|
| `source_supported` | Tanımlanabilir bir kaynağa dayanan, belirli iddia için temeli net bilgi. |
| `documented` | Uygulaması gösterilmiş/belgelenmiş bir yöntem. Belgelenmiş olması her durumda uygun/güvenli olduğu anlamına gelmez. |
| `creative_proposal` | Sestia'nın mevcut bilgiyi birleştirerek geliştirdiği, henüz test edilmemiş öneri. |
| `user_experience` | Gerçek bir uygulamadan gelen geri bildirim/sonuç; başka kullanıcılara uygulanabilirliği ayrıca değerlendirilmeli. |

Tek bir "güven skoru" kullanılmaz. Bir girdi `status` dışında ayrıca `sources` alanıyla ve tipine göre `limitations`/`safety` gibi alanlarla da nitelenebilir (bkz. §4).

`status` bilginin dayanağını ve üretim niteliğini ifade eder. Bir bilginin aktif kullanımda olup olmadığını ifade etmez; bunu `lifecycle` ifade eder (bkz. §3.1).

### 3.1 `lifecycle` sözlüğü (4 değer)

`lifecycle`, `status`'tan bağımsız ayrı bir alandır ve kaydın yaşam durumunu ifade eder.

| Değer | Anlamı |
|---|---|
| `draft` | Henüz kabul edilmiş aktif bilgi değil. |
| `active` | Güncel ve aktif kullanılan kayıt. |
| `deprecated` | Artık aktif kullanım için önerilmeyen kayıt. Yerine geçen bir kayıt olmak zorunda değildir. |
| `superseded` | Başka bir kayıt tarafından yerini almış kayıt. |

**Kurallar:**
- `lifecycle: superseded` olan kayıtta `superseded_by` alanı **zorunludur**. Bu alan, yerine geçen kaydın kalıcı `id`'sini taşır.
- `deprecated` için ayrı bir metadata alanı yoktur. Gerekçe gerekiyorsa belgenin gövdesinde açıklanır.
- Yeni oluşturulan veya bundan sonra anlamlı biçimde güncellenen bilgi dosyaları `lifecycle` alanını taşır.
- `lifecycle` alanı bulunmayan eski bir kayıt, bu nedenle `draft`, `active` veya `deprecated` sayılmaz. Yaşam durumu yalnızca açıkça yazıldığında geçerlidir.

Bu belge yalnızca alanın biçimini ve izin verilen değerleri tanımlar. Değerler arasındaki geçişlerin ne zaman ve hangi koşulla yapılacağı `01_KUTUPHANE_KURALLARI/BILGI_YASAM_DONGUSU_VE_KABUL.md` belgesinin sorumluluğundadır (bkz. §0).

---

## 4. Tipe özgü ek alanlar

Ortak iskelete ek olarak aşağıdaki alanlar tanımlıdır. Her alan zorunlu değildir; konuya uymuyorsa boş bırakılır (önceki raporun "esneklik, ama şablonsuzluk değil" ilkesi).

Mevcut bilgi dosyalarında bu tipe özgü alanlar frontmatter'da kullanılmamaktadır.

### Object
`orijinal_islev`, `alternatif_islevler`, `yapisal_ozellikler`, `bilesenler` (→ Component id listesi), `tipik_ariza_noktalari`

### Component
`ait_oldugu_nesne` (→ Object id, varsa), `malzeme` (→ Material id), `baglanti_tipi`, `bagimsiz_kullanim_potansiyeli`

### Material
`fiziksel_ozellikler`, `dayaniklilik`, `islenebilirlik`, `nem_ve_isi_davranisi`, `bakim`, `guvenlik_notu`, `maliyet_notu`

### Method
`gerekli_malzeme`, `gerekli_arac`, `surec_adimlari`, `beceri_seviyesi`, `sure_notu`, `yaygin_hatalar`, `safety`, `alternatif_yontemler`

### Function
`uygun_nesne_turleri`, `mekansal_gereksinim`, `ilgili_ihtiyac` (→ 09_YASAM_VE_KULLANIM ile ilişki)

### Project
`baslangic_nesnesi`, `hedef_islev`, `gereken_bilgi` (→ ilgili Material/Method id'leri), `uygulanabilirlik_notlari`, `safety`, `maliyet_notu`, `sure_notu`, `zorluk_seviyesi`

### Reference
`kaynak_turu`, `donem_veya_baglam`, `ilham_verdigi_alanlar` (→ ilgili id listesi)

**Mevcut kullanım notları:**
- `type: reference` kütüphanede kavramsal/teorik bilgi dosyaları için kullanılmaktadır (ör. renk teorisi dosyaları). Bibliyografik bir kaynak kaydı anlamına gelmez.
- Özgün palet dosyaları `type: project` ile kaydedilmiştir.

---

## 5. İlişki türleri sözlüğü (sabit, başlangıç seti — 12 tür)

Aşırı esneklik erken karmaşıklık yaratacağı için bu listeyle sınırlı tutulur. Yeni bir tür gerekiyorsa önce burada eklenir; dosyalarda rastgele türetilmez.

| İlişki | Kullanım |
|---|---|
| `HAS_COMPONENT` | Object → Component |
| `PART_OF` | Component → Object (ters yön) |
| `IS_MADE_OF` | Object/Component → Material |
| `SUPPORTS_METHOD` | Material/Component → Method (bu malzemeye/parçaya uygulanabilir yöntem) |
| `USES_METHOD` | Project → Method |
| `USES_COMPONENT` | Project → Component |
| `USES_MATERIAL` | Project → Material |
| `MAY_SUPPORT_FUNCTION` | Object/Component → Function (kesin değil, olasılık) |
| `REQUIRES_FUNCTION` | Project → Function |
| `DOCUMENTS` | Reference → Project/Method |
| `MAY_BE_INSPIRED_BY` | Project/Function → Reference veya başka Project |
| `RELATED_TO` | Yukarıdakilerin hiçbirine tam uymayan, genel ilişki (az kullanılmalı — diğerleri varken kaçış yolu olmamalı) |

---

## 6. Merkezi indeks

Kütüphanede bugün merkezi bir `id` → path indeksi **yoktur**. İlişkiler yalnızca bilgi dosyalarının kendi `related:` alanlarında tutulur.

Aşağıdaki format, 2026-09-22 şema önerisinde indeks için önerilmiş örnektir ve tarihsel örnek olarak korunur. Örnekteki path'ler o tarihteki taslak yapıya aittir; mevcut klasör yapısını göstermez.

```json
{
  "material_mese": {
    "path": "02_MALZEMELER/AHSAP/Ahsap_Turleri/mese.md",
    "type": "material",
    "title": "Meşe"
  },
  "object_ahsap-sandalye-klasik": {
    "path": "01_ESYALAR_VE_BILESENLER/Oturma_Grubu/sandalye_ahsap_klasik.md",
    "type": "object",
    "title": "Klasik Ahşap Sandalye"
  }
}
```

İlişki kayıtlarının ayrı bir yapıda tutulması için önerilen örnek:

```json
[
  {"from": "object_ahsap-sandalye-klasik", "relation": "HAS_COMPONENT", "to": "component_sandalye-sirtlik"},
  {"from": "component_sandalye-sirtlik", "relation": "IS_MADE_OF", "to": "material_mese"}
]
```

---

## 7. Genişleme kuralı

Yeni bir tip veya ilişki türü gerektiğinde önce bu dosyaya gerekçesiyle eklenir, sonra yeni veya etkilenen bilgi dosyalarında kullanılır.

Mevcut dosyalar geriye dönük güncellenmeye ZORLANMAZ; eski girdiler eski şemayla geçerli kalır. Bir girdinin hangi şemaya göre yazıldığını `schema_version` alanı gösterir. Alanı olmayan girdiler legacy profildir (bkz. §2.2).

---

## 8. Henüz tanımlanmamış alanlar

Aşağıdaki konular bu şemanın sorumluluğundadır ama henüz tanımlanmamıştır:

- **Mevcut kayıtların sürüm 1'e geçişi:** Mevcut bilgi dosyalarına `schema_version` ve `lifecycle` eklenmesi. Bu geçiş, şablonlar ve diğer standartlar tamamlandıktan sonra ele alınacaktır.
- **Diğer profillerde sürüm ve yaşam durumu:** `schema_version` ve `lifecycle` bilgi dosyası profili için tanımlıdır. Referans analizi, küme ve kayıt/rapor profillerinin bu alanları taşıyıp taşımayacağı henüz belirlenmemiştir.

Aşağıdaki konular SESTIA'nın host/retrieval mimarisiyle birlikte ele alınacaktır:

- **İlişki tekrarı:** Tipe özgü `id` alanları (ör. `bilesenler`, `malzeme`) ile `related:` alanının aynı ilişkiyi iki kez kaydetmesinin nasıl ele alınacağı. Ters ilişkilerin (ör. `HAS_COMPONENT` / `PART_OF`) iki tarafta da tutulup tutulmayacağı.
- **Merkezi indeks:** Bir indeks veya registry oluşturulursa dosyalardan türetilip türetilmeyeceği, alanları ve runtime retrieval ile ilişkisi.

---

## 9. Belge geçmişi

### 2026-09-25 — Şema sürümü 1: `lifecycle` ve `schema_version`

- **Eklenen alanlar:** Bilgi dosyası profiline `schema_version`, `lifecycle` ve `superseded_by` eklendi (§2, §2.2, §3.1). Güncel şema sürümü `1` olarak tanımlandı.
- **§7 genişleme kuralı (özgün cümle):** "`last_updated` alanı hangi girdinin ne zamanki şemaya göre yazıldığını işaret eder." `last_updated` ile şema sürümü ayrı kavramlar olarak tanımlandığı için bu cümle `schema_version` referansıyla değiştirildi.
- **§3 (bir önceki sürümdeki cümle):** "`status` bilginin dayanağını ifade eder. Bir bilginin aktif kullanımda olup olmadığını ifade etmez (bkz. §8)." Bu cümle `lifecycle` alanına referans verecek şekilde güncellendi.
- **§8:** Yaşam durumu alanı ve şema sürümü açık konular listesinden çıkarıldı. Mevcut kayıtların geçişi ve diğer profillerde kullanım yeni açık konular olarak eklendi. İlişki tekrarı ve merkezi indeks, host/retrieval mimarisine bağlandı.
- **Mevcut kayıtlar:** Bu değişiklikle birlikte değiştirilmedi. Mevcut bilgi dosyaları legacy profildir.

### 2026-09-25 — Gerçek kullanımla uzlaştırma

Kaldırılan veya güncellenen ifadelerin özgün hâlleri:

- **Frontmatter:** `belge_turu: mimari_degerlendirme` ve `durum: taslak / onay bekliyor` idi. Belge artık canonical şema olarak kullanıldığı için `belge_turu: bilgi_semasi` ve `durum: canonical` olarak güncellendi; `last_updated` eklendi.
- **Giriş paragrafı (özgün):** "Bu belge, önceki mimari raporun (`00_MIMARI_VE_PLANLAMA/SESTIA_BILGI_KUTUPHANESI_RAPOR.md`) Deliverable C4/C5/D bölümlerinde kavramsal olarak tanımlanan yapıyı, gerçek bilgi dosyaları yazılmaya başlanmadan önce **somut bir alan listesi ve ilişki sözlüğü** hâline getirir."
- **İkinci paragraf (özgün):** "Henüz uygulama kodu değiştirilmedi, veritabanı oluşturulmadı, gerçek bir bilgi dosyası (Object/Material/Method/... içerikli) yazılmadı. Bu belge yalnızca **şema tasarımıdır** — bundan sonra yazılacak her bilgi dosyasının hangi ortak iskeleti paylaşacağını tanımlar." Bilgi dosyaları artık mevcut olduğu için kaldırıldı.
- **`id` benzersizliği (özgün):** "…benzersizlik `91_BILGI_ILISKILERI/`'deki merkezi indeksle garanti altına alınır, dosya adıyla değil." ve "Bir dosya taşınırsa/yeniden adlandırılırsa sadece indeksteki yol güncellenir; `related:` alanlarındaki referanslar kırılmaz." `91_BILGI_ILISKILERI/` klasörü artık yoktur ve indeks oluşturulmamıştır; §2.1 buna göre güncellendi.
- **§5 başlığı ve kapanışı (özgün):** "Merkezi indeks — önerilen format (ÖRNEK, henüz oluşturulmadı)" ve "Bu dosyanın gerçek içeriği, ilk gerçek bilgi dosyaları yazılmaya başladığında elle (ya da basit bir betikle) doldurulacak — bu belge sadece FORMATI öneriyor, henüz bir indeks dosyası oluşturulmadı." Bölüm §6 olarak korundu; indeksin olmadığı ve örneklerin tarihsel olduğu belirtildi.
- **Kapanış notu (özgün):** "*Bu belge bir şema önerisidir, onay bekliyor. Onaylandıktan sonra ilk gerçek bilgi dosyaları (önerilen pilot: `02_MALZEMELER/AHSAP` altında birkaç dosya) bu şemaya göre yazılabilir.*"
- **Numaralandırma:** Özgün §1–§6 bölümleri, yeni §0 ve §1 (belge profilleri) eklendiği için yeniden numaralandı. Özgün "Ortak iskelet" bölümü §2 oldu, `status` §3, tipe özgü alanlar §4, ilişkiler §5, indeks §6, genişleme kuralı §7.
- **Eklenen bölümler:** §0 sorumluluk sınırı, §1 belge profilleri, §2'deki gerçek kullanım notları, §4 sonundaki mevcut kullanım notları, §8 henüz tanımlanmamış alanlar.

`status` sözlüğü, tipe özgü alanlar, ilişki türleri sözlüğü ve genişleme kuralının içeriği değiştirilmedi.

### 2026-09-22 — İlk sürüm

İlk sürüm, `91_BILGI_ILISKILERI/` klasöründe bir şema önerisi olarak oluşturuldu.
