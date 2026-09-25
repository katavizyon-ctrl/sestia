---
id: reference_dijital-ve-fiziksel-renk-sistemleri
type: reference
title: "Dijital Renk Sistemleri (HEX/RGB/HSL) ve Fiziksel Renk Sistemleri (NCS/RAL/Pantone)"
status: source_supported
primary_domain: 05_RENK_VE_GORSEL_KOMPOZISYON
related_domains: []
related:
  - {id: reference_hue-saturation-value-lightness, relation: RELATED_TO}
sources:
  - "Coloralyze, What is the NCS Color System and How is it Used in Interior Design?, https://coloralyze.com/blog/what-is-ncs-color-system (erişim: 2026-09-22)"
  - "Coloralyze, The Complete Guide to Color Standards: CSS, RAL, Pantone and NCS, https://coloralyze.com/blog/complete-guide-color-standards (erişim: 2026-09-22)"
  - "WhtColor, Pantone vs RAL: What's the Difference and When to Use Each, https://whtcolor.com/en/blog/pantone-vs-ral-whats-the-difference (erişim: 2026-09-22)"
  - "Butler Signs, The Key Differences in Colour Systems | RAL vs. Pantone, https://butlersigns.uk/our-company/blog/understanding-the-key-differences-in-colour-systems/ (erişim: 2026-09-22)"
last_updated: 2026-09-22
tags: [hex, rgb, hsl, ncs, ral, pantone, renk-sistemi]
---

# Dijital Renk Sistemleri ile Fiziksel Renk Sistemleri Arasındaki Fark

## Konu

Bu, Sestia'nın kesinlikle netleştirmesi gereken kritik bir ayrımdır: **ekranda görünen bir renk ile fiziksel bir boya/kumaş/malzeme rengi AYNI ŞEY DEĞİLDİR.**

## Dijital sistemler: HEX, RGB, HSL

HEX (`#1E4FA3` gibi), RGB (kırmızı/yeşil/mavi ışık değerleri, 0-255) ve HSL/HSV (bkz. `hue_saturation_value_lightness.md`) — bunların hepsi **ışık yayan** bir ekranın rengi nasıl üreteceğini tarif eder (additive/eklemeli renk modeli, sRGB renk uzayı). Bu değerler cihazdan cihaza (farklı ekran kalibrasyonu, parlaklık ayarı) az da olsa farklı görünebilir.

## Fiziksel sistemler: NCS, RAL, Pantone

Bunlar **ışığı yansıtan** fiziksel yüzeyleri (boya, kumaş, plastik, baskı) tarif eder ve farklı amaçlar için geliştirilmiştir:

- **NCS (Natural Colour System):** İsveç Renk Enstitüsü tarafından geliştirildi; insan gözünün rengi NASIL ALGILADIĞINA dayanır (6 temel renk: beyaz, siyah, sarı, kırmızı, mavi, yeşil). Farklı malzemeler ve ışık koşulları arasında algısal tutarlılığı hedefler — bu yüzden özellikle iç mekân/mimari tasarımda (İskandinav tasarım geleneğinde) tercih edilir.
- **RAL:** 1927'de Almanya'da geliştirildi; endüstriyel boya, kaplama, metal ve genel yüzey işleri için pratik, hızlı iletişim kurmayı sağlayan standart bir kod sistemi. Avrupa'da mimari projelerde sıkça belirtilir.
- **Pantone (PMS):** 1963'te, MATBAA/baskı endüstrisindeki "aynı renk farklı yazıcıda farklı görünüyor" sorununu çözmek için geliştirildi. Grafik tasarım, moda ve marka tutarlılığı gerektiren alanlarda baskındır.

## Neden karıştırılmamalı

Bir ekranda "#8B5A3C" olarak görünen bir kahverengi, gerçek bir boya kartelasında BİREBİR bu RAL ya da Pantone koduna karşılık gelmez — dönüşüm yaklaşık bir eşleştirmedir, üreticiden üreticiye değişir ve ışık koşuluna göre kayabilir. Bu kütüphanedeki paletler dijital HEX değerleri olarak üretilmiştir; bunlardan doğrulanmamış bir "bu tam olarak şu RAL/Pantone koduna eşittir" iddiası üretilmemiştir ve üretilmemelidir.

## Uygulama notu

Sestia bir palet önerdiğinde: HEX değerini bir İLHAM/başlangıç noktası olarak sunmalı, kullanıcıyı gerçek boya/kumaş seçiminde fiziksel bir örnek/kartela ile doğrulamaya yönlendirmeli. "Bu HEX kodu şu Pantone/RAL rengine birebir eşittir" gibi bir iddia, kaynakla doğrulanmadığı sürece ASLA yapılmamalı.

## Doğrulama durumu

Üç fiziksel sistemin amaç/köken bilgisi kaynaklarla desteklenmiştir. HEX↔NCS/RAL/Pantone arası KESİN dönüşüm iddiaları bu kütüphanede bilinçli olarak YAPILMAMIŞTIR — bu, doğrulanmamış eşdeğerlik üretmeme ilkesinin doğrudan uygulamasıdır.
