---
belge_turu: mevcut_durum_raporu
kapsam: SESTIA_BILGI_KUTUPHANESI (tamamı)
hazirlanma_tarihi: 2026-09-25
yontem: salt-okuma inceleme — 67 .md dosyasının tamamı okundu; 12 .svg makine ile kontrol edildi; 29 _INBOX görseli yalnızca envanter/analiz dosyaları üzerinden değerlendirildi (görsellerin kendisi açılmadı)
degisiklik: kütüphanede hiçbir dosya değiştirilmedi, taşınmadı, silinmedi
---

# SESTIA Bilgi Kütüphanesi — Tam Envanter ve Mevcut Durum Raporu

## Okuma kılavuzu

Bu raporda dört etiket kullanılıyor. Birbirine karışmamaları için her bulgu bunlardan biriyle işaretlendi:

- **MEVCUT DURUM:** Dosyalarda gerçekten bulunan içerik ya da gerçekten var olan yapı.
- **TESPİT:** İncelemede ortaya çıkan gözlemler. Tutarsızlık, çelişki ya da örüntü olabilir. Değerlendirme bana ait, dayandığı kanıt dosyadadır.
- **EKSİK:** Mevcut belgelerde planlanmış ya da öngörülmüş ama henüz yapılmamış işler.
- **ÖNERİ:** Bu raporun kendi önerileri. Mevcut belgelerde yer alan bir karar değildir ve onay bekler.

Mevcut belgelerden aktarılan kararlar "belgede karar:" ifadesiyle ve dosya yoluyla birlikte veriliyor. Tüm yollar `SESTIA_BILGI_KUTUPHANESI/` köküne göredir.

---

## 0. Yönetici özeti

1. **MEVCUT DURUM:** Kütüphanede **108 dosya** var: **67 `.md`**, **12 `.svg`** ve **29 görsel** (28 `.jpg` + 1 `.png`, hepsi `_INBOX` içinde). Dosyaların tamamı statik. Uygulama kodunun hiçbir yeri bu klasörü okumuyor. `app/`, `lib/`, `components/` ve `proxy.js` içinde `SESTIA_BILGI_KUTUPHANESI` geçen bir referans bulunmuyor.
2. **MEVCUT DURUM:** Gerçek içerik yalnızca **tek bir araştırma turundan**, yani renk konusundan geliyor. Bu turda şema uyumlu **24 bilgi dosyası** üretildi. Ayrıca 29 dış görsel referans için **38 dosyalık** bir analiz ve kümeleme katmanı var. Kalan 5 dosya mimari ya da meta belgedir.
3. **MEVCUT DURUM:** 15 üst klasörün **7'si tamamen boş**: 01, 04, 08, 09, 10, 92, 99. 02, 03, 06 ve 07 klasörlerinde yalnızca birer dosya var ve bu dosyaların hepsi **renkle ilgili**. Ahşap işçiliği, doğal taş, seramik/fayans, kumaş, metal ve DIY teknikleri için **hiçbir bilgi dosyası yok**.
4. **TESPİT:** Mimari (şema, 7 bilgi tipi, 4 `status` değeri, 12 ilişki türü, `id ≠ yol` ilkesi) belgede iyi tanımlanmış. Uygulamada ise kısmen izleniyor. Kullanılan ilişki türü 12 değil 3. İlişkilerin %70'i kaçış türü olan `RELATED_TO`. Tipe özgü alanların hiçbiri kullanılmamış. Kartela katmanı ise ortak şemanın tamamen dışında.
5. **TESPİT:** Renk teorisi ve 12 özgün palet gerçek, kaynaklı ve dürüst etiketlenmiş bir çekirdek oluşturuyor. **LAB/LCH/CIELAB hiç ele alınmamış.** HSL yalnızca kavram olarak var, palet renklerinde HSL değeri verilmiyor. Kişiselleştirilmiş renk önerisi için *yöntem* düzeyinde bir temel var (`creative_proposal`). *Veri* ya da *sistem* düzeyinde bir temel yok.
6. **TESPİT:** SESTIA'nın marka renkleri (`app/globals.css`) kütüphanenin **dışında** duruyor ve fiziksel ayrım korunmuş. Ancak marka tokeni `--terracotta: #A67C5A`, dış referans #019'daki "Caramel" (`#A67C5A`) ile **birebir aynı**. Kütüphanedeki "Terracotta" adlı renkler ise farklı değerler (`#C1592E`, `#C1663B`). Bu bir isim çakışması riski.
7. **TESPİT:** `92_OGRENME_VE_DOGRULAMA` ve `99_ARSIV` klasörlerinin amacı **hiçbir belgede tanımlanmamış**. Yalnızca ağaç diyagramında "BOŞ" olarak geçiyorlar. Öğrenme ve doğrulama konusu yalnızca **açık sorular** listesi halinde bekliyor (bkz. §6).

---

## 1. Tam envanter

### 1.1 Sayısal döküm

| Katman | Dosya | Açıklama |
|---|---|---|
| Mimari / meta belgeler | 5 `.md` | 00 klasöründe 3, 90'da 1, 91'de 1 |
| Şema uyumlu bilgi dosyaları | 24 `.md` | YAML frontmatter'da `id/type/status/...` var |
| Palet önizlemeleri | 12 `.svg` | Her palet `.md` dosyasının eşi |
| Kartela referans katmanı | 38 `.md` | 1 envanter + 29 analiz + 7 küme + 1 README |
| Ham dış görseller | 29 (28 `.jpg` + 1 `.png`) | `05_.../_INBOX/`, dokunulmamış |
| **Toplam** | **108 dosya** | 67 `.md` |

### 1.2 Klasör ağacı (gerçek durum)

```text
SESTIA_BILGI_KUTUPHANESI/
├── 00_MIMARI_VE_PLANLAMA/                 3 .md (mimari rapor, devir raporu, INBOX organizasyon raporu)
├── 01_ESYALAR_VE_BILESENLER/              BOŞ
├── 02_MALZEMELER/
│   └── AHSAP/                             1 .md (ahşap alt tonları — renk odaklı)
├── 03_DIY_ONARIM_VE_URETIM/
│   └── Dosemecilik/                       1 .md (döşemede kumaş rengi seçimi — renk odaklı)
├── 04_DONUSUM_VE_YENIDEN_KULLANIM/        BOŞ
├── 05_RENK_VE_GORSEL_KOMPOZISYON/
│   ├── Renk_Teorisi/                      6 .md
│   ├── Palet_Gelistirme_Yontemleri/       1 .md
│   ├── Paletler/                          12 .md + 12 .svg
│   ├── Uygulamalar/                       1 .md
│   ├── Kartela_Referanslari/
│   │   ├── 00_ENVANTER/                   1 .md
│   │   ├── 01_ANALIZ_DOSYALARI/           29 .md
│   │   ├── 02_KUMELER/                    7 .md
│   │   └── 03_SECILMIS_REFERANSLAR/       yalnızca README.md (kasıtlı boş)
│   └── _INBOX/                            29 görsel (ham, dokunulmamış)
├── 06_ISIK_VE_AYDINLATMA/                 1 .md (ışık ve renk algısı)
├── 07_IC_MEKAN_VE_YERLESIM/               1 .md (küçük alanlarda renk)
├── 08_TASARIM_TARIHI_VE_KULTURU/          BOŞ
├── 09_YASAM_VE_KULLANIM/                  BOŞ
├── 10_SURDURULEBILIRLIK/                  BOŞ
├── 90_ARASTIRMA_VE_KAYNAKLAR/             1 .md (Renk Araştırması 01 kaydı)
├── 91_BILGI_ILISKILERI/                   1 .md (bilgi tipleri ve ilişki şeması)
├── 92_OGRENME_VE_DOGRULAMA/               BOŞ
└── 99_ARSIV/                              BOŞ
```

