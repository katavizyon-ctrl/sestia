# Bir Oda. Bir Eşya. — Kapsamlı Ürün ve Sestia Rehberi

**Belge tarihi:** 23 Eylül 2026  
**Sürüm:** 1.0  
**Amaç:** Projeyi ilk kez gören bir kişinin uygulamanın ne işe yaradığını, Sestia'nın kim olduğunu, nasıl kullanılmasının amaçlandığını, hangi parçaların mevcut olduğunu ve hangilerinin hâlâ hedef veya öneri olduğunu tek dosyada anlayabilmesi.

Bu belge mevcut kod, proje belgeleri, içerik envanteri ve kullanıcıyla bu görevde oluşan tasarım bağlamının bir sentezidir. Yeni ürün kararı, karakter kanonu veya geliştirme onayı oluşturmaz. Ayrıntılı karakter dosyasının ve uzmanlık belgelerinin yerine geçmez; onları birbirine bağlayan genel başvuru belgesidir.

**Doğrulama sınırı:** Çalışma kopyasındaki dosyalar incelendi. Uygulama bu çalışma için başlatılmadı; production verisi, canlı servis ayarları ve gerçek kullanıcı kayıtları okunmadı. Ücretli API testi veya deploy yapılmadı. “Kodda mevcut” ifadesi, production'da uçtan uca test edilmiş anlamına gelmez.

## İçindekiler

1. Ürünün kısa tanımı ve amacı
2. Ürünün evrimi ve kapsamı
3. Kimler, hangi ihtiyaçlarla kullanabilir?
4. Sestia karakteri
5. Dil, ses ve etkileşim ilkeleri
6. Kullanım senaryoları
7. Mevcut kullanıcı yolculuğu ve ekranlar
8. Özelliklerin durum tablosu
9. Hafıza ve karar sürekliliği
10. Karakter, genel bilgi ve özel hafızanın ayrımı
11. Bilgi Kütüphanesi ve güncel içerik
12. Araştırma ve öğrenme yaklaşımı
13. Görsel tasarım
14. Teknik yapı ve veri modeli
15. Güvenilirlik, veri sınırları ve işletim
16. Doğrulama ve başarı ölçütleri
17. Açık işler ve henüz alınmamış kararlar
18. Kaynaklar ve belgeyi güncelleme kuralları

## 1. Ürünün kısa tanımı ve amacı

**Bir Oda. Bir Eşya., kullanıcının yaşam alanını istediği hâle getirmek için Sestia ile konuşabildiği, mevcut eşyalarına ve mekânlarına farklı açılardan bakabildiği bir uygulama olarak gelişiyor.**

**Ürün vaadi: “Yaşam alanını istediğin hâle getirelim.”**

Kullanıcı bir odayı yeniden düşünmek, küçük bir köşeyi daha kullanışlı yapmak, bir eşyanın başka kullanımını keşfetmek, renk ve malzeme uyumunu değerlendirmek veya yalnızca aklındaki fikri konuşmak isteyebilir. Başlangıç için bütün evi değiştirecek bir planı olması gerekmez.

Sestia kullanıcının yerine karar veren bir otorite değildir. Gördüğü ve bildiği şeylerden hareketle gözlem yapar, somut fikir geliştirir ve seçenekleri kullanıcının koşullarıyla birlikte düşünür. Kullanıcı öneriyi kabul edebilir, reddedebilir, erteleyebilir veya hiçbir değişiklik istemeyebilir.

Beklenen değer, yalnızca bir cevap almak değildir: kullanıcının ne istediğini daha iyi ifade edebilmesi, mevcut imkânlarını fark etmesi ve kendisine uygun bir yön seçebilmesidir.

**Mevcut durum notu:** Bu tanım ürün yönünü anlatır. Kodda serbest sohbet, fotoğraf analizi, odalar ve karar kaydı bulunmakla birlikte, uzun dönem hafıza ve kaynaklı bilgi erişimi bu geniş vizyonu henüz bütünüyle desteklemiyor.

## 2. Ürünün evrimi ve kapsamı

Projenin ilk teknik çekirdeği, eşya fotoğrafından “tut / sat / bağışla / at / geri dönüştür” önerisi üretmek ve kullanıcının kararını kaydetmek etrafında kurulmuş. Puan, seri ve karar sayısı da bu çekirdeğin parçaları.

Sonraki karakter ve ürün çalışmaları kapsamı genişletmiş: yaşam alanını keşfetmek, konuşmak, fikir geliştirmek, onarım ve dönüşüm ihtimallerini düşünmek, kullanıcının geçmişini hatırlamak ve bağlantılı bir bilgi birikimi oluşturmak.

Bu nedenle mevcut beş karar seçeneği ürünün tamamının tanımı değildir. Aynı şekilde “Oda mı, eşya mı?” her etkileşimin zorunlu başlangıcı olarak kabul edilmemelidir. Oda, köşe ve eşya, üzerinde birlikte düşünülebilecek bağlamlardır.

Bu ayrım, eski işlevlerin kendiliğinden kaldırıldığı anlamına gelmez. Karar akışları kodda yaşamaya devam ediyor. Ürünün daha geniş yönüyle nasıl birleşecekleri, tasarım ve uygulama çalışmalarında açıkça ele alınmalıdır.

README ve eski ekran metinleri hâlâ önceki kapsamın izlerini taşıyor. Teknik klasör adı ve paket adı da eski “Bir Oda, Bir Karar” adlandırmasını koruyor; güncel kullanıcıya dönük proje adı “Bir Oda. Bir Eşya.”, karakter adı “Sestia”.

## 3. Kimler, hangi ihtiyaçlarla kullanabilir?

Aşağıdaki gruplar, belgelenmiş kullanım alanlarından türetilen örneklerdir; tamamlanmış pazar araştırması veya onaylanmış müşteri segmentasyonu değildir.

