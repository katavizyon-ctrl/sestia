---
belge_turu: mimari_degerlendirme
durum: taslak / onay bekliyor
onceki_belge: ../00_MIMARI_VE_PLANLAMA/SESTIA_BILGI_KUTUPHANESI_RAPOR.md
tarih: 2026-09-22
---

# Bilgi Tipleri ve İlişki Şeması

Bu belge, önceki mimari raporun (`00_MIMARI_VE_PLANLAMA/SESTIA_BILGI_KUTUPHANESI_RAPOR.md`) Deliverable C4/C5/D bölümlerinde kavramsal olarak tanımlanan yapıyı, gerçek bilgi dosyaları yazılmaya başlanmadan önce **somut bir alan listesi ve ilişki sözlüğü** hâline getirir.

Henüz uygulama kodu değiştirilmedi, veritabanı oluşturulmadı, gerçek bir bilgi dosyası (Object/Material/Method/... içerikli) yazılmadı. Bu belge yalnızca **şema tasarımıdır** — bundan sonra yazılacak her bilgi dosyasının hangi ortak iskeleti paylaşacağını tanımlar.

---

## 1. Ortak iskelet (7 tipin tamamında bulunur)

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
```

`id` konvansiyonu: `<tip>_<kısa-slug>` biçiminde, insan-okur ama benzersiz (ör. `material_mese`, `object_ahsap-sandalye-klasik`, `project_sandalyeden-bitki-standi`). UUID gibi opak bir kimlik yerine okunabilir slug tercih ediliyor çünkü kütüphane insan tarafından da doğrudan taranacak (bkz. önceki rapor C7); benzersizlik `91_BILGI_ILISKILERI/`'deki merkezi indeksle garanti altına alınır, dosya adıyla değil.

**Önemli:** `id` hiçbir zaman dosya yoluna eşit varsayılmaz. Bir dosya taşınırsa/yeniden adlandırılırsa sadece indeksteki yol güncellenir; `related:` alanlarındaki referanslar kırılmaz.

---

## 2. `status` sözlüğü (4 değer, sabit)

| Değer | Anlamı |
|---|---|
| `source_supported` | Tanımlanabilir bir kaynağa dayanan, belirli iddia için temeli net bilgi. |
| `documented` | Uygulaması gösterilmiş/belgelenmiş bir yöntem. Belgelenmiş olması her durumda uygun/güvenli olduğu anlamına gelmez. |
| `creative_proposal` | Sestia'nın mevcut bilgiyi birleştirerek geliştirdiği, henüz test edilmemiş öneri. |
| `user_experience` | Gerçek bir uygulamadan gelen geri bildirim/sonuç; başka kullanıcılara uygulanabilirliği ayrıca değerlendirilmeli. |

Tek bir "güven skoru" kullanılmıyor — bir girdi `status` dışında ayrıca `sources`, ve tipine göre `limitations`/`safety` gibi alanlarla da nitelenebilir (bkz. §3).

---

## 3. Tipe özgü ek alanlar

Ortak iskelet + aşağıdaki alanlar. Her alan zorunlu değildir; konuya uymuyorsa boş bırakılır (önceki raporun "esneklik, ama şablonsuzluk değil" ilkesi).

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

---

## 4. İlişki türleri sözlüğü (sabit, başlangıç seti — 12 tür)

Aşırı esneklik erken karmaşıklık yaratacağı için başta bu listeyle sınırlı tutuluyor; yeni bir tür gerekiyorsa önce burada eklenir, dosyalarda rastgele türetilmez.

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

## 5. Merkezi indeks — önerilen format (ÖRNEK, henüz oluşturulmadı)

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

İlişki kayıtları ayrı bir yapıda (aynı dosyada ikinci bir alan olarak ya da `relations/` altında ayrı bir dosyada) tutulabilir:

```json
[
  {"from": "object_ahsap-sandalye-klasik", "relation": "HAS_COMPONENT", "to": "component_sandalye-sirtlik"},
  {"from": "component_sandalye-sirtlik", "relation": "IS_MADE_OF", "to": "material_mese"}
]
```

Bu dosyanın gerçek içeriği, ilk gerçek bilgi dosyaları yazılmaya başladığında elle (ya da basit bir betikle) doldurulacak — bu belge sadece FORMATI öneriyor, henüz bir indeks dosyası oluşturulmadı.

---

## 6. Genişleme kuralı

Yeni bir tip ya da ilişki türü gerektiğinde: önce bu dosyaya eklenir (gerekçesiyle), sonra yeni/etkilenen bilgi dosyalarında kullanılır. Mevcut dosyalar geriye dönük güncellenmeye ZORLANMAZ — eski girdiler eski şemayla geçerli kalır, `last_updated` alanı hangi girdinin ne zamanki şemaya göre yazıldığını işaret eder.

---

*Bu belge bir şema önerisidir, onay bekliyor. Onaylandıktan sonra ilk gerçek bilgi dosyaları (önerilen pilot: `02_MALZEMELER/AHSAP` altında birkaç dosya) bu şemaya göre yazılabilir.*
