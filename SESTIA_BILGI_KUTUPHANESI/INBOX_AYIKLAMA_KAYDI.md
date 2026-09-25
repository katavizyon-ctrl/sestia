---
belge_turu: ayiklama_kaydi
durum: aktif
---

# Inbox Ayıklama Kaydı

`_INBOX` klasörlerinden yapılan ayıklamaların kaydı.

- `_INBOX` içeriği Git dışında olduğu için hangi dosyanın nereye gittiğini ve eski adının ne olduğunu yalnızca bu kayıt gösterir.
- Yeni satırlar tablonun sonuna eklenir; eski satırlar değiştirilmez.

## Kararlaştırılan kurallar (2026-09-25)

Bu kurallar, ilk deneme ayıklamasında (altı mermer görseli) kullanıcıyla birlikte belirlendi.

**Kullanıcı ne yapar:** Her şeyi kök `_INBOX`'a atar. Klasör seçmez, dosyayı adlandırmak zorunda değildir.

**Ayıklamada ne olur:** Ayıklamayı yapan her dosyayı açıp inceler ve nereye taşınacağına karar verir. Aşağıdaki kurallar bu karar içindir.

1. **Taşıma kararını görselin içeriği belirler.** Dosyanın adı veya nereye bırakıldığı belirlemez.
2. **Mekân varsa iç mekân.** Görselde bir mekân görünüyorsa (mutfak, banyo, koridor…) görsel `07_IC_MEKAN_VE_YERLESIM`'e gider; içindeki malzeme ne olursa olsun.
   - mutfak + mermer = mutfak
   - banyo + mermer = banyo
   - koridor + mermer = koridor
3. **Sadece malzeme varsa malzemeler.** Görselde sadece malzeme veya malzemeler varsa görsel `02_MALZEMELER`'e gider (örnek: seramik + mermer = malzemeler).
4. **Gerçek / yapay zekâ klasörü değiştirmez.** Render veya yapay zekâ şüphesi yalnızca etikettir: adda `_ai-olabilir`, ayrıca kayıtta.
5. **Belirsizse konuşulur.** Görselin konusu veya mekânı belli değilse (örnek: pencere görünüyor ama hangi oda olduğu belli değil) kullanıcıyla konuşulup birlikte karar verilir. Karar verilene kadar dosya yerinde kalır.
6. **Ad, gideceği klasörü söyler.** Ayıklamayı yapan, dosyayı gideceği klasöre göre yeniden adlandırır: `<klasör-kelimesi>_<konu>_<ayrıntı>[_ai-olabilir]`. Örnek klasör kelimeleri: `malzeme_`, `icmekan_`. Kategori numarası kullanılmaz, çünkü kategori numaraları henüz kesin değil. Eski ad bu kayıtta saklanır.
7. **Bağlantılar kayıtta.** Görselin ilgili olduğu diğer kategoriler bu kayda "İlgili" olarak yazılır.

**Henüz karar verilmeyenler:**
- ayıklamayı kimin ve ne zaman yapacağı;
- görsel dışı materyalin (makale, PDF, NotebookLM çıktısı) nasıl ayıklanacağı.

## Kayıtlar

