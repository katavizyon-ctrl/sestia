# SESTIA Doküman Envanteri 01 — Eski Markdown Katmanı

**Hazırlanma:** 2026-09-25 16:54:38 (yerel saat, UTC+03:00)  
**Çalışma türü:** Salt-okuma envanter. Kaynak dosyalar yalnızca okundu; hiçbir dosya değiştirilmedi, taşınmadı, silinmedi, yeniden adlandırılmadı. Bu rapor tek yeni dosyadır.  
**Önemli:** Bu rapor hiçbir belgeye CURRENT / CANON / SUPERSEDED / OBSOLETE statüsü atamaz ve hangi belgenin "doğru" veya "güncel" olduğuna karar vermez. Dosya adlarındaki v1/FAZ/RAPOR gibi ifadeler yalnızca **sinyal** olarak kaydedilmiştir. Belgelerin kendi frontmatter'larında yazan `status:` / `durum:` değerleri belgenin kendi beyanı olarak aynen aktarılmıştır; bu raporun değerlendirmesi değildir.

---

## 1. Scope

- **Proje kökü:** `C:\projects\1_ODA_1_KARAR` (recursive tarama).
- **Dahil etme ölçütü:** uzantısı `.md` olan ve dosya sistemi *modified* zaman damgası **2026-09-22 23:59:59 (yerel saat, UTC+03:00) ve öncesi** olan dosyalar.
- **Tarih nedeniyle dışarıda bırakılanlar:** modified zaman damgası 2026-09-23 00:00:00 veya sonrası olan `.md` dosyaları. Bunlar yalnızca **sayıldı**; içerikleri bu raporun analizine alınmadı. Bölüm 7 ve 9'da yalnızca *dosya adı/yolu* düzeyinde, "olası ilişki, incelenmedi" notuyla anılırlar.
- **Yapısal olarak hariç tutulan klasörler:** `node_modules/` (üçüncü taraf paket belgeleri, 517 adet .md; proje belgesi değil) ve `.git/`. Bu dosyalar ne kapsam içi ne de "tarih nedeniyle dışarıda" sayısına dahildir.
- **Kullanılan yöntem:** Node.js `fs.statSync` (created = `birthtime`, modified = `mtime`), SHA-256 içerik özeti, ilk `# ` satırı, basit frontmatter ayrıştırma, gövde metninde ISO (`YYYY-AA-GG`) ve Türkçe (`22 Eylül 2026`) tarih kalıpları. Ek olarak `git hash-object` ile çalışma kopyasındaki içeriğin son commit (HEAD `0c7ac1a`) içindeki bloblarla eşleşip eşleşmediğine salt-okuma olarak bakıldı.
- **Created zaman damgası:** Windows NTFS üzerinde okunabildi. Ancak dosya kopyalama/taşıma işlemleri created değerini değiştirebildiği için bu değer yazılış tarihinin kanıtı sayılmamalıdır (bkz. Bölüm 9).

## 2. Kaç eski .md bulundu

**67** adet kapsam-içi (eski) `.md` dosyası.

| Konum | Adet |
|---|---|
| `(proje kökü)` | 4 |
| `docs` | 4 |
| `SESTIA_BILGI_KUTUPHANESI` | 59 |

Belge ailesi (bu raporun nötr gruplaması; otorite ifade etmez):

| Aile | Adet |
|---|---|
| F0 Proje/ajan yapılandırma | 3 |
| F1 Karakter belgeleri | 3 |
| F2 Uygulama/kod denetimleri | 2 |
| F3 Kütüphane mimari/devir | 2 |
| F4 Renk referans _INBOX çalışması | 39 |
| F5 Renk araştırması ve bilgi kartları | 18 |

## 3. Kaç yeni .md tarih nedeniyle dışarıda bırakıldı

**36** adet `.md` dosyası (modified ≥ 2026-09-23 00:00:00). İçerikleri okunmadı/analiz edilmedi.

| Konum | Adet |
|---|---|
| `SESTIA_BILGI_KUTUPHANESI` | 15 |
| `design-references` | 2 |
| `docs` | 16 |
| `docs/reports/SESTIA_BILGI_KUTUPHANESI` | 3 |

Toplam taranan proje .md (node_modules hariç): 103 = 67 kapsam içi + 36 kapsam dışı.

## 4. Eski Markdown tam envanteri

Zaman damgaları yerel saattir (UTC+03:00). Boyut bayt cinsindendir. `#` sütunu iki tabloda aynı dosyayı gösterir.

### 4a. Dosya sistemi bilgileri

