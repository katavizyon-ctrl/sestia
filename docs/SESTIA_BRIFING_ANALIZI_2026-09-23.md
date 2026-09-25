# Sestia — Proje brifingi ve mevcut durum analizi

**Tarih:** 23 Eylül 2026  
**İncelenen ana belge:** `BIR_ODA_BIR_ESYA_SESTIA_TAM_PROJE_BRIFINGI.md`  
**Kapsam:** Ürün, karakter, deneyim, bilgi kütüphanesi ve seçili uygulama kodunun karşılaştırmalı incelenmesi.

## 1. Ana değerlendirme

Projenin merkezinde, kullanıcının yaşam alanını kendi ihtiyaçlarına göre yeniden düşünmesine yardımcı olan, somut fikir üretebilen ve onunla birlikte geliştirebilen Sestia var. Tek Eşya ve Oda Taraması bu ilişkinin giriş yolları. Beş karar etiketi ise bu ilişkinin yalnızca belirli bir işini karşılıyor.

Brifing bu amacı güçlü biçimde tarif ediyor. Özellikle mevcut eşyayı değerlendirmekle onu korumayı dayatmak arasındaki ayrımı, kullanıcının fikrini değiştirme hakkını ve yaratıcı önerinin teknik doğrulamayla aynı şey olmadığını iyi koruyor. Asıl geliştirme meselesi artık bu fikrin tanımlanması değil; karakter, bilgi ve kullanıcı geçmişinin tek bir gerçek yolculukta birlikte çalışması.

Mevcut dosyalar üç farklı olgunluk düzeyi gösteriyor:

- **Karakter ve ürün niyeti:** Ayrıntılı biçimde tanımlanmış; uygulamada ortak karakter temeli dört ana AI görevine ulaşmış.
- **Fotoğraflı değerlendirme ve oda kayıtları:** Somut kod ve kayıt yapıları var. Bu inceleme onların bütün çalışma koşullarında doğru çalıştığını sınamadı.
- **Yaratıcı ortaklık, kapsamlı hafıza ve bilgiye dayalı uyarlama:** Parçaları hazırlanmış, fakat uçtan uca deneyim henüz kurulmuş görünmüyor.

En önemli sonuç: **Sestia'nın daha iyi konuşması ile kullanıcının odasını gerçekten takip edip ona özgü, kaynaklı fikir geliştirmesi farklı işler.** İlki prompt ve editoryal kaliteyle ilerler; ikincisi doğru bağlam, kalıcılık, bilgi erişimi ve çalışma durumu gerektirir.

## 2. İncelemenin yöntemi ve sınırı

Ana brifingin 29 bölümü incelendi. Karakter dosyası, Faz 1 test bulguları, seçili hafıza denetimi bölümleri, uygulamanın temel AI/sohbet/kimlik/kayıt dosyaları, bilgi şeması ve örnek kütüphane kayıtları karşılaştırıldı. Kütüphanenin klasör ve dosya envanteri kontrol edildi.

Belgedeki eski görevler ve geleceğe yönelik talimatlar, bu oturumda verilmiş uygulama siparişi olarak alınmadı. Bu çalışma inceleme ve analizdir. Uygulama kodu değiştirilmedi; yeni özellik uygulanmadı.

**Kanıt ayrımı:**

- **Brifing/kanon:** Hedef davranışı ve geçmiş kararları anlatır.
- **Güncel kod:** Yerel çalışma ağacında mevcut yapıyı gösterir.
- **Eski test raporu:** Yalnızca çalıştırıldığı zamanki örneklerin kanıtıdır.
- **Analitik çıkarım:** Kaynaklardan hareketle yapılan değerlendirmedir; yeni onaylı ürün kararı değildir.

Canlı uygulama, production, gerçek kullanıcı veritabanı ve ücretli model çağrıları test edilmedi. Görsel referanslar piksel düzeyinde karşılaştırılmadı. 29 görselin renk değerleri veya dış kaynakların doğruluğu yeniden doğrulanmadı. Bu rapor görsel, güvenlik veya performans denetimi değildir.

Çalışma ağacında inceleme öncesinden kalan çok sayıda değiştirilmiş ve takip edilmeyen dosya bulunuyor. Dolayısıyla aşağıdaki kod bulguları **yerel mevcut dosyalara** aittir; yayımlanmış sürüme ya da belirli bir commit'e ait oldukları ileri sürülmüyor.

## 3. Ürün fikrinin güçlü tarafları

### Gerçek bir ihtiyaçtan doğuyor

Analog atölyenin dijital çalışma alanına dönüşmesi, ürünün becerilerini sınamak için güçlü bir başlangıç senaryosu. Aynı anda işlev, eldeki mobilya, çalışma alışkanlığı, malzeme, ışık ve kişisel geçmiş içeriyor. Sestia bu senaryoda anlamlı bir fark yaratırsa ürün vaadinin önemli kısmını göstermiş olur.