**MEVCUT DURUM:** Şunlar hiçbir yerde **yok**: `_INDEX/`, `_SEMA/`, `relations.json`, herhangi bir alt klasörde `README`/indeks dosyası (03_SECILMIS hariç), ve mimari raporun C3 bölümünde önerilen alt klasörler (`Ahsap_Turleri/`, `Temel_Teknikler/`, `Yuzey_Bitirme/`, `Tum_Esya_Donusumu/` vb.).

### 1.3 Klasör bazında değerlendirme

| Klasör | Amaç (belgelere göre) | İçerik durumu | Diğer klasörlerle ilişki |
|---|---|---|---|
| `00_MIMARI_VE_PLANLAMA` | Mimari karar ve rapor belgeleri. Klasör adı mimari raporda yok, sonradan eklenmiş. | 3 dolu rapor. Bilgi içeriği değil, meta belge. | Tüm klasörleri tarif ediyor |
| `01_ESYALAR_VE_BILESENLER` | Object/Component tipleri. Mimari rapora göre "çekirdek" (`00_.../SESTIA_BILGI_KUTUPHANESI_RAPOR.md` Del. B) | **BOŞ** | Case 1–3'te her senaryonun başlangıç noktası olarak öngörülmüş. Hiçbir dosya buraya referans vermiyor. |
| `02_MALZEMELER` | Material tipi, "hub" alan (Del. B) | 1 dosya: `AHSAP/ahsap_alt_tonlari_ve_renk_egilimi.md`. Malzemenin **fiziksel/teknik** özellikleri değil, yalnızca **renk alt tonu** ele alınmış. | 05'e bağlı (RELATED_TO) |
| `03_DIY_ONARIM_VE_URETIM` | Method tipi, "nasıl yapılır" | 1 dosya: `Dosemecilik/dosemecilikte_renk_secimi.md`. Döşeme **tekniği** değil, **kumaş rengi seçimi** anlatılıyor. | 05'e bağlı; metinde 04'e atıf var ama 04 boş |
| `04_DONUSUM_VE_YENIDEN_KULLANIM` | Chair Test modları: Change/Separate/Combine/Reimagine (Del. C3) | **BOŞ** | Mimari raporun "en çok vurgulanan alan" dediği yer. Dört test senaryosunun (sandalye, kapı, çekmece, kumaş) tamamı buraya işaret ediyor. |
| `05_RENK_VE_GORSEL_KOMPOZISYON` | Renk ve görsel kompozisyon | **Tek gelişmiş alan**: 20 bilgi dosyası, 12 SVG ve 38 dosyalık kartela katmanı | 02, 03, 06 ve 07'ye çapraz bağlı |
| `06_ISIK_VE_AYDINLATMA` | Işık | 1 dosya: `isik_ve_renk_algisi.md`. Aydınlatma tasarımı değil, **ışığın renk algısına etkisi** konu ediliyor. | 05 ile karşılıklı |
| `07_IC_MEKAN_VE_YERLESIM` | Mekân ve yerleşim | 1 dosya: `kucuk_alanlarda_renk_kullanimi.md`. Yerleşim/planlama değil, **renk stratejisi** anlatılıyor. | 05'e bağlı |
| `08_TASARIM_TARIHI_VE_KULTURU` | Reference tipi (köken/dönem) | **BOŞ** | `palet_09_vintage_yaklasim.md`, `related_domains` alanında bu klasörü gösteriyor. Araştırma kaydı boşluk #4. |
| `09_YASAM_VE_KULLANIM` | İhtiyaçları genel bilgiye bağlayan katman | **BOŞ** | Şemada Function tipindeki `ilgili_ihtiyac` alanı buraya işaret ediyor |
| `10_SURDURULEBILIRLIK` | Belgede karar: bağımsız dizin olacak, ama esas işi **ilişkiler** yapacak (Del. B) | **BOŞ** | Hiçbir dosya buna referans vermiyor |
| `90_ARASTIRMA_VE_KAYNAKLAR` | Araştırma kayıtları. Mimari raporun C8 ağacında yok. | 1 kayıt (`RENK_ARASTIRMASI_01.md`, 27 URL) | 05, 02, 03, 06, 07 dosyalarının kaynak dökümü |
| `91_BILGI_ILISKILERI` | Şema ve (planlanan) merkezi indeks | 1 şema belgesi. İndeks **yok**. | Bütün bilgi dosyalarının frontmatter'ını tanımlıyor |
| `92_OGRENME_VE_DOGRULAMA` | **Hiçbir belgede tanımlanmamış** | **BOŞ** | Yok |
| `99_ARSIV` | **Hiçbir belgede tanımlanmamış** | **BOŞ** | Yok |

**TESPİT:** Klasörün var olması içerik bulunduğu anlamına gelmiyor. 02, 03, 06 ve 07 klasörleri "dolu" görünse de her birinde tek dosya var ve dördü de **renk araştırmasının yan ürünü**. Bu klasörlerin kendi alanlarına ait (malzeme bilimi, teknik yöntem, aydınlatma tasarımı, yerleşim) **hiçbir bilgi** henüz üretilmemiş.

---

## 2. Markdown dosyalarının tek tek incelenmesi

### 2.1 Mimari ve meta belgeler (5 dosya)

