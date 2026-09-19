# Bir Oda, Bir Karar

Kişisel eşyaların fotoğrafını çekip AI'dan **tut / sat / bağışla / at / geri dönüştür**
önerisi alan, streak/puan tabanlı bir declutter uygulaması (v1, PWA).

## Kurulum

```bash
npm install
cp .env.example .env.local
```

`.env.local` içine gerçek `ANTHROPIC_API_KEY` değerini yaz:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

```bash
npm run dev
```

`http://localhost:3000` adresinde açılır. Telefonundan test etmek için bilgisayarınla
aynı ağdaki telefonundan `http://<bilgisayarının-yerel-ip'si>:3000` adresine git (kamera
erişimi için HTTPS ya da `localhost` gerekir — yerel ağ üzerinden HTTP'de kamera izni
tarayıcıya göre kısıtlı olabilir; gerçek cihaz testleri için bir tünel (ör. `ngrok`) ya
da bir deploy önerilir).

## Mimari

- **Next.js (App Router)** — hem frontend hem `/api/*` route'ları tek uygulamada.
- **`lib/anthropic.js`** — Anthropic Messages API'sine görsel + Türkçe prompt gönderip
  JSON şemasını (`category`, `recommendation`, `reasoning`) parse eden mantık. WhatsApp
  bot referans kodundaki (`analyzePhoto()`) aynı desen ve prompt esas alındı, 5. kategori
  (`geri_donustur`) eklendi.
- **`lib/db.js`** — SQLite (`better-sqlite3`), `data/app.db` dosyasında. `users` tablosu
  cihaz başına streak/puan/toplam karar tutar, `decisions` tablosu her kararın geçmişini
  tutar.
- **Kimlik** — hesap sistemi yok; `localStorage`'da üretilen bir UUID (`boba_device_id`)
  cihazı tanımlar ve backend'e her istekte gönderilir.
- **`app/page.js`** — tüm ekranları (Ana Sayfa, Tara, Analiz/Karar, Oda Taraması, Kutlama)
  tek sayfalık bir React akışı olarak yönetir; tasarım prototipinin renk/tipografi
  sistemini (`app/globals.css`) birebir kullanır.

## v1 Kapsamı

- Tekli eşya akışı: fotoğraf → AI analizi → onay/manuel seçim → kayıt → kutlama.
- Opsiyonel "Oda Taraması" modu: tek fotoğrafta 6-10 öne çıkan eşyayı listeler, kullanıcı
  her birini onaylayabilir/hariç tutabilir/önerisini değiştirebilir, toplu kaydedilir.
- Kapsam dışı (sonraki aşama): oda bazlı organizasyon, Haftalık İlham/Bakım Modu, aile
  mirası modu, satış platformu entegrasyonu.

## Dağıtım notu

`better-sqlite3` dosya tabanlı bir veritabanıdır ve **kalıcı disk** ister. Vercel gibi
sunucusuz (serverless) platformlarda dosya sistemi her istekte sıfırlanabilir — bu yüzden
üretimde **Render, Railway veya Fly.io** gibi kalıcı disk sunan bir platform kullan, ya da
`lib/db.js`'i bir Postgres bağlantısına (ör. Supabase) taşı. Kodun geri kalanı (`app/api/*`
route'ları) değişmeden kalır; sadece `lib/db.js`'deki sorgular Postgres istemcisiyle
değiştirilir.

`public/icon.svg` yer tutucu bir uygulama ikonudur; gerçek 192x192/512x512 PNG ikonlarla
değiştirilmesi önerilir (bazı Android tarayıcıları SVG manifest ikonlarını tam desteklemez).