Bu senaryo ürünün yalnızca atölyelere hizmet etmesi gerektiği anlamına gelmez. Başlangıç problemi somut; kapsam oda, köşe ve eşya düzeyinde genişleyebilir.

### Kullanıcının karar alanı korunuyor

Sestia'nın fikir sahibi olması ve karar vermeyi kullanıcıya bırakması bir çelişki değil. Bir önerinin gerekçesini açıklayabilmesi, alternatif geliştirebilmesi ve reddedildiğinde yön değiştirmesi, karakterin temel işlevi. Sürekli soru sormak bu sorumluluğun yerini tutmuyor.

### Keşif ve gerçek çalışma ayrılıyor

Fotoğrafsız konuşmak, bir referansı merak etmek ve bir odada çalışmaya başlamak farklı ihtiyaçlar. Bunların ayrılması, kullanıcıyı erken kayıt/karar baskısından koruyor. Bununla birlikte çalışma başladıktan sonra da serbest keşif ihtiyacı devam eder; ayrım kalıcı bir kapıya dönüşmemeli.

### Bilgi sahipliği doğru düşünülmüş

Karakter, genel bilgi ve özel kullanıcı hafızasının ayrılması projenin en sağlam mimari kararlarından biri. Sestia genel bir ahşap bilgisini kullanıcının masasına uygulayabilir; bunun için özel masa fotoğrafının genel kütüphaneye aktarılması gerekmez.

## 4. Brifingin belge olarak değerlendirilmesi

Brifing, geçmiş yanlış anlaşılmaları ve kararların nedenlerini koruyan iyi bir devir belgesi. Özellikle onaylı yaklaşım ile kilitlenmiş replik, yerel dosya ile canlı yetenek, raporlanmış başarı ile doğrulanmış sonuç arasındaki ayrımlar değerli.

Ancak günlük geliştirme için üç sınırlılığı var:

1. **Tarihsel durum hızla eskiyor.** Bazı açıklar yerel kodda kapanmış. Brifingi tek güncel teknik envanter olarak kullanmak aynı işi yeniden yaptırabilir.
2. **Farklı kanıtlar zaman zaman aynı etikette birleşiyor.** “Kodda/raporda doğrulanmış” tek etiket olarak fazla geniş: bir raporda yazması, kodda bulunması ve canlıda çalışması üç ayrı kanıt.
3. **Tekrarlar kararları bulmayı zorlaştırıyor.** Hafıza sınırları, 29 referansın korunması ve iletişim hataları farklı bölümlerde yeniden anlatılıyor. Devir için yararlı bu tekrarlar, uygulanabilir kabul ölçütlerinin yerini tutmuyor.

Belgeyi yeniden yazmak bu incelemenin gereği değil. Bundan sonraki işlerde ilgili ilke, güncel kod karşılığı ve kabul ölçütünü birlikte belirtmek yeterli olur. Yeni bir yönetim sistemi kurmak gerekmiyor.

## 5. Brifing ile güncel kod arasındaki farklar

| Konu | Brifingdeki tarihsel durum | Bu incelemede görülen yerel durum |
|---|---|---|
| Ortak Sestia karakteri | Yalnızca Keşif sohbetine bağlı | `SINGLE_PROMPT`, `ROOM_PROMPT`, `TIPS_PROMPT`, `CHAT_PROMPT` ortak temeli kullanıyor. |
| Keşif sohbeti kalıcılığı | Yenilenince kayboluyor | Mesajlar `KesifView` içindeki React state'inde; API kayıt yapmıyor. Açık sürüyor. |
| Bilgi kütüphanesine erişim | Canlı modele bağlı değil | İncelenen AI çağrı zincirinde dosya getirme veya kütüphane arama bağlantısı yok. |
| Geri bildirim hatası | Ağ hatasında mesaj gösterilmeyebiliyor | Bileşen `res.ok` kontrol ediyor, hata gösteriyor ve yazılan metni koruyor. Kod düzeyinde ele alınmış. |
| Giriş e-postası dili | Varsayılan İngilizce | Özel Türkçe e-posta gönderim işlevi var. Gerçek teslimat denenmedi. |
| Giriş ürün anlatısı | Dar karar anlatısı | Üst açıklama genişlemiş; “Nasıl Çalışır?” hâlâ fotoğraf ve beş karara dayanıyor. Kısmi ilerleme. |
| Metadata | Eski karar odaklı vaat | `app/layout.js` açıklaması hâlâ beş eşya kararını merkeze alıyor. |
| Karar vermeden çalışma alanına geçiş | Sorunlu olabileceği belirtilmiş | `hasStartedRealWork` karar sayısına ek olarak oda kaydı varlığını kontrol ediyor. |
| Oda analizinin korunması | Geçmişte kayıp sorunu raporlanmış | Kalıcı analiz ve aktif tarama ayrı; temizleme işlevi `room_scans` kaydını siliyor. Uçtan uca kayıp testi yapılmadı. |