| Dosya | Amaç | Nitelik | Olgunluk | Referanslar | Karşılanmamış gereksinimler |
|---|---|---|---|---|---|
| `00_MIMARI_VE_PLANLAMA/SESTIA_BILGI_KUTUPHANESI_RAPOR.md` (22.09) | Kavramsal ve fiziksel mimari (Deliverable A–H) | Mimari talimat ve karar önerisi | Tamamlanmış tasarım belgesi. "Onay aşaması" diye işaretli. | `lib/sestiaLibrary.js`, `lib/anthropic.js`, `SECTION_CONTEXT_LABELS`, `rooms/decisions` tabloları | H bölümündeki 10 adımın büyük kısmı: `_SEMA/`, `_INDEX/relations.json`, alt klasörler, AHSAP pilotu (3–5 dosya), araştırma mimarisi, retrieval |
| `00_MIMARI_VE_PLANLAMA/SESTIA_TAM_DEVIR_RAPORU_01.md` (22.09) | Kütüphanenin tamamı için devir ve özet | Durum raporu | Tamamlanmış, ancak **kısmen eskimiş** (bkz. TESPİT) | Tüm dosyalar | §8'deki 8 eksik, §9'daki 4 öneri |
| `00_MIMARI_VE_PLANLAMA/RENK_REFERANS_INBOX_ORGANIZASYON_RAPORU_01.md` (22.09) | 29 dış görselin organizasyonu | Organizasyon kaydı | Tamamlanmış | `Kartela_Referanslari/*`, `Paletler/*` | §12: seçilmiş referansların kullanıcı onayı, 4 palet boşluğu |
| `90_ARASTIRMA_VE_KAYNAKLAR/RENK_ARASTIRMASI_01.md` | Renk turu araştırma kaydı | Kaynak kaydı ve boşluk listesi | "tamamlandı (ilk tur)" | 27 URL, 24 dosya | 6 bilgi boşluğu (bkz. §6) |
| `91_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md` | Ortak iskelet, 4 `status` değeri, 12 ilişki türü, tipe özgü alanlar, indeks formatı | Teknik şema | "taslak / onay bekliyor" | Mimari rapor C4/C5/D | Merkezi indeks. Onayın kaydı yok. |

**TESPİT — devir raporu kısmen eskimiş:**
- §2'de "00 klasöründe tek dosya var" deniyor. Şu anda 3 dosya var.
- §5'teki ağaçta `Kartela_Referanslari/` ve `_INBOX/` yok.
- §7'de kartela klasörü **öneri** olarak geçiyor, §8 madde 3'te "yok" deniyor. Klasör sonradan INBOX raporuyla oluşturulmuş.
- Rapor içindeki bir atıf yanlış bölümü gösteriyor: "§9'a bakınız" deniyor ama eksik listesi §8'de.

**TESPİT — mimari rapor ile gerçek yapı arasındaki farklar:**
- Mimari raporun C8 ağacında `00_`, `90_`, `91_`, `92_`, `99_` klasörleri yok. Bu klasörleri ve `_INDEX/` ile `_SEMA/` yerine geçtiklerini tanımlayan bir karar belgesi bulunmuyor.
- Rapor `08_TASARIM_TARIHI_VE_KULTUR` adını kullanıyor, gerçek klasör `08_TASARIM_TARIHI_VE_KULTURU`.
- İndeksin yeri üç belgede üç farklı şekilde geçiyor: mimari raporda `_INDEX/relations.json` (kökte), şema belgesinde "91_BILGI_ILISKILERI'deki merkezi indeks", devir raporunda `91_BILGI_ILISKILERI/relations.json`.
- Mimari raporun başlığındaki "Hiçbir dizin/dosya oluşturulmadı" ifadesi yazıldığı anki durumu anlatıyor, bugün geçerli değil.

### 2.2 Şema uyumlu bilgi dosyaları (24 dosya)

Hepsinin tarihi `last_updated: 2026-09-22` ve hepsinde ortak iskelet (`id, type, title, status, primary_domain, related_domains, related, sources, tags`) eksiksiz.

| Dosya | `type` | `status` | Kaynak | İçerik özeti | Olgunluk |
|---|---|---|---|---|---|
| `05/Renk_Teorisi/renk_cemberi_ve_iliskiler.md` | reference | source_supported | 3 | Tamamlayıcı/analog/triadik/monokromatik | Kısa, tamamlanmış giriş metni |
| `05/Renk_Teorisi/hue_saturation_value_lightness.md` | reference | source_supported | 3 | HSL ve HSV farkı | Tamamlanmış |
| `05/Renk_Teorisi/sicak_soguk_notr_renkler.md` | reference | source_supported | 2 | Sıcak/soğuk/nötr, alt ton, "köprü renk" | Tamamlanmış |
| `05/Renk_Teorisi/renk_dengesi_kontrast_oranlar.md` | reference | source_supported | 3 | 60-30-10 kuralı, kontrast | Tamamlanmış |
| `05/Renk_Teorisi/renk_algisi_ve_baglam.md` | reference | source_supported | 3 | Simultane kontrast | Tamamlanmış |
| `05/Renk_Teorisi/dijital_ve_fiziksel_renk_sistemleri.md` | reference | source_supported | 4 | HEX/RGB/HSL ve NCS/RAL/Pantone. **Belgede karar: kesin dönüşüm iddiasında bulunulmayacak.** | Tamamlanmış |
| `05/Palet_Gelistirme_Yontemleri/esyadan_ve_gorselden_palet_turetme.md` | method | creative_proposal | 0 | 4 yöntem: eşyadan, görselden, iki renkten, ışığa uyarlama | Tamamlanmış taslak yöntem |
| `05/Paletler/palet_01…12_*.md` (12 dosya) | project | creative_proposal | 0 | Her dosyada rol, ad, HEX, ilişki, malzeme, mekân, ışık notu ve durum notu | Tamamlanmış, tek tip şablon |
| `05/Uygulamalar/ahsap_ve_renk_uyumu.md` | project | source_supported | 2 | Ahşap alt tonuna göre duvar/kumaş seçimi | Tamamlanmış |
| `02/AHSAP/ahsap_alt_tonlari_ve_renk_egilimi.md` | material | source_supported | 3 | Ceviz/kiraz/maun sıcak, dişbudak/akçaağaç soğuk, beyaz meşe/tik nötr | Tamamlanmış, dar kapsamlı |
| `03/Dosemecilik/dosemecilikte_renk_secimi.md` | method | source_supported | 2 | Kumaş rengi ilkeleri, "iki-ton kuralı" | Tamamlanmış |
| `06/isik_ve_renk_algisi.md` | reference | source_supported | 2 | Kelvin ölçeği, ışığın renge etkisi | Tamamlanmış |
| `07/kucuk_alanlarda_renk_kullanimi.md` | method | source_supported | 2 | Açık ve düşük kontrastlı strateji ile "koyuyla gömme" alternatifi | Tamamlanmış |

**MEVCUT DURUM — dağılım:** `status` alanında 11 `source_supported` ve 13 `creative_proposal` var. `documented` ve `user_experience` hiç kullanılmamış. Tip dağılımı: 13 project, 7 reference, 3 method, 1 material. Object, Component ve Function tiplerinden **hiç dosya yok**.