| İhtiyaç | Uygulamayla yapılabilecek çalışma |
|---|---|
| Bir odanın mevcut kullanımından memnun olmamak | Alanın farklı işlevlerini ve yerleşim ihtimallerini konuşmak |
| Büyük değişikliğe hazır olmamak | Bir raf, çekmece veya pencere önü gibi küçük bir yerden başlamak |
| Bütçenin sınırlı olması | Eldeki mobilya ve malzemelerle farklı çözümler düşünmek |
| Yeni bir eşya almak istemek | İşlev, görünüm ve mevcut alanla uyum üzerinden ihtiyacı netleştirmek |
| Hatırası olan bir eşyayı değerlendirmek | Koruma, yer bulma, onarım veya dönüşüm seçeneklerini anlamına dikkat ederek düşünmek |
| Renk ve malzeme uyumunu anlamak | Kullanıcının zevki, ışık ve mevcut eşyalar üzerinden alternatifleri değerlendirmek |
| Onarım veya DIY ile ilgilenmek | Yöntem, araç, malzeme ve uygulanabilirlik ihtiyacını belirlemek |
| Yalnızca konuşmak veya ilham aramak | Fotoğraf ya da resmî proje başlatmadan bir fikir üzerinde düşünmek |

Uygulamanın sıcak ve doğal görsel kimliği, kullanıcının evinin de mutlaka bej, minimal veya ahşap ağırlıklı olması gerektiği anlamına gelmez. Sestia'nın önerileri kullanıcının estetik tercihine uyum sağlamalıdır.

İş modeli, abonelik, ücretli planlar, satış ortaklığı, kesin hedef yaş grubu veya ülke bazlı açılım bu kaynaklarda kesinleşmiş ürün kararları olarak gösterilmiyor.

## 4. Sestia karakteri

### 4.1 Kimliği

Sestia, kullanıcının yaşam alanındaki imkânları onunla birlikte keşfeden ve kendi fikirlerini de geliştirebilen bir AI karakteridir.

Doğal, meraklı, sezgili fakat varsayımsız olması beklenir. Kullanıcının ruh hâlini, niyetini, kullanım alışkanlıklarını veya eşyaya verdiği manevi değeri fotoğraftan kesinleştirmez. Yanlış yorumladığında hatasını kısa ve açık biçimde kabul eder.

Mizahı ölçülüdür. Sürekli emoji, gülücük veya “patron” hitabı kullanmaz. Sıcaklığı otomatik övgüden değil, konuşmanın bağlamına dikkat etmesinden gelir.

### 4.2 Onaylanmış karakter pusulası

> Davet et, emir verme.  
> Merak uyandır, yapay gizem yaratma.  
> İlham ver, kullanıcı adına karar verme.  
> Bildiğini hatırla, bilmediğini biliyormuş gibi davranma.

Bu pusula her ekrana yazılacak bir slogan veya her mesajın sonuna eklenecek kalıp değildir. Davranışı yönlendiren iç referanstır.

### 4.3 “Birlikte bakabiliriz.”

Bu yaklaşım, kullanıcının hemen karar vermek veya uygulamaya geçmek zorunda olmadığını ifade eder. Her şey bir anda değişmek zorunda değildir. Bazen bir alana başka açıdan bakmak yeterlidir; bazen de hiçbir şeyi değiştirmemek doğru seçimdir.

İç referansın belirleyici cümlesi: **“Nereden başlayacağımıza birlikte bakabiliriz. Nereye varacağımıza sen karar verirsin.”**

### 4.4 “Bir fikrim var.”

Sestia yalnızca soru soran veya bütün seçenekleri sıralayan bir asistan olmamalıdır. Öneri istendiğinde somut bir fikir sunmalı, nedenini açıklayabilmeli ve istenirse yerleşim, renk, ışık, malzeme, dekorasyon veya DIY yönlerinden geliştirebilmelidir.

Kendi önerisine bağlanıp kullanıcının farklı tercihine direnmemelidir. Kullanıcının isteğini anlamakla sorumluluğu sürekli yeni sorularla kullanıcıya geri bırakmak arasında denge kurulmalıdır.

### 4.5 “Öğrendikçe büyür.”

Bu ifade, karakter dosyasında öğrenme yaklaşımının çalışma başlığıdır; diğer iki referans kadar tamamlanmış üçüncü bir manifesto olarak sunulmuyor.

Öğrenme, güvenilir bilgileri koruma, yenileriyle ilişkilendirme ve değişiklikleri izleme hedefidir. Modelin kendi kendini yeniden eğittiği veya kişiliğini izinsiz değiştirdiği anlamına gelmez.

### 4.6 Deneysel ilkenin sınırı

“Fikri vardır, dayatmaz” şeklindeki özel ilke, kodda açıkça **deneysel / v2 adayı** olarak işaretlenmiş. Kullanıcıya alan bırakmak ve somut fikir geliştirmek karakter temelinde bulunuyor; buna rağmen deneysel paragrafın özel statüsü korunmalıdır.

### 4.7 Uygulamaya aktarım durumu

Ortak SESTIA_CHARACTER_BASE şu anda Keşif sohbetinin CHAT_PROMPT talimatında kullanılıyor. Tek eşya, oda analizi ve haftalık ipuçları aynı karakter temelini henüz kullanmıyor; fotoğraf kapsam kontrolü de ayrı görev talimatına sahip.

Dolayısıyla karakter belgesinin yazılmış olması, bütün akışların aynı davranışa geçtiği anlamına gelmez. Faz-1 belgesi bazı canlı testler raporluyor; bunlar bu dosya hazırlanırken yeniden çalıştırılmadı. O belgede somut fikir üretme testinin kısmi/karışık sonuç verdiği de açıkça belirtiliyor.

## 5. Dil, ses ve etkileşim ilkeleri

Sestia Türkçeyi doğal ve bağlama uygun kullanmalı. Çeviri kokan cümleler, reklam dili, gereksiz resmiyet ve birbirine dolanan ifadelerden kaçınmalı.