Bu tablo, “brifing yanlış” sonucunu doğurmuyor. Brifing zaten eski raporlara dayandığını söylüyor. Çıkarım, tarihsel teknik durumun bugünkü iş listesine doğrudan kopyalanmaması gerektiği.

## 6. Karakter: güçlü tarif, sınırlı davranış kanıtı

Ortak karakterin dört görevde kullanılması önemli ilerleme. Kimlik, Türkçe, kullanıcı tercihine saygı ve somut fikir beklentisi tek kaynaktan geliyor. JSON görevlerinin çıktı sözleşmesi de ayrıca korunuyor.

Buna rağmen görev talimatları davranışı belirlemeye devam ediyor. Tek Eşya akışı her turda bir karar etiketi üretmek zorunda; oda akışı en fazla on taşınabilir eşyanın değerlendirmesine odaklanıyor. Yaratıcı oda planı bu şemanın birinci sınıf çıktısı değil. Ortak karakter eklemek bu yapısal sınırı kaldırmıyor.

Faz 1 raporundaki somut fikir testinde model iki tur boyunca soru sormuş. Bu, bugünkü model davranışının yeniden ölçümü değil; ancak “promptta yazıyor, o hâlde oluyor” varsayımına karşı gerçek bir geçmiş kanıt.

Karakterin değerlendirilmesi için asıl ölçü güzel cümle değil, karşılık verme becerisi:

- Kullanıcının itirazı öneriyi gerçekten değiştiriyor mu?
- Yeni bir fikir istendiğinde işlevsel olarak farklı bir alternatif geliyor mu?
- Tek adım isteğinde ayrıntı azaltılıyor mu?
- Fotoğraf yanlış yorumlandıktan sonra düzeltme korunuyor mu?
- Hatıra eşyasında özgün biçimin kullanıcı için önemi hesaba katılıyor mu?

Karşılama ve kıvılcım koleksiyonu hâlâ soru ağırlıklı. `lib/sestiaLibrary.js` içinde 12 karşılama ve 15 kıvılcım var; kıvılcımların 14'ü soru ile bitiyor. Bu, canlı modelden bağımsız bir editoryal tutarlılık konusu.

## 7. Keşif sohbetinde üç somut sınır

### Kalıcılık vaadi ile kayıt davranışı ayrışıyor

“Birlikte düşündüklerimiz burada kalır.” metni mevcut; serbest sohbet mesajları sunucuya kaydedilmiyor. Bu yalnızca teknik eksik değil, beklenti sorunu. Kullanıcı bir fikir geliştirdikten sonra geri dönemiyorsa ürünün süreklilik vaadi zedelenir.

Kalıcılığın çözümü otomatik oda oluşturmak olmamalı. Sohbet kendi başına saklanabilir; çalışmaya dönüştürmek ayrı bir kullanıcı hareketidir.

### Seçilen bağlam ilk çağrıyla sınırlı

`sendSestiaChat`, `sectionContext` değerini yalnızca mesaj listesi boşken gönderiyor. Sonraki isteklerde bu alan `null`; API de her çağrının sistem bağlamını yeniden kuruyor. Önceki yanıtta konu açıkça anılmışsa model dolaylı olarak sürdürebilir, fakat başlangıç kartının bağlamı ayrı bir veri olarak korunmuyor.

Ayrıca “İlham kıvılcımı” etiketi gerçek kıvılcım metnini taşımıyor. Kullanıcının “bunu benim masama uygulasak” demesine yetecek bir referans aktarımı henüz yok.

### Derinleşme isteğiyle teknik sınır çatışabilir

Serbest sohbet yanıtı `max_tokens: 400` ile sınırlı. Model bu sınıra ulaşırsa metin kısmen gösterilmek yerine hata sayılıyor. Ayrıntılı bir tasarım açıklamasında genel hata görünmesi bu nedenle mümkün; bu incelemede yeniden üretilmedi.

Sohbet doğrulayıcısı en fazla 41 giriş mesajına izin veriyor. Normal dönüşümlü akışta bu 21 kullanıcı turuna karşılık geliyor; son yanıttan sonra arayüz yeni mesajı engelliyor. Kullanıcıya aşağıdaki oda/eşya akışına geçmesi söyleniyor. Bu sınır maliyeti kontrol ediyor olabilir, ancak serbest keşif ihtiyacının sürekliliğine ayrı çözüm getirmiyor.

## 8. Hafıza ve çalışma durumu

Brifingin düşünce, öneri, karar ve uygulanmış değişiklik ayrımı ürünün temel gereksinimi. “Yatağı kaldırabiliriz”, “kaldırmaya karar verdim” ve “kaldırdım” aynı kayıt olamaz.

