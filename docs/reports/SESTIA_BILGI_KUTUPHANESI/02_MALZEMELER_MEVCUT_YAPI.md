# SESTIA — 02_MALZEMELER Mevcut Yapı

**Snapshot tarihi:** 2026-09-25
**Klasör:** `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/02_MALZEMELER/`

## 1. Belgenin amacı

Bu belge, `02_MALZEMELER` klasörünün belirtilen tarihteki gerçek filesystem durumunun bir snapshot'ıdır.

- Tek kaynağı filesystem'in kendisidir. Eski raporlar kaynak olarak kullanılmamıştır.
- Klasör ve dosya adları filesystem'deki hâliyle, numaralarıyla birlikte aynen yazılmıştır.
- Snapshot tarihinden sonra yapılan değişiklikleri yansıtmaz.

## 2. Güncel klasör ağacı

Ağaçta `.gitkeep` dosyaları gösterilmemiştir. Snapshot tarihinde 74 alt kategori klasörünün her birinde ve `_INBOX` içinde birer `.gitkeep` bulunur.

```
02_MALZEMELER/
├── _INBOX/
├── 01_AHSAP/
│   ├── ahsap_alt_tonlari_ve_renk_egilimi.md
│   ├── 01_MASIF_AHSAP/
│   ├── 02_KONTRPLAK_PLYWOOD/
│   ├── 03_MDF/
│   ├── 04_SUNTA/
│   ├── 05_OSB/
│   ├── 06_LAMINE_AHSAP/
│   └── 07_AHSAP_KAPLAMALAR/
├── 02_TAS_VE_TAS_ESASLI_MALZEMELER/
│   ├── 01_MERMER/
│   ├── 02_TRAVERTEN/
│   ├── 03_GRANIT/
│   ├── 04_KUVARSIT/
│   ├── 05_KIREC_TASI/
│   ├── 06_KAYRAK_TASI/
│   ├── 07_ONIKS/
│   ├── 08_KUVARS_KOMPOZIT/
│   ├── 09_SINTERLENMIS_TAS/
│   └── 10_TERRAZZO/
├── 03_SERAMIK_VE_FAYANS/
│   ├── 01_SERAMIK_KARO_VE_FAYANS/
│   ├── 02_PORSELEN_VE_GRES/
│   ├── 03_TERRAKOTTA_VE_PISMIS_TOPRAK/
│   ├── 04_CINI_VE_EL_YAPIMI_SERAMIK/
│   └── 05_DEKORATIF_VE_FONKSIYONEL_SERAMIK/
├── 04_METAL/
│   ├── 01_DEMIR_VE_CELIK/
│   ├── 02_PASLANMAZ_CELIK/
│   ├── 03_ALUMINYUM/
│   ├── 04_BAKIR/
│   ├── 05_PIRINC_VE_BRONZ/
│   └── 06_DIGER_METALLER_VE_ALASIMLAR/
├── 05_CAM_VE_AYNA/
│   ├── 01_DUZ_VE_STANDART_CAM/
│   ├── 02_TEMPERLI_VE_LAMINE_CAM/
│   ├── 03_BUZLU_VE_DOKULU_CAM/
│   ├── 04_RENKLI_VE_DEKORATIF_CAM/
│   ├── 05_AYNA_VE_AYNA_YUZEYLERI/
│   └── 06_CAM_TUGLA_VE_BLOKLAR/
├── 06_KUMAS_VE_TEKSTIL/
│   ├── 01_DOGAL_LIFLI_KUMASLAR/
│   ├── 02_SENTETIK_VE_KARISIM_KUMASLAR/
│   ├── 03_DOSEMELIK_KUMASLAR/
│   ├── 04_PERDE_VE_DEKORATIF_TEKSTILLER/
│   ├── 05_HALILAR_VE_KILIMLER/
│   ├── 06_ORGULU_VE_DOKULU_KUMASLAR/
│   └── 07_TEKNIK_VE_OZEL_AMACLI_TEKSTILLER/
├── 07_DERI_VE_DERI_ALTERNATIFLERI/
│   ├── 01_DOGAL_DERI/
│   ├── 02_SUET_VE_NUBUK/
│   ├── 03_ISLENMIS_VE_DEKORATIF_DERI/
│   ├── 04_SENTETIK_DERI/
│   └── 05_BITKISEL_VE_YENI_NESIL_ALTERNATIFLER/
├── 08_DOGAL_LIF_VE_ORGU_MALZEMELERI/
│   ├── 01_RATTAN_VE_KAMIS/
│   ├── 02_BAMBU/
│   ├── 03_MANTAR/
│   ├── 04_JUT_SISAL_VE_KENEVIR/
│   └── 05_DENIZ_OTU_SAZ_VE_RAFYA/
├── 09_PLASTIK_VE_KAUCUK/
│   ├── 01_AKRILIK_PLEKSI/
│   ├── 02_POLIKARBONAT/
│   ├── 03_PVC_VE_VINIL/
│   ├── 04_POLIETILEN_VE_POLIPROPILEN/
│   ├── 05_ABS_VE_DIGER_SERT_PLASTIKLER/
│   └── 06_KAUCUK_VE_SILIKON/
├── 10_BETON_ALCI_VE_SIVA/
│   ├── 01_BETON_VE_CIMENTO_ESASLI_MALZEMELER/
│   ├── 02_ALCI_VE_ALCI_URUNLERI/
│   ├── 03_KIREC_VE_MINERAL_SIVALAR/
│   ├── 04_KIL_VE_TOPRAK_ESASLI_SIVALAR/
│   └── 05_MIKROCIMENTO_VE_DEKORATIF_YUZEYLER/
├── 11_BOYA_VERNIK_VE_KAPLAMALAR/
│   ├── 01_DUVAR_VE_TAVAN_BOYALARI/
│   ├── 02_MOBILYA_VE_AHSAP_BOYALARI/
│   ├── 03_VERNIK_VE_LAKE/
│   ├── 04_YAG_MUM_VE_CILALAR/
│   ├── 05_ASTAR_VE_KORUYUCU_KAPLAMALAR/
│   └── 06_RENKLENDIRICILER_VE_AHSAP_LEKELERI/
└── 12_YARDIMCI_MALZEMELER/
    ├── 01_TUTKAL_VE_YAPISTIRICILAR/
    ├── 02_EPOKSI_VE_RECINELER/
    ├── 03_SILIKON_MASTIK_VE_SIZDIRMAZLIK/
    ├── 04_DOLGU_VE_MACUNLAR/
    ├── 05_DERZ_VE_TAMIR_HARCLARI/
    └── 06_BANTLAR_VE_YAPISKAN_FOLYOLAR/
```