| Tarih | Eski ad | Yeni ad | Nereden | Nereye | Ne gösteriyor | İlgili | Özgünlük |
|---|---|---|---|---|---|---|---|
| 2026-09-25 | `blog-1766913347-3579.webp` | `malzeme_mermer_beyaz-gri-bordo_studyo-kompozisyon_ai-olabilir.webp` | `02_MALZEMELER/_INBOX` | yerinde (yeniden adlandırıldı) | Stüdyo kompozisyonu: beyaz-gri, gri ve bordo mermer plakaları, küp, küre; traverten benzeri blok | `05_RENK` (renk ve damar karşılaştırması) | Muhtemelen render |
| 2026-09-25 | `blog-1775158591-8543.webp` | `malzeme_mermer_damar-cesitleri_showroom-plakalar_ai-olabilir.webp` | `02_MALZEMELER/_INBOX` | yerinde (yeniden adlandırıldı) | Showroom'da yan yana plakalar: siyah, beyaz-altın, mor, gri-bordo damarlar | `05_RENK` (damar paleti) | Muhtemelen yapay zekâ |
| 2026-09-25 | `deep-green-block-1-1-b.webp` | `malzeme_mermer_koyu-yesil-deep-green_ham-blok-ocak.webp` | `02_MALZEMELER/_INBOX` | yerinde (yeniden adlandırıldı) | Ocakta ham blok: koyu yeşil zemin, beyaz damarlar | Aynı taşın plakasıyla eş | Gerçek fotoğraf. "Deep Green" ticari ad, doğrulanmadı |
| 2026-09-25 | `deep-green-slab-1-1-b.webp` | `malzeme_mermer_koyu-yesil-deep-green_plaka-fabrika-TR-K5387.webp` | `02_MALZEMELER/_INBOX` | yerinde (yeniden adlandırıldı) | Aynı taşın fabrikada kesilmiş plakası; "TURKEY K5387 / 2" etiketi | Ham blokla eş | Gerçek fotoğraf |
| 2026-09-25 | `blog-1778299212-2878.webp` | `icmekan_koridor_bookmatch-mermer-duvar_ai-olabilir.webp` | `02_MALZEMELER/_INBOX` | `07_IC_MEKAN_VE_YERLESIM/_INBOX` | Koridor ve oturma alanı: bookmatch kırmızı damarlı beyaz mermer duvar, çizgili gri mermer zemin ve duvar, ceviz dolaplar | `02_MALZEMELER` → mermer | Muhtemelen render. Plakalar mermer görünümlü porselen de olabilir |
| 2026-09-25 | `rosso-laguna-gallery-1-1-1-b.webp` | `icmekan_banyo_bordo-mermer-kaplama-rosso-laguna.webp` | `02_MALZEMELER/_INBOX` | `07_IC_MEKAN_VE_YERLESIM/_INBOX` | Tamamı bordo, beyaz damarlı mermerle kaplı banyo; altın armatürler, gizli LED | `02_MALZEMELER` → mermer (ıslak alanda kireçli taş); `05_RENK` (bordo + altın) | Gerçek olabilir, rötuşlu olabilir. "Rosso Laguna" ticari ad, doğrulanmadı |
| 2026-09-25 | `IMG_7108.jpeg` | `malzeme_mermer_gri-cizgili_zemin_01_genel.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Gri, ahşap damarı görünümlü çizgili mermer zemin; cilalı, derzlerde kir, yüzeyde toz ve küçük parçacıklar | — | Kullanıcının kendi fotoğrafı (gerçek). Taşın adı bilinmiyor |
| 2026-09-25 | `IMG_7108 (1).jpeg` | `malzeme_mermer_gri-cizgili_zemin_01_genel_kopya.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | IMG_7108 ile bayt bayt aynı dosya (MD5 846167fa…) | IMG_7108 | Kopya. Silinmedi, işaretlendi |
| 2026-09-25 | `IMG_7109.jpeg` | `malzeme_mermer_gri-cizgili_zemin_02_yakin.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Aynı gri çizgili zemin, daha yakın; yansıma ve lekeler | — | Kullanıcının fotoğrafı |
| 2026-09-25 | `IMG_7110.jpeg` | `malzeme_mermer_gri-cizgili_zemin_03_gunisigi-parlak-yuzey.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Aynı zemin gün ışığında: yüksek parlaklık, noktasal lekeler ve çukurcuklar, derz kiri | — | Kullanıcının fotoğrafı |
| 2026-09-25 | `IMG_7111.jpeg` | `malzeme_ahsap_mese-parke_01_budak-cizik.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Geniş tahtalı, budaklı (rustik) parke; derz aralıkları, bir çizik | — | Kullanıcının fotoğrafı. Meşe olduğu görsel tahmin. Masif mi lamine mi kenardan görülmeden bilinemez |
| 2026-09-25 | `IMG_7112.jpeg` | `malzeme_ahsap_mese-parke_02_budak-catlaklari.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Aynı parke; budak çevresinde lif yönünde çatlaklar, derz aralıkları | — | Kullanıcının fotoğrafı |
| 2026-09-25 | `IMG_7113.jpeg` | `malzeme_ahsap_mese-parke_03_renk-desen-farki.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Daha dar ve az budaklı tahtalar; tahtalar arasında renk farkı, düz ve katedral desen bir arada | — | Kullanıcının fotoğrafı. 01–02 ile aynı zemin olmayabilir |
| 2026-09-25 | `IMG_7114.jpeg` | `malzeme_ahsap_mese-parke_04_derz-araliklari.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Mat, açık tonlu parke; derzlerde koyu kir ve açılma | — | Kullanıcının fotoğrafı. 03 ile aynı zemin olabilir |
| 2026-09-25 | `IMG_7116.jpeg` | `malzeme_mermer_bej_zemin_01_matlasma-leke.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Bej zeminli, gri damarlı mermer karolar; cilası gitmiş, mat bölgeler, lekeler, kirli derzler | — | Kullanıcının fotoğrafı. Matlaşma aşınmadan veya asitle aşınmadan (etching) olabilir; ayırt edilemedi |
| 2026-09-25 | `IMG_7117.jpeg` | `malzeme_mermer_bej_zemin_02_duvar-dibi-asinma.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Aynı bej mermer, duvar dibi; yoğun matlaşma, koyu leke, açık derzler | — | Kullanıcının fotoğrafı |
| 2026-09-25 | `IMG_7118.jpeg` | `malzeme_mermer_bej_zemin_03_duvar-dibi-asinma-ikinci-cekim.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | IMG_7117 ile hemen hemen aynı kare (ışık farkı) | IMG_7117 | Kullanıcının fotoğrafı. Aynı dosya değil, benzer çekim |
| 2026-09-25 | `IMG_7119.jpeg` | `malzeme_mermer_bej_merdiven_01_basamak-asinma.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Bej mermer merdiven: yuvarlatılmış (bullnose) basamak kenarları, süpürgelik, paslanmaz korkuluk; basamaklarda aşınma ve leke | `07_IC_MEKAN` (merdiven) | Kullanıcının fotoğrafı. Zemin karolarıyla aynı taş olabilir |
| 2026-09-25 | `IMG_7120.jpeg` | `malzeme_mermer_bej_merdiven_02_pembe-renk-degisimi-kenar.jpeg` | `_INBOX` (kök) | `02_MALZEMELER/_INBOX` | Merdiven yakın plan: basamakta pembe-kırmızı renk bölgesi, kenar çentikleri, damar ve çatlak benzeri çizgiler, küçük bir boya/kalem izi | `07_IC_MEKAN` (merdiven) | Kullanıcının fotoğrafı. Pembe bölge taşın doğal rengi mi leke mi, fotoğraftan kesin değil |