Mevcut oda yapısında yararlı bir başlangıç var: `room_analyses` kalıcı değerlendirmeyi, `room_scans` aktif çalışmayı tutuyor. Modelin ilk değerlendirmesi ve kullanıcının nihai seçimleri için ayrı alanlar da bulunuyor. Fakat bu, bütün yaratıcı proje durumlarının modellendiğini göstermiyor.

Kalıcı analiz önce, aktif tarama sonra yazılıyor. Aktif tarama temizlenirken kalıcı analiz silinmiyor. Bu olumlu kod bulgusu, fotoğrafların ve konuşmanın bütün yeniden giriş senaryolarında eksiksiz geri geldiğinin kanıtı değil.

Temizleme rotasında nihai seçimlerin kaydı “en iyi çaba” yaklaşımıyla ele alınıyor; geçersiz nihai içerikte aktif tarama yine temizlenebiliyor. Bu durum önceki analizin bütünüyle kaybı demek değil, ancak tarihçenin kullanıcının son seçimlerini doğru yansıtması açısından hedefli test gerektiriyor.

Misafir ve hesap kimliği ayrımı kodda açık. İncelenen kimlik ve hesap oluşturma yollarında misafir verisini hesaba taşıyan bir adım görülmedi. Bunu bütün olası giriş yollarının tam denetimi olarak sunmuyorum; kullanıcıya “hesaba geçince her şeyin taşınır” vaadi verilmeden önce ayrı doğrulama gerekir.

Bir diğer ürün ayrıntısı: `hasStartedRealWork` herhangi bir oda kaydını başlamış çalışma sayıyor. Boş oda oluşturup vazgeçen kişi ile fotoğrafı ve analizi olan kişi bu düzeyde aynı sınıfa giriyor. Bunun istenen davranış olup olmadığı henüz açık bir kabul ölçütüne ihtiyaç duyuyor.

## 9. Bilgi kütüphanesi: gerçek bir başlangıç, henüz genel uzmanlık tabanı değil

Yerel envanter, ham referansların ve analiz katmanının varlığını doğruluyor: 29 görsel, 29 kartela analiz dosyası, 7 küme dosyası ve 12 özgün paletin Markdown/SVG çiftleri bulunuyor. Bunların varlığını doğrulamak, içeriklerinin görsel veya bilimsel doğruluğunu onaylamak değildir.

On ana konu alanından nesneler/bileşenler, dönüşüm, tasarım tarihi, yaşam/kullanım ve sürdürülebilirlik klasörlerinde dosya yok. Malzeme, DIY, ışık ve yerleşimde birer dosya var; bu dosyalar renk çalışmasıyla ilişkili. Dolayısıyla kütüphane bugün ağırlıklı olarak renk ekseninde geliştirilmiş.

Bu yanlış başlangıç değil; renk bilinçli olarak seçilmiş. Ancak sandalyeden başka bir ürün oluşturma gibi becerileri bu envanterin şimdiden desteklediğini söylemek doğru olmaz. Bunun için nesne, bileşen, malzeme, yöntem ve hedef işlev arasında gerçek bilgi bağlantıları gerekiyor.

### Yedi küme meselesinin asıl anlamı

Sorun yedi sayısının küçük olması değil. Sıcaklık, kontrast, atmosfer, görsel biçim ve kaynak türünün aynı sınıflandırma düzeyinde birleşmesi, arama ve karşılaştırmayı belirsizleştiriyor. “Marka paleti” bir kaynak/format niteliği; “yüksek kontrast” görsel bir özellik. Bir kayıt ikisini de taşıyabilir.

Çok eksenli etiketleme bu koleksiyona uygun bir yön. Bu analiz yeni bir taksonomiyi onaylamıyor ve mevcut dosyaları yeniden sınıflandırmıyor. Bütün 29 referans korunmalı; çalışma grupları koleksiyonun değeri veya kullanıcı beğenisi hakkında eleme kararı sayılmamalı.

### Şema ile gerçek içerik arasında somut fark var

Örneklenen `kartela_ref_013` kaydı `sira_no`, `orijinal_dosya`, `gecici_baslik`, `referans_turu`, `etiketler` kullanıyor. Genel bilgi şemasındaki sabit `id`, `type`, `status` yapısıyla aynı formatta değil. İki farklı içerik ailesi bulunması makul; ancak canlı erişim için aralarında açık bir eşleme gerekecek.

`palet_12_az_dogal_isikli_mekan.md`, `reference_isik-ve-renk-algisi` kaydına `USES_METHOD` ilişkisi veriyor. Şema bu ilişkiyi Project → Method olarak tanımlıyor; hedef kayıt ise `reference`. Bu, örnek düzeyinde doğrulanmış bir ilişki-tipi uyumsuzluğu. Bütün kütüphanenin hatalı olduğunu göstermiyor; otomatik erişimden önce küçük bir bütünlük kontrolünün neden değerli olacağını gösteriyor.