**TESPİT — şema kullanımıyla ilgili sorunlar:**
1. **Frontmatter ile gövde çelişiyor.** `Uygulamalar/ahsap_ve_renk_uyumu.md` ve `Dosemecilik/dosemecilikte_renk_secimi.md` dosyalarında frontmatter `status: source_supported` diyor, gövdedeki "Doğrulama durumu" bölümü ise `documented` diyor.
2. **İlişki türü sözlüğü neredeyse kullanılmıyor.** 46 ilişki kaydının dağılımı: 32 `RELATED_TO` (%70), 13 `USES_METHOD`, 1 `USES_MATERIAL`. Şema `RELATED_TO` için "az kullanılmalı, kaçış yolu olmamalı" diyor. 12 türün 9'u hiç kullanılmamış.
3. **Anlamca yanlış kullanım var.** Şemada `USES_METHOD` Project'ten Method'a giden bir ilişki. Paletlerde ise 12 kez `reference` tipindeki teori dosyalarını gösteriyor.
4. **Tip eşlemesi zorlanmış.** Paletler `project` olarak işaretlenmiş, ama şemadaki Project alanları (`baslangic_nesnesi`, `hedef_islev`, `zorluk_seviyesi`…) paletler için anlamsız. Renk teorisi dosyaları `reference` tipinde. Şema ise Reference tipini "köken, dönem, bağlam, ilham verdiği alanlar" olarak, yani daha çok tarih ve kültür anlamında tanımlıyor. **7 tipli modelde "palet" ya da "renk" için doğal bir yer yok.**
5. **Tipe özgü alanların hiçbiri kullanılmamış.** 24 dosyanın hiçbirinde `safety`, `guvenlik_notu`, `fiziksel_ozellikler`, `surec_adimlari`, `beceri_seviyesi`, `limitations` gibi alanlar geçmiyor. Bu bilgiler gövdede serbest metin olarak duruyor.
6. **İki paralel bağlantı sistemi var.** Frontmatter `related` alanı id üzerinden bağlıyor. Gövdedeki "Bağlantılar" bölümleri ise **göreli dosya yolu** kullanıyor (`../../06_ISIK.../isik_ve_renk_algisi.md` gibi). İkisi birbiriyle eşleşmiyor. Örneğin `palet_01` gövdede `ahsap_ve_renk_uyumu.md` ve `palet_07` dosyalarına bağlanıyor, frontmatter'da bu bağlar yok. Yol tabanlı bağlar, belgede kararlaştırılan `id ≠ yol` ilkesine aykırı ve dosya taşınırsa kırılır.
7. **İlişkiler tek yönlü.** Teori dosyalarının hiçbiri paletlere geri bağlanmıyor. Paletlere işaret eden tek dosya devir raporu. Ters yönü hesaplayacak bir indeks de yok.
8. **Kırık `id` yok.** Frontmatter'daki 46 `related` hedefinin hepsi gerçekten var olan bir `id`'ye karşılık geliyor (makine ile doğrulandı).
9. Küçük: `palet_06` dosyasında `bitunluklu` etiketinde yazım hatası var.

### 2.3 Kartela referans katmanı (38 dosya)

| Dosya(lar) | Amaç | Frontmatter | Olgunluk |
|---|---|---|---|
| `Kartela_Referanslari/00_ENVANTER/RENK_REFERANS_ENVANTERI_01.md` | 29 görselin ana tablosu | `belge_turu: envanter` | Tamamlanmış |
| `01_ANALIZ_DOSYALARI/kartela_ref_001…029_*.md` | Görsel başına analiz: 3–8 renk (HEX), karakter, etiketler, 6 yorum alanı, risk | **Ayrı şema**: `sira_no, orijinal_dosya, gecici_baslik, referans_turu, etiketler` | Tamamlanmış, tek tip şablon |
| `02_KUMELER/kume_01…07_*.md` | Estetik ve format kümeleri | Yalnızca `kume_no, kume_adi` | Kısa, tamamlanmış |
| `03_SECILMIS_REFERANSLAR/README.md` | Kullanıcının onaylayacağı referanslar için ayrılmış alan | Yok | Kasıtlı boş |

**MEVCUT DURUM — HEX kaynağının dürüst işaretlenmesi:** Analiz dosyaları her HEX değerinin nereden geldiğini ayırıyor: kaynakta yazılı mı, yoksa analizi yapanın tahmini mi. #015 ve #026 dosyalarında gerçek Pantone kodları var. Bu kodların HEX karşılıkları için çok açık "resmi değildir" uyarıları konmuş. #022'deki 7 haneli kodların geçersiz olduğu belirtilmiş ve renkler tamamen tahmin olarak işaretlenmiş.

**TESPİT — katmanla ilgili sorunlar:**
1. **Ortak şemanın dışında.** Analiz dosyalarında `id`, `type`, `status` ve `sources` yok, bu yüzden hiçbiri id ile bağlanamıyor. Devir raporu §7 kartela dosyaları için `type: reference`, `status: source_supported` ve gerçek kaynak önermişti. Bu öneri uygulanmamış.
2. **#013 (sekiz alt paletli moodboard) hiçbir kümede yok.** Küme boyutlarının toplamı 33. Dört referans (#003, #009, #019, #021) iki kümede birden yer alıyor, #013 ise açıklamasız dışarıda kalmış.
3. **Kırık atıf.** `kume_04` dosyası "Bölüm G'de (final rapor)" diye bir yere atıf yapıyor. INBOX raporunun bölümleri 1–12 arası numaralı ve G bölümü yok.
4. **Belirsiz başlık.** `kartela_ref_004`: bölüm başlığı "Yaklaşık baskın renkler" diyor, tablo sütunu "HEX (kaynakta yazılı)" diyor. HEX'in kaynağı belirsiz kalıyor.
5. **Özgün paletlerle bağ yalnızca bir yönde ve düz metin.** Analiz dosyaları paletlere göreli yolla atıf yapıyor, paletler ise kartela referanslarına hiç atıf yapmıyor. Mevcut `MAY_BE_INSPIRED_BY` türü bu bağ için uygun olurdu ama hiç kullanılmamış.

### 2.4 SVG dosyaları

**MEVCUT DURUM:** 12 SVG'nin her birindeki renk bloklarının `fill` değeri, eşi olan `.md` dosyasındaki HEX tablosuyla **birebir aynı** (makine ile karşılaştırıldı). Farklı çıkan değerler yalnızca etiket ve çerçeve için kullanılan gri tonlar (`#2A2A2A`, `#555555`, `#8A8A8A`, `#EEEEEE`). SVG'ler bağımsız ve düz metin dosyaları, herhangi bir araca bağımlı değiller.

---

## 3. Kütüphane mimarisi: istenen alanların mevcut karşılıkları

