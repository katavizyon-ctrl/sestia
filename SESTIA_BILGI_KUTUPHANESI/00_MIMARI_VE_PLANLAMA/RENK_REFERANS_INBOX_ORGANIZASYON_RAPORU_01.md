---
belge_turu: organizasyon_raporu
kapsam: 05_RENK_VE_GORSEL_KOMPOZISYON/_INBOX
tarih: 2026-09-22
---

# Renk Referans _INBOX Organizasyon Raporu 01

Bu rapor, `05_RENK_VE_GORSEL_KOMPOZISYON/_INBOX/` içine eklenen 29 dosyanın kontrollü, izlenebilir ve yeniden kullanılabilir biçimde organize edilmesi çalışmasının tam kaydıdır. `_INBOX/` içindeki orijinal dosyalar SİLİNMEDİ/TAŞINMADI; her dosya OLDUĞU YERDE kalıyor, sadece ÜZERİNE analiz/organizasyon katmanı inşa edildi.

---

## 1. `_INBOX` içinde kaç dosya bulundu

**29 dosya** — hepsi görsel (28 `.jpg`, 1 `.png`). Metin/PDF/başka format yok.

## 2. Dosya türleri ve genel dağılım

| Referans türü | Sayı | Dosyalar |
|---|---|---|
| Swatch / palette sheet (fotoğraf ya da soyut görsel + renk şeridi) | 24 | #001-002, #004-012, #014, #016-018, #020, #022-025, #027-029 |
| Boya kartelası (GERÇEK resmi Pantone kodu içeren) | 2 | #015, #026 |
| İç mekân referansı (açıkça yaşam alanı/dekorasyon markalı) | 2 | #019, #021 |
| Moodboard (çoklu, isimlendirilmiş alt-palet) | 1 | #013 (8 alt-palet içeriyor) |
| Malzeme/tekstil odaklı referans (birincil tür olarak) | 0 | — (bazı dosyalar ikincil `tekstil_odakli` etiketi taşıyor) |
| Belirsiz/karma | 0 | — |

## 3. Oluşturulan yeni klasörler

```
05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/
├── 00_ENVANTER/
├── 01_ANALIZ_DOSYALARI/
├── 02_KUMELER/
└── 03_SECILMIS_REFERANSLAR/   (boş, sadece README — kullanıcı onayı bekliyor)
```

`_INBOX/` yerinde, değiştirilmeden bırakıldı.

## 4. Oluşturulan envanter dosyası

`Kartela_Referanslari/00_ENVANTER/RENK_REFERANS_ENVANTERI_01.md` — 29 dosyanın TAMAMI için sıra no, dosya adı, uzantı, referans türü, kısa açıklama, geçici başlık, renk ailesi ve ön analiz etiketi içeren tek bir master tablo.

## 5. Kaç ayrı analiz dosyası yazıldı

**29 ayrı `.md` analiz dosyası**, `Kartela_Referanslari/01_ANALIZ_DOSYALARI/` altında, `kartela_ref_001_...md` — `kartela_ref_029_...md` biçiminde. Her biri: orijinal dosya adı, geçici başlık, referans türü, görsel açıklama, 3-8 renk + yaklaşık HEX, paletin karakteri, çoklu etiketler, ve 6 yorum alanı (atmosfer, mekân türü, malzeme uyumu, ahşap/kumaş/duvar/zemin ilişkisi, özgün paletlerle yakınlık, risk/belirsizlik) içeriyor.

## 6. Oluşturulan küme sayısı ve adları

**7 küme**, `Kartela_Referanslari/02_KUMELER/` altında:

1. `kume_01_sicak_topraklilar.md` (5 referans)
2. `kume_02_soguk_notrler.md` (3 referans)
3. `kume_03_dusuk_doygunluk_yumusaklar.md` (5 referans)
4. `kume_04_yuksek_kontrastli_dramatik_paleler.md` (8 referans — en kalabalık küme)
5. `kume_05_dogal_illustrasyon_yuksek_doygunluk.md` (5 referans)
6. `kume_06_kiyi_ve_deniz_esintili.md` (3 referans)
7. `kume_07_resmi_ve_marka_paletleri.md` (4 referans — format bazlı, aesthetic değil)