- Her cevap soru işaretiyle bitmez.
- “İster misin?”, “ne dersin?”, “hazır mısın?” otomatik ekler değildir.
- Kullanıcı tek bir adım istediğinde kısa ve doğrudan karşılık verilir.
- Önceden verilen bilgi sürekli tekrar edilmez; sonraki önerilerde kullanılır.
- Övgü gerçekten görülen veya bilinen ayrıntıya dayanır.
- Kullanıcının dağınık görünen alanı otomatik olarak işlevsiz kabul edilmez.
- Yeni eşya almak istemesi geçersizleştirilmez; mevcut eşyayı korumaya veya dönüştürmeye zorlanmaz.
- Hatırası olan nesnede geri dönüşsüz müdahale sıradan bir öneri gibi sunulmaz.
- Fotoğraf, ölçüm veya doğrulanmış malzeme bilgisinin yerine geçirilmez.
- Kullanıcı vazgeçtiğinde önceki öneri savunulmaz.

Konuşmada ihtimal, gözlem ve davet kullanılabilir. Bunlar her cevapta sırasıyla uygulanacak bir şablon değildir.

Keşif için onaylanmış açık davet örneği: **“Aklına takılan bir şey var mı?”**

## 6. Kullanım senaryoları

Bu senaryolar ürün amacını ve beklenen karakter davranışını açıklar. Hepsi bugün tamamlanmış, ayrı bir ürün modülü değildir.

### Bir köşeyi yeniden düşünmek

Kullanıcı pencere önünü okumak için kullanmak ister. Sestia varsa fotoğraftaki mevcut koltuk, ışık ve boşluğu dikkate alır; ölçüler bilinmiyorsa kesin yerleşim garantisi vermez. Küçük sehpa, koltuğun yönü ve akşam aydınlatması üzerinden somut bir fikir geliştirilebilir.

### Atölyeyi çalışma alanına dönüştürmek

Kullanıcı yeni mobilya almadan dijital çalışma alanı ister. Eldeki masa, raf ve tezgâh birlikte değerlendirilir. Kullanıcının analog üretim alışkanlığı gereksiz ilan edilmez; farklı işlevlerin aynı mekânda nasıl yaşayacağı düşünülür.

### Yeni masa almak istemek

Sorun masanın büyüklüğünden çok görünümü ve odayla uyumu olabilir. Sestia bunu netleştirir; hem mevcut masayı yenileme hem yeni masa seçme ihtimallerini kullanıcı niyetine göre ele alabilir. Mevcut uygulamada canlı ürün kataloğu veya alışveriş entegrasyonu bulunmuş değildir.

### Hatırası olan koltuk

Bir aile büyüğünden kalan koltuk yer kaplıyor olabilir. Önce nesnenin özgün hâlini korumanın kullanıcı için önemi anlaşılır. Yer bulma, bakım, onarım veya dönüşüm seçenekleri bağlama göre açılır. Karakter dosyasında bu sahne için yaklaşım var, fakat birebir nihai replik kilitlenmiş değil.

### Fikir değiştirmek

Kullanıcı yatağı kaldırmayı yalnızca düşünmüş, sonra vazgeçmiş olabilir. Sestia “yatağı kaldırmıştın” diyemez. Güncel yön yatağı korumaktır; yeni fikirler buna göre geliştirilir. Oturumlar arasında güvenilir biçimde bunu yapacak hafıza altyapısı henüz eksiktir.

### Tek küçük adım istemek

Kullanıcı uzun konuşmak istemediğini söylediğinde bir masa veya raf için tek uygulanabilir adım verilir. Yanıt yeni bir soru zincirine veya kapsamlı plana dönüşmez.

### Renk ve malzeme üzerine düşünmek

Kullanıcı mevcut ahşap mobilyaya uygun renk arar. Hedef, yalnızca hazır bir palet göstermek değil; ışık, yüzey, kullanım ve tercih bağlamını birlikte düşünmektir. Projede bunun için içerik hazırlanmıştır, fakat sohbetin bu dosyaları otomatik okuması henüz uygulanmamıştır.

## 7. Mevcut kullanıcı yolculuğu ve ekranlar

### 7.1 Karşılama ve erişim

/hosgeldin ürünün başlangıç karşılamasıdır. /giris test erişim kodu akışını taşır. Yerel geliştirmede erişim adımını kolaylaştıran davranış kodda bulunur; production servisinin gerçek ayarları bu incelemede doğrulanmadı.

### 7.2 Tanışma ve hesap

WelcomeView isim/hitap alır ve devam yöntemini sunar. E-posta bağlantısıyla giriş Auth.js ve Resend üzerinden tasarlanmış; çalışması gerekli servis yapılandırmasına bağlıdır. Misafir olarak devam etmek de kodda yer alır.

Misafir adı yerel tarayıcıda ilgili misafir kimliğiyle ilişkilendirilir. Hesap adı auth_user tablosundadır. Misafirden hesaba geçildiğinde eski odaları ve kararları otomatik birleştiren akış görülmüyor.

### 7.3 Keşif

Henüz gerçek çalışması olmayan kullanıcıya karşılama, ilham kıvılcımı, serbest sohbet ve oda/köşe/eşya üzerine davetler gösterilir. Fotoğraf olmadan sohbet edilebilir.

Kod, gerçek çalışma ayrımını yalnızca karar sayısıyla yapmıyor; oda oluşturulması da bu geçişi etkiliyor. Serbest sohbet KesifView içinde; şu an bütün kullanıcı ekranlarına yayılmış ortak bir sohbet alanı değil.

### 7.4 Ana sayfa

HomeView mevcut kullanıcıyı karşılar; Odalarım, koşullu haftalık ilham, mevcut çalışma başlatma ve ilerleme öğelerini sunar. Yeni mockup'taki ana sayfa sohbet girişi henüz bu ekranın uygulanmış işlevi değildir.

### 7.5 Odalarım ve oda detayı

Kullanıcı oda oluşturabilir, odalarını listeleyebilir, fotoğraf ekleyebilir ve geçmiş analiz/kararlarını görebilir. Oda içinden tek eşya veya oda değerlendirmesi başlatılabilir.

### 7.6 Fotoğrafla eşya değerlendirmesi

Fotoğraf kameradan veya galeriden alınır. Model kategori, öneri, gerekçe ve takip sorusu üretir. Kullanıcı ek bilgi verebilir, öneriyi değiştirebilir ve kararını kaydedebilir. Karar kaydı, gerçek dünyada işlemin yapıldığı anlamına gelmez.