| # | relative_path | filename | parent_folder | file_size | created | modified | SHA-256 (ilk 12) |
|---|---|---|---|---|---|---|---|
| 1 | `AGENTS.md` | AGENTS.md | (proje kökü) | 678 | 2026-09-20 01:12:40 | 2026-09-20 01:12:40 | `63f2c50380ed` |
| 2 | `CLAUDE.md` | CLAUDE.md | (proje kökü) | 11 | 2026-09-20 01:12:40 | 2026-09-20 01:12:40 | `336cc4fbf19b` |
| 3 | `docs/SESTIA_HAFIZA_MIMARISI_DENETIM.md` | SESTIA_HAFIZA_MIMARISI_DENETIM.md | docs | 33924 | 2026-09-22 21:51:50 | 2026-09-22 21:51:50 | `dcc7da56aca3` |
| 4 | `docs/SESTIA_KARAKTER_DOSYASI_v1.md` | SESTIA_KARAKTER_DOSYASI_v1.md | docs | 24509 | 2026-09-22 14:17:07 | 2026-09-22 14:44:18 | `cd985ee15b40` |
| 5 | `docs/SESTIA_KARAKTER_ENTEGRASYONU_ON_DENETIM.md` | SESTIA_KARAKTER_ENTEGRASYONU_ON_DENETIM.md | docs | 14281 | 2026-09-22 15:00:33 | 2026-09-22 15:00:33 | `f16ceacedc24` |
| 6 | `docs/SESTIA_KARAKTER_YENILEME_FAZ1.md` | SESTIA_KARAKTER_YENILEME_FAZ1.md | docs | 15925 | 2026-09-22 15:50:54 | 2026-09-22 15:50:54 | `95538a17795c` |
| 7 | `README.md` | README.md | (proje kökü) | 9452 | 2026-09-20 06:45:53 | 2026-09-20 06:45:53 | `ca99e4812527` |
| 8 | `SESTIA_BILGI_KUTUPHANESI/01_ARASTIRMA/05_RENK_VE_GORSEL_KOMPOZISYON/RENK_ARASTIRMASI_01.md` | RENK_ARASTIRMASI_01.md | 05_RENK_VE_GORSEL_KOMPOZISYON | 9418 | 2026-09-22 21:13:25 | 2026-09-22 21:13:25 | `3b4278f8a82c` |
| 9 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/00_MIMARI_VE_PLANLAMA/RENK_REFERANS_INBOX_ORGANIZASYON_RAPORU_01.md` | RENK_REFERANS_INBOX_ORGANIZASYON_RAPORU_01.md | 00_MIMARI_VE_PLANLAMA | 8951 | 2026-09-22 22:15:31 | 2026-09-22 22:15:31 | `ef5632e9c9ee` |
| 10 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/00_MIMARI_VE_PLANLAMA/SESTIA_BILGI_KUTUPHANESI_RAPOR.md` | SESTIA_BILGI_KUTUPHANESI_RAPOR.md | 00_MIMARI_VE_PLANLAMA | 28256 | 2026-09-22 20:34:40 | 2026-09-22 20:34:40 | `2ec8d1bde631` |
| 11 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/00_MIMARI_VE_PLANLAMA/SESTIA_TAM_DEVIR_RAPORU_01.md` | SESTIA_TAM_DEVIR_RAPORU_01.md | 00_MIMARI_VE_PLANLAMA | 20675 | 2026-09-22 21:24:15 | 2026-09-22 21:24:15 | `8fc4562e9a88` |
| 12 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/02_MALZEMELER/01_AHSAP/ahsap_alt_tonlari_ve_renk_egilimi.md` | ahsap_alt_tonlari_ve_renk_egilimi.md | 01_AHSAP | 3086 | 2026-09-22 21:06:39 | 2026-09-22 21:06:39 | `6215ccc4d293` |
| 13 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/03_DIY_ONARIM_VE_URETIM/Dosemecilik/dosemecilikte_renk_secimi.md` | dosemecilikte_renk_secimi.md | Dosemecilik | 3015 | 2026-09-22 21:07:53 | 2026-09-22 21:07:53 | `376b979dfda2` |
| 14 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/00_ENVANTER/RENK_REFERANS_ENVANTERI_01.md` | RENK_REFERANS_ENVANTERI_01.md | 00_ENVANTER | 8994 | 2026-09-22 22:06:07 | 2026-09-22 22:06:07 | `ddd7e1c39727` |
| 15 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_001_alacakaranlikta_bugday_basagi.md` | kartela_ref_001_alacakaranlikta_bugday_basagi.md | 01_ANALIZ_DOSYALARI | 2827 | 2026-09-22 22:06:28 | 2026-09-22 22:06:28 | `3959b737563f` |
| 16 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_002_meyveli_buz_kartelasi.md` | kartela_ref_002_meyveli_buz_kartelasi.md | 01_ANALIZ_DOSYALARI | 2652 | 2026-09-22 22:06:48 | 2026-09-22 22:06:48 | `7c9f301b4da5` |
| 17 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_003_mp072_marka_paleti.md` | kartela_ref_003_mp072_marka_paleti.md | 01_ANALIZ_DOSYALARI | 2678 | 2026-09-22 22:07:07 | 2026-09-22 22:07:07 | `60ba38db09de` |
| 18 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_004_firtinali_sehir_silueti.md` | kartela_ref_004_firtinali_sehir_silueti.md | 01_ANALIZ_DOSYALARI | 2165 | 2026-09-22 22:07:23 | 2026-09-22 22:07:23 | `9c79fd4f4736` |
| 19 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_005_alacakaranlik_gradyani.md` | kartela_ref_005_alacakaranlik_gradyani.md | 01_ANALIZ_DOSYALARI | 2116 | 2026-09-22 22:07:37 | 2026-09-22 22:07:37 | `9cccfd483585` |
| 20 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_006_sicak_notr_gradyan_paleti.md` | kartela_ref_006_sicak_notr_gradyan_paleti.md | 01_ANALIZ_DOSYALARI | 2164 | 2026-09-22 22:07:51 | 2026-09-22 22:07:51 | `9233e5bbddc3` |
| 21 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_007_mercan_resifi_illustrasyonu.md` | kartela_ref_007_mercan_resifi_illustrasyonu.md | 01_ANALIZ_DOSYALARI | 1770 | 2026-09-22 22:08:04 | 2026-09-22 22:08:04 | `f536225444ca` |
| 22 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_008_kis_yapraklari_kirmizi_meyveler.md` | kartela_ref_008_kis_yapraklari_kirmizi_meyveler.md | 01_ANALIZ_DOSYALARI | 1919 | 2026-09-22 22:08:17 | 2026-09-22 22:08:17 | `1d5212e909b9` |
| 23 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_009_gun_batimi_sahili.md` | kartela_ref_009_gun_batimi_sahili.md | 01_ANALIZ_DOSYALARI | 2065 | 2026-09-22 22:08:31 | 2026-09-22 22:08:31 | `8fdd139723f4` |
| 24 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_010_zumrut_altin_mermer_dokusu.md` | kartela_ref_010_zumrut_altin_mermer_dokusu.md | 01_ANALIZ_DOSYALARI | 1996 | 2026-09-22 22:08:45 | 2026-09-22 22:08:45 | `05956e9a8a3a` |
| 25 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_011_alacakaranlikta_gokdelenler.md` | kartela_ref_011_alacakaranlikta_gokdelenler.md | 01_ANALIZ_DOSYALARI | 1965 | 2026-09-22 22:08:58 | 2026-09-22 22:08:58 | `b3da9b488fbd` |
| 26 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_012_lacivert_kirmizi_gradyan_paleti.md` | kartela_ref_012_lacivert_kirmizi_gradyan_paleti.md | 01_ANALIZ_DOSYALARI | 1882 | 2026-09-22 22:09:10 | 2026-09-22 22:09:10 | `fd6069e72afc` |
| 27 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_013_sekiz_ruh_halli_moodboard.md` | kartela_ref_013_sekiz_ruh_halli_moodboard.md | 01_ANALIZ_DOSYALARI | 3582 | 2026-09-22 22:09:34 | 2026-09-22 22:09:34 | `f808c15edb92` |
| 28 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_014_uiux_soguk_notr_gradyan.md` | kartela_ref_014_uiux_soguk_notr_gradyan.md | 01_ANALIZ_DOSYALARI | 2062 | 2026-09-22 22:09:48 | 2026-09-22 22:09:48 | `3058634e91d0` |
| 29 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_015_pantone_new_york_gun_batimi.md` | kartela_ref_015_pantone_new_york_gun_batimi.md | 01_ANALIZ_DOSYALARI | 3019 | 2026-09-22 22:10:09 | 2026-09-22 22:10:09 | `ddc9bc71c266` |
| 30 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_016_mor_cicek_makro_fotografi.md` | kartela_ref_016_mor_cicek_makro_fotografi.md | 01_ANALIZ_DOSYALARI | 1941 | 2026-09-22 22:10:23 | 2026-09-22 22:10:23 | `5635ad36cc6d` |
| 31 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_017_yumusak_pastel_gradyan_paleti.md` | kartela_ref_017_yumusak_pastel_gradyan_paleti.md | 01_ANALIZ_DOSYALARI | 1874 | 2026-09-22 22:10:35 | 2026-09-22 22:10:35 | `b5393974049f` |
| 32 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_018_mp088_marka_paleti.md` | kartela_ref_018_mp088_marka_paleti.md | 01_ANALIZ_DOSYALARI | 1992 | 2026-09-22 22:10:48 | 2026-09-22 22:10:48 | `06642174b460` |
| 33 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_019_mocha_and_beach_kiyi_paleti.md` | kartela_ref_019_mocha_and_beach_kiyi_paleti.md | 01_ANALIZ_DOSYALARI | 2592 | 2026-09-22 22:11:06 | 2026-09-22 22:11:06 | `572c4cb54f9b` |
| 34 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_020_ates_buz_soyut_doku_paleti.md` | kartela_ref_020_ates_buz_soyut_doku_paleti.md | 01_ANALIZ_DOSYALARI | 1733 | 2026-09-22 22:11:18 | 2026-09-22 22:11:18 | `a3e1ab1493b7` |
| 35 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_021_sea_glass_kiyi_ic_mekan_paleti.md` | kartela_ref_021_sea_glass_kiyi_ic_mekan_paleti.md | 01_ANALIZ_DOSYALARI | 2607 | 2026-09-22 22:11:34 | 2026-09-22 22:11:34 | `eed49697e165` |
| 36 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_022_dag_gun_batimi_fotograf_paleti.md` | kartela_ref_022_dag_gun_batimi_fotograf_paleti.md | 01_ANALIZ_DOSYALARI | 2166 | 2026-09-22 22:11:49 | 2026-09-22 22:11:49 | `f5337fc9f08e` |
| 37 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_023_soyut_ipek_doku_paleti.md` | kartela_ref_023_soyut_ipek_doku_paleti.md | 01_ANALIZ_DOSYALARI | 1992 | 2026-09-22 22:12:03 | 2026-09-22 22:12:03 | `2d14f83cf5f4` |
| 38 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_024_karanlikta_pembe_cicek_makro.md` | kartela_ref_024_karanlikta_pembe_cicek_makro.md | 01_ANALIZ_DOSYALARI | 1909 | 2026-09-22 22:12:16 | 2026-09-22 22:12:16 | `93fbd6648ac0` |
| 39 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_025_turkuaz_yapraklar_turuncu_gunes.md` | kartela_ref_025_turkuaz_yapraklar_turuncu_gunes.md | 01_ANALIZ_DOSYALARI | 1929 | 2026-09-22 22:12:29 | 2026-09-22 22:12:29 | `623b3756c115` |
| 40 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_026_pantone_soguk_notr_kartela_izgarasi.md` | kartela_ref_026_pantone_soguk_notr_kartela_izgarasi.md | 01_ANALIZ_DOSYALARI | 4027 | 2026-09-22 22:12:54 | 2026-09-22 22:12:54 | `cfd4832875da` |
| 41 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_027_kirmizi_lacivert_yaprak_paleti.md` | kartela_ref_027_kirmizi_lacivert_yaprak_paleti.md | 01_ANALIZ_DOSYALARI | 1824 | 2026-09-22 22:13:06 | 2026-09-22 22:13:06 | `a1655e7885af` |
| 42 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_028_bogurtlen_ahududu_illustrasyonu.md` | kartela_ref_028_bogurtlen_ahududu_illustrasyonu.md | 01_ANALIZ_DOSYALARI | 1696 | 2026-09-22 22:13:18 | 2026-09-22 22:13:18 | `ae4b415018b4` |
| 43 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/01_ANALIZ_DOSYALARI/kartela_ref_029_sehirde_gun_batimi_siluet.md` | kartela_ref_029_sehirde_gun_batimi_siluet.md | 01_ANALIZ_DOSYALARI | 1830 | 2026-09-22 22:13:31 | 2026-09-22 22:13:31 | `76b83c5485a4` |
| 44 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/02_KUMELER/kume_01_sicak_topraklilar.md` | kume_01_sicak_topraklilar.md | 02_KUMELER | 1043 | 2026-09-22 22:13:43 | 2026-09-22 22:13:43 | `0c6f9717b80c` |
| 45 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/02_KUMELER/kume_02_soguk_notrler.md` | kume_02_soguk_notrler.md | 02_KUMELER | 900 | 2026-09-22 22:13:50 | 2026-09-22 22:13:50 | `5ea6d06778e2` |
| 46 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/02_KUMELER/kume_03_dusuk_doygunluk_yumusaklar.md` | kume_03_dusuk_doygunluk_yumusaklar.md | 02_KUMELER | 971 | 2026-09-22 22:13:57 | 2026-09-22 22:13:57 | `641c9e4e9dbf` |
| 47 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/02_KUMELER/kume_04_yuksek_kontrastli_dramatik_paleler.md` | kume_04_yuksek_kontrastli_dramatik_paleler.md | 02_KUMELER | 1413 | 2026-09-22 22:14:07 | 2026-09-22 22:14:07 | `483f212f26b5` |
| 48 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/02_KUMELER/kume_05_dogal_illustrasyon_yuksek_doygunluk.md` | kume_05_dogal_illustrasyon_yuksek_doygunluk.md | 02_KUMELER | 1053 | 2026-09-22 22:14:15 | 2026-09-22 22:14:15 | `c3549c46aa97` |
| 49 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/02_KUMELER/kume_06_kiyi_ve_deniz_esintili.md` | kume_06_kiyi_ve_deniz_esintili.md | 02_KUMELER | 961 | 2026-09-22 22:14:22 | 2026-09-22 22:14:22 | `104e8f29250c` |
| 50 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/02_KUMELER/kume_07_resmi_ve_marka_paletleri.md` | kume_07_resmi_ve_marka_paletleri.md | 02_KUMELER | 1300 | 2026-09-22 22:14:32 | 2026-09-22 22:14:32 | `f4e2790be261` |
| 51 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/03_SECILMIS_REFERANSLAR/README.md` | README.md | 03_SECILMIS_REFERANSLAR | 696 | 2026-09-22 22:14:40 | 2026-09-22 22:14:40 | `9e6c9a332055` |
| 52 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Palet_Gelistirme_Yontemleri/esyadan_ve_gorselden_palet_turetme.md` | esyadan_ve_gorselden_palet_turetme.md | Palet_Gelistirme_Yontemleri | 4198 | 2026-09-22 21:06:21 | 2026-09-22 21:06:21 | `eed19a43ee65` |
| 53 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Paletler/palet_02_sicak_notrler.md` | palet_02_sicak_notrler.md | Paletler | 2073 | 2026-09-22 21:08:42 | 2026-09-22 21:08:42 | `c4c8f1505fc5` |
| 54 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Paletler/palet_04_pastel_dusuk_doygunluk.md` | palet_04_pastel_dusuk_doygunluk.md | Paletler | 2069 | 2026-09-22 21:09:23 | 2026-09-22 21:09:23 | `d1a7cfeed8cf` |
| 55 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Paletler/palet_06_monokromatik_yesil.md` | palet_06_monokromatik_yesil.md | Paletler | 2250 | 2026-09-22 21:10:09 | 2026-09-22 21:10:09 | `080310a4bfc3` |
| 56 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Paletler/palet_09_vintage_yaklasim.md` | palet_09_vintage_yaklasim.md | Paletler | 2314 | 2026-09-22 21:11:16 | 2026-09-22 21:11:16 | `2ceaa1635999` |
| 57 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Paletler/palet_10_cagdas_minimal.md` | palet_10_cagdas_minimal.md | Paletler | 1899 | 2026-09-22 21:11:36 | 2026-09-22 21:11:36 | `ebabe35546ff` |
| 58 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Paletler/palet_11_kucuk_oda_calisma_alani.md` | palet_11_kucuk_oda_calisma_alani.md | Paletler | 2132 | 2026-09-22 21:11:59 | 2026-09-22 21:11:59 | `f1573dcadeff` |
| 59 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Renk_Teorisi/dijital_ve_fiziksel_renk_sistemleri.md` | dijital_ve_fiziksel_renk_sistemleri.md | Renk_Teorisi | 3959 | 2026-09-22 21:05:56 | 2026-09-22 21:05:56 | `a8f536766aa4` |
| 60 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Renk_Teorisi/hue_saturation_value_lightness.md` | hue_saturation_value_lightness.md | Renk_Teorisi | 2925 | 2026-09-22 21:04:42 | 2026-09-22 21:04:42 | `eb69dd60429f` |
| 61 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Renk_Teorisi/renk_algisi_ve_baglam.md` | renk_algisi_ve_baglam.md | Renk_Teorisi | 2977 | 2026-09-22 21:05:34 | 2026-09-22 21:05:34 | `4d43aaf3254a` |
| 62 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Renk_Teorisi/renk_cemberi_ve_iliskiler.md` | renk_cemberi_ve_iliskiler.md | Renk_Teorisi | 3399 | 2026-09-22 21:04:25 | 2026-09-22 21:04:25 | `312aebc580be` |
| 63 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Renk_Teorisi/renk_dengesi_kontrast_oranlar.md` | renk_dengesi_kontrast_oranlar.md | Renk_Teorisi | 3062 | 2026-09-22 21:05:16 | 2026-09-22 21:05:16 | `0a6c1e78179e` |
| 64 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Renk_Teorisi/sicak_soguk_notr_renkler.md` | sicak_soguk_notr_renkler.md | Renk_Teorisi | 2952 | 2026-09-22 21:04:59 | 2026-09-22 21:04:59 | `dc98258cdf80` |
| 65 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/06_ISIK_VE_AYDINLATMA/isik_ve_renk_algisi.md` | isik_ve_renk_algisi.md | 06_ISIK_VE_AYDINLATMA | 2870 | 2026-09-22 21:07:14 | 2026-09-22 21:07:14 | `28d494d0755f` |
| 66 | `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/07_IC_MEKAN_VE_YERLESIM/kucuk_alanlarda_renk_kullanimi.md` | kucuk_alanlarda_renk_kullanimi.md | 07_IC_MEKAN_VE_YERLESIM | 3199 | 2026-09-22 21:07:34 | 2026-09-22 21:07:34 | `ca6c4feac569` |
| 67 | `SESTIA_UYGULAMA_DENETIM_RAPORU.md` | SESTIA_UYGULAMA_DENETIM_RAPORU.md | (proje kökü) | 39994 | 2026-09-22 11:05:44 | 2026-09-22 11:05:44 | `dc0c991ec756` |

### 4b. İçerik bilgileri

| # | İlk H1 | Belge içinde yazılı tarih(ler) | Frontmatter (date/tarih/version/status/belge_turu/kapsam vb.) | Dosya adı sinyalleri | Nötr amaç | Olası aile |
|---|---|---|---|---|---|---|
| 1 | This is NOT the Next.js you know | — | — | — | Kod asistanlarına bu projedeki Next.js sürümünün eğitim verisinden farklı olduğunu ve yerel dokümantasyonun okunması gerektiğini bildiren talimat bloğu. | F0 Proje/ajan yapılandırma |
| 2 | (H1 yok) | — | — | — | Tek satırlık yönlendirme; içeriği `@AGENTS.md` dosyasını içe aktarır. | F0 Proje/ajan yapılandırma |
| 3 | SESTIA HAFIZA MİMARİSİ — YENİDEN DENETİM | 22 Eylül 2026, 2026-09-22, 2026-09-21 | — | DENETIM | Sestia'nın hafıza (kalıcılık) mimarisini, önceki denetimleri doğrulanmış kabul etmeden, çalışma kopyası üzerinden yeniden inceleyen salt-okuma denetim; aşamalı hafıza mimarisi önerisi ve karar listesi içerir. | F2 Uygulama/kod denetimleri |
| 4 | SESTIA — KARAKTER DOSYASI | 22 Eylül 2026 | — | v1 | Sestia karakterine ilişkin birlikte alınmış kararların derlemesi (kimlik, karakter pusulası, iç referans metni vb.); kendini uygulamaya aktarılmış bir sistem talimatı olmadığını belirterek tanımlar. | F1 Karakter belgeleri |
| 5 | SESTIA KARAKTER ENTEGRASYONU — ÖN DENETİM RAPORU | 22 Eylül 2026 | — | ÖN_DENETIM | Mevcut uygulama kodundaki dört AI talimatını Karakter Dosyası v1 ile karşılaştıran salt-okuma ön denetim; karakter yenilemesinin kapsamını belirlemek için zemin sunar. | F1 Karakter belgeleri |
| 6 | SESTIA KARAKTER YENİLEMESİ — FAZ 1 ÇALIŞMA RAPORU | 22 Eylül 2026 | — | FAZ1 | Karakter kararlarının uygulamaya ilk kontrollü aktarımını (ortak karakter temeli, yalnızca Keşif sohbetine bağlama) anlatan Faz 1 çalışma raporu. | F1 Karakter belgeleri |
| 7 | Bir Oda, Bir Karar | — | — | README | "Bir Oda, Bir Karar" uygulamasının kurulum, mimari ve test grubu altyapısını anlatan proje README'si; ürünü tut/sat/bağışla/at/geri dönüştür odaklı declutter PWA (v1) olarak tanımlar. | F0 Proje/ajan yapılandırma |
| 8 | Araştırma Kaydı 01 — Renk, Paletler ve Kartelalar | 2026-09-22 | belge_turu: arastirma_kaydi; arastirma_tarihi: 2026-09-22; durum: tamamlandi (ilk tur) | ARAŞTIRMA, sıra no 01 | Renk teorisi, renk sistemleri, renk algısı ve iç mekân uygulamaları üzerine yapılan ilk araştırma turunun kaydı; kullanılan web kaynaklarını ve üretilen bilgi dosyalarını listeler. | F5 Renk araştırması ve bilgi kartları |
| 9 | Renk Referans _INBOX Organizasyon Raporu 01 | 2026-09-22 | belge_turu: organizasyon_raporu; kapsam: 05_RENK_VE_GORSEL_KOMPOZISYON/_INBOX; tarih: 2026-09-22 | RAPOR, sıra no 01 | Renk _INBOX'ına eklenen 29 görselin envanterlenmesi, analiz dosyalarına ve kümelere ayrılması çalışmasının organizasyon kaydı. | F4 Renk referans _INBOX çalışması |
| 10 | SESTIA BİLGİ KÜTÜPHANESİ — Kavramsal ve Fiziksel Mimari Tasarımı | 22 Eylül 2026 | — | RAPOR | Sestia Bilgi Kütüphanesi için kavramsal ve fiziksel mimari tasarım önerisi; kendini tasarım/onay aşamasında bir belge olarak tanımlar. | F3 Kütüphane mimari/devir |
| 11 | SESTIA BİLGİ KÜTÜPHANESİ — TAM DEVİR RAPORU 01 | 2026-09-22 | belge_turu: devir_raporu; kapsam: SESTIA_BILGI_KUTUPHANESI (tamamı); hazirlanma_tarihi: 2026-09-22; onceki_belgeler: | RAPOR, DEVİR, sıra no 01 | Kütüphanedeki dosyaların okunup değerlendirilmesiyle hazırlanmış devir raporu; önceki bağlamı bilmeyen birinin kütüphaneyi anlaması amaçlanır. | F3 Kütüphane mimari/devir |
| 12 | Ahşap Türlerinin Alt Tonları | 2026-09-22 | type: material; status: source_supported; last_updated: 2026-09-22 | — | Ahşap türlerinin alt tonlarını ve renk eğilimlerini anlatan malzeme bilgi kartı (frontmatter'lı). | F5 Renk araştırması ve bilgi kartları |
| 13 | Mobilya Yenileme ve Döşemecilikte Kumaş Rengi Seçimi | 2026-09-22 | type: method; status: source_supported; last_updated: 2026-09-22 | — | Mobilya yenileme/döşemecilikte kumaş rengi seçimine dair yöntem bilgi kartı. | F5 Renk araştırması ve bilgi kartları |
| 14 | Renk Referans Envanteri 01 | 2026-09-22 | belge_turu: envanter; kapsam: _INBOX (renk kartelası / palet / görsel referans); tarih: 2026-09-22; toplam_dosya: 29 | ENVANTER, sıra no 01 | _INBOX'taki 29 renk referans görselinin tablo hâlinde ana kaydı (dosya adı, tür, kısa açıklama, geçici başlık, renk ailesi, ön etiket). | F4 Renk referans _INBOX çalışması |
| 15 | Kartela Referansı 001 — Alacakaranlıkta Buğday Başağı | — | (frontmatter var; istenen alanlar yok) | sıra no 001 | _INBOX'taki #001 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 001 — Alacakaranlıkta Buğday Başağı"). | F4 Renk referans _INBOX çalışması |
| 16 | Kartela Referansı 002 — Meyveli Buz Kartelası | — | (frontmatter var; istenen alanlar yok) | sıra no 002 | _INBOX'taki #002 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 002 — Meyveli Buz Kartelası"). | F4 Renk referans _INBOX çalışması |
| 17 | Kartela Referansı 003 — MP072 Marka Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 003 | _INBOX'taki #003 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 003 — MP072 Marka Paleti"). | F4 Renk referans _INBOX çalışması |
| 18 | Kartela Referansı 004 — Fırtınalı Şehir Silueti | — | (frontmatter var; istenen alanlar yok) | sıra no 004 | _INBOX'taki #004 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 004 — Fırtınalı Şehir Silueti"). | F4 Renk referans _INBOX çalışması |
| 19 | Kartela Referansı 005 — Alacakaranlık Gradyanı | — | (frontmatter var; istenen alanlar yok) | sıra no 005 | _INBOX'taki #005 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 005 — Alacakaranlık Gradyanı"). | F4 Renk referans _INBOX çalışması |
| 20 | Kartela Referansı 006 — Sıcak Nötr Gradyan Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 006 | _INBOX'taki #006 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 006 — Sıcak Nötr Gradyan Paleti"). | F4 Renk referans _INBOX çalışması |
| 21 | Kartela Referansı 007 — Mercan Resifi İllüstrasyonu | — | (frontmatter var; istenen alanlar yok) | sıra no 007 | _INBOX'taki #007 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 007 — Mercan Resifi İllüstrasyonu"). | F4 Renk referans _INBOX çalışması |
| 22 | Kartela Referansı 008 — Kış Yaprakları ve Kırmızı Meyveler | — | (frontmatter var; istenen alanlar yok) | sıra no 008 | _INBOX'taki #008 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 008 — Kış Yaprakları ve Kırmızı Meyveler"). | F4 Renk referans _INBOX çalışması |
| 23 | Kartela Referansı 009 — Gün Batımı Sahili | — | (frontmatter var; istenen alanlar yok) | sıra no 009 | _INBOX'taki #009 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 009 — Gün Batımı Sahili"). | F4 Renk referans _INBOX çalışması |
| 24 | Kartela Referansı 010 — Zümrüt ve Altın Mermer Dokusu | — | (frontmatter var; istenen alanlar yok) | sıra no 010 | _INBOX'taki #010 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 010 — Zümrüt ve Altın Mermer Dokusu"). | F4 Renk referans _INBOX çalışması |
| 25 | Kartela Referansı 011 — Alacakaranlıkta Gökdelenler | — | (frontmatter var; istenen alanlar yok) | sıra no 011 | _INBOX'taki #011 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 011 — Alacakaranlıkta Gökdelenler"). | F4 Renk referans _INBOX çalışması |
| 26 | Kartela Referansı 012 — Lacivert-Kırmızı Gradyan Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 012 | _INBOX'taki #012 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 012 — Lacivert-Kırmızı Gradyan Paleti"). | F4 Renk referans _INBOX çalışması |
| 27 | Kartela Referansı 013 — Sekiz Ruh Halli Moodboard Koleksiyonu | — | (frontmatter var; istenen alanlar yok) | sıra no 013 | _INBOX'taki #013 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 013 — Sekiz Ruh Halli Moodboard Koleksiyonu"). | F4 Renk referans _INBOX çalışması |
| 28 | Kartela Referansı 014 — UI/UX Soğuk Nötr Gradyan Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 014 | _INBOX'taki #014 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 014 — UI/UX Soğuk Nötr Gradyan Paleti"). | F4 Renk referans _INBOX çalışması |
| 29 | Kartela Referansı 015 — Pantone: New York Gün Batımı | — | (frontmatter var; istenen alanlar yok) | sıra no 015 | _INBOX'taki #015 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 015 — Pantone: New York Gün Batımı"). | F4 Renk referans _INBOX çalışması |
| 30 | Kartela Referansı 016 — Mor Çiçek Makro Fotoğrafı | — | (frontmatter var; istenen alanlar yok) | sıra no 016 | _INBOX'taki #016 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 016 — Mor Çiçek Makro Fotoğrafı"). | F4 Renk referans _INBOX çalışması |
| 31 | Kartela Referansı 017 — Yumuşak Pastel Gradyan Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 017 | _INBOX'taki #017 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 017 — Yumuşak Pastel Gradyan Paleti"). | F4 Renk referans _INBOX çalışması |
| 32 | Kartela Referansı 018 — MP088 Marka Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 018 | _INBOX'taki #018 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 018 — MP088 Marka Paleti"). | F4 Renk referans _INBOX çalışması |
| 33 | Kartela Referansı 019 — Mocha & Beach Kıyı Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 019 | _INBOX'taki #019 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 019 — Mocha & Beach Kıyı Paleti"). | F4 Renk referans _INBOX çalışması |
| 34 | Kartela Referansı 020 — Ateş ve Buz Soyut Doku Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 020 | _INBOX'taki #020 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 020 — Ateş ve Buz Soyut Doku Paleti"). | F4 Renk referans _INBOX çalışması |
| 35 | Kartela Referansı 021 — Sea Glass Kıyı İç Mekân Paleti (Veni's Atelier) | — | (frontmatter var; istenen alanlar yok) | sıra no 021 | _INBOX'taki #021 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 021 — Sea Glass Kıyı İç Mekân Paleti (Veni's Atelier)"). | F4 Renk referans _INBOX çalışması |
| 36 | Kartela Referansı 022 — Dağ Gün Batımı Fotoğraf Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 022 | _INBOX'taki #022 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 022 — Dağ Gün Batımı Fotoğraf Paleti"). | F4 Renk referans _INBOX çalışması |
| 37 | Kartela Referansı 023 — Soyut İpek Doku Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 023 | _INBOX'taki #023 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 023 — Soyut İpek Doku Paleti"). | F4 Renk referans _INBOX çalışması |
| 38 | Kartela Referansı 024 — Karanlıkta Pembe Çiçek Makro Fotoğrafı | — | (frontmatter var; istenen alanlar yok) | sıra no 024 | _INBOX'taki #024 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 024 — Karanlıkta Pembe Çiçek Makro Fotoğrafı"). | F4 Renk referans _INBOX çalışması |
| 39 | Kartela Referansı 025 — Turkuaz Yapraklar ve Turuncu Güneş | — | (frontmatter var; istenen alanlar yok) | sıra no 025 | _INBOX'taki #025 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 025 — Turkuaz Yapraklar ve Turuncu Güneş"). | F4 Renk referans _INBOX çalışması |
| 40 | Kartela Referansı 026 — Pantone: Soğuk Nötr Kartela Izgarası | — | (frontmatter var; istenen alanlar yok) | sıra no 026 | _INBOX'taki #026 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 026 — Pantone: Soğuk Nötr Kartela Izgarası"). | F4 Renk referans _INBOX çalışması |
| 41 | Kartela Referansı 027 — Kırmızı-Lacivert Yaprak Paleti | — | (frontmatter var; istenen alanlar yok) | sıra no 027 | _INBOX'taki #027 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 027 — Kırmızı-Lacivert Yaprak Paleti"). | F4 Renk referans _INBOX çalışması |
| 42 | Kartela Referansı 028 — Böğürtlen ve Ahududu İllüstrasyonu | — | (frontmatter var; istenen alanlar yok) | sıra no 028 | _INBOX'taki #028 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 028 — Böğürtlen ve Ahududu İllüstrasyonu"). | F4 Renk referans _INBOX çalışması |
| 43 | Kartela Referansı 029 — Şehirde Gün Batımı Silueti | — | (frontmatter var; istenen alanlar yok) | sıra no 029 | _INBOX'taki #029 numaralı görsel referansın analiz dosyası: görsel açıklaması, yaklaşık baskın HEX renkleri ve etiketler ("Kartela Referansı 029 — Şehirde Gün Batımı Silueti"). | F4 Renk referans _INBOX çalışması |
| 44 | Küme 01 — Sıcak Topraklılar | — | (frontmatter var; istenen alanlar yok) | sıra no 01 | Kartela referanslarını ortak renk karakterine göre gruplayan 01 numaralı küme dosyası; kümeye giren referansları listeler. | F4 Renk referans _INBOX çalışması |
| 45 | Küme 02 — Soğuk Nötrler | — | (frontmatter var; istenen alanlar yok) | sıra no 02 | Kartela referanslarını ortak renk karakterine göre gruplayan 02 numaralı küme dosyası; kümeye giren referansları listeler. | F4 Renk referans _INBOX çalışması |
| 46 | Küme 03 — Düşük Doygunluk / Pastel Yumuşaklar | — | (frontmatter var; istenen alanlar yok) | sıra no 03 | Kartela referanslarını ortak renk karakterine göre gruplayan 03 numaralı küme dosyası; kümeye giren referansları listeler. | F4 Renk referans _INBOX çalışması |
| 47 | Küme 04 — Yüksek Kontrastlı, Dramatik Gece Paletleri | — | (frontmatter var; istenen alanlar yok) | sıra no 04 | Kartela referanslarını ortak renk karakterine göre gruplayan 04 numaralı küme dosyası; kümeye giren referansları listeler. | F4 Renk referans _INBOX çalışması |
| 48 | Küme 05 — Doğal İllüstrasyon / Yüksek Doygunluk Fantezi | — | (frontmatter var; istenen alanlar yok) | sıra no 05 | Kartela referanslarını ortak renk karakterine göre gruplayan 05 numaralı küme dosyası; kümeye giren referansları listeler. | F4 Renk referans _INBOX çalışması |
| 49 | Küme 06 — Kıyı ve Deniz Esintili Paletler | — | (frontmatter var; istenen alanlar yok) | sıra no 06 | Kartela referanslarını ortak renk karakterine göre gruplayan 06 numaralı küme dosyası; kümeye giren referansları listeler. | F4 Renk referans _INBOX çalışması |
| 50 | Küme 07 — Resmi / Yarı-Resmi Kartela ve Marka Paletleri | — | (frontmatter var; istenen alanlar yok) | sıra no 07 | Kartela referanslarını ortak renk karakterine göre gruplayan 07 numaralı küme dosyası; kümeye giren referansları listeler. | F4 Renk referans _INBOX çalışması |
| 51 | Seçilmiş Referanslar | — | — | README | Klasörün kasıtlı olarak boş olduğunu ve yalnızca kullanıcı onayıyla seçilecek referanslar için ayrıldığını açıklayan kısa not. | F4 Renk referans _INBOX çalışması |
| 52 | Mevcut Bir Eşyadan, Referans Görselden veya İki Renkten Palet Türetme | 2026-09-22 | type: method; status: creative_proposal; last_updated: 2026-09-22 | — | Mevcut bir eşyadan, referans görselden veya iki renkten palet türetme yöntemini anlatan bilgi kartı. | F5 Renk araştırması ve bilgi kartları |
| 53 | Palet 02 — Sıcak Nötrler | 2026-09-22 | type: project; status: creative_proposal; last_updated: 2026-09-22 | sıra no 02 | Özgün palet önerisi 02: kullanım amacı, renkler ve bağlamı; aynı adlı bir .svg önizlemeye referans verir. | F5 Renk araştırması ve bilgi kartları |
| 54 | Palet 04 — Pastel ve Düşük Doygunluk | 2026-09-22 | type: project; status: creative_proposal; last_updated: 2026-09-22 | sıra no 04 | Özgün palet önerisi 04: kullanım amacı, renkler ve bağlamı; aynı adlı bir .svg önizlemeye referans verir. | F5 Renk araştırması ve bilgi kartları |
| 55 | Palet 06 — Monokromatik Yeşil | 2026-09-22 | type: project; status: creative_proposal; last_updated: 2026-09-22 | sıra no 06 | Özgün palet önerisi 06: kullanım amacı, renkler ve bağlamı; aynı adlı bir .svg önizlemeye referans verir. | F5 Renk araştırması ve bilgi kartları |
| 56 | Palet 09 — Vintage Yaklaşım | 2026-09-22 | type: project; status: creative_proposal; last_updated: 2026-09-22 | sıra no 09 | Özgün palet önerisi 09: kullanım amacı, renkler ve bağlamı; aynı adlı bir .svg önizlemeye referans verir. | F5 Renk araştırması ve bilgi kartları |
| 57 | Palet 10 — Çağdaş Minimal | 2026-09-22 | type: project; status: creative_proposal; last_updated: 2026-09-22 | sıra no 10 | Özgün palet önerisi 10: kullanım amacı, renkler ve bağlamı; aynı adlı bir .svg önizlemeye referans verir. | F5 Renk araştırması ve bilgi kartları |
| 58 | Palet 11 — Küçük Oda / Çalışma Alanı | 2026-09-22 | type: project; status: creative_proposal; last_updated: 2026-09-22 | sıra no 11 | Özgün palet önerisi 11: kullanım amacı, renkler ve bağlamı; aynı adlı bir .svg önizlemeye referans verir. | F5 Renk araştırması ve bilgi kartları |
| 59 | Dijital Renk Sistemleri ile Fiziksel Renk Sistemleri Arasındaki Fark | 2026-09-22 | type: reference; status: source_supported; last_updated: 2026-09-22 | — | Dijital (RGB/HEX vb.) ve fiziksel (Pantone/RAL/NCS vb.) renk sistemleri arasındaki farkı anlatan referans kartı. | F5 Renk araştırması ve bilgi kartları |
| 60 | Hue, Saturation, Value, Lightness (HSV/HSL) Nedir? | 2026-09-22 | type: reference; status: source_supported; last_updated: 2026-09-22 | — | Ton, doygunluk, değer ve açıklık (HSV/HSL) kavramlarını anlatan referans kartı. | F5 Renk araştırması ve bilgi kartları |
| 61 | Renk Algısı ve Bağlama Bağlı Görsel Etkiler | 2026-09-22 | type: reference; status: source_supported; last_updated: 2026-09-22 | — | Renk algısının bağlama göre değişmesini ve ilgili görsel etkileri anlatan referans kartı. | F5 Renk araştırması ve bilgi kartları |
| 62 | Renk Çemberi ve Renk İlişkileri | 2026-09-22 | type: reference; status: source_supported; last_updated: 2026-09-22 | — | Renk çemberi ve tamamlayıcı/analog/triadik/monokromatik ilişkileri anlatan referans kartı. | F5 Renk araştırması ve bilgi kartları |
| 63 | Renk Dengesi, Kontrast ve Oranlar | 2026-09-22 | type: reference; status: source_supported; last_updated: 2026-09-22 | — | Renk dengesi, kontrast ve oran kavramlarını anlatan referans kartı. | F5 Renk araştırması ve bilgi kartları |
| 64 | Sıcak, Soğuk ve Nötr Renkler | 2026-09-22 | type: reference; status: source_supported; last_updated: 2026-09-22 | — | Sıcak, soğuk ve nötr renk ayrımını anlatan referans kartı. | F5 Renk araştırması ve bilgi kartları |
| 65 | Doğal ve Yapay Işığın Renk Algısına Etkisi | 2026-09-22 | type: reference; status: source_supported; last_updated: 2026-09-22 | — | Doğal ve yapay ışığın renk algısına etkisini anlatan kaynak destekli referans kartı. | F5 Renk araştırması ve bilgi kartları |
| 66 | Küçük Odalarda ve Çalışma Alanlarında Renk Stratejisi | 2026-09-22 | type: method; status: source_supported; last_updated: 2026-09-22 | — | Küçük odalarda ve çalışma alanlarında renk stratejisini anlatan yöntem kartı. | F5 Renk araştırması ve bilgi kartları |
| 67 | BİR ODA. BİR EŞYA. — Uygulama Geneli Keşif ve Denetim Raporu | — | — | RAPOR, DENETIM | Uygulamanın geneline yönelik salt-okuma keşif/denetim raporu (12 bölüm): mimari, Türkçe metin envanteri, karakter tutarlılığı, AI mimarisi, tasarım sistemi, geri bildirim, veritabanı ve karar gerektiren konular. | F2 Uygulama/kod denetimleri |

## 5. Exact duplicates

**Kapsam-içi .md dosyaları arasında birebir aynı içerik: 0 grup.** (SHA-256 ile 67 dosyanın tamamı karşılaştırıldı; her özet tektir.)

Boşluk ve satır sonu farkları yok sayılarak yapılan ikinci karşılaştırmada da eşleşen grup sayısı: **0**.

**Kapsam dışı ama not edilmesi gereken birebir eşleşmeler (sayıya dahil değildir):**

- `docs/SESTIA_KARAKTER_DOSYASI_v1.md` ile `docs/SESTIA_KARAKTER_DOSYASI_v1.txt` byte düzeyinde birebir aynı (`cmp` ile doğrulandı, ikisi de 24509 bayt). `.txt` dosyası .md olmadığı için envantere alınmadı; yalnızca bilgi olarak kaydedildi.
- `SESTIA_BILGI_KUTUPHANESI/` altındaki kapsam-içi 59 dosyanın **tamamı**, son commit'te (HEAD) farklı bir yolda bulunan dosyalarla birebir aynı içeriğe sahip (bkz. Bölüm 8.3). Bunlar dosya sisteminde iki kopya değildir; git açısından "eski yolda silinmiş, yeni yolda takip dışı" görünen aynı içeriklerdir.

## 6. Same / similar name – different content

Aşağıdaki eşleşmelerde içerikler farklıdır (SHA-256 farklı). Bu, bir belgenin diğerinin sürümü olduğu anlamına gelmez.

**6.1 Birebir aynı dosya adı, farklı içerik**

- `README.md`: `README.md` · `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/03_SECILMIS_REFERANSLAR/README.md` — biri proje README'si, diğeri boş bir seçim klasörünün açıklama notu.

**6.2 Benzer adlı, farklı konulu kapsam-içi dosyalar**

- Kartela referanslarında tekrar eden görsel temalar (her biri farklı `_INBOX` görseline ait ayrı analiz):
  - "alacakaranlık": `kartela_ref_001_alacakaranlikta_bugday_basagi.md`, `kartela_ref_005_alacakaranlik_gradyani.md`, `kartela_ref_011_alacakaranlikta_gokdelenler.md`
  - "gün batımı": `kartela_ref_009_gun_batimi_sahili.md`, `kartela_ref_015_pantone_new_york_gun_batimi.md`, `kartela_ref_022_dag_gun_batimi_fotograf_paleti.md`, `kartela_ref_029_sehirde_gun_batimi_siluet.md`
  - "marka paleti": `kartela_ref_003_mp072_marka_paleti.md`, `kartela_ref_018_mp088_marka_paleti.md`
  - "çiçek makro": `kartela_ref_016_mor_cicek_makro_fotografi.md`, `kartela_ref_024_karanlikta_pembe_cicek_makro.md`
  - "gradyan paleti": `kartela_ref_006_…`, `kartela_ref_012_…`, `kartela_ref_014_…`, `kartela_ref_017_…`
  - "kırmızı–lacivert": `kartela_ref_012_lacivert_kirmizi_gradyan_paleti.md`, `kartela_ref_027_kirmizi_lacivert_yaprak_paleti.md`
- "Sıcak/soğuk nötr" adı üç farklı katmanda geçer: `Renk_Teorisi/sicak_soguk_notr_renkler.md` (kavram kartı), `Paletler/palet_02_sicak_notrler.md` (özgün palet), `02_KUMELER/kume_02_soguk_notrler.md` (dış referans kümesi).
- "Renk algısı": `Renk_Teorisi/renk_algisi_ve_baglam.md` ile `06_ISIK_VE_AYDINLATMA/isik_ve_renk_algisi.md` — biri bağlam etkisi, diğeri ışık etkisi.
- "Küçük alan": `07_IC_MEKAN_VE_YERLESIM/kucuk_alanlarda_renk_kullanimi.md` (yöntem kartı) ile `Paletler/palet_11_kucuk_oda_calisma_alani.md` (palet önerisi).
- "Pastel / düşük doygunluk": `Paletler/palet_04_pastel_dusuk_doygunluk.md` ile `02_KUMELER/kume_03_dusuk_doygunluk_yumusaklar.md`.
- "Denetim" adlı iki kök/docs raporu: `SESTIA_UYGULAMA_DENETIM_RAPORU.md` ve `docs/SESTIA_HAFIZA_MIMARISI_DENETIM.md` (konuları farklı: uygulama geneli vs hafıza mimarisi; ilişki için bkz. 7.2).
- "Rapor" adlı iki kütüphane belgesi: `SESTIA_BILGI_KUTUPHANESI_RAPOR.md` ve `SESTIA_TAM_DEVIR_RAPORU_01.md` (ilişki için bkz. 7.3).

**6.3 Kapsam-içi dosyayla benzer adlı kapsam-dışı dosyalar (yalnızca ad düzeyinde; içerikleri incelenmedi)**

- `ahsap_alt_tonlari_ve_renk_egilimi.md` ↔ `05_RENK_VE_GORSEL_KOMPOZISYON/Uygulamalar/ahsap_ve_renk_uyumu.md`
- `kume_02_soguk_notrler.md` ↔ `Paletler/palet_03_soguk_notrler.md`
- `SESTIA_TAM_DEVIR_RAPORU_01.md` ↔ `docs/reports/SESTIA_BILGI_KUTUPHANESI/OTURUM_DEVIR_BRIFINGI_2026-09-25.md`
- `SESTIA_BILGI_KUTUPHANESI_RAPOR.md` ↔ `docs/reports/SESTIA_BILGI_KUTUPHANESI/MEVCUT_DURUM_RAPORU.md` ve `03_ALTYAPI/01_KUTUPHANE_KURALLARI/KUTUPHANE_MIMARISI.md`
- `RENK_ARASTIRMASI_01.md` ↔ `01_ARASTIRMA/02_MALZEMELER/MALZEME_ARASTIRMASI_01*.md` (aynı "…_ARASTIRMASI_01" adlandırma kalıbı, farklı konu)

## 7. Possible version families

Bu bölümdeki gruplar, aynı çalışmanın farklı aşamaları/sürümleri **olabilecek** belgelerdir. Hiçbir grupta "hangisi geçerli" sonucuna varılmamıştır; kanıtlar yalnızca belgelerin kendi ifadeleri ve dosya meta verileridir.

### 7.1 Karakter belgeleri (F1)

- Kapsam içi: `docs/SESTIA_KARAKTER_DOSYASI_v1.md` → `docs/SESTIA_KARAKTER_ENTEGRASYONU_ON_DENETIM.md` → `docs/SESTIA_KARAKTER_YENILEME_FAZ1.md` (modified sırası 14:44 → 15:00 → 15:50, 22 Eylül).
- Kanıt: ÖN_DENETİM belgesi "İncelenen Karakter Dosyası: `docs/SESTIA_KARAKTER_DOSYASI_v1.md` — Sürüm 1.0" diye açıkça atıf yapar; FAZ1 belgesi her ikisini "Referans belgeler" olarak listeler. Bu üç belge birbirinin sürümü değil, aynı iş akışının ardışık adımları gibi görünür.
- Dosya adındaki `_v1` ve belge içindeki "Sürüm: 1.0" var; ÖN_DENETİM ve FAZ1 belgelerinde "v2 adayı" / "v2-adayı" ifadeleri geçer. Kapsam-içi dosyalar arasında `…_v2` adlı bir karakter dosyası **bulunmadı**.
- Kapsam dışı, ad düzeyinde ilişkili olabilecekler (incelenmedi): `docs/SESTIA_KARAKTER_ENTEGRASYON_TESTLERI.md`, `docs/SESTIA_KARAKTER_ENTEGRASYON_TESTLERI_02.md`, `docs/SESTIA_KAPSAMLI_URUN_VE_KARAKTER_REHBERI.md`. Bunların v1 ile ilişkisi bu turda değerlendirilmedi.

### 7.2 Uygulama / kod denetimleri (F2)

- Kapsam içi: `SESTIA_UYGULAMA_DENETIM_RAPORU.md` (22 Eylül 11:05) ve `docs/SESTIA_HAFIZA_MIMARISI_DENETIM.md` (22 Eylül 21:51).
- Kanıt: HAFIZA denetiminin H1'i "YENİDEN DENETİM"dir ve son notunda `SESTIA_KARAKTER_ENTEGRASYONU_ON_DENETIM.md` ile `SESTIA_UYGULAMA_DENETIM_RAPORU.md` gibi önceki denetimlerin bulgularını "güncel gerçek olarak kabul etmeden" yeniden okunduğunu belirtir. Konu kapsamları örtüşür (özellikle hafıza/kalıcılık bölümleri) ama aynı değildir. Olası ilişki: kısmi yeniden inceleme; sürüm ilişkisi kanıtlanmış değildir.
- Kapsam dışı, ad düzeyinde ilişkili olabilecekler (incelenmedi): `docs/CODEX_BAGIMSIZ_KOD_DENETIMI_01.md`, `docs/CODEX_GERCEK_BAGIMSIZ_DENETIM_02.md`, `docs/SESTIA_ODA_TARAMASI_VE_KARAR_DURUMU_DENETIMI.md`, `docs/CLAUDE_CODEX_FAZ1_BAGIMSIZ_DOGRULAMA.md`.

### 7.3 Kütüphane mimari / devir belgeleri (F3)

- Kapsam içi: `…/00_MIMARI_VE_PLANLAMA/SESTIA_BILGI_KUTUPHANESI_RAPOR.md` (20:34) ve `…/00_MIMARI_VE_PLANLAMA/SESTIA_TAM_DEVIR_RAPORU_01.md` (21:24).
- Kanıt: TAM_DEVIR_RAPORU_01 frontmatter'ında `onceki_belgeler:` altında `00_MIMARI_VE_PLANLAMA/SESTIA_BILGI_KUTUPHANESI_RAPOR.md`, `91_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md` ve `90_ARASTIRMA_VE_KAYNAKLAR/RENK_ARASTIRMASI_01.md` listelenir. Bu yollar dosyaların **bugünkü** konumlarıyla eşleşmez (bkz. Bölüm 8.3 ve 9).
- İlk rapor kendini "Tasarım/onay aşaması" olarak tanımlar; devir raporu kütüphanenin o anki dosyalarını okuyarak özetler. Olası ilişki: tasarım → sonrasındaki durum özeti. Aynı belgenin sürümleri oldukları kanıtlanmamıştır.
- `_01` son eki bir seri olabileceğine işaret eder; kapsam içinde `_02` yoktur. Kapsam dışında ad düzeyinde ilişkili olabilecekler (incelenmedi): `docs/reports/SESTIA_BILGI_KUTUPHANESI/MEVCUT_DURUM_RAPORU.md`, `…/OTURUM_DEVIR_BRIFINGI_2026-09-25.md`, `03_ALTYAPI/01_KUTUPHANE_KURALLARI/KUTUPHANE_MIMARISI.md`, `03_ALTYAPI/03_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md`.

### 7.4 Renk referans _INBOX çalışması (F4)

- Kapsam içi: `RENK_REFERANS_INBOX_ORGANIZASYON_RAPORU_01.md`, `RENK_REFERANS_ENVANTERI_01.md`, 29 × `kartela_ref_###_*.md`, 7 × `kume_##_*.md`, `03_SECILMIS_REFERANSLAR/README.md` — toplam 39 dosya; modified aralığı 22 Eylül 22:06–22:15.
- Bunlar bir **seri/paket**tir (tek iş oturumunda üretilmiş gibi görünen, birbirine atıf yapan parçalar), birbirinin sürümü değildir. Organizasyon raporu ile envanter aynı sayıları (29 görsel; 28 jpg + 1 png; tür dağılımı 24/2/2/1) tekrarlar — içerik örtüşmesi vardır ama içerikler farklıdır.
- Kartela dosyalarında `referans_turu` dağılımı: swatch_palette_sheet 22, swatch_palette_sheet_marka 2, boya_kartelasi_resmi 2, ic_mekan_referansi 2, moodboard 1 (toplam 29).
- Seri numaralarında boşluk yok: kartela 001–029 ve küme 01–07 eksiksiz.