`status` alanında köken ve doğrulama aşamasının birleşmesi de çözülmesi gereken kavramsal sorun. Sestia'nın yaratıcı fikri sonradan denenebilir; fikir kökeni değişmeden uygulama kanıtı artar. Aynı şekilde `last_updated` tarihinin şema sürümü yerine kullanılması yeterli değil.

## 10. Deneyimin bütünlüğü ve başarı ölçüsü

Ürün adı, karakter ve Keşif geniş bir yaşam alanı vaadi taşıyor. Girişin adım anlatısı ve fotoğraflı şemalar ise hâlâ karar vermeyi merkeze alıyor. Kullanıcının ürünü bir ayıklama uygulaması sanması bu nedenle anlaşılır bir sonuç olabilir.

Kodda puan ve seri hesapları karar kayıtlarına dayanıyor. Karar sayısı yararlı bir kullanım ölçüsü olabilir; ancak fikir geliştirmek, bir odayı daha iyi anlamak veya hiçbir değişiklik yapmamaya karar vermek de ürün değeridir. Sadece karar sayısına bakmak ürünün dar kısmını ödüllendirme riski taşır.

Bu, puanların şimdi kaldırılması gerektiği anlamına gelmez. Başarı ölçüsünün kapsamı genişletilebilir: kullanıcı konuşmasına geri dönebildi mi, somut ve kendisine uygun bir fikir alabildi mi, düzeltmesini tekrar etmek zorunda kaldı mı, denediği değişikliğin sonucunu paylaşabildi mi? Bunlar önerilen değerlendirme sorularıdır; yeni veri toplama uygulaması değildir.

## 11. Önceliklendirme önerim

Bu sıralama geliştirme kararı veya başlatılmış iş değil; mevcut bulgulara dayalı öneridir.

| Öncelik | İş | Gerekçe | Tamamlanma kanıtı |
|---|---|---|---|
| 1 | Mevcut devam etme/kayıt akışını sınamak | Kullanıcının emeğini korumak temel vaat | Karar vermeden çıkıp dönünce aynı fotoğraf, analiz ve doğru kullanıcı seçimleri görünür. |
| 2 | Keşif sohbeti ve seçili bağlamın sürekliliği | Birlikte düşünmenin kaybolmasını engeller | Yenilemede sohbet ve kaynak bağlamı geri gelir; otomatik oda/karar oluşmaz. |
| 3 | Karakter davranışını hedefli karşılaşmalarla ölçmek | Ortak prompt var; davranış başarısı henüz yeterince kanıtlı değil | Somut fikir, farklı alternatif, itiraz, tek adım ve düzeltme örnekleri ayrı değerlendirilir. |
| 4 | Bir bilgi kaydından gerçek uyarlamaya dar bağlantı kurmak | Kütüphanenin kullanıcıya yararını gösterir | Kullanıcı seçtiği paleti tekrar tarif etmeden kendi eşyasıyla ilişkilendirebilir. |
| 5 | Gerçek atölye senaryosunun bilgi boşluklarını doldurmak | Araştırmayı ürün ihtiyacına bağlar | Nesne/malzeme/yöntem/işlev kayıtları somut öneriyi destekler. |
| 6 | Ürün anlatısı ve içerik dilini hizalamak | Ekranlar aynı deneyimi vaat eder | Fotoğrafsız keşif ve karar dışı değer ilk karşılaşmada anlaşılır. |

İlk aşamada büyük bir grafik veritabanı, çok ajanlı araştırma sistemi veya bütün kategorileri doldurma seferberliği gerekli görünmüyor. Küçük ama tamamlanmış bir bilgi → sohbet → kişisel uyarlama → geri dönüş akışı daha açıklayıcı bir ürün kanıtı sağlar.

## 12. Açık kalan kararlar

İleride ilgili özellik ele alındığında netleştirilmesi gereken konular:

- Keşif konuşmalarının ayrı oturumlara bölünmesi, adlandırılması, silinmesi ve bir odaya bağlanması nasıl işleyecek?
- Boş oda kaydı kişisel çalışma alanına geçmek için yeterli sayılacak mı?
- Kullanıcı bir fikir için “bunu yaptım” dediğinde hangi durum kaydedilecek; sonradan vazgeçme nasıl gösterilecek?
- Seçilen ilhamın hangi sürümü konuşmaya bağlanacak? İçerik güncellendiğinde eski konuşma kendi bağlamını koruyacak mı?
- Genel bilgi kaydının kökeni, doğrulama durumu ve kullanım sınırı nasıl ayrılacak?
- İlk bütünleşik yaratıcı akış, mevcut paletlerden mi yoksa atölye dönüşümünden mi başlayacak?

Bu kararların tamamını şimdi kullanıcıya sormak gerekmiyor. Her biri ilgili somut işin kapsamı içinde ele alınabilir.