Alt kategori klasörlerinin altında başka klasör yoktur. Hiyerarşi iki seviyedir: ana aile → alt kategori.

## 3. Ana malzeme aileleri özeti

| Kod | Ana aile | Alt kategori sayısı | Mevcut bilgi dosyası | Not |
|---|---|---|---|---|
| 01 | `01_AHSAP` | 7 | 1 | Dosya aile seviyesinde; alt kategorilerde `.md` yok |
| 02 | `02_TAS_VE_TAS_ESASLI_MALZEMELER` | 10 | 0 | Yalnızca yapı |
| 03 | `03_SERAMIK_VE_FAYANS` | 5 | 0 | Yalnızca yapı |
| 04 | `04_METAL` | 6 | 0 | Yalnızca yapı |
| 05 | `05_CAM_VE_AYNA` | 6 | 0 | Yalnızca yapı |
| 06 | `06_KUMAS_VE_TEKSTIL` | 7 | 0 | Yalnızca yapı |
| 07 | `07_DERI_VE_DERI_ALTERNATIFLERI` | 5 | 0 | Yalnızca yapı |
| 08 | `08_DOGAL_LIF_VE_ORGU_MALZEMELERI` | 5 | 0 | Yalnızca yapı |
| 09 | `09_PLASTIK_VE_KAUCUK` | 6 | 0 | Yalnızca yapı |
| 10 | `10_BETON_ALCI_VE_SIVA` | 5 | 0 | Yalnızca yapı |
| 11 | `11_BOYA_VERNIK_VE_KAPLAMALAR` | 6 | 0 | Yalnızca yapı |
| 12 | `12_YARDIMCI_MALZEMELER` | 6 | 0 | Yalnızca yapı |
| | **Toplam** | **74** | **1** | |

"Yalnızca yapı": Ailede klasörler ve `.gitkeep` dosyaları var, `.md` bilgi dosyası yok.

## 4. Mevcut bilgi dosyaları

`02_MALZEMELER` altında `.gitkeep` dışındaki tek dosya:

| Path (`02_MALZEMELER/`'e göre) | Frontmatter | Ana aile |
|---|---|---|
| `01_AHSAP/ahsap_alt_tonlari_ve_renk_egilimi.md` | `id: material_ahsap-alt-tonlari`, `type: material`, `status: source_supported`, `primary_domain: 02_MALZEMELER`; `title`: "Ahşap Türlerinin Alt Tonları (Sıcak / Soğuk / Nötr)" | `01_AHSAP` |

Dosyada `lifecycle` ve `schema_version` alanları yok; yani legacy profilde.

## 5. `_INBOX` durumu

| | |
|---|---|
| Mevcut mu? | Evet: `02_MALZEMELER/_INBOX/` |
| Ham dosya sayısı | 0 |
| İçerik | Yalnızca `.gitkeep` |
| Dosya türleri | — |
| Alt uzmanlık `_INBOX`'ları | Yok. Ana aile ve alt kategori klasörlerinin hiçbirinde `_INBOX` bulunmuyor. |

## 6. Yapı ve içerik durumu

- **Toplam ana aile:** 12
- **Toplam alt kategori:** 74
- **Toplam `.md` bilgi dosyası:** 1
- **Gerçek bilgi içeriği olan aile:** `01_AHSAP`. Dosya aile seviyesinde duruyor, alt kategori klasörlerinde değil.
- **Yalnızca klasör yapısı olan aileler:** `02` – `12` arasındaki 11 aile.
- **Alt kategori klasörleri:** 74 klasörün hepsinde yalnızca `.gitkeep` var; `.md` dosyası yok.

## 7. Not

Bu belge:
- taxonomy önerisi değildir,
- research plan değildir,
- eksik analizi değildir,
- yeni kategori önermez,
- yalnızca belirtilen tarihteki filesystem snapshot'ıdır.