### 7.5 Renk araştırması ve bilgi kartları (F5)

- Kapsam içi: `RENK_ARASTIRMASI_01.md` + 6 renk teorisi kartı + ışık, küçük alan, döşemecilik, ahşap alt tonları, palet türetme kartları + 6 palet dosyası (toplam 18). Hepsinin frontmatter'ında `last_updated: 2026-09-22` veya araştırma tarihi 2026-09-22 yazar.
- **Palet serisi zaman sınırıyla bölünmüştür:** `palet_02, 04, 06, 09, 10, 11` kapsam içi; `palet_01, 03, 05, 07, 08, 12` ve `Uygulamalar/ahsap_ve_renk_uyumu.md` kapsam dışıdır (modified 25 Eylül). Aynı seri olduğu adlandırmadan anlaşılır; kapsam-dışı parçaların içeriği bu turda okunmadı.
- Bu grup bir sürüm ailesi değil, aynı araştırma turundan çıkan ayrı konulu kartlar kümesidir.

### 7.6 Tekil (UNIQUE) sayılabilecekler

- `AGENTS.md`, `CLAUDE.md`, `README.md` — belirgin bir eş/sürüm adayı yok. `CLAUDE.md` içeriği yalnızca `@AGENTS.md` referansıdır (içerik olarak AGENTS.md'ye bağlıdır, kopyası değildir).
- `README.md` ürünü "tut / sat / bağışla / at / geri dönüştür" declutter uygulaması (v1) olarak tanımlar; `SESTIA_UYGULAMA_DENETIM_RAPORU.md` bu eski ürün tanımının bazı arayüz metinlerinde hâlâ bulunduğunu not eder. Bu bir tutarsızlık gözlemidir, hangisinin geçerli olduğuna dair bir karar değildir.

### 7.7 Özet sınıflandırma (A/B/C/D)

| Sınıf | Adet / açıklama |
|---|---|
| A) Exact duplicate | 0 grup (kapsam içi .md arasında) |
| B) Same/similar name, different content | 1 birebir aynı ad grubu (README.md) + Bölüm 6.2'deki benzer ad kümeleri |
| C) Possible version family | 7.1 Karakter (3 dosya), 7.2 Denetim (2 dosya), 7.3 Kütüphane mimari/devir (2 dosya) — hepsi "olası", kanıtlanmamış |
| D) Unique / seri üyesi | Kalan dosyalar: F4 ve F5 seri üyeleri (57) ile AGENTS.md, CLAUDE.md, README.md |