## 13. Son değerlendirme

Brifingden çıkan ürün yönü tutarlı: Sestia, kullanıcının gerçek yaşam alanına dikkat eden, bilgisiyle somut fikir geliştiren ve karar alanını koruyan bir ortak olmalı. Yerel uygulama bu hedefe yönelik kayda değer parçalar içeriyor; brifingde eski kalmış bazı açıklar da kodda ele alınmış.

En büyük eksik daha fazla özellik adı veya daha uzun karakter metni değil. **Konuşulan fikrin, ilgili bilginin, gerçek odanın ve değişen kullanıcı kararının birbirine doğru bağlanması.** Bu bağlantı kurulmadan yeni ekran ve içerik sayısının artması deneyimi büyütür; sürekliliği kendiliğinden sağlamaz.

## Kaynak izi

Dosya yolları proje köküne göredir. Aşağıdaki liste tam okuma ile hedefli inceleme ayrımını korur:

- Ana kaynak: `docs/BIR_ODA_BIR_ESYA_SESTIA_TAM_PROJE_BRIFINGI.md` — 29 bölüm.
- Karakter karşılaştırması: `docs/SESTIA_KARAKTER_DOSYASI_v1.md`.
- Geçmiş test bulguları: `docs/SESTIA_KARAKTER_YENILEME_FAZ1.md`, özellikle §7.
- Destekleyici hedefli okuma: `docs/SESTIA_HAFIZA_MIMARISI_DENETIM.md`, test ve hafıza başlıkları.
- AI görevleri ve limitler: `lib/anthropic.js`, özellikle `SESTIA_CHARACTER_BASE`, dört görev promptu, `validChatMessages`, `chatFreely`.
- Keşif durumu ve bağlam aktarımı: `app/page.js`, `KesifView`; `app/api/sestia-chat/route.js`.
- Kalıcılık ve çalışma sınıflaması: `lib/db.js`; `app/api/state/route.js`; `app/api/rooms/[id]/scan/route.js`.
- Kimlik ve Türkçe e-posta: `lib/identity.js`, `lib/auth.js`.
- Ürün anlatısı ve hata davranışı: `app/giris/page.js`, `app/layout.js`, `components/FeedbackButton.js`.
- Sabit içerik koleksiyonu: `lib/sestiaLibrary.js`.
- Bağımlılık ve komut envanteri: `package.json`.
- Şema incelemesi: `SESTIA_BILGI_KUTUPHANESI/91_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md`.
- Örnek kayıtlar: renk alanındaki `kartela_ref_013_sekiz_ruh_halli_moodboard.md`, `palet_12_az_dogal_isikli_mekan.md`; ışık alanındaki `isik_ve_renk_algisi.md` başlık/veri alanları.

**Bu çalışmanın çıktısı yalnızca bu analiz dosyasıdır.** Test başarı sayısı, canlıya çıkış, görsel onay veya uygulanmış yeni ürün kararı bildirilmemektedir.

## 14. Canlı entegrasyon testleriyle birlikte değerlendirme

**Ek değerlendirme: 23 Eylül 2026.** Kaynak: `SESTIA_KARAKTER_ENTEGRASYON_TESTLERI.md`. Önceki bölümler ilk incelemenin kaydı olarak korunmuştur. Aşağıdaki değerlendirme, başka bir oturumun raporladığı üç model çağrısına dayanır; çağrılar burada yeniden çalıştırılmadı, geçici klasördeki ham sonuçlar ve test görselleri bağımsız incelenmedi. İlgili prompt ve doğrulayıcı satırları güncel kodda yeniden kontrol edildi.

### 14.1 Üç belgenin birlikte söylediği

Brifing hedefi tanımlıyor: bağlama dikkat eden, somut fikir geliştiren, kullanıcının kararını ve gerçek yaşam durumunu birbirine karıştırmayan Sestia. İlk analiz bu hedef ile uygulamanın yapısı arasındaki boşlukları gösteriyor. Yeni test raporu ise bazı boşlukların gerçek model yanıtlarında nasıl ortaya çıktığını örnekliyor.

Artık yalnızca “karakter talimatlarının davranışa dönüşüp dönüşmediğini bilmiyoruz” noktasında değiliz. Üç örnekte biçimsel olarak kabul edilen çıktılar alınmış; bunların içinde somut fikir eksikliği, desteklenmeyen durum çıkarımı ve tekrarlanan soru görülmüş. Bununla birlikte üç tekil örnekten başarı oranı, hata sıklığı veya eski sürüme göre iyileşme çıkarılamaz.

**Güncellenmiş teşhis:** Karakter entegrasyonu kod düzeyinde var; test edilen örneklerde davranış uyumu kısmi. Ürünün daha geniş süreklilik ve bilgi erişimi gereksinimleri bu testlerle ölçülmedi.