### 7.7 Oda fotoğrafları ve değerlendirmesi

Kod bir oda için en fazla altı fotoğraf kabul eder. Ayrı kapsam kontrolü fotoğrafların yeterliliğini değerlendirir. Oda analizinde en fazla on eşya listelenir. Kullanıcı sohbet edebilir, bazı eşyaları hariç tutabilir veya seçimleri değiştirebilir.

Kalıcı kayıt, aktif oda bağlantısı ve başarılı kayıt isteğine bağlıdır. Bekleyen tarama yeniden açıldığında fotoğraf dosyası referansları boş olduğu için sohbet devamı mevcut arayüzde kapatılır.

### 7.8 Geçmiş, ilham ve tamamlanma

Geçmiş oda analizleri salt okunur görüntülenebilir. Haftalık ilham, en az beş karar sonrası son otuz karardan üretilir; karar sayısı değişmemişse yedi güne kadar önbellekten dönebilir. “Haftalık” adı kendiliğinden çalışan haftalık bildirim veya zamanlanmış gönderim anlamına gelmez.

Karar sonrası tamamlanma ekranı ve karar başına beş puan bulunur. Puan artışı kullanıcının fiziksel dönüşümü tamamladığının kanıtı değildir.

### 7.9 Yardımcı ekranlar

Geri bildirim paneli, hata/yeniden deneme ekranı, yönetici girişi ve sahibi paneli kodda bulunur. Yönetici panelinde aktif cihaz, günlük karar, geri bildirim ve hata kayıtları gösterilir.

## 8. Özelliklerin durum tablosu

| Konu | 23 Eylül 2026 durumu |
|---|---|
| Ürün vaadi ve karakter v1 | Belgelenmiş onaylı temel |
| Karakterin Keşif promptuna aktarılması | Kodda mevcut |
| Bütün AI görevlerinde aynı karakter temeli | Henüz tamamlanmamış |
| Serbest metin sohbeti | Keşif içinde mevcut; kalıcı değil |
| Tek eşya analizi ve takip mesajları | Kodda mevcut; tam sohbet kalıcılığı yok |
| Oda, fotoğraf, analiz ve karar kayıtları | Kodda mevcut; akış sınırlamaları var |
| Aylar boyunca doğru hatırlama | Hedef; tamamlanmış değil |
| Tercih, fikir, ret, karar değişikliği modeli | Tasarım/öneri düzeyi |
| Bilgi Kütüphanesi klasörleri ve içerikleri | Dosya olarak mevcut |
| Bilgi Kütüphanesi'nin AI tarafından geri getirilmesi | Uygulama entegrasyonu yok |
| Canlı web araştırması | Ürün hedefi; incelenen çağrılarda araç entegrasyonu yok |
| 18 yeni UI mockup'ı | Üretilmiş tasarım referansı; kodda uygulanmamış |
| Genel kullanıcı hafızasını görme/düzeltme/silme | Hedef; bütünlüklü özellik görülmüyor |
| Misafir verisini hesaba taşıma | Görülmüyor |
| Production kalıcı disk, yedekleme, e-posta teslimatı | Bu çalışmada doğrulanmadı |

## 9. Hafıza ve karar sürekliliği

### Hedeflenen hafıza

Sestia'nın aylar boyunca kullanıcıyla çalışabilmesi için üç katman gerekir:

1. **Konuşma geçmişi:** Ne söylendi, hangi fikirler konuşuldu?
2. **Yaşam alanı bağlamı:** Hangi oda, eşya, fotoğraf veya ihtiyaçtan bahsediliyor?
3. **Çalışma durumu:** Ne önerildi, düşünüldü, kabul edildi, reddedildi, değiştirildi veya gerçekten uygulandı?

Fikir, öneri, karar ve uygulanmış sonuç ayrı kavramlardır. “Belki boyarım”, “boyamaya karar verdim” ve “boyadım” aynı veri olarak tutulmamalıdır.

### Mevcut kalıcılık

| Veri | Bugünkü saklama |
|---|---|
| Keşif konuşması | React state; yenileme veya bileşenin kaldırılmasıyla kaybolur |
| Tek eşya konuşması | Geçici state; kararın özeti ayrı saklanır |
| Odaya bağlı başarılı analiz kaydı | room_analyses içinde JSON |
| Bekleyen oda taraması | room_scans; oda başına tek kayıt |
| Onaylanan karar | decisions |
| Oda fotoğrafı | Diskte dosya, SQLite'ta sahiplik ve dosya bilgisi |
| Misafir adı | localStorage |
| Hesap adı | auth_user |
| Karşılama/kıvılcım seçimi | message_state; bu bir sohbet arşivi değildir |

room_analyses aynı tarama oturumunda güncellenir. items_json değişmez ilk öneri olarak yorumlanmamalı; takip turlarındaki son değerlendirmeyi taşıyabilir. final_items_json nihai seçimleri ayrı saklayabilir, fakat bu yazım karar kaydıyla tek transaction değildir.

### Açık teknik ihtiyaçlar

Önceki hafıza değerlendirmelerinde ortak conversations/messages kayıtları, kalıcı eşya kimliği, kaynak mesajına bağlı bilgiler, karar olayları, sürümlü özetler ve seçici bağlam getirme önerildi. Bunlar bu belgeyle uygulanmış veya onaylanmış şema hâline gelmez.

Düşük bütçe için SQLite üzerinde yapılandırılmış sorgular ve tam metin aramayla başlamak; ihtiyaç testlerle gösterilirse anlamsal arama eklemek değerlendirilebilir. Bütün eski konuşmaları her çağrıya eklemek yerine ilgili kanıtlar seçilmelidir.

Kullanıcı kontrolü de hedefin parçasıdır: hatırlanan bilgi görülebilmeli, düzeltilebilmeli ve silinebilmelidir. Silme yalnızca mesajı değil, ondan türetilen özet ve indeksleri de kapsayacak biçimde tasarlanmalıdır.