Örnek listedeki "vintage ve retro" kümesi kasıtlı olarak OLUŞTURULMADI — 29 referansın hiçbiri gerçek bir vintage/retro estetiği taşımıyor (hepsi modern dijital palet/fotoğraf formatında); zorla bir küme uydurmak yerine gerçek içeriğe uygun 7 küme tercih edildi (bkz. madde 7 "boşluklar").

## 7. Baskın estetik eğilimler

- **En kalabalık eğilim (8/29, %28):** Koyu lacivert/siyah taban + tek-birkaç doygun sıcak vurgu ("dramatik gece" paletleri, Küme 04).
- **İkinci en kalabalık (5/29 × 2):** Sıcak toprak tonları (Küme 01) ve düşük doygunluk/pastel yumuşaklar (Küme 03) eşit ağırlıkta.
- Genel olarak `_INBOX` içeriği kütüphanenin kendi 12 özgün paletinden DAHA DRAMATİK/yüksek-kontrastlı bir eğilim taşıyor — özgün paletler daha "kullanılabilir, dengeli" iken, dış referansların çoğu Instagram/Pinterest tarzı "etkileyici görsel" formatında üretilmiş.

## 8. Tekrar eden / birbirine çok benzeyen paletler

- **#003 (MP072) ve #018 (MP088):** Aynı serinin (@AlexCristache) iki farklı çıktısı — format ve sunum tarzı BİREBİR aynı, sadece renkler farklı.
- **#005, #006, #012, #017, #020:** Hepsi aynı "gradyan arka plan + hap-şekilli renk bloğu" formatını kullanıyor (üç farklı imza: `@codesmashers`, "Ceeez", "Luca Davincci") — format tekrarı yüksek, ama renk içerikleri gerçekten farklı.
- **#016, #023, #024, #027 (SlideOcean.net serisi):** Aynı kaynağın 4 farklı çıktısı, hepsi "fotoğraf + numaralı renk şeridi" formatında.
- **#002, #007, #028 (@caitiecolors serisi):** Aynı kaynağın 3 farklı çıktısı, hepsi meyve/doğa illüstrasyonu + HEX yazılı şerit formatında.

**Sonuç:** 29 dosyanın büyük kısmı aslında SADECE birkaç farklı "üretici hesabın" (muhtemelen Pinterest/Instagram renk paleti hesapları) tekrarlayan formatlarından oluşuyor — İÇERİK (renkler) çoğunlukla farklı ama SUNUM FORMATI son derece tekrarlı.

## 9. İlginç / ayırt edici paletler

- **#013 (Sekiz Ruh Halli Moodboard):** Tek dosyada 8 isimlendirilmiş alt-palet — envanterdeki en YOĞUN bilgi içeren tek dosya.
- **#015 ve #026 (Pantone gerçek kodlar):** Envanterdeki TEK gerçek resmi kaynak örnekleri — özel disiplinle işlendi.
- **#019 ve #021 (Mocha & Beach, Sea Glass):** Açıkça iç mekân/dekorasyon markası olarak sunulmuş, doğrudan uygulanabilir referanslar.
- **#010 (Zümrüt ve Altın Mermer):** Kütüphanenin `palet_06_monokromatik_yesil.md`'ini doğrudan zenginleştirebilecek, lüks/altın vurgulu bir varyant.

## 10. Mevcut 12 özgün paletle ilişkiler