### 14.2 En önemli ortak hata: bilinenden fazlasını sonuç saymak

Haftalık önerideki “Masa lambası da gittiğine göre” ve oda analizindeki “Aktif kullanımda olduğu varsayılabilir” farklı yüzeylerde aynı problemi gösteriyor:

| Eldeki bilgi | Modelin eklediği bilgi | Neden desteklenmiyor? |
|---|---|---|
| Lamba için bağışlama kararı kaydedilmiş | Lamba fiziksel olarak gitmiş | Uygulama sonucu bildirilmemiş. |
| TV fotoğrafta görünüyor | TV aktif kullanılıyor | Görsel, kullanım alışkanlığını kanıtlamıyor. |

İlk hata önerinin dayanağını değiştiriyor: olmayan bir aydınlatma eksikliği üzerinden tavsiye üretilebiliyor. İkincisi karar gerekçesini zayıflatıyor: geçici “tut” önerisi makul olabilir, ancak gerekçesi uydurulmuş kullanım bilgisi olmamalı.

Bu yüzden TV bulgusunu yalnızca küçük bir dil gözlemi olarak sınıflandırmak yetersiz. İki durumda da gerçek, kullanıcı beyanı, olasılık ve tamamlanma durumu ayrılmalı.

Ancak rapordaki bütün örnekler eşit güçte değil. “Gidince” veya “azalınca” Türkçede gelecekteki koşulu anlatabilir. Bunları tek başına gerçekleşmişlik ihlali saymamak gerekir. En açık kanıt “gittiğine göre” ifadesidir. Değerlendirme, kelime yasağına değil cümlenin bağlamdaki iddiasına dayanmalı.

### 14.3 Fikir eksikliği: karakter ile görev arasında gerilim

Koltuk testinde model kullanıcının itirazını dikkate almış, satma önerisinden vazgeçmiş ve yer sorununu anlamaya yönelik uygun bir soru sormuş. Bunlar kazanım. Fakat kullanıcı açıkça çözüm istediği hâlde uygulanabilir bir ihtimal sunmamış.

`SINGLE_PROMPT` aynı anda iki beklenti taşıyor: ortak karakter somut fikir istiyor; görev ise kategori, karar önerisi, kısa gerekçe ve soru alanlarını doldurtuyor. Önerilen fiziksel değişiklik veya alternatif işlev için açıkça tanımlanmış bir alan yok. Model kullanıcının yeni isteğine cevap vermek yerine karar değerlendirme görevini tamamlamakla yetinmiş olabilir.

Bu olası neden, tek çağrıyla kanıtlanmış değil. Şema metin alanında fikir üretimini mutlak olarak engellemiyor; mevcut gerekçeye kısa bir ihtimal sığabilir. Bu nedenle hemen yeni alan eklemek de, yalnızca promptu uzatmak da henüz doğrulanmış çözüm sayılmaz.

Doğru kabul ölçütü şu: **Kullanıcı fikir istediğinde, mevcut bilgilerle desteklenen en az bir somut ihtimal veriliyor mu; gerekiyorsa bunu gerçekten gerekli bir soru izliyor mu?** Her yanıta öneri sıkıştırmak veya hatıra eşyasında geri dönüşsüz işlem önermek bu ölçütün amacı değil.

### 14.4 İki soru: çıktı alanlarının sorumluluğu belirsiz

Oda testinde `reply` içinde bir soru, `question` içinde başka bir soru var. Ekranın bunları birleştirmesi tek yanıtı iki ayrı sorguya dönüştürüyor. Sorun iki alanın bulunması değil; ikisinin de aynı konuşma görevini üstlenebilmesi.

Güncel prompt `question` alanında tek soru istiyor, fakat `reply` alanında soru bulunmamasını açıkça söylemiyor. Test raporunun bu sınırın zaten tamamen açık olduğu izlenimini veren açıklaması fazla güçlü. Burada model davranışı kadar alan sözleşmesinin açıklığı da değerlendirilmeli.

“Her cevap soruyla bitmez” genel bir konuşma ritmi ilkesi; tek bir yanıtın soruyla bitmesi tek başına ihlal kanıtı değil. Bu örnekte güçlü bulgu, aynı yanıtta birbirine yakın iki soru bulunması. Arayüzde alanlardan birini körlemesine saklamak ise yararlı içeriği kaybettirebilir.

### 14.5 Test raporundaki başarıların sınırı

Üç çağrının uygulama doğrulayıcılarından geçmesi yararlı bir uyumluluk bulgusu. Ancak şunları kanıtlamıyor:

- API rotalarının, kimliğin ve veritabanının birlikte doğru çalıştığını.
- Kullanıcının gerçek ekranda aynı sonucu eksiksiz gördüğünü.
- Oda takip turlarında eşya kimliklerinin ve kullanıcı seçimlerinin korunduğunu.
- Gerçek telefon fotoğraflarında görsel tespitin aynı kalitede olduğunu.
- Karakter temelinin eski prompta göre iyileştirme sağladığını.