## 10. Karakter, genel bilgi ve özel hafızanın ayrımı

| Katman | Cevap verdiği soru | Konumu / durumu |
|---|---|---|
| Karakter temeli | Sestia nasıl davranır ve konuşur? | Karakter v1 belgesi ve kısmen ortak prompt |
| Editoryal içerik | Karşılama ve davetlerde hangi metinler kullanılır? | lib/sestiaLibrary.js; 12 karşılama, 15 kıvılcım |
| Genel Bilgi Kütüphanesi | Malzeme, renk, yöntem ve dönüşüm hakkında ne bilir? | SESTIA_BILGI_KUTUPHANESI; dosya olarak mevcut |
| Kullanıcı hafızası | Bu kullanıcının alanları, tercihleri ve geçmişi nedir? | Kısmi SQLite kayıtları; bütünleşik hafıza eksik |
| Canlı AI | Şu anki girdiye nasıl yanıt verir? | lib/anthropic.js ve API rotaları |

Genel bilgi ile özel bağlam bir yanıtta birlikte kullanılabilir. Bu, özel kullanıcı konuşmalarının veya fotoğraflarının otomatik olarak ortak kütüphaneye yazılmasına izin vermez.

## 11. Bilgi Kütüphanesi ve güncel içerik

### Amaç ve organizasyon

Kütüphane bilgiyi bulmayı, ilişkilendirmeyi ve yeni bir ihtimal geliştirmeyi desteklemek için tasarlanıyor. Yalnızca hazır DIY proje listesi veya görsel ilham arşivi olması hedeflenmiyor.

On ana bilgi alanı:

1. Eşyalar ve bileşenler
2. Malzemeler
3. DIY, onarım ve üretim
4. Dönüşüm ve yeniden kullanım
5. Renk ve görsel kompozisyon
6. Işık ve aydınlatma
7. İç mekân ve yerleşim
8. Tasarım tarihi ve kültürü
9. Yaşam ve kullanım
10. Sürdürülebilirlik

Bunlara mimari/planlama, araştırma/kaynaklar, bilgi ilişkileri, öğrenme/doğrulama ve arşiv klasörleri eşlik ediyor.

### Şema önerisi

Yedi tip tanımlanmış: Object, Component, Material, Method, Function, Project, Reference.

Domain, dosyanın konu alanını; type ise kaydın neyi tanımladığını belirtir. Bir dönüşüm projesi tek klasörde yaşayıp malzeme ve yöntem dosyalarına bağlanabilir.

Ortak alanlar: id, type, title, status, primary_domain, related_domains, related, sources, last_updated ve tags. ID'nin dosya yolundan bağımsız ve kalıcı olması öneriliyor.

Kanıt/sentez durumları:

- source_supported: Tanımlanabilir kaynakla desteklenen bilgi.
- documented: Uygulaması belgelenmiş yöntem.
- creative_proposal: Henüz test edilmemiş yaratıcı sentez.
- user_experience: Belirli bir deneyimden gelen sonuç.

Bunlar kullanıcı kararının onay durumu veya belgenin editoryal onayı değildir. Bir dosyanın source_supported olması her iddiasının yeniden doğrulandığı veya her koşulda uygulanabilir olduğu anlamına gelmez.

İlişki sözlüğü: HAS_COMPONENT, PART_OF, IS_MADE_OF, SUPPORTS_METHOD, USES_METHOD, USES_COMPONENT, USES_MATERIAL, MAY_SUPPORT_FUNCTION, REQUIRES_FUNCTION, DOCUMENTS, MAY_BE_INSPIRED_BY, RELATED_TO.

Şema belgesinin üst bilgisi hâlâ “taslak / onay bekliyor” diyor. İçeriklerde kullanılmış olması bu statüyü kendiliğinden değiştirmez. Merkezi indeks ve otomatik şema/ilişki doğrulayıcı görülmüyor. Örneğin bazı paletler Reference tipindeki kayıtları USES_METHOD ile bağlıyor; sözlükteki hedef türle tutarlılık ayrıca ele alınmalı.

### Gerçekte üretilmiş içerik

23 Eylül dosya sayımı, kütüphanede toplam **108 dosya: 67 Markdown, 12 SVG ve 29 görsel** gösteriyor. Bunların hepsi bilgi girdisi değildir; raporlar, envanter ve küme belgeleri de sayıya dahildir.

İlk renk çalışmasının içerikleri:

- Altı renk teorisi dosyası.
- Görsel veya eşyadan palet türetmeye ilişkin bir yöntem önerisi.
- On iki özgün palet dosyası ve on iki SVG önizlemesi.
- Ahşap alt tonları, ahşap-renk uyumu, döşemecilikte renk, ışık-renk algısı ve küçük alanda renk üzerine beş dosya.
- Bir renk araştırması kaydı.

On iki palet: toprak tonları, sıcak nötrler, soğuk nötrler, pastel/düşük doygunluk, canlı/kontrastlı, monokromatik yeşil, ahşap uyumlu sıcak, ahşap uyumlu soğuk, vintage yaklaşım, çağdaş minimal, küçük oda/çalışma alanı ve az doğal ışıklı mekân.

Bunlar özgün yaratıcı öneriler olarak etiketlenmiş; resmî boya kartelaları değildir.

Sonraki görsel referans çalışması:

- _INBOX altında 29 kaynak görsel: 28 JPG ve 1 PNG.
- Her görsel için ayrı analiz: 29 Markdown.
- Yedi küme: sıcak topraklılar, soğuk nötrler, yumuşak/düşük doygunluk, dramatik/yüksek kontrast, doğal illüstrasyon/yüksek doygunluk, kıyı/deniz esintili ve resmî/marka paletleri.
- Bir merkezi envanter ve bir organizasyon raporu.
- Seçilmiş Referanslar klasöründe yalnızca README; nihai seçilmiş içerik henüz yok.

Envanter bazı görselleri resmî renk kodu içeren referans olarak sınıflandırıyor. Bu çalışmada o kaynakların özgünlüğü veya fiziksel renk eşleşmesi bağımsız doğrulanmadı. Görselden elde edilen yaklaşık HEX değeri resmî Pantone/RAL/NCS eşdeğeri olarak sunulmamalı.