| İstenen alan | Mevcut karşılığı | Durum |
|---|---|---|
| Mimari ve planlama | `00_MIMARI_VE_PLANLAMA/` (3 rapor) + `91/` şema | **Gelişmiş** (belge düzeyinde) |
| Eşyalar ve bileşenler | `01_ESYALAR_VE_BILESENLER/` | Yalnızca klasör |
| Malzemeler | `02_MALZEMELER/AHSAP/` (1 dosya, renk odaklı) | Neredeyse boş |
| DIY, onarım ve üretim | `03_DIY_ONARIM_VE_URETIM/Dosemecilik/` (1 dosya, renk odaklı) | Neredeyse boş |
| Dönüşüm ve yeniden kullanım | `04_DONUSUM_VE_YENIDEN_KULLANIM/` | Yalnızca klasör (alt yapı mimari raporda tasarlanmış) |
| Renk ve görsel kompozisyon | `05_...` | **Tek içerik bakımından gelişmiş alan** |
| Işık ve aydınlatma | `06_...` (1 dosya, renk algısı odaklı) | Neredeyse boş |
| İç mekân ve yerleşim | `07_...` (1 dosya, renk odaklı) | Neredeyse boş |
| Tasarım tarihi ve kültürü | `08_...` | Yalnızca klasör |
| Yaşam ve kullanım | `09_...` | Yalnızca klasör |
| Sürdürülebilirlik | `10_...` | Yalnızca klasör, hiçbir dosya referans vermiyor |
| Araştırma ve kaynaklar | `90_...` (1 kayıt) | Başlangıç düzeyi |
| Bilgi ilişkileri | `91_...` (şema var, indeks yok) | Şema düzeyi |
| Öğrenme ve doğrulama | `92_...` | Yalnızca klasör. **Amacı yazılı değil.** |
| Arşiv | `99_...` | Yalnızca klasör. **Amacı yazılı değil.** |

**Belgede karar (mimari rapor Del. B):** Güvenlik, bütçe, ergonomi ve bakım bağımsız klasör olmayacak, **alanlar arası (cross-cutting) alanlar** olacak. Güvenlik için ayrıca küçük bir referans havuzu öngörülmüş. Araçlar ve Ekipman 03'ün altında başlayacak. **MEVCUT DURUM:** Güvenlik havuzu yok ve hiçbir dosyada `safety` alanı yok.

### 3.1 Malzeme uzmanlıkları nerede?