| Özgün palet | Yakın dış referanslar |
|---|---|
| `palet_01_toprak_tonlari` | #001, #006, #011, #019 |
| `palet_03_soguk_notrler` | #004, #014, #026 |
| `palet_04_pastel_dusuk_doygunluk` | #009, #017, #021 |
| `palet_05_canli_kontrastli` | #003, #012, #018, #020 |
| `palet_06_monokromatik_yesil` | #010 |
| `palet_07_ahsap_uyumlu_sicak` | #006, #011, #019 |
| `palet_08_ahsap_uyumlu_soguk` | #014, #026 |
| `palet_09_vintage_yaklasim` | #022, #023 (uzak/kısmi akrabalık) |
| `palet_11_kucuk_oda_calisma_alani` | #009, #021 |
| `palet_12_az_dogal_isikli_mekan` | #003, #008, #013 (Amber Mirage), #029 |
| `palet_02_sicak_notrler` | doğrudan güçlü bir eşleşme bulunamadı |
| `palet_10_cagdas_minimal` | doğrudan güçlü bir eşleşme bulunamadı |

## 11. Fiziksel boya kartelası / moodboard / yaklaşık dijital örnekleme ayrımı

- **Gerçek fiziksel/resmi kod:** SADECE #015 ve #026 (Pantone). Bu ikisinde bile HEX değerlerinin BÜYÜK ÇOĞUNLUĞU (17/17 kod için sadece 2'sinde kaynakta HEX vardı) benim tarafımdan YAPILMIŞ yaklaşık tahminlerdir — resmi değildir, her iki analiz dosyasında da BÜYÜK HARFLERLE ayrıca uyarılmıştır.
- **Moodboard:** #013, tek başına bir kategori — 8 alt-palet, profesyonel ama kaynağı/markası belirsiz bir ilham panosu formatı.
- **Yaklaşık dijital örnekleme (kalan 26 dosyanın tamamı):** Ya kaynağın KENDİ yazdığı HEX'ler (üçüncü taraf hesaplar — @caitiecolors, @codesmashers, "Ceeez", "Luca Davincci", SlideOcean.net, @uiux.jarar, @AlexCristache) ya da (özellikle #022'de) benim tarafımdan yapılmış tam yaklaşık okumalar. **Hiçbiri resmi bir üretici/boya markası DEĞİLDİR** — hepsi "aesthetic palette" tarzı sosyal medya/tasarım araçları çıktısıdır.

## 12. Sonraki adım için öneriler

**Kullanıcı onayıyla seçilmiş referanslara taşıma:** `03_SECILMIS_REFERANSLAR/` şu an kasıtlı olarak boş. Önerilen ilk adaylar (yüksek özgünlük/kalite + kütüphaneyle net ilişki): #019 (Mocha & Beach), #021 (Sea Glass), #026 (Pantone soğuk nötr ızgarası), #006 (Sıcak Nötr Gradyan). Ama bu SEÇİM kullanıcıya bırakılmıştır.

**Eksik estetik alanlar (kütüphanenin 12 özgün paletinde henüz TEMSİL EDİLMEYEN, ama _INBOX'ta güçlü örneği bulunan):**
- "Dramatik gece + tek doygun vurgu" ailesi (Küme 04, 8 referans var, kütüphanede sadece 1 uzak akraba var — palet_05).
- "Mor/leylak/magenta" ağırlıklı hiçbir özgün palet yok (#016, #024, #028, ve moodboard'un "Noctune Bloom"/"Velvet Twilight" alt-paletleri bu boşluğu gösteriyor).
- "Kıyı/deniz esintili, soğuk yeşil-mavi + kum" kombinasyonu (Küme 06) kütüphanede DOĞRUDAN yok — en güçlü yeni-palet adayı.
- "Yüksek doygunluk, oyuncu/meyvemsi" (Küme 05) — çocuk odası/mutfak için düşünülebilir, şu an tamamen boş.

**Gerekirse yeni özgün palet üretim alanları:** Yukarıdaki 4 boşluk, ileride yeni bir "Renk Araştırması 02" turunda özgün (creative_proposal) palet üretimi için somut, kanıta dayalı aday konulardır — ama bu KARAR bu raporda VERİLMEMİŞTİR, kullanıcı onayı gerektirir.

---

*Bu rapor bir organizasyon/envanter çalışmasının kaydıdır. `_INBOX/` içindeki hiçbir orijinal dosya silinmedi/taşınmadı, `Paletler/` koleksiyonu değiştirilmedi, uygulama koduna dokunulmadı, hiçbir resmi renk kodu uydurulmadı.*