## 8. Tarih / sürüm kanıtları

### 8.1 Dosya sistemi

- Kapsam-içi modified aralığı: **2026-09-20 01:12:40** – **2026-09-22 22:15:31**.
- `AGENTS.md`, `CLAUDE.md`, `README.md`: 20 Eylül 2026. Diğer 64 dosya: 22 Eylül 2026.
- Created ≠ modified olan tek dosya: `docs/SESTIA_KARAKTER_DOSYASI_v1.md` (created 14:17:07, modified 14:44:18) — oluşturulduktan sonra düzenlendiğine işaret eder. Diğer 66 dosyada created = modified.

### 8.2 Belge içi tarih ve sürüm ifadeleri

- Gövdede yazılı "22 Eylül 2026": `SESTIA_KARAKTER_DOSYASI_v1.md` ("Tarih"), `SESTIA_KARAKTER_ENTEGRASYONU_ON_DENETIM.md` ("Denetim tarihi"), `SESTIA_KARAKTER_YENILEME_FAZ1.md` ("Tarih"), `SESTIA_HAFIZA_MIMARISI_DENETIM.md` ("Denetim tarihi"; ayrıca 2026-09-21 tarihine atıf), `SESTIA_BILGI_KUTUPHANESI_RAPOR.md` ("Tarih").
- Frontmatter tarihleri: `RENK_ARASTIRMASI_01.md` (`arastirma_tarihi: 2026-09-22`), `RENK_REFERANS_INBOX_ORGANIZASYON_RAPORU_01.md` ve `RENK_REFERANS_ENVANTERI_01.md` (`tarih: 2026-09-22`), `SESTIA_TAM_DEVIR_RAPORU_01.md` (`hazirlanma_tarihi: 2026-09-22`), 17 bilgi kartı/palet dosyası (`last_updated: 2026-09-22`).
- **Belge içinde tarih bulunmayanlar:** `SESTIA_UYGULAMA_DENETIM_RAPORU.md` (yalnızca dosya sistemi tarihi var), `AGENTS.md`, `CLAUDE.md`, `README.md`, 29 kartela analiz dosyası, 7 küme dosyası, `03_SECILMIS_REFERANSLAR/README.md`.
- Sürüm ifadeleri: `SESTIA_KARAKTER_DOSYASI_v1.md` ("Sürüm: 1.0"); ÖN_DENETİM ve FAZ1 belgelerinde "v1" atıfları ve "v2 adayı" ifadeleri; `README.md` "(v1, PWA)". `SESTIA_UYGULAMA_DENETIM_RAPORU.md` içindeki "v5" belge sürümü değildir, "Auth.js v5" kütüphane sürümüdür.
- Belgelerin kendi beyan ettiği durumlar (aynen): `RENK_ARASTIRMASI_01.md` → `durum: tamamlandi (ilk tur)`; bilgi kartları → `status: source_supported` (10 dosya) veya `status: creative_proposal` (7 dosya: 6 palet + palet türetme kartı); `SESTIA_KARAKTER_YENILEME_FAZ1.md` → "Durum: Faz 1 tamamlandı… karakter kanonu değildir"; `SESTIA_BILGI_KUTUPHANESI_RAPOR.md` → "Durum: Tasarım/onay aşaması".

