# Bir Oda, Bir Karar

Kişisel eşyaların fotoğrafını çekip AI'dan **tut / sat / bağışla / at / geri dönüştür**
önerisi alan, streak/puan tabanlı bir declutter uygulaması (v1, PWA).

## Kurulum

```bash
npm install
cp .env.example .env.local
```

`.env.local` içine gerçek değerleri yaz:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
ACCESS_CODE=test-grubuna-verecegin-kod
ADMIN_ACCESS_CODE=sadece-senin-bilecegin-ayri-bir-kod
```

`ACCESS_CODE` ve `ADMIN_ACCESS_CODE` olmadan sırasıyla ana uygulama ve `/admin`
paneli 500 döner — ikisi de zorunlu.

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

## Test grubu altyapısı

### 1. Erişim kapısı

`proxy.js` (Next.js 16'da "middleware" artık "proxy" olarak adlandırılıyor — bkz.
`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`), tüm sayfa ve
`/api/*` isteklerini `access_ok` cookie'sine göre gate'liyor. Cookie yoksa `/giris`'e
yönlendiriyor (API istekleri için 401 JSON dönüyor). `/giris`'te girilen kod
`ACCESS_CODE`'a uyarsa `/api/access` httpOnly bir cookie set ediyor (180 gün).
Hesap sistemi yok — herkes aynı paylaşılan kodu kullanıyor.

`/admin` ve `/api/admin/*` bu kapıdan tamamen bağımsız, ayrı bir `admin_ok` cookie'siyle
korunuyor (`/admin-giris` + `ADMIN_ACCESS_CODE`) — test grubu kodunu bilen biri admin
paneline giremez.

### 2. Telemetri

`lib/db.js`'e eklenen `events` tablosu (`device_id, event_type, payload_json, created_at`)
şu olayları tutuyor: `session_start`, `screen_view`, `mode_selected`,
`ai_suggestion_shown`, `decision_confirmed` (AI önerisiyle aynı mı değişti mi bilgisiyle).
İstemci `lib/telemetry.js`'deki `logEvent()` ile `/api/event`'e fire-and-forget POST atıyor
— telemetri hiçbir zaman ana akışı bloklamıyor veya bozmuyor.

### 3. Uygulama içi geri bildirim

Sağ altta sabit duran yuvarlak buton (`components/FeedbackButton.js`) bir metin kutusu
açıyor, `/api/feedback` ile `feedback` tablosuna (`device_id, message, screen, created_at`)
yazıyor.

### 4. Hata yakalama

- `app/error.js`: Next.js'in React error boundary dosya kuralı — render sırasında
  patlayan hataları yakalar, kullanıcıya "bir şeyler ters gitti, tekrar dener misin"
  gösterir ve `errors` tablosuna kaydeder.
- `components/GlobalErrorReporter.js`: `window.onerror` ve `unhandledrejection`
  dinleyicileri — React sınırlarının dışında kalan (event handler, promise) hataları
  **sessizce** `errors` tablosuna kaydeder. Kasıtlı olarak kullanıcıya bir şey
  göstermez: her arka plan hatasında tam ekran uyarı çıkarsa deneyim gereksiz yere
  bozulur; ciddi/render'ı kıran hatalar zaten `app/error.js` tarafından yakalanıp
  gösteriliyor.

### 5. Sahibi paneli (`/admin`)

Sunucu bileşeni olarak doğrudan `lib/db.js`'den okuyor (ayrı bir API katmanı yok):
son 7 günde aktif cihaz sayısı, günlük karar sayısı (basit CSS bar grafik), son 50
geri bildirim ve son 50 hata. `ADMIN_ACCESS_CODE` ile `/admin-giris`'ten giriliyor.

### 6. Ana ekran mesaj sistemi

`lib/homeMessages.js` paylaşılan `ana-ekran-mesajlari.json`'daki 8 kategoriyi ve
soru havuzlarını birebir içeriyor. `lib/db.js`'deki `getHomeMessage()`, her
`/api/state` çağrısında (Ana Sayfa her açıldığında) şu sinyalleri hesaplayıp bir
kategori seçiyor:

- `totalDecisions === 0` → **01_ilk_karşılaşma**
- streak tam olarak 7/14/30'a denk geliyorsa → **07_ilerleme** (bu haftaki gerçek
  karar sayısına göre yüksek/orta/düşük alt havuzu)
- bu oturumda (son `session_start` olayından bu yana) 5+ karar verildiyse →
  **04_kontrol_sende**
- son aktiflikten bu yana 2+ gün geçtiyse → **08_yeniden_karşılaşma**
- bu oturumda 1+ karar verildiyse → **03_bir_adım_daha**
- toplam karar sayısı henüz 5'in altındaysa → **06_küçük_adımlar**
- son aktiflik tam 1 gün önceyse → **05_kendi_ritminde**
- bunların hiçbiri değilse → **02_devamlılık** (varsayılan)

Her kategori (ve 07'nin 3 alt havuzu) kendi `message_state` satırında son gösterilen
satırın index'ini tutuyor, bir sonraki seçim onu hariç tutuyor (rotasyon kuralı).

**Bilinçli sadeleştirmeler / varsayımlar** (kaynak JSON'da net sayısal eşik
verilmeyen yerler için):
- `05_kendi_ritminde` için "seyrek ama düzenli" = tam olarak 1 günlük ara (2+ gün
  zaten 08'e gidiyor).
- `06_küçük_adımlar` için "ilk hafta / düşük aktivite" = toplam karar sayısı < 5.
- "Oturum" sunucuda saklı bir session id değil — `session_start` olayının en son
  ne zaman loglandığından bu yana geçen `decision_confirmed` sayısı olarak
  hesaplanıyor.
- **07_ilerleme**'nin `yuksek_aktivite` durumunda istenen "bu hafta çekilen gerçek
  fotoğraflardan küçük bir 'önce' grid'i" **eklenmedi** — bu, decisions tablosunun
  şu an fotoğraf byte'larını saklamadığı bir görsel özellik (ayrı bir blob/dosya
  depolama katmanı gerektirir); şu an sadece metin gösteriliyor.

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

### Render'a deploy (adım adım)

1. Projeyi GitHub'a push'la (henüz yoksa: `git remote add origin <repo-url>` sonra
   `git push -u origin main`).
2. [render.com](https://render.com)'da **New > Web Service**, GitHub reponu bağla.
3. Ayarlar:
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: en ucuz plan yeterli (test grubu için)
4. **Disks** sekmesinden kalıcı bir disk ekle: **Mount Path** = `/opt/render/project/src/data`,
   en az 1 GB. Bu olmadan her deploy'da SQLite verisi silinir.
5. **Environment** sekmesine şu değişkenleri ekle: `ANTHROPIC_API_KEY`,
   `ANTHROPIC_MODEL`, `ACCESS_CODE`, `ADMIN_ACCESS_CODE`.
6. **Create Web Service** — ilk deploy birkaç dakika sürer. Bitince Render sana
   `https://<servis-adı>.onrender.com` adresini verir; bu, HTTPS ile geliyor
   (PWA kamera erişimi ve güvenli cookie'ler için gerekli).
7. Test için o adrese git → `/giris`'e yönlenmelisin → `ACCESS_CODE`'u gir.

### Railway'e deploy (adım adım)

1. [railway.app](https://railway.app)'te **New Project > Deploy from GitHub repo**,
   reponu seç.
2. Railway `package.json`'ı otomatik algılar; **Settings > Deploy**'da build/start
   komutlarının `npm run build` / `npm start` olduğunu doğrula.
3. **Variables** sekmesine `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ACCESS_CODE`,
   `ADMIN_ACCESS_CODE`'u ekle.
4. **Settings > Volumes**'tan bir volume ekle, mount path `/app/data` (Railway'de
   proje kökü genelde `/app`) — kalıcı SQLite için şart.
5. **Settings > Networking**'ten **Generate Domain** ile bir genel URL al (otomatik
   HTTPS).
6. Deploy tamamlanınca domain'e git, `/giris`'te `ACCESS_CODE`'u test et, sonra
   `/admin-giris`'te `ADMIN_ACCESS_CODE`'u test et.

Her iki platformda da: kod veya env değiştikçe yeni bir deploy tetiklenir, disk/volume
sayesinde `data/app.db` deploy'lar arasında korunur.

`public/icon.svg` yer tutucu bir uygulama ikonudur; gerçek 192x192/512x512 PNG ikonlarla
değiştirilmesi önerilir (bazı Android tarayıcıları SVG manifest ikonlarını tam desteklemez).
