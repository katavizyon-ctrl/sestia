---
id: reference_hue-saturation-value-lightness
type: reference
title: "Hue, Saturation, Value, Lightness (HSV/HSL) Nedir?"
status: source_supported
primary_domain: 05_RENK_VE_GORSEL_KOMPOZISYON
related_domains: []
related:
  - {id: reference_renk-cemberi-ve-iliskiler, relation: RELATED_TO}
  - {id: reference_dijital-ve-fiziksel-renk-sistemleri, relation: RELATED_TO}
sources:
  - "Wikipedia, HSL and HSV, https://en.wikipedia.org/wiki/HSL_and_HSV (erişim: 2026-09-22)"
  - "Lenovo Glossary, What Are HSB and HSL? Color Models Explained for Designers, https://www.lenovo.com/us/en/glossary/hsb-and-hsl/ (erişim: 2026-09-22)"
  - "ColorFYI, HSL vs HSV: Which Color Model Should You Use?, https://colorfyi.com/blog/hsl-vs-hsv/ (erişim: 2026-09-22)"
last_updated: 2026-09-22
tags: [hsl, hsv, hue, saturation, value, lightness, renk-modeli]
---

# Hue, Saturation, Value, Lightness (HSV/HSL) Nedir?

## Konu

Bir rengi yalnızca "mavi" ya da "#1E4FA3" demek yerine üç bağımsız boyutuyla tarif etmek, o rengi BİLİNÇLİ biçimde değiştirmeyi (daha açık, daha canlı, daha soluk yapmayı) mümkün kılar. HSL ve HSV, RGB'nin insan algısına daha yakın iki alternatif ifadesidir; 1970'lerde bilgisayar grafiği araştırmacıları tarafından geliştirilmiştir.

## Üç boyut

- **Hue (Ton):** Renk çemberi üzerindeki konum, 0–360 derece (ör. 0°=kırmızı, 120°=yeşil, 240°=mavi). "Hangi renk" sorusunun cevabı budur.
- **Saturation (Doygunluk):** Rengin ne kadar "saf"/canlı ya da ne kadar griye yakın/soluk olduğu. Düşük doygunluk = pastel/toz görünüm; yüksek doygunluk = canlı, keskin görünüm.
- **Value / Lightness (Değer/Açıklık):** Rengin ne kadar açık ya da koyu olduğu.

## HSL ile HSV arasındaki fark

İkisi de Hue ve Saturation eksenini paylaşır; farklı olan üçüncü eksendir:

- **HSL'de Lightness**, siyah-beyaz dengesini belirler. %50 lightness'ta renk en canlı hâlindedir; %50'nin üzerine çıkmak beyaz katar (rengi açar), altına inmek siyah katar (rengi koyulaştırır).
- **HSV'de Value**, %100'de rengin en parlak, tam doygun hâlini verir; %0'da ise ton ne olursa olsun siyahtır. HSV'de "en parlak" nokta beyaza değil, saf renge gider.

Pratikte: HSB/HSV genellikle görsel düzenleme araçlarında, HSL ise web/arayüz tasarımında daha yaygın kullanılır. HSV doygunluğu, HSL ise parlaklığı algısal olarak daha iyi temsil eder.

## Uygulama notu

Bir palet geliştirirken "bu rengi biraz daha soluklaştır" ya da "aynı tonun daha koyu bir varyasyonunu ekle" gibi istekler HSL/HSV terimleriyle kesin biçimde tarif edilebilir — bu, `Palet_Gelistirme_Yontemleri/` klasöründeki yöntemlerin teknik temelidir. Örneğin monokromatik bir palet, tek bir Hue değerini sabit tutup Saturation/Lightness'ı değiştirerek üretilir.

## Doğrulama durumu

Kaynaklarda tutarlı biçimde belgelenmiş, standart bir renk bilimi konusudur.