### 8.3 Git kanıtı (salt-okuma: `git hash-object`, `git ls-tree`)

- `AGENTS.md`, `CLAUDE.md`, `README.md` ve 4 `docs/` dosyası HEAD'deki aynı yol ile birebir aynıdır.
- `SESTIA_UYGULAMA_DENETIM_RAPORU.md` HEAD'de yoktur (takip dışı).
- `SESTIA_BILGI_KUTUPHANESI/` altındaki kapsam-içi 59 dosyanın her biri HEAD'de **farklı bir yolda** birebir aynı içerikle bulunur. Yol eşlemesi:
  - `SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/<kategori>/…` ⇐ HEAD: `SESTIA_BILGI_KUTUPHANESI/<kategori>/…` (ör. `00_MIMARI_VE_PLANLAMA`, `02_MALZEMELER`, `05_RENK_VE_GORSEL_KOMPOZISYON` …)
  - `SESTIA_BILGI_KUTUPHANESI/01_ARASTIRMA/05_RENK_VE_GORSEL_KOMPOZISYON/RENK_ARASTIRMASI_01.md` ⇐ HEAD: `SESTIA_BILGI_KUTUPHANESI/90_ARASTIRMA_VE_KAYNAKLAR/RENK_ARASTIRMASI_01.md`