| Uzmanlık | Mevcut yer | İçeriğin gerçek durumu |
|---|---|---|
| **Ahşap işçiliği** (kesme, birleştirme, zımpara, yüzey bitirme, ahşap türleri) | Mimari raporda öngörülen yerler: `02_MALZEMELER/AHSAP/{Ahsap_Turleri, Ozellikler, Isleme_Teknikleri, Bakim_Ve_Koruma}/` ve `03_DIY.../{Temel_Teknikler, Yuzey_Bitirme, Onarim_Ve_Restorasyon}/`. Bu alt klasörlerin **hiçbiri oluşturulmamış.** | Yalnızca `ahsap_alt_tonlari_ve_renk_egilimi.md` var. Ahşabı **renk uyumu** açısından sınıflandırıyor, işçilik bilgisi **sıfır**. Mimari rapordaki "AHSAP pilotu (3–5 dosya, şema doğrulaması için)" **yapılmadı**. |
| **Doğal taş** (mermer, traverten, granit…) | Klasör de alt klasör de yok. Mimari rapor bu konudan hiç bahsetmiyor. | Yalnızca kartela analizlerinde yorum olarak geçiyor (#010 mermer dokusu; #013, #019, #021'de "doğal taşla uyumlu"). Araştırma kaydı boşluk #3 "taş" diyor. |
| **Seramik / fayans** | Klasör yok, mimari raporda geçmiyor. | 8 dosyada **uyum notu** olarak geçiyor (ör. `palet_01`'deki "pişmiş toprak seramik"). Bilgi dosyası yok. Araştırma boşluğu #3'te yer alıyor. |
| **Kumaş / tekstil** | Mimari rapor Case 4'te `02_MALZEMELER/KUMAS_VE_TEKSTIL/` yolunu öngörmüş. **Oluşturulmamış.** | Yalnızca `dosemecilikte_renk_secimi.md` (kumaş **rengi**). Devir raporu §8 madde 5: "karşı taraf henüz yazılmadı." |
| **Metal** | Klasör yok | Yalnızca palet notlarında (pirinç, krom, siyah metal) uyum amaçlı geçiyor |

**TESPİT:** Malzeme alanında **alt taksonomiyi tanımlayan bir belge yok**. Hangi malzemenin hangi alt klasörde duracağı ve malzeme ile teknik ayrımının (02 mi, 03 mü) nasıl yapılacağı yalnızca ahşap için ve yalnızca örnek düzeyinde tarif edilmiş.

---

## 4. Renk kütüphanesinin mevcut durumu

| Soru | Yanıt | Dayanak |
|---|---|---|
| Renk teorisi var mı? | **Evet.** 6 kaynaklı dosya. Kısa ve giriş düzeyinde. | `05/Renk_Teorisi/*` |
| Renk aileleri ve paletler için yapı kurulmuş mu? | **Kısmen.** 12 özgün palet tek tip bir şablonla yazılmış. Kartela tarafında 7 küme var. Ancak **ailelerin ya da renk adlarının** tanımlandığı bir sözlük yok. Aileler palet dosyalarının adlarında ve etiketlerinde örtük olarak duruyor. | `Paletler/`, `02_KUMELER/` |
| Renk kartelası var mı? | **Tek, birleşik bir kartela yok.** Şunlar var: (a) 12 özgün paletteki toplam 62 renk (her biri ad + HEX + rol), (b) dış referanslardan gelen, kaynağı işaretlenmiş 214 renk kaydı (#013'ün 40 rengi dahil), (c) 17 gerçek Pantone kodu (#015'te 5, #026'da 12). Bu üç havuzu tek bir aranabilir kartelada toplayan bir yapı ya da dosya **yok**. | Palet ve analiz dosyaları |
| HEX, RGB, HSL, LAB | **HEX:** her yerde. **RGB ve HSL:** yalnızca kavram olarak anlatılıyor, hiçbir palet renginde RGB/HSL değeri verilmiyor. **LAB, LCH, CIELAB, ΔE, CMYK:** kütüphanede **hiç geçmiyor** (tam metin taraması yapıldı). **NCS, RAL, Pantone:** tanımları var. **Belgede karar: HEX'ten bu sistemlere kesin dönüşüm yapılmayacak.** | `dijital_ve_fiziksel_renk_sistemleri.md`, `hue_saturation_value_lightness.md` |
| Renklerin malzeme, ışık, mekân ve stille ilişkisi | **Malzeme:** yalnızca ahşap alt tonu sistematik olarak işlenmiş; diğer malzemeler serbest metinde uyum notu olarak geçiyor. **Işık:** Kelvin temelli genel eğilim, her palette bir ışık notu. **Mekân:** paletlerde "uygun mekân" bölümü, 07'de küçük alan dosyası. **Stil:** yalnızca "vintage" (palet 09) ve "çağdaş minimal" (palet 10). Stil taksonomisi yok. | Paletler, 02/06/07 dosyaları |
| Kişiselleştirilmiş öneri için temel | **Yöntem temeli var, veri ve sistem temeli yok.** `esyadan_ve_gorselden_palet_turetme.md` Sestia'nın yeni palet üretirken izleyeceği 4 adımlı yöntemi tanımlıyor (`creative_proposal`). Kullanıcı tercihi, oda bağlamı ya da kullanıcının malzemesi gibi girdilerle bir renk kaydını eşleştirecek yapılandırılmış alanlar yok. Özel kullanıcı hafızasıyla bağ ise yalnızca mimari rapor Del. F'de kavramsal düzeyde tarif ediliyor. | Palet geliştirme yöntemi, mimari rapor F |
| Yalnızca plan aşamasında olanlar | (1) `03_SECILMIS_REFERANSLAR/` için kullanıcı seçimi. (2) 4 yeni palet boşluğu: dramatik gece + tek vurgu, mor/magenta, kıyı/deniz, yüksek doygunluk/oyuncu (INBOX raporu §12). (3) "Renk Araştırması 02" (yalnızca önerilmiş). (4) Az ışıklı mekânda doygunluk ne kadar artırılmalı sorusu (kaynaksız). (5) Pantone/RAL/NCS↔HEX dönüşüm rehberi. (6) Kültürel/tarihsel renk konusu. | INBOX raporu §12, araştırma kaydı |

### 4.1 Marka renkleri ile genel renk kütüphanesinin ayrımı

**MEVCUT DURUM:** SESTIA'nın marka renk sistemi kütüphanenin dışında, `app/globals.css` dosyasında CSS değişkenleri olarak duruyor (`--terracotta: #A67C5A`, `--eucalyptus: #5C6B57`, `--slate: #4F717A`, `--stone: #7D7874`, `--recycle: #5E7699`, `--bg: #F3ECE2`… ve karanlık tema karşılıkları). Marka yönü `docs/SESTIA_MARKA_VE_TASARIM_YONU.md` dosyasında anlatılıyor. Kütüphane belgelerinin hiçbiri marka renklerine atıf yapmıyor. Fiziksel ayrım **korunmuş**.

**TESPİT — karışma riski:**
- Marka tokeni `--terracotta` değeri `#A67C5A`. Bu değer dış referans #019'daki **"Caramel"** rengiyle birebir aynı. `public/icon.svg` zemini de aynı renk.
- Kütüphanede "Terracotta" adıyla geçen renkler başka değerler: `#C1592E` (palet 10) ve `#C1663B` (palet 12).
- Kısacası aynı ad farklı HEX'lere, aynı HEX farklı adlara karşılık geliyor. Kütüphanede bu ayrımı yazılı olarak koruyan bir kural yok.

---

## 5. Kütüphaneler arası bilgi ilişkileri

### 5.1 Belgelerde planlanan mekanizma

**Belgede karar** (mimari rapor C5, D ve şema §1–§5):
- Her bilgi tek bir yerde durur (`primary_domain`). Diğer alanlar ona `related_domains` ile işaret eder ve `related` alanında id tabanlı tipli ilişkiler kurar. Bilgi kopyalanmaz.
- Bağlantı türü 12 kelimelik sabit bir sözlükten seçilir.
- Merkezi bir JSON indeksi `id → yol` eşlemesini ve ilişki listesini tutar. Graf veritabanı ya da vektör veritabanı **gerekmez** (belgede açıkça kararlaştırılmış).
- Discovery'den sohbete geçişte (Del. F) taşınacaklar: seçilen madde, ona doğrudan bağlı 2–3 kayıt, kanıt durumu ve kullanıcının özel bağlamı. Özel bağlam yalnızca okunur, genel bilgiye yazılmaz.

### 5.2 Örnek: ahşap bir dolabın dönüştürülmesi

Mevcut tasarım bu isteği aşağıdaki gibi karşılamayı öngörüyor. Sağ sütun bugün gerçekte ne bulunduğunu gösteriyor:

| Adım | Öngörülen bilgi kaynağı (belge) | Bugün gerçekte var mı? |
|---|---|---|
| Dolabın ne olduğu, parçaları | Object `dolap` + Component (kapak, gövde, kulp) → `01_` (`HAS_COMPONENT`) | **Yok.** 01 boş. |
| Ahşap türü ve özellikleri | Material → `02_MALZEMELER/AHSAP/Ahsap_Turleri/` (`IS_MADE_OF`) | **Kısmen.** Yalnızca alt ton sınıflandırması var. Fiziksel ve işleme özellikleri yok. |
| Yüzey işlemi (zımpara, boya, vernik, lake) | Method → `03_.../Yuzey_Bitirme/`, `Temel_Teknikler/` (`SUPPORTS_METHOD`, `USES_METHOD`) | **Yok.** Alt klasör bile oluşturulmamış. |
| Renk seçimi | `05` paletleri + `ahsap_ve_renk_uyumu.md` + palet geliştirme yöntemi | **Var.** Kütüphanenin şu anda karşılayabildiği tek halka. |
| Işığa göre renk | `06/isik_ve_renk_algisi.md` | **Var** (genel düzeyde) |
| Mekâna yerleşim | `07_` (Depolama, Oda türleri…) | **Kısmen.** Yalnızca küçük alan renk stratejisi var. |
| Dönüşüm fikri (Change/Separate/Combine/Reimagine) | Project → `04_` (`MAY_SUPPORT_FUNCTION`, `MAY_BE_INSPIRED_BY`) | **Yok.** 04 boş. |
| Güvenlik (boya kimyasalı, duvar montajı) | Cross-cutting `safety` alanı ve güvenlik havuzu | **Yok** |
| Güven durumu | `status` (documented ve creative_proposal ayrımı) | Alan var. `documented` değeri hiç kullanılmamış. |

**TESPİT:** Tasarım bu isteği **kavramsal olarak karşılıyor**. Mimari rapordaki Case 1–4 bu tür birleştirmeyi adım adım tarif ediyor. Bugün ise zincirin yalnızca **renk halkası** dolu. İlişkilerin %70'i `RELATED_TO` olduğu için şu anki bağlar "ne tür bir ilişki" sorusunu cevaplayamıyor. Merkezi indeks olmadığı için de ters yönde gezinme (bu malzemeye hangi projeler bağlı?) yapılamıyor.

---

## 6. Öğrenme ve araştırma mimarisi

**MEVCUT DURUM:** `92_OGRENME_VE_DOGRULAMA/` boş. Amacını tanımlayan bir belge yok. `90_ARASTIRMA_VE_KAYNAKLAR/` klasöründe tek araştırma kaydı var. Öğrenme konusundaki metinlerin tamamı iki yerde: mimari rapor Del. G ("yanıtlanmadı, sadece açık sorular") ve şema belgesindeki `status` tanımları.

| Konu | Mevcut belgelerde ne var? | Nitelik |
|---|---|---|
| Kaynaklı bilgi birikimi | **Uygulanmış örnek var.** Frontmatter'da `sources` alanı, erişim tarihli URL'ler ve araştırma kaydı bulunuyor. Renk turunda 27 kaynak kullanılmış. | Uygulamada var (tek tur) |
| Araştırarak öğrenme | Renk turu WebSearch ile yapılmış (araştırma kaydı). Bu, bir insan ya da ajan tarafından elle yürütülen bir iş akışı. Sestia'nın kendi başına araştırma yapmasını sağlayan bir mekanizma **tanımlanmamış**. Mimari rapor H-7 bunu "gelecek implementasyon" olarak ayırmış. | Yalnızca açık soru |
| Kaynak doğrulama | Kaynak kalitesi hiyerarşisi yalnızca soru olarak var (Del. G). Mimari rapor Del. A'da tek bir ilke yazılı: görsel ilham en zayıf kanıttır. Kartela katmanında pratik bir ayrım uygulanmış: resmi kod, üçüncü taraf HEX ve tahmin HEX ayrı işaretleniyor. | İlke ve pratik var, yöntem yok |
| Bilgi güncelliği | `last_updated` alanı var. Hangi bilginin ne sıklıkla yeniden doğrulanacağı yalnızca soru olarak duruyor (Del. G "freshness"). Şema §6'da bir kural var: eski girdiler eski şemayla geçerli kalır. | Alan var, politika yok |
| Kullanıcı geri bildiriminden öğrenme | `status: user_experience` değeri tanımlı ama **hiç kullanılmamış**. Onay/inceleme süreci, anekdotun genel kural sayılmasının engellenmesi ve anonimleştirme yalnızca soru olarak var. | Yalnızca soru |
| Genel bilgi ile özel kullanıcı bilgisinin ayrılması | **Belgede karar:** üç ayrı katman var (karakter kütüphanesi, bilgi kütüphanesi, özel hafıza). Özel hafıza genel bilgiye **otomatik akmaz**, yalnızca sohbete okunur (mimari rapor A ve F, devir raporu §1). Uygulamadaki `rooms/decisions` tablolarında kimlik bazlı izolasyon zaten var (mimari rapordaki kod incelemesi notu). | Karar var, köprü tasarlanmamış |
| Sestia'nın kütüphaneyi nasıl kullanacağı | Del. F'de kavramsal bağlam paketi tarif edilmiş. `SECTION_CONTEXT_LABELS` genişletilerek kullanılacak. Retrieval mekanizması **tasarlanmamış** (H-8). Kod bağlantısı **yok**. | Kavram düzeyinde |

**MEVCUT DURUM — araştırma kaydındaki 6 bilgi boşluğu:** (1) az ışıkta doygunluk ne kadar artırılmalı, (2) NCS/RAL/Pantone↔HEX dönüşümü, (3) metal, seramik, taş ve kumaşta renk-malzeme etkileşimi, (4) kültürel ve tarihsel renk kullanımı, (5) görsel referansların değerlendirme yöntemi, (6) merkezi indeks.

**TESPİT:** Boşluk #5 ("Pinterest türü görsel kaynaklar nasıl değerlendirilecek") yazıldıktan sonra fiilen yaşandı: INBOX turunda 29 görsel referans işlendi. Ancak bu değerlendirmenin yöntemi (güven seviyeleri, hangi durumda `source_supported` sayılacağı) araştırma kaydına ya da 92 klasörüne **geri yazılmadı**. Yöntem yalnızca INBOX raporunun içinde örtük olarak duruyor.

---

## 7. Genel durum değerlendirmesi

### 7.1 Şu anda gerçekten elimizde ne var?

- İyi düşünülmüş, yazılı bir **mimari**: vizyon, 10 alan, 7 bilgi tipi, `status` boyutu, ilişki sözlüğü, `id ≠ yol` ilkesi, özel hafıza ayrımı.
- **Kaynaklı ve dürüst etiketlenmiş bir renk çekirdeği**: 6 teori dosyası, 1 yöntem, 12 özgün palet (SVG ile), renk konusundaki 4 çapraz alan dosyası.
- **29 dış görsel referansın** tam envanteri, analizi ve kümelenmesi. HEX kaynağı dikkatle işaretlenmiş, ham dosyalar korunmuş.
- Bir **araştırma kaydı** (27 URL) ve açıkça yazılmış bilgi boşlukları.
- **Olmayanlar:** çalışan bir sistem, kod entegrasyonu, indeks, arama, öğrenme mekanizması.

### 7.2 İçerik bakımından gelişmiş alanlar

Yalnızca `05_RENK_VE_GORSEL_KOMPOZISYON`. Bu klasörün içinde de özgün paletler ve kartela analizleri, teori dosyalarından daha ayrıntılı. Teori dosyaları 2–4 KB uzunluğunda giriş metinleri.

### 7.3 Yalnızca iskeletten ibaret alanlar

- **Tamamen boş:** 01, 04, 08, 09, 10, 92, 99.
- **Adı var ama kendi alan bilgisi yok, tek renk dosyası var:** 02, 03, 06, 07.
- **Şema var, uygulaması yok:** 91 (indeks yok).

### 7.4 Kararlaştırılmış ama uygulanmamış işler

| # | Karar veya öneri | Kaynak belge |
|---|---|---|
| 1 | Merkezi indeks (`relations.json`) | Mimari rapor C5, şema §5, devir raporu §8/§9 |
| 2 | `_SEMA/frontmatter_semasi.md` | Mimari rapor C8, H-4 |
| 3 | 02/03/04/07 alt klasör yapısı | Mimari rapor C3/C8 |
| 4 | AHSAP pilotu (3–5 gerçek dosya) | Mimari rapor H |
| 5 | `02_MALZEMELER/KUMAS_VE_TEKSTIL/` | Mimari rapor Case 4, devir raporu §8-5 |
| 6 | Güvenlik referans havuzu ve `safety` alanlarının kullanımı | Mimari rapor B, şema §3 |
| 7 | Kartela dosyalarının `type: reference` + `status` + `sources` ile işaretlenmesi | Devir raporu §7 |
| 8 | Mimari belgelerin farklı frontmatter kullandığının yazılı hale getirilmesi | Devir raporu §8-8 |
| 9 | Seçilmiş referanslar (kullanıcı onayı bekliyor) | INBOX raporu §12, `03_SECILMIS_REFERANSLAR/README.md` |
| 10 | Şemanın onayı: "taslak / onay bekliyor" durumu hiçbir yerde kapatılmamış | `91_.../bilgi_tipleri_ve_iliski_semasi.md` |
| 11 | Mimari raporun "şimdi karar verilmesi gerekenler" listesi (H-1..3): onaylandığına dair kayıt yok | Mimari rapor H |

### 7.5 Tekrar eden ya da çelişen tanımlar

1. İndeksin yeri: `_INDEX/` (kökte) ile `91_BILGI_ILISKILERI/` arasında çelişki var (§2.1).
2. Klasör kümesi: mimari rapordaki C8 ağacı ile gerçek ağaç uyuşmuyor (00/90/91/92/99 ve `KULTUR`/`KULTURU` farkı).
3. Devir raporu ile INBOX raporu aynı gün yazılmış ama devir raporu kartela katmanını "yok" gösteriyor (§2.1).
4. İki dosyada frontmatter `status` değeri gövdedeki doğrulama durumuyla çelişiyor (§2.2-1).
5. `USES_METHOD`'ın şemadaki tanımı ile fiili kullanımı farklı (§2.2-3).
6. `reference` tipi iki farklı anlamda kullanılıyor: renk bilgisi ve tarih/kültür referansı. Dış kartela referansları ise ayrı bir "referans" kavramı olarak düşünülmüş (§2.2-4).
7. Bağlantılar hem id ile hem dosya yolu ile kuruluyor (§2.2-6).
8. "Terracotta" adı ve `#A67C5A` değeri marka sistemi ile kütüphane arasında farklı anlamlara geliyor (§4.1).
9. Bir adlandırma riski: `lib/sestiaLibrary.js` **karakter** kütüphanesi. Adı "Sestia Bilgi Kütüphanesi" ile karıştırılabilir. Belgeler bu ayrımı açıkça yapıyor (mimari rapor A, devir raporu §1), dosya adı yapmıyor.

### 7.6 Renk kartelası fikri mevcut yapının neresine oturuyor?

**MEVCUT DURUM:** "Kartela" kelimesi kütüphanede iki farklı anlamda kullanılıyor:
- (a) Dış kaynaklı görsel referanslar: `Kartela_Referanslari/`.
- (b) Fiziksel boya kartelası: #015 ve #026'daki gerçek Pantone kodları.

Sestia'nın **kendi**, aranabilir **renk kataloğu** anlamında bir kartela yok. En yakın karşılığı 12 palet dosyasına dağılmış 62 adlandırılmış renk.

**TESPİT — yapıdaki olası yerler** (karar değil, eşleme):
- Fiziksel olarak doğal yeri `05_RENK_VE_GORSEL_KOMPOZISYON/`. Burada `Paletler/` ile `Kartela_Referanslari/` arasında renk düzeyinde (palet düzeyinde değil) bir katman eksik.
- Kavramsal olarak 7 tipli modelde "tek bir renk" kaydı için uygun bir tip yok (§2.2-4). Kartela bu nedenle ya mevcut bir tipe zorlanacak ya da şemanın genişleme kuralı (şema §6: "önce bu dosyaya eklenir, gerekçesiyle") işletilecek.
- Aynı renk kaydının kaynağa göre ayrılması gerekiyor: özgün (`creative_proposal`), dış kaynakta yazılı ama doğrulanmamış, resmi kod (Pantone). Bu ayrım `status` ve `sources` ile ifade edilebilir. Devir raporu §7 bu yönde bir öneri içeriyor.
- Marka renkleri bu kartelanın **dışında** kalmalı ya da açıkça ayrı etiketlenmeli (§4.1).

### 7.7 Yeni içerik üretmeden önce netleşmesi gereken konular

Aşağıdakiler **karar soruları**. Cevaplar kullanıcıya ait. Bu rapor bir karar önermiyor, soruları sıralıyor.

1. **Şema onayı:** `bilgi_tipleri_ve_iliski_semasi.md` onaylandı mı? Onaylandıysa §7.4'teki "taslak" durumu nasıl kapatılacak?
2. **İndeksin yeri ve üretim şekli:** Kökte `_INDEX/` mı, `91_` içinde mi? Elle mi, betikle mi üretilecek?
3. **"Renk" ve "palet" için tip:** Mevcut 7 tipten birine mi eşlenecek (şu an `project`), yoksa şema genişletilecek mi?
4. **Kartela katmanının statüsü:** Analiz dosyaları ortak şemaya (`id/type/status/sources`) taşınacak mı, yoksa ayrı bir "ham referans" katmanı olarak mı kalacak? #013'ün kümesi ne olacak?
5. **Kartela kavramının tanımı:** Kastedilen (a) Sestia'nın kendi renk kataloğu mu, (b) fiziksel üretici kartelaları mı (Pantone/RAL/NCS/yerel boya markaları), yoksa ikisi birden mi? (b) ise resmi HEX/LAB verisinin kaynağı ve lisans durumu ne olacak?
6. **Renk gösterimleri:** LAB/LCH ve ΔE bu kütüphanede ele alınacak mı? `dijital_ve_fiziksel_renk_sistemleri.md` dosyasındaki "dönüşüm iddiası yok" kararı nasıl korunacak?
7. **Marka ile genel renk ayrımı:** Kütüphaneye yazılı bir kural eklenecek mi? "Terracotta" ve `#A67C5A` çakışması nasıl ele alınacak?
8. **92 ve 99 klasörlerinin amacı:** Öğrenme ve doğrulama klasöründe ne duracak (politika belgeleri, doğrulama kayıtları, kullanıcı deneyimi adayları)? Arşive ne zaman ne taşınacak?
9. **Malzeme taksonomisi:** Ahşap, taş, seramik/fayans, kumaş ve metal alt klasörleri nasıl kurulacak? Malzeme ile teknik ayrımı (02 mi, 03 mü) nerede çizilecek? Mimari rapordaki AHSAP pilotu hâlâ ilk adım mı?
10. **İlişki kullanım disiplini:** `RELATED_TO` oranının yüksekliği kabul edilebilir mi? Mevcut 24 dosya geriye dönük düzeltilecek mi? (Şema §6 buna zorlamıyor.)
11. **İçerik sırası:** Bir sonraki araştırma turu ne olacak? Devir raporu §9 iki aday gösteriyor: 01 (Eşyalar) ya da Kumaş/Tekstil. INBOX raporu §12 ise yeni palet üretimini öneriyor. Bunlar birbiriyle yarışan önceliklerdir.

---

## Ek A — Bu raporun önerileri (ÖNERİ, onay bekler)

Aşağıdakiler mevcut belgelerde yer alan kararlar **değildir**. Yalnızca sonraki değerlendirme toplantısına girdi olarak listeleniyor:

1. Yeni içerik üretmeden önce §7.7'deki 1–4 numaralı soruların cevaplanması. Bunlar şema ve indeks konuları ve sonraki her dosyanın biçimini belirleyecek.
2. Küçük tutarlılık düzeltmelerinin (§7.5-1, 3, 4, 5; kartela #004 başlığı; `kume_04` atfı; #013 kümesi; `bitunluklu`) **ayrı ve onaylı bir düzeltme görevinde** toplanması. Bu rapor kapsamında hiçbiri düzeltilmedi.
3. "Kartela" kavramı netleşene kadar kartela katmanının mevcut haliyle **dondurulması**.

---

*Bu rapor salt-okuma incelemesinin sonucudur. `SESTIA_BILGI_KUTUPHANESI/` içindeki hiçbir dosya değiştirilmedi, taşınmadı veya silinmedi. Uygulama koduna dokunulmadı. Oluşturulan tek dosya proje kökündeki bu rapordur.*