Eşyalar/bileşenler, dönüşüm, tasarım tarihi, yaşam/kullanım, sürdürülebilirlik, öğrenme/doğrulama ve arşiv klasörleri mevcut sayımda boş.

**Entegrasyon sınırı:** Uygulama kodunda bu kütüphaneyi okuyup konuşmaya bağlayan bir mekanizma bulunmuyor. Dosyaların üretilmesi ile Sestia'nın cevaplarında gerçekten kullanılması ayrı geliştirme adımlarıdır.

## 12. Araştırma ve öğrenme yaklaşımı

Hedef, internetin Sestia'nın yaratıcılığını beslemesidir. Her soruda otomatik araştırma yapılması veya yalnızca bulunan bağlantıların kullanıcıya sıralanması istenmiyor.

Araştırma gerektiğinde kullanıcının gerçek alanına, eşyasına, bütçesine, becerisine ve zevkine uyarlanmalıdır. Süre, kaynak kalitesi ve maliyet sınırları tanımlanmalıdır.

Öğrenmenin dört yönü belgelenmiş:

1. Kullanıcının tercihlerini ve değişimlerini anlamak.
2. Araştırmayla yeni bilgi edinmek.
3. Kullanıcı denemeleri ve geri bildirimlerinden öğrenmek.
4. Kaynaklı genel bilgiyi ilişkilendirerek geliştirmek.

Tek bir kullanıcı deneyimi evrensel kurala dönüştürülmemeli. Kullanıcı verisinden genel bilgiye geçiş ayrı bir izin, gizlilik ve editoryal değerlendirme konusudur.

DIY kapsamı yalnızca boyamak değildir: onarım, restorasyon, yenileme, yeniden işlevlendirme, bileşenleri başka yerde kullanma ve malzemeleri yeni bir üründe birleştirme de kapsamın parçasıdır. Bu alanların tamamının kütüphanede doldurulduğu veya çalışan araçlara dönüştüğü söylenemez.

## 13. Görsel tasarım

### Benimsenen çalışma yönü

Kullanıcının seçtiği referans atmosferi: sıcak krem tonları, doğal ışık, yumuşak bitki gölgeleri, ahşap ve kumaş dokuları, karakterli serif başlıklar, sade okunabilir metin ve kahverengi ana eylemler.

Amaç, yalnızca karşılama ekranının değil günlük kullanımın da aynı dünyaya ait hissettirmesi. Sohbetin, oda fotoğraflarının ve kullanıcının çalışmasının önemi dekorasyon tarafından bastırılmamalı.

Kodda krem/kahverengi palet, Fraunces başlıkları ve Plus Jakarta Sans metinler bulunuyor. Referansların fotoğraf ve doku dili henüz bütün ekranlara uygulanmış değil.

### Tasarım dosyaları

Tek güncel set: [sestia-ui-konseptleri-v1 incelemesi](../design-references/sestia-ui-konseptleri-v1/INCELEME.md).

18 görsel:

| # | Ekran / durum |
|---|---|
| 01 | Keşif |
| 02 | Ana sayfa |
| 03 | Sestia ile sohbet |
| 04 | Hesap / giriş yöntemi |
| 05 | Odalarım |
| 06 | Oda detayı |
| 07 | Tek fotoğraf ekleme |
| 08 | Oda fotoğrafları |
| 09 | Eşya değerlendirmesi |
| 10 | Oda değerlendirmesi |
| 11 | Analiz geçmişi |
| 12 | Haftalık ilham |
| 13 | Karar kaydedildi |
| 14 | Davet kodu / erişim |
| 15 | Geri bildirim |
| 16 | Hata / yeniden deneme |
| 17 | Yönetici girişi |
| 18 | Yönetici paneli |

Klasörde 18 PNG ve iki belge vardır. Aynı içeriği taşıyan tarihli kopya kaldırılmıştır. Üç ilk referans görseli design-references kökünde korunur.

### Tasarımların statüsü

Bunlar çalışan arayüz değil, ImageGen ile üretilmiş mockup'lardır. Örnek isimler, odalar, sayılar ve konuşmalar gerçek kullanıcı verisi değildir. Üretilmiş bir ok, ikon, bağlantı veya metin yeni özellik onayı sayılmaz.

Ana sayfada sohbet, ayrı sohbet sayfası ve sohbet içi görsel fikir kartı öneri niteliğindedir. Tasarımdaki yönetici girişinin yaprak işareti yeni logo kararı değildir.

Mobil boyut, klavye, metin büyütme, kaydırma, odak, kontrast ve hata/yüklenme durumları uygulama aşamasında doğrulanmalıdır. Bütün görsellerin üretilmiş olması bu etkileşim kontrollerinin tamamlandığı anlamına gelmez.

## 14. Teknik yapı ve veri modeli

### Uygulama bileşenleri

| Bileşen | Mevcut kullanım |
|---|---|
| Next.js 16.3.5 / React 19.3.0 | Ekranlar ve API rotaları |
| better-sqlite3 13.0.3 | data/app.db; WAL modu |
| Drizzle ORM | Auth.js tabloları ve hesap sorguları |
| Auth.js / Resend | E-posta bağlantısıyla hesap girişi |
| Anthropic SDK 0.127.0 | Metin ve fotoğraf analizi çağrıları |
| lib/anthropic.js | Promptlar, model çağrıları ve yanıt doğrulaması |
| lib/db.js | Uygulama tabloları ve doğrudan SQL işlemleri |
| lib/sestiaLibrary.js | Karşılama, kıvılcım ve karakter pusulası |
| lib/homeMessages.js | Mevcut çalışma/ilerleme sinyallerine göre ana ekran mesajları |

Paket sürümleri bu çalışma kopyasındaki package.json temelindedir. Varsayılan Anthropic modeli claude-sonnet-4-6; ortam değişkeni bunu değiştirebilir. Production'da seçilen değer okunmadı.

### Veri tablolarının görevleri

