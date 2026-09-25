---
id: method_esyadan-ve-gorselden-palet-turetme
type: method
title: Mevcut Bir Eşyadan, Referans Görselden veya İki Renkten Palet Türetme
status: creative_proposal
primary_domain: 05_RENK_VE_GORSEL_KOMPOZISYON
related_domains: []
related:
  - {id: reference_renk-cemberi-ve-iliskiler, relation: RELATED_TO}
  - {id: reference_hue-saturation-value-lightness, relation: RELATED_TO}
  - {id: reference_sicak-soguk-notr-renkler, relation: RELATED_TO}
  - {id: reference_renk-algisi-ve-baglam, relation: RELATED_TO}
sources: []
last_updated: 2026-09-22
tags: [palet-gelistirme, metodoloji, yaratici-yontem]
---

# Mevcut Bir Eşyadan, Referans Görselden veya İki Renkten Palet Türetme

## Konu ve durum notu

Bu dosya, bilinen renk teorisi ilkelerinin (bkz. `../Renk_Teorisi/`) BİRLEŞTİRİLEREK yeni bir palet üretme SÜRECİNİ tarif eder. Burada anlatılan adımlar Sestia'nın kendi muhakeme yöntemidir — dışarıdan alınmış, belgelenmiş bir "resmi metodoloji" değildir, bu yüzden `status: creative_proposal` olarak işaretlenmiştir. Temel dayandığı renk ilişkileri (tamamlayıcı/analog/triadik, HSL, alt ton, kontrast) kanıt destekli, ama bunların bu sırayla birleştirilmesi Sestia'nın/kütüphanenin kendi yaklaşımıdır.

## Yöntem 1 — Mevcut bir eşyadan palet geliştirme

1. Eşyanın baskın 1-2 rengini (genellikle malzemenin kendisi — ahşap, kumaş, metal) belirle.
2. Bu rengin alt tonunu (sıcak/soğuk/nötr) değerlendir — bkz. `sicak_soguk_notr_renkler.md`.
3. Baskın renk için bir "aile" seç: aynı alt tonda 1-2 nötr (duvar/zemin için) + 1 uyumlu ikincil renk (analog ya da tamamlayıcı) + 1 ölçülü vurgu rengi.
4. 60-30-10 mantığına göre rolleri dağıt (bkz. `renk_dengesi_kontrast_oranlar.md`): eşyanın rengi genellikle "ikincil" ya da "vurgu" rolünde kalır, nötr bir taban rengi mekânın geri kalanını (duvar) taşır.

## Yöntem 2 — Referans görselden palet türetme

1. Görseldeki 3-5 baskın rengi (gözle ya da bir renk seçici araçla) tanımla.
2. Bu renklerin birbirine çember üzerinde nasıl konumlandığını değerlendir (analog mı, tamamlayıcı mı, monokromatik mi) — bu, görselin "neden çalıştığını" açıklar.
3. Görseldeki oranları (hangi renk ne kadar yer kaplıyor) not et — bu genellikle zaten doğal bir 60-30-10 dağılımına yakındır.
4. Kullanıcının GERÇEK mekânına uyarlarken: görseldeki ışık koşulunu (doğal/yapay, sıcak/soğuk) kullanıcının kendi mekânıyla karşılaştır — aynı HEX değeri farklı ışıkta farklı görünebilir (bkz. `renk_algisi_ve_baglam.md`, `../../06_ISIK_VE_AYDINLATMA/isik_ve_renk_algisi.md`).

## Yöntem 3 — Kullanıcının sevdiği iki rengi birleştirme

1. İki rengin çember üzerindeki ilişkisini belirle (komşu/analog mu, karşıt/tamamlayıcı mı, uzak ama triadik mesafede mi).
2. İlişki türüne göre üçüncü/dördüncü rengi seç: analogsa aradaki geçiş tonunu, tamamlayıcıysa dengeleyici bir nötr köprü rengi ekle.
3. İki rengi EŞİT ağırlıkta kullanmak yerine (genellikle huzursuz sonuç verir) birini baskın, diğerini vurgu yap.
4. Sonucu nötr bir taban (beyaz, bej, gri gibi) ile "seyrelterek" iki rengin bir arada yaşayabileceği bir alan oluştur.

## Yöntem 4 — Bir paletin farklı ışık koşullarına uyarlanması

Bir palet az doğal ışık alan bir mekâna taşınacaksa: doygunluğu hafif artırmak (düşük ışıkta renkler "soluklaşmış" görünür) ve çok soğuk/koyu tonlardan kaçınmak genellikle önerilir (bkz. `../../06_ISIK_VE_AYDINLATMA/isik_ve_renk_algisi.md`). Kesin bir "şu kadar % artır" kuralı bu kütüphanede henüz doğrulanmamıştır — bu bir açık araştırma konusudur (bkz. araştırma kaydı).

## Sestia için kullanım notu

Bu yöntemler, Sestia'nın kütüphanedeki 12 hazır paleti BİREBİR TEKRARLAMAK yerine kullanıcının kendi eşyasına/görseline/renk tercihine göre YENİ bir palet geliştirebilmesini sağlar. Üretilen her yeni palet `creative_proposal` olarak değerlendirilmeli, kullanıcıya "bu senin için geliştirdiğim bir öneri, resmi bir kartela değil" şeklinde dürüstçe sunulmalıdır.