- Yani bu dosyaların içerikleri 22 Eylül'den beri değişmemiş, ancak klasör yapısı sonradan yeniden düzenlenmiş görünüyor. Dosya taşıma işlemi modified zaman damgasını korumuş olduğundan bu dosyalar kapsam içinde kalmıştır.

## 9. Belirsizlikler

1. **Zaman damgası güvenilirliği:** Kapsam yalnızca dosya sistemi modified zamanına göre belirlendi. Kopyalama/taşıma/geri yükleme bu değeri değiştirebilir veya koruyabilir; bu nedenle "22 Eylül öncesi" etiketi yazılış tarihini kesin olarak kanıtlamaz. Örnek: `design-references/sestia-ui-konseptleri-v1/URETIM_PROMPTLARI.md` modified 2026-09-23 00:32 ama created 00:37 — created > modified, yani kopyalanmış/taşınmış olabilir. Bu dosya kapsam dışında kaldı.
2. **Sınıra yakın dosyalar:** 23 Eylül'ün ilk saatlerinde değiştirilmiş kapsam-dışı dosyalar var (`URETIM_PROMPTLARI.md` 00:32, `INCELEME.md` 00:37, `SESTIA_KAPSAMLI_URUN_VE_KARAKTER_REHBERI.md` 00:59, `SESTIA_PROJE_BRIEFING.md` 01:07). Bunlar muhtemelen 22 Eylül gecesi süren aynı çalışma oturumunun parçasıdır; kurala uygun olarak dışarıda bırakıldılar.
3. **Eski yol atıfları:** `SESTIA_TAM_DEVIR_RAPORU_01.md` ve `RENK_ARASTIRMASI_01.md` gibi belgeler içerik içinde eski klasör yollarına (`90_ARASTIRMA_VE_KAYNAKLAR/`, `91_BILGI_ILISKILERI/`, `SESTIA_BILGI_KUTUPHANESI/05_RENK…` gibi `02_KUTUPHANE/` öneki olmayan yollar) atıf yapar. Bugünkü dosya konumlarıyla bu atıflar eşleşmez. Bu rapor bu atıfları düzeltmez veya değerlendirmez.
4. **Git durumu:** Kütüphane dosyaları git'te "eski yolda silinmiş" + "yeni yolda takip dışı" görünür. Bu yeniden düzenlemenin kasıtlı ve tamamlanmış olup olmadığı bu turun konusu değildir.
5. **Kapsam dışı parçalara bölünen seriler:** Palet serisi (01–12) ve kütüphanenin bilgi ilişkileri şeması (`bilgi_tipleri_ve_iliski_semasi.md`) kapsam sınırıyla bölünmüştür. Kapsam-içi dosyaların atıf yaptığı bazı belgeler (ör. TAM_DEVIR'in `onceki_belgeler` listesindeki şema dosyası) bu turda okunamadı.
6. **.md dışı eşler:** `docs/SESTIA_KARAKTER_DOSYASI_v1.txt` (.md ile birebir aynı) ve `docs/SESTIA_PROJE_BRIEFING.pdf` (kapsam-dışı `.md` ile aynı adlı) gibi .md olmayan dosyalar envantere alınmadı. `.docx` gibi başka formatlardaki belgeler (ör. kapsam-dışı bir belgede anılan `Ana_ekran_mesajlar_v2.docx`) taranmadı.
7. **Karakter "v2":** ÖN_DENETİM ve FAZ1 belgeleri "v2 adayı" ilkelerden söz eder; bir v2 belgesinin var olup olmadığı veya kapsam-dışı belgelerden birinin bu rolü üstlenip üstlenmediği bu turda belirlenemez.
8. **Amaç açıklamaları:** "Nötr amaç" sütunu, belgelerin başlık ve giriş bölümleri ile (seri dosyalarda) ortak şablon okunarak yazılmıştır. 29 kartela ve 7 küme dosyası aynı şablonu izlediğinden amaçları şablon düzeyinde özetlenmiştir; her birinin renk içeriği ayrıca değerlendirilmemiştir.
9. **Kodlama:** Tüm dosyalar UTF-8 olarak okundu; Türkçe karakterler bozulmadan çözümlendi. Bazı dosya adları ve H1'ler ASCII transliterasyonu kullanır (ör. `KUTUPHANESI`, `Arastirma`), bu adlandırma tercihidir, bozulma değildir.

---

*Bu rapor salt-okuma bir envanterdir. Hiçbir kaynak dosya değiştirilmedi, taşınmadı, silinmedi veya yeniden adlandırılmadı; hiçbir belgeye statü atanmadı.*