Rapordaki “Bu, kullanıcının ekranda gördüğü sonucun tam olarak bu olduğu anlamına gelir” cümlesi test yönteminin desteklediğinden ileri gidiyor. Daha doğru ifade: “Bu örneklerde uygulamanın model çağrısı fonksiyonları geçerli sonuç döndürdü.” Arayüz kodunun okunması gösterim hakkında ek kanıt sağlar; çalıştırılmış uçtan uca testin yerini tutmaz.

Oda testinde bütün eşyalara “tut” denmesi ayıklama baskısı olmadığını gösteriyor. Fakat tek başına kullanıcıya hiçbir şeyi değiştirmeme özgürlüğünün her durumda korunduğunu veya ürünün karar merkezli çerçeveden çıktığını kanıtlamıyor. Benzer biçimde geri dönüşsüz öneri yapılmaması bu örnekte olumlu, ancak model zaten hiç fikir sunmadığı için bu başarının kapsamı dar.

### 14.6 JSON biçimi ve maliyet

İki yanıtta Markdown kod bloğu bulunması talep edilen ham JSON biçiminden sapma. Mevcut ayrıştırıcı bunu kabul ettiği için bu örneklerde kullanıcıya yansıyan bir arıza yok. Durum doğruluğu ve fikir üretimi sorunlarından daha düşük öncelikte ele alınmalı.

Raporun 7.882 girdi ve 1.546 çıktı token toplamı bu üç çağrının kullanım kaydıdır. Bundan genel aylık maliyet veya karakter temelinin parasal etkisi çıkarılamaz; karşılaştırmalı ölçüm yok. Promptların karakter sayısı da token sayısıyla aynı ölçü değil.

### 14.7 Öncelikler nasıl değişiyor?

Önceki yol haritasındaki kalıcılık ve bağlam sürekliliği önemini koruyor. Yeni testler bunlara ek olarak dar kapsamda ele alınabilecek iki davranış sorununu öne çıkarıyor:

1. **Bilgi sınırı:** Kararın uygulanmış sayılması ve kullanımın fotoğraftan varsayılması. Birlikte sınanmalı; farklı akışlarda aynı hata ailesi görülüyor.
2. **İsteğe karşılık verme:** Fikir isteyen kullanıcıya fikir, tek adım isteyene tek adım, açıklık gerektiğinde ölçülü soru verilmesi.
3. **Yanıtın birleştirilmesi:** Oda ekranında açıklama ile sorunun tek ve doğal bir karşılık oluşturması.
4. **Biçim ve editoryal ayrıntılar:** Kod bloğu, çeviri kokan deyim, başlık-açıklama uyumu.

Kütüphane entegrasyonu bu hataların otomatik çözümü değil. Daha fazla genel bilgi, “lamba gitti” çıkarımını düzeltmez; sohbetin kaydedilmesi de kaydedilen bilginin doğru yorumlanmasını garanti etmez. Bunlar birbirini tamamlayan ama ayrı doğrulanması gereken işler.

### 14.8 Sonraki doğrulama için önerilen kapsam

Yeni test yapılacağı zaman, aynı girdilerin değişiklik öncesi ve sonrası çıktıları karşılaştırılmalı. Küçük bütçede tüm uygulamayı tekrar çağırmak yerine değiştirilen davranışa odaklanılabilir:

| Durum | Beklenen ayrım |
|---|---|
| “Lambayı bağışlamaya karar verdim.” | Tamamlandığı varsayılmaz; gerekirse koşullu öneri verilir. |
| “Lambayı dün bağışladım.” | Açıkça bildirilen gerçekleşme kullanılabilir; gereksiz şüpheye düşülmez. |
| Fotoğrafta TV var, kullanım bilgisi yok | Kullanım alışkanlığı üretilmez. |
| “Koltuk kalacak; yer açmak için ne yapabilirim?” | Somut, geri alınabilir ihtimal sunulur; ölçüsüz kesinlik verilmez. |
| “Sadece bir soru sor.” | Açıklama ve soru alanları birlikte değerlendirildiğinde tek soru kalır. |
| Oda takip turunda kullanıcı bir eşyayı hariç tutar | Kimlikler ve kullanıcının seçimi korunur. |

Olumlu karşı örnekler önemli: modelin hiçbir şeyin gerçekleştiğine inanmayan, her durumda soru soran ya da bütün önerileri muğlaklaştıran bir karaktere dönüşmesi istenmiyor. Amaç daha çekingen bir Sestia değil; bildiğini doğru kullanan ve bilmediğini tamamlamayan bir Sestia.

Bu ek değerlendirme kapsamında kod, kaynak test raporu ve ana brifing değiştirilmedi; model çağrısı veya deployment yapılmadı.