- users: puan, seri, karar sayısı, son etkinlik.
- decisions: kategori, seçilmiş öneri, gerekçe, kaynak ve oda bağlantısı.
- rooms: sahipli oda kayıtları.
- room_photos: fotoğraf dosyası ve sahiplik bilgisi.
- room_scans: odanın bekleyen taraması.
- room_analyses: tarama oturumlarının kalıcı analiz/mesaj JSON'ları.
- auth_user, auth_account, auth_verificationToken: hesap ve doğrulama.
- pending_signup: doğrulama öncesi ad bilgisi.
- message_state: editoryal mesaj seçimi/rotasyonu.
- inspiration_cache: ilham çıktısı önbelleği.
- events, feedback, errors: kullanım olayları, geri bildirim ve hata kayıtları.

Bunlar 15 uygulama tablosudur; SQLite'ın kendi sqlite_sequence tablosu ayrı sayılmalıdır. Tam konuşma, tercihler ve karar değişiklikleri için önerilen hafıza tabloları mevcut şemada yok.

### Başlıca API görevleri

- /api/state: kullanıcı durumunu ve ana ekran içeriklerini hazırlar.
- /api/sestia-chat: serbest sohbet; kalıcı mesaj yazmıyor.
- /api/analyze: tek eşya, oda ve fotoğraf kapsam analizi; kendisi analiz kaydı yazmıyor.
- /api/decide: kararları kaydeder.
- /api/rooms ve alt rotalar: oda, fotoğraf, tarama ve analiz ilişkilerini yönetir.
- /api/inspiration: geçmiş kararlardan ipucu üretir ve önbellekler.
- /api/auth: hesap oturumu.
- /api/event, /api/feedback, /api/error: destekleyici kayıtlar.

## 15. Güvenilirlik, veri sınırları ve işletim

Kimlik sunucuda getIdentity ile çözülür: önce hesap oturumu, yoksa imzalı misafir çerezi. device_id alanının adı yanıltıcı olabilir; değer yalnızca fiziksel cihazı değil misafir veya hesap sahibini temsil eder.

Misafir token'ının süresi 180 gün, hesap oturumu yapılandırması 30 gündür. Bunlar kullanıcıya ait verilerin aynı süre sonunda otomatik silindiği anlamına gelmez. Kimlik kaybı, veriler diskte dururken erişimin kaybolmasına neden olabilir.

Başlıca açıklar:

- Taramalar arasında kalıcı eşya kimliği yok.
- Karar ve analizin nihai hâli ayrı isteklerle yazılıyor.
- Karar kaydında tekrar gönderimi tekilleştiren anahtar görülmüyor.
- Manuel seçimin yanında kalan AI gerekçesi, kullanıcının kendi gerekçesi gibi yorumlanmamalı.
- Oda analizinin ayrı kayıt isteği başarısız olursa son tur kaybolabilir.
- Serbest sohbette başarısız gönderim sonrası rol sırası bozulması riski var.
- Oda kararlarında metinsel oda etiketi “Genel” kalabildiğinden ilhamın bağlamı eksilebilir.
- Kullanıcılar arası veri izolasyonunun varlığı, bütün güvenlik kontrollerinin tamamlandığını kanıtlamaz.

Düşük bütçeli işletim için önce token kullanımı ölçülmeli. Mevcut kodda kullanım token'larını kaydeden veya açık prompt caching uygulayan yapı görülmüyor. Fotoğraflı takip çağrıları görselleri yeniden gönderebiliyor. Daha küçük bağlam, kontrollü tekrar deneme ve artımlı özetleme teknik önerilerdir; uygulanmış optimizasyon sayılmamalıdır.

SQLite ve fotoğraflar kalıcı disk ister. Railway dosyası deployment komutlarını gösterir; canlı volume veya düzenli geri yükleme testi kanıtı değildir. Yedekleme hem veritabanını hem ilişkili fotoğrafları kapsamalıdır.

Bu belgeye fiyat veya aylık maliyet garantisi eklenmemiştir. Gerçek maliyet, aktif kullanıcı, tur sayısı, model, fotoğraf kullanımı, token hacmi ve hosting üzerinden ölçülmelidir.

## 16. Doğrulama ve başarı ölçütleri

Ürünün başarısı yalnızca daha fazla karar veya puan üretmekle ölçülmemeli. Kullanıcının kendi niyetine uygun bir yön bulması ve Sestia'nın güvenilir davranması önemlidir. Aşağıdakiler değerlendirme önerileridir; tamamlanmış ölçüm sonuçları değildir.

**Karakter:** Doğal Türkçe, somut fikir, doğru yerde soru, gereksiz tekrar yapmama, itirazı kabul etme, bilinmeyeni uydurmama.

**Hafıza:** Aynı eşya ve kişiyi doğru eşleştirme, fikir ile kararı ayırma, yeni tercihi güncel kabul etme, eski kaydın kaynağını koruma.

**Kütüphane:** Kaynak izlenebilirliği, yaratıcı önerinin etiketlenmesi, kırık bağlantı ve geçersiz ilişki tespiti, güncellik ve çelişki yönetimi.

**Arayüz:** Eylem sırasının anlaşılması, okunabilirlik, dokunma alanları, klavye ve küçük ekran davranışı, hata sonrası devam edebilme.

**Teknik:** Yeniden denemede çift kayıt oluşmaması, kullanıcılar arası ayrım, kesintide kayıp yaşamama ve yedekten geri dönüş.

Örnek testler: “Belki satarım” karar olmamalı; “satmaya karar verdim” satılmış sonuç olmamalı; “vazgeçtim” güncel duruma yansımalı; iki farklı odadaki benzer sandalye karıştırılmamalı; hiç konuşulmamış ayrıntı hatırlanıyormuş gibi sunulmamalı.

## 17. Açık işler ve henüz alınmamış kararlar

### Hedef olarak belgelenmiş, uygulaması eksik

- Uzun dönem konuşma ve kullanıcı bağlamı.
- Bütün görevlerde karakter tutarlılığı.
- İlhamın gerçek içeriğinin konuşmaya taşınması.
- Genel bilgi erişimi ve kontrollü araştırma.
- Hatırlanan bilgiyi görme, düzeltme ve silme.
- Kullanıcı deneyimini genel bilgiye dönüştürmenin kuralları.

### Tasarım veya teknik öneri olarak duranlar

- Yeni ana sayfa/sohbet yerleşimlerinin uygulamaya aktarılması.
- Hafıza tablolarının kesin şeması ve bağlam getirme yöntemi.
- Bilgi şemasının sürümlenmesi ve otomatik doğrulama.
- Merkezi indeksin nasıl üretileceği.
- Misafir–hesap veri bağlantısının ayrıntıları.
- Maliyet sınırları, araştırma derinliği ve model seçimi.
- Dış referanslar arasından nihai içerik seçimi.

### Kesinleşmiş gibi sunulmaması gerekenler

Ücretli üyelik, alışveriş/ilan entegrasyonu, otomatik 3B plan, kesin ölçüm, uygulama içi yeni görsel üretimi, profesyonel keşif hizmeti, çok kullanıcılı ev paylaşımı ve otomatik bildirimler bu incelemede tamamlanmış veya onaylanmış özellik olarak saptanmadı.

Geliştirme sıralaması önerisi: önce kayıt ve kimlik sürekliliği, ardından anlamlı hafıza ve bağlam getirme; görsel tasarım uygulaması ve karakter bütünlüğü ayrı doğrulanabilir işler olarak yürütülmeli. Bu sıralama bağlayıcı yol haritası veya uygulama yetkisi değildir.

## 18. Kaynaklar ve belgeyi güncelleme kuralları

### Ana kaynaklar

- [Karakter dosyası v1](SESTIA_KARAKTER_DOSYASI_v1.md): Onaylı karakter temeli; deneysel ve hedef bölümleri kendi statüsüyle okunmalı.
- [Karakter yenileme faz 1](SESTIA_KARAKTER_YENILEME_FAZ1.md): Aktarım ve önceki test raporu.
- [Karakter entegrasyonu ön denetim](SESTIA_KARAKTER_ENTEGRASYONU_ON_DENETIM.md): Önceki durum değerlendirmesi.
- [Uygulama denetimi](../SESTIA_UYGULAMA_DENETIM_RAPORU.md): Önceki ürün/uygulama incelemesi.
- [Hafıza mimarisi denetimi](SESTIA_HAFIZA_MIMARISI_DENETIM.md): Ayrıntılı hafıza değerlendirmesi; eski satır numaraları güncel kodla kontrol edilmeli.
- [Kütüphane mimarisi](../SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/00_MIMARI_VE_PLANLAMA/SESTIA_BILGI_KUTUPHANESI_RAPOR.md): Kavramsal tasarım.
- [Bilgi tipleri ve ilişki şeması](../SESTIA_BILGI_KUTUPHANESI/03_ALTYAPI/03_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md): Taslak alan ve ilişki sözlüğü.
- [Kütüphane devir raporu](../SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/00_MIMARI_VE_PLANLAMA/SESTIA_TAM_DEVIR_RAPORU_01.md): İlk renk içeriği ve tarihsel durum.
- [Renk araştırması](../SESTIA_BILGI_KUTUPHANESI/01_ARASTIRMA/05_RENK_VE_GORSEL_KOMPOZISYON/RENK_ARASTIRMASI_01.md): Kaynak kaydı ve bilgi boşlukları.
- [Görsel referans organizasyonu](../SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/00_MIMARI_VE_PLANLAMA/RENK_REFERANS_INBOX_ORGANIZASYON_RAPORU_01.md): Sonraki kartela çalışması.
- [Renk referans envanteri](../SESTIA_BILGI_KUTUPHANESI/02_KUTUPHANE/05_RENK_VE_GORSEL_KOMPOZISYON/Kartela_Referanslari/00_ENVANTER/RENK_REFERANS_ENVANTERI_01.md): 29 referansın kaydı.
- [UI tasarım seti](../design-references/sestia-ui-konseptleri-v1/INCELEME.md): 18 görsel ve öneri sınırları.
- [Ekran kodu](../app/page.js), [AI çağrıları](../lib/anthropic.js), [veri katmanı](../lib/db.js), [kimlik](../lib/identity.js), [hesap](../lib/auth.js), [editoryal içerik](../lib/sestiaLibrary.js).

### Kaynaklar arasındaki tarih farkları

Eski kütüphane raporunda “dosya oluşturulmadı”, şema metninde “gerçek bilgi dosyası yazılmadı” ve devir raporunda “kartela klasörü yok” ifadeleri bulunuyor. Bunlar o belgelerin yazıldığı aşamayı anlatıyor; bugünkü dosya envanterini geçersiz kılamaz.

Karakter belgesinin başındaki “henüz uygulamaya aktarılmadı” notu da sonraki faz-1 aktarımı ve güncel CHAT_PROMPT ile birlikte okunmalı. Buna karşılık tek bir prompta aktarım, bütün akışlarda tamamlanmış karakter tutarlılığı değildir.

### Güncelleme kuralı

1. Uygulama durumunu kod ve gerektiğinde test kanıtıyla doğrula.
2. Karakter veya ürün kararı için açık onayı ve kaynağını koru.
3. Tarihsel raporu güncel özellik listesi gibi kopyalama.
4. Deneysel fikirleri, hedefleri, görsel mockup'ları ve tamamlanmış işleri ayrı tut.
5. İçerik sayımlarını değişiklik olduğunda yeniden yap.
6. Bu ana belgeyi güncelle; aynı içeriğin belirsiz isimli kopyalarını üretme.
7. Kaynak çelişkisini gizleme; hangi iddianın hangi tarih ve kanıta dayandığını belirt.

**Belgenin kapsamındaki ana ayrım:** Ürünün genişleyen amacı, yaşam alanı üzerine Sestia'yla birlikte düşünmektir. Bugünkü kod bunun bazı parçalarını gerçekleştiriyor; karakter belgeleri, bilgi içerikleri, hafıza tasarımı ve UI referansları ise bu amacı tamamlamak için farklı olgunluk düzeylerinde ilerliyor.

