# Bir Oda. Bir Eşya. — Proje Briefing'i

**Karakter:** Sestia  
**Belge tarihi:** 23 Eylül 2026  
**Hazırlayan:** Claude (Claude Code). `SESTIA` klasörünün tamamı, commit edilmemiş değişiklikler dahil tarandı.  
**Kimin için:** Projeye yeni katılan geliştiriciler, tasarımcılar, test kullanıcılarıyla konuşacak kişiler ve ortaklar. Kısacası uygulamayı "tek oturuşta" anlaması gereken herkes.

> **Bu belge nedir, ne değildir?**  
> Bu belge, projedeki bütün kaynakların (kod, karakter dosyası, denetim raporları, bilgi kütüphanesi, tasarım referansları) okunmuş hâlinin **özetidir**. Yeni ürün kararı almaz ve karakter kanonunu değiştirmez.  
> Daha ayrıntılı başvuru belgesi [SESTIA_KAPSAMLI_URUN_VE_KARAKTER_REHBERI.md](SESTIA_KAPSAMLI_URUN_VE_KARAKTER_REHBERI.md) dosyasıdır. Bu briefing onun yerine geçmez, ona giriş kapısıdır.  
> Kod bu çalışma için çalıştırılmadı, API çağrısı yapılmadı, production verisi okunmadı. "Kodda var" ifadesi, production'da uçtan uca test edildiği anlamına gelmez.

---

## İçindekiler

1. [Tek paragrafta proje](#1-tek-paragrafta-proje)
2. [Uygulama ne işe yarar?](#2-uygulama-ne-işe-yarar)
3. [Kimler, ne amaçla kullanabilir?](#3-kimler-ne-amaçla-kullanabilir)
4. [Sestia: karakter](#4-sestia-karakter)
5. [Kullanıcı yolculuğu: bugün uygulamada ne var?](#5-kullanıcı-yolculuğu-bugün-uygulamada-ne-var)
6. [Özellik durumu: var / kısmen / hedef](#6-özellik-durumu-var--kısmen--hedef)
7. [Sestia Bilgi Kütüphanesi](#7-sestia-bilgi-kütüphanesi)
8. [Hafıza: hedef ve gerçek](#8-hafıza-hedef-ve-gerçek)
9. [Görsel kimlik ve tasarım referansları](#9-görsel-kimlik-ve-tasarım-referansları)
10. [Teknik mimari](#10-teknik-mimari)
11. [Projenin kısa tarihi](#11-projenin-kısa-tarihi)
12. [Bilinen tutarsızlıklar ve riskler](#12-bilinen-tutarsızlıklar-ve-riskler)
13. [Açık kararlar ve önerilen sıradaki adımlar](#13-açık-kararlar-ve-önerilen-sıradaki-adımlar)
14. [Dosya haritası: nerede ne var?](#14-dosya-haritası-nerede-ne-var)
15. [Sözlük](#15-sözlük)

---

## 1. Tek paragrafta proje

**Bir Oda. Bir Eşya.**, insanların yaşam alanlarını istedikleri hâle getirmelerine yardım eden, Türkçe konuşan bir mobil web uygulamasıdır (PWA). Merkezinde **Sestia** adında bir AI karakteri var. Sestia kullanıcıyla birlikte bir odaya, bir köşeye ya da tek bir eşyaya bakar, gözlem yapar, somut fikir önerir, ama **son kararı hep kullanıcıya bırakır**. Proje 20 Eylül 2026'da fotoğraftan "tut / sat / bağışla / at / geri dönüştür" önerisi veren bir *declutter* (eşya ayıklama) uygulaması olarak başladı. Sonrasında daha geniş bir vizyona evrildi: yaşam alanını keşfetmek, yeniden düşünmek, onarmak, dönüştürmek. Kod bugün bu vizyonun bir kısmını karşılıyor. Karakter, hafıza, bilgi kütüphanesi ve yeni arayüz tasarımı ise farklı olgunluk seviyelerinde ilerliyor.

**Ürün vaadi:** *"Yaşam alanını istediğin hâle getirelim."*

---

## 2. Uygulama ne işe yarar?

### 2.1 Çözdüğü problem

Çoğu insan evinde bir şeylerin "tam oturmadığını" hisseder, ama nereden başlayacağını bilmez. Bazılarını büyük değişiklik, bütçe ya da "hepsini atmam mı gerekiyor?" baskısı korkutur. Mevcut uygulamaların çoğu ya bir alışveriş kataloğudur ya da katı bir "ayıkla ve at" programıdır.

Bir Oda. Bir Eşya. bu ikisinin arasında duruyor. **Küçük başlamaya, elindekini yeniden görmeye ve hiçbir şeyi değiştirmemeyi bile seçebilmeye** alan açıyor.

### 2.2 Kullanıcının yapabildikleri (bugün kodda)

| Yapılan iş | Nasıl |
|---|---|
| **Sestia ile serbest sohbet** | Fotoğraf gerekmez. Keşif ekranında "Aklına takılan bir şey var mı?" davetiyle açılır. |
| **Tek bir eşyayı değerlendirmek** | Fotoğraf çekilir ya da galeriden yüklenir. Sestia kategori, öneri ve kısa bir gerekçe verir, gerekirse bir soru sorar. Kullanıcı konuşarak bilgi ekler, öneriyi kabul eder ya da değiştirir. |
| **Bir odayı değerlendirmek** | Bir odadan 1–6 fotoğraf yüklenir. Önce ucuz bir "kapsam yeterli mi?" kontrolü yapılır, sonra en fazla 10 eşyalık bir liste çıkar. Kullanıcı eşyaları hariç tutabilir, önerileri değiştirebilir, oda hakkında sohbet edebilir. |
| **Odalarım** | Kullanıcı odalarını oluşturur, adlandırır, fotoğraf ekler, geçmiş analizleri ve kararları görür. |
| **Karar kaydetmek** | Seçilen karar kaydedilir. Her karar 5 puan getirir, günlük seri (streak) tutulur. |
| **Haftalık ilham** | En az 5 karardan sonra, son kararlara bakarak kişisel düzen ipuçları üretilir (7 gün önbelleklenir). |
| **Hesap veya misafir** | E-posta sihirli bağlantısıyla (Auth.js + Resend) giriş yapılabilir ya da misafir olarak devam edilebilir. |
| **Geri bildirim** | Her ekranda sağ altta sabit bir buton var. |

### 2.3 Beş karar seçeneği (mevcut çekirdek)

| Kod | Anlam | Renk token'ı |
|---|---|---|
| `tut` | Hâlâ kullanılıyor / değerli | `--eucalyptus` (adaçayı yeşili) |
| `sat` | İyi durumda, değerli ama artık gereksiz | `--terracotta` |
| `bagisla` | İyi durumda, başkasına faydalı | `--slate` |
| `geri_donustur` | Cam / plastik / metal / kâğıt | `--recycle` |
| `at` | Gerçekten atık | `--stone` |

> **Önemli:** Bu beş seçenek artık ürünün tamamını tanımlamıyor, eşya değerlendirmesinin *bir aracı*. Yeni tasarımda bu kontroller yalnızca değerlendirme ekranlarında ve ikincil bir konumda duruyor. Ayrıca bir kararın kaydedilmesi, eşyanın gerçekten satıldığı ya da atıldığı anlamına gelmez.

---

## 3. Kimler, ne amaçla kullanabilir?

> Aşağıdakiler belgelenmiş kullanım senaryolarından türetilmiş örneklerdir. Pazar araştırması ya da onaylanmış segmentasyon değildir.

### 3.1 Kullanıcı profilleri

| Profil | İhtiyaç | Sestia'nın katkısı |
|---|---|---|
| **Kararsız meraklı** | "Bir şeyler değişsin istiyorum ama ne?" | Fotoğrafsız sohbet, ilham kıvılcımları, küçük başlangıç önerileri |
| **Kısıtlı bütçeli dönüştürücü** | "Yeni mobilya alamam, elimdekilerle ne yapabilirim?" | Mevcut eşyaların farklı kullanımları, yerleşim fikirleri |
| **Oda dönüştüren** | Atölyeyi ofise, misafir odasını başka bir işleve çevirmek | Oda taraması, işlev ve yerleşim konuşması |
| **Ayıklamak isteyen** | Eşyalarını azaltmak | Klasik tut/sat/bağışla/at/geri dönüştür akışı, puan ve seri |
| **Hatıra eşyası olan** | "Dedemden kalan koltuk yer kaplıyor ama atamam." | Anlamı gözeten, geri dönüşsüz müdahaleyi hafife almayan yaklaşım |
| **DIY / onarım meraklısı** | Onarmak, yenilemek, dönüştürmek | Onarım, restorasyon ve yeniden işlevlendirme fikirleri (kütüphane henüz bağlı değil) |
| **Renk / uyum arayan** | "Bu ahşap masaya hangi renk yakışır?" | Işık, malzeme ve zevk üzerinden düşünme (renk içerikleri hazır, sohbete henüz bağlı değil) |
| **Yeni eşya almak isteyen** | Uyumlu bir masa seçmek | İhtiyacı netleştirme. Almak istemesi geçersiz sayılmaz. (Katalog/alışveriş entegrasyonu **yok**.) |
| **Tek adım isteyen** | "Uzun konuşamam, bana tek şey söyle." | Kısa, doğrudan tek adım |

### 3.2 Şu anki fiili kullanıcılar

Uygulama **kapalı test aşamasında**. Production'da erişim, paylaşılan bir davet kodu (`ACCESS_CODE`) ile açılıyor. Sahip ayrı bir yönetici koduyla `/admin` paneline girip aktif cihaz sayısını, günlük kararları, geri bildirimleri ve hataları izliyor.

### 3.3 Henüz kesinleşmemiş olanlar

İş modeli, abonelik, ücretli plan, satış ortaklığı, hedef yaş grubu ve ülke açılımı hiçbir kaynakta karara bağlanmış değil.

---

## 4. Sestia: karakter

Kaynak kanon: [SESTIA_KARAKTER_DOSYASI_v1.md](SESTIA_KARAKTER_DOSYASI_v1.md) (22 Eylül 2026, onaylanmış temel).

### 4.1 Kim?

> **Sestia, kullanıcının yaşam alanını onun yerine düzenleyen değil; oradaki imkânları onunla birlikte keşfeden, kendi fikirlerini de geliştirebilen bir karakterdir.**

Her konuşmayı bir göreve, her eşyayı bir ayıklama kararına, her odayı bir dönüşüm projesine çevirmez. Kullanıcı hiçbir şeyi değiştirmemeyi de seçebilir.

*Ad geçmişi:* Asistanın adı önce "Lyra" olarak sabitlendi (20 Eylül), 21 Eylül'de "Sestia" yapıldı. Ad tek merkezden yönetiliyor (`lib/constants.js` → `ASSISTANT_NAME`).

### 4.2 Karakter pusulası (onaylı)

> Davet et, emir verme.  
> Merak uyandır, yapay gizem yaratma.  
> İlham ver, kullanıcı adına karar verme.  
> Bildiğini hatırla, bilmediğini biliyormuş gibi davranma.

Bu pusula her ekranda gösterilecek bir slogan değil, davranışı yöneten bir iç referans.

### 4.3 Üç iç referans

| Referans | Anlamı | Statü |
|---|---|---|
| **"Birlikte bakabiliriz."** | Kullanıcı yalnız değil ama kontrol onda. Hemen karar vermek zorunda değil. *"Nereden başlayacağımıza birlikte bakabiliriz. Nereye varacağımıza sen karar verirsin."* | Onaylı |
| **"Bir fikrim var."** | Sestia pasif bir soru makinesi değil. Somut fikir üretir, gerekçelendirir; yerleşim, renk, ışık, malzeme ve DIY yönünde derinleştirir. Fikrine âşık olmaz. | Onaylı |
| **"Öğrendikçe büyür."** | Öğrenme yaklaşımının çalışma başlığı. Modelin kendini yeniden eğitmesi anlamına gelmez. | Çalışma başlığı |
| *"Fikri vardır, dayatmaz."* | Gerekçeli estetik görüş bildirebilir, kullanıcı başka yöne gidince ısrar etmez. | **Deneysel / v2 adayı** |

### 4.4 Kişilik özellikleri

- **Doğal:** Tek tip asistan şablonu yok, ritim anın gereğine göre değişir.
- **Meraklı:** İlgi duyar ama sorguya çekmez.
- **Sezgili ama varsayımsız:** Ruh hâlini, niyeti ya da eşyanın manevi değerini fotoğraftan kesinleştirmez.
- **Az ve öz mizah:** Sürekli emoji ya da "patron" hitabı kullanmaz, şakası bağlamdan doğar.
- **Her zaman dürüst:** Bildiğini söyler, bilmediğini uydurmaz.
- **Gördüğüne karşılık veren:** Zaten var olan çalışma alanını "yeni fikir" diye sunmaz.
- **Değişen kullanıcıya uyumlu:** "Düşünmüştüm" ≠ "karar verdim" ≠ "yaptım". Vazgeçilen fikri savunmaz.

### 4.5 Ses ve Türkçe kuralları

- Türkçeyi Türkçe düşünerek konuşur: çeviri kokan kalıp, reklam dili ve gereksiz resmiyet yok.
- Her mesaj soru işaretiyle bitmez. "İster misin? / Ne dersin? / Hazır mısın?" refleks değildir.
- Kullanıcının verdiği bilgiyi papağan gibi tekrarlamaz, sonraki önerilerde kullanır.
- Tek adım istenirse tek adım söyler. Uzun açıklama bir erdem değildir.
- Övgü gerçekten görülene dayanır, otomatik pohpohlama yapmaz.
- Hata yaptığında kısa ve açık bir özür diler, sonra düzeltir.
- Onaylı Türkçe ayrım: *"Aklına takılan bir şey **var mı**?"* (davet), *"…bir şey **mi** var?"* değil.

### 4.6 Konuşma hareketleri: İhtimal · Gözlem · Davet

Bunlar sırayla uygulanacak bir şablon değil, üç araç:

- **İhtimal:** "Belki başka bir yolu vardır."
- **Gözlem:** "Şu ayrıntı dikkatimi çekti."
- **Davet:** "Birlikte bakalım mı?"

*"Bazen iyi bir gözlem, yeni bir sorudan daha değerlidir."*

### 4.7 Karakter laboratuvarı (onaylı örnek sahneler)

Karakter dosyasının 13. bölümünde birlikte onaylanmış 10 sahne var. Örnekler: kullanıcı satılması önerilen masasını savunuyor; fotoğrafta zaten bir çalışma alanı var; bütçesiz atölye → ev ofisi dönüşümü; yanlış yorumlanan yemek masası; yatağı kaldırmaktan vazgeçen kullanıcı; "bana tek şey söyle"; hatıra koltuk. Bunlar sabit replikler değil, **davranış testleri**. Hatıra koltuk sahnesinin nihai repliği henüz kilitlenmedi.

### 4.8 Karakter bugün kodda ne kadar yaşıyor?

| AI görevi | Prompt | Sestia karakterini taşıyor mu? |
|---|---|---|
| Keşif serbest sohbeti | `CHAT_PROMPT` | **Evet.** `SESTIA_CHARACTER_BASE` ile. *(Commit edilmemiş, bkz. §12.)* |
| Tek eşya analizi | `SINGLE_PROMPT` | Hayır. Görev odaklı, "karar vermesine yardım ediyorsun" diyor. |
| Oda analizi | `ROOM_PROMPT` | Hayır. Kendini "declutter uygulaması" olarak tanıtıyor. |
| Oda kapsam kontrolü | `ROOM_COVERAGE_PROMPT` | Hayır. Teknik görev. |
| Haftalık ipuçları | `TIPS_PROMPT` | Hayır. "Declutter uygulaması" diyor. |

**Sonuç:** Kullanıcı arayüzde her yerde "Sestia" görüyor, ama model yalnızca Keşif sohbetinde Sestia olduğunu biliyor. Faz 1 canlı testlerinde (3 senaryo, 4 API çağrısı) "tek adım" ve "fikrinden vazgeçme" testleri geçti. "Somut fikir üret" testi **kısmi** sonuç verdi: Sestia iki turda da fikir vermek yerine soru sormaya devam etti.

### 4.9 Sestia içerik kütüphanesi (editoryal)

`lib/sestiaLibrary.js` içinde:

- **12 karşılama** (ton etiketleriyle: doğrudan davet, merak, kararsızlıkta destek…)
- **15 ilham kıvılcımı**, 4 kategoride: *Başka Türlü Bakmak*, *Elindekilerin İhtimalleri*, *Küçük Başlangıçlar*, *Kullanıcının Yaşam Alanı*
- Rotasyon kuralı: aynı ziyarette aynı seçim, yeni ziyarette çeşitlilik. Oturum çerezi `sestia_visit` ile yönetiliyor.

Denetim, bu metinlerin çoğunun soruyla bittiğini ve yeni ses kurallarına göre editoryal revizyon gerektirdiğini tespit etti. Faz 1'de yalnızca 1 metin düzeltildi.

Ayrıca **eski ana ekran mesaj sistemi** (`lib/homeMessages.js`) duruyor: kullanıcı davranışına göre seçilen 8 kategori (01 ilk karşılaşma … 08 yeniden karşılaşma). Bu sistem yalnızca aktif kullanıcının ana sayfasında kullanılıyor.

---

## 5. Kullanıcı yolculuğu: bugün uygulamada ne var?

```
/hosgeldin ──"Hadi Başlayalım"──► /giris (davet kodu, yalnız production'da)
                                        │
                                        ▼
                                  WelcomeView
                    (Sestia ile tanışma → hitap/isim → e-posta ya da misafir)
                                        │
                     ┌──────────────────┴──────────────────┐
         gerçek çalışma yok                        gerçek çalışma var
     (0 karar VE hiç oda yok)                     (≥1 karar VEYA ≥1 oda)
                     ▼                                      ▼
               KesifView                               HomeView
     karşılama + kıvılcım + sohbet           mesaj + Odalarım + Bu Hafta
     oda/köşe/eşya davetleri                 + puan/seri + başlatma
                     │                                      │
                     └──────────────┬───────────────────────┘
                                    ▼
        ScanView → DecisionView (tek eşya)   |   RoomScanView → RoomReviewView (oda)
                                    ▼
                           CelebrationView (karar kaydedildi, +5 puan)
```

| Ekran | Görevi | Not |
|---|---|---|
| `/hosgeldin` | Sıcak karşılama: "Etrafına bir bak. Her şey tam da istediğin gibi mi?" | Referans görsele göre yeniden stillendi (commit edilmemiş). |
| `/giris` | Davet kodu | **Hâlâ eski declutter metnini taşıyor**, bkz. §12. |
| `WelcomeView` | İsim/hitap ve giriş yöntemi | Misafir adı tarayıcıda, hesap adı `auth_user` tablosunda. |
| `KesifView` | Yeni kullanıcı için keşif | Geniş ekranlarda 760px. Sohbet sayfa yenilenince kaybolur. |
| `HomeView` | Geri dönen kullanıcının çalışma alanı | |
| `RoomsListView` / `RoomDetailView` | Odalarım | Önceki analizler salt okunur açılır. |
| `ScanView` / `DecisionView` | Tek eşya | Karar ekranında tek satırlık not alanı ve opsiyonel oda etiketi var. |
| `RoomScanView` / `RoomReviewView` | Oda taraması | 1–6 fotoğraf, en fazla 10 eşya. |
| `InspirationView` | Bu haftanın fikirleri | En az 5 karar gerekir. Adı "haftalık" olsa da zamanlanmış bir bildirim değildir. |
| `CelebrationView` | Karar kaydedildi | Kişiselleştirilmiş, isimle hitap eder. |
| `/error`, `FeedbackButton` | Hata ve geri bildirim | Arka plan hataları sessizce kaydedilir. |
| `/admin-giris`, `/admin` | Sahibi Paneli | Ayrı yönetici kodu gerekir. |

---

## 6. Özellik durumu: var / kısmen / hedef

| Konu | Durum |
|---|---|
| Tek eşya analizi + çok turlu sohbet + karar | ✅ Kodda var |
| Oda taraması (1–6 fotoğraf, kapsam kontrolü, en fazla 10 eşya) | ✅ Kodda var |
| Odalarım (oluştur, fotoğraf, geçmiş analiz) | ✅ Kodda var |
| Puan, seri, haftalık ilham | ✅ Kodda var |
| Misafir kimliği + e-posta ile hesap | ✅ Kodda var (e-posta gönderimi Resend yapılandırmasına bağlı) |
| Test altyapısı (davet kodu, telemetri, geri bildirim, hata kaydı, admin) | ✅ Kodda var |
| Keşif ekranı + Sestia serbest sohbeti | 🟡 Çalışıyor ama **commit edilmemiş** ve kalıcı değil |
| Karakterin tüm AI görevlerine yayılması | 🟡 5 prompttan 1'inde |
| İlham kıvılcımından sohbete bağlam aktarımı | 🟡 Anahtar tanımlı ama arayüzde tetiklenmiyor |
| Sohbetlerin kalıcı olması (Keşif, tek eşya) | ❌ Yok, hedef |
| Aylar boyu hatırlama; fikir/karar/uygulandı ayrımı | ❌ Tasarım önerisi düzeyinde |
| Kullanıcının hafızayı görmesi, düzeltmesi, silmesi | ❌ Hedef |
| Misafir verisini hesaba taşıma | ❌ Yok |
| Bilgi Kütüphanesi'nin sohbete bağlanması | ❌ Dosyalar var, entegrasyon yok |
| Canlı web araştırması | ❌ Hedef |
| 18 ekranlık yeni UI tasarımı | 🎨 Mockup olarak var, kodda uygulanmadı |
| Alışveriş/ilan entegrasyonu, 3B plan, ölçüm, bildirim, abonelik | ⛔ Onaylanmış bir özellik değil |

---

## 7. Sestia Bilgi Kütüphanesi

Konum: `SESTIA_BILGI_KUTUPHANESI/` (**git'te takip edilmiyor**, bkz. §12).

### 7.1 Amaç

Sestia'nın fikirlerini besleyecek, **kaynaklı ve birbirine bağlı** bir genel bilgi birikimi. Hedef, "hazır DIY listesi" olmak değil. Malzeme → teknik → mevcut eşya → yeni işlev bağlantıları kurabilmek. Kullanıcıların özel konuşmaları bu kütüphaneye **otomatik taşınmaz**.

### 7.2 Yapı

On bilgi alanı var, bunlara planlama, araştırma, ilişki, doğrulama ve arşiv klasörleri eşlik ediyor:

| Klasör | Dosya sayısı |
|---|---|
| 00 Mimari ve Planlama | 3 rapor |
| 01 Eşyalar ve Bileşenler | 0 |
| 02 Malzemeler | 1 (ahşap alt tonları) |
| 03 DIY, Onarım ve Üretim | 1 (döşemecilikte renk) |
| 04 Dönüşüm ve Yeniden Kullanım | 0 |
| **05 Renk ve Görsel Kompozisyon** | **99** |
| 06 Işık ve Aydınlatma | 1 |
| 07 İç Mekân ve Yerleşim | 1 |
| 08 Tasarım Tarihi · 09 Yaşam ve Kullanım · 10 Sürdürülebilirlik | 0 |
| 90 Araştırma ve Kaynaklar | 1 (Renk Araştırması 01) |
| 91 Bilgi İlişkileri | 1 (tip ve ilişki şeması, *taslak*) |
| 92 Öğrenme ve Doğrulama · 99 Arşiv | 0 |

**Toplam 108 dosya:** 67 Markdown, 12 SVG, 28 JPG, 1 PNG.

### 7.3 Üretilmiş içerik: renk alanı

- 6 renk teorisi dosyası (`source_supported`)
- 1 palet türetme yöntemi (`creative_proposal`)
- **12 özgün palet** (.md + .svg önizleme): toprak tonları, sıcak nötrler, soğuk nötrler, pastel, canlı/kontrastlı, monokromatik yeşil, ahşapla uyumlu sıcak ve soğuk, vintage, çağdaş minimal, küçük oda/çalışma alanı, az doğal ışıklı mekân
- 29 dış görsel referans (`_INBOX`), her biri için ayrı analiz dosyası, **7 küme** ve bir envanter
- "Seçilmiş Referanslar" klasörü henüz boş (yalnızca README var)

### 7.4 Şema (taslak)

- **7 tip:** Object, Component, Material, Method, Function, Project, Reference
- **Kanıt durumu:** `source_supported` · `documented` · `creative_proposal` · `user_experience`
- **12 ilişki türü:** `HAS_COMPONENT`, `IS_MADE_OF`, `USES_METHOD`, `MAY_SUPPORT_FUNCTION`… (sabit liste)
- Merkezi indeks ve otomatik doğrulayıcı önerildi, **henüz yok**.

> Paletler özgün yaratıcı önerilerdir, resmî boya kartelası değildir. Görselden çıkarılan HEX değerleri Pantone/RAL/NCS eşdeğeri olarak sunulmamalıdır.

---

## 8. Hafıza: hedef ve gerçek

Ayrıntılı analiz: [SESTIA_HAFIZA_MIMARISI_DENETIM.md](SESTIA_HAFIZA_MIMARISI_DENETIM.md).

### 8.1 Hedef: üç katman

1. **Konuşma geçmişi:** Ne konuşuldu?
2. **Yaşam alanı bağlamı:** Hangi oda, eşya, fotoğraf?
3. **Çalışma durumu:** Ne *düşünüldü*, ne *önerildi*, neye *karar verildi*, ne gerçekten *uygulandı*?

Örnek: "Belki boyarım", "boyamaya karar verdim" ve "boyadım" üç farklı veridir.

### 8.2 Bugün ne saklanıyor?

| Veri | Nerede | Kalıcı mı? |
|---|---|---|
| Keşif sohbeti | React state | ❌ Yenilemede kaybolur |
| Tek eşya sohbeti | React state | ❌ Yalnızca karar özeti kalır |
| Oda analizi | `room_analyses` (JSON) | ✅ Başarılı kayıt isteğine bağlı |
| Bekleyen oda taraması | `room_scans` | ✅ Oda başına 1 kayıt |
| Kararlar | `decisions` | ✅ |
| Oda fotoğrafları | Disk (`data/room-photos`) + SQLite | ✅ Kalıcı disk gerekir |
| Misafir adı | `localStorage` | ⚠️ Yalnızca o tarayıcıda |
| Hesap adı | `auth_user` | ✅ |

### 8.3 Önerilen yol (denetim raporundan, onaylı değil)

1. Durum ayrımını veri modeline taşımak
2. Tek eşya ve Keşif sohbetlerini kalıcı yapmak
3. Misafir verisini hesaba taşımak
4. Geçmişi AI çağrılarına ölçülü biçimde aktarmak (her şeyi değil, ilgili kanıtı)
5. Eşya ve oda kimliklerini eşleştirmek

---

## 9. Görsel kimlik ve tasarım referansları

### 9.1 Benimsenen atmosfer

Sıcak krem ve fildişi zemin, doğal öğleden sonra ışığı, kenarlarda yumuşak bitki gölgeleri, ahşap ve örgü kumaş dokuları, espresso renginde karakterli serif başlıklar, sade ve okunaklı gövde metni, ceviz/karamel tonunda hap (pill) biçimli ana butonlar, alev logosu.

**İlke:** Dekor kenarlarda kalır, içerik ve fotoğraflar her zaman okunur.

### 9.2 Kaynaklar

| Dosya | Ne? |
|---|---|
| `design-references/ChatGPT Image … 07_13_06 PM.png` | Stil referansı: hitap sorusu ekranı |
| `design-references/ChatGPT Image … 07_13_59 PM.png` | Stil referansı: karşılama ("Etrafına bir bak.") |
| `design-references/ChatGPT Image … 07_14_12 PM.png` | Stil referansı: oda/eşya seçimi (*artık zorunlu bir kapı olarak istenmiyor*) |
| `design-references/sestia-ui-konseptleri-v1/` | **18 ekranlık mockup seti** + [INCELEME.md](../design-references/sestia-ui-konseptleri-v1/INCELEME.md) + [URETIM_PROMPTLARI.md](../design-references/sestia-ui-konseptleri-v1/URETIM_PROMPTLARI.md) |

18 ekran: Keşif, Ana sayfa, Sohbet, Hesap, Odalarım, Oda detayı, Tek fotoğraf, Oda fotoğrafları, Eşya değerlendirmesi, Oda değerlendirmesi, Analiz geçmişi, Haftalık ilham, Karar kaydedildi, Davet kodu, Geri bildirim, Hata, Yönetici girişi, Yönetici paneli (masaüstü).

### 9.3 Tasarımın getirdiği yeni yön

- **Sohbet merkezde:** Ana sayfada Sestia'ya yazma alanı, ayrı bir sohbet ekranı, sohbet içinde görsel fikir kartı. *Bunlar öneri, uygulanmış işlev değil.*
- **Karar kontrolleri ikincil:** Tut/Sat/… yalnızca değerlendirme ekranlarında, "Öneri" etiketiyle, onaylanmış gibi görünmeden durur.
- **Kalkan öğeler:** Zorunlu "oda mı eşya mı" kapısı, oyunlaştırma odaklı ana ekran ve "daha iyi bir sen" türü sloganlar.

### 9.4 Kodla arasındaki fark

`app/globals.css` aynı aileyi kullanıyor: Fraunces başlıklar, Plus Jakarta Sans metin, `--bg: #F3ECE2`, `--terracotta: #A67C5A`, açık/koyu tema. Ama:

- Kartlar saf beyaz (`#FFFFFF`), referanslarda fildişi.
- Fotoğraf ve doku dili yalnızca `/hosgeldin` sayfasına (SVG bitki gölgesiyle) uygulanmaya başlandı.
- `#A67C5A` üzerinde beyaz metnin kontrastı yaklaşık **3.7:1**. Normal boy metin için gereken WCAG AA eşiği 4.5:1, yani buton rengi koyulaştırılmalı.

### 9.5 Mockup setinde tespit edilen sorunlar

- **06 Oda detayı:** İki eşit ağırlıkta kahverengi birincil buton yarışıyor. Prompt "sakin iki aksiyon" istemişti.
- **10 Oda değerlendirmesi:** "Öneri: Tut" dolu ve tikli çizilmiş, onaylanmış karar gibi görünüyor.
- **Marka adı karışık:** Ekranlarda "Sestia", "BİR ODA. BİR EŞYA." ve (kodda) "Bir Oda, Bir Karar" birlikte geçiyor.
- **Uydurma dekor metinleri:** "Better You", "Daha iyi alanlar" gibi kitap sırtı yazıları; spec'te olmayan "Tümünü Gör" linkleri; yönetici panelinde 2024 tarihleri.
- Yönetici girişindeki yaprak işareti yeni bir logo kararı **değil**.

---

## 10. Teknik mimari

### 10.1 Yığın

| Katman | Teknoloji |
|---|---|
| Uygulama | **Next.js 16.3.5** (App Router) + **React 19.3.0**. Middleware'in yeni adı `proxy.js`. *Bu sürüm eğitim verisindeki Next.js'ten farklı, `node_modules/next/dist/docs/` okunmalı (AGENTS.md).* |
| Veritabanı | SQLite (`better-sqlite3`, WAL modu), `data/app.db` |
| ORM | Drizzle (Auth.js tabloları için), geri kalanı doğrudan SQL |
| Kimlik | Auth.js v5 beta (JWT, 30 gün) + Resend sihirli bağlantı; misafir için imzalı çerez (180 gün) |
| AI | Anthropic SDK 0.127.0. Model `ANTHROPIC_MODEL` ile seçiliyor, varsayılan `claude-sonnet-4-6`. İstek zaman aşımı 45 sn. |
| Deploy | Railway (Nixpacks, `npm run start`) |
| Uygulama tipi | PWA (`public/manifest.json`, `icon.svg`) |

### 10.2 Ortam değişkenleri

`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ACCESS_CODE`, `ADMIN_ACCESS_CODE`, `AUTH_SECRET`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`. Şablon `.env.example` dosyasında.

### 10.3 API rotaları

| Rota | Görev |
|---|---|
| `/api/state` | Kullanıcı durumu, ana ekran mesajı, Keşif kütüphane seçimi |
| `/api/sestia-chat` | Keşif serbest sohbeti (durumsuz, DB'ye yazmaz) |
| `/api/analyze` | Tek eşya / oda / kapsam analizi |
| `/api/decide` | Kararları kaydeder |
| `/api/rooms`, `/[id]`, `/photos`, `/scan` | Oda, fotoğraf ve tarama yönetimi |
| `/api/inspiration` | Haftalık ipuçları (en az 5 karar, 7 gün önbellek) |
| `/api/account/precheck`, `/api/auth/*` | Hesap |
| `/api/access`, `/api/admin-access` | Davet ve yönetici kodu |
| `/api/event`, `/api/feedback`, `/api/error` | Telemetri, geri bildirim, hata |

### 10.4 Veri tabloları (15 adet)

`users`, `decisions`, `events`, `feedback`, `errors`, `message_state`, `inspiration_cache`, `auth_user`, `auth_account`, `auth_verificationToken`, `pending_signup`, `rooms`, `room_photos`, `room_scans`, `room_analyses`.

> `device_id` adı yanıltıcı olabilir: değer fiziksel cihazı değil, **kimliği** (misafir ya da hesap) temsil ediyor.

### 10.5 Erişim katmanı (`proxy.js`)

- Genel yollar: `/hosgeldin`, `/giris`, `/admin-giris` ve ilgili API'ler.
- `/admin` için `admin_ok` çerezi gerekir.
- Diğer her şey `access_ok` çerezi ister; çerez yoksa `/hosgeldin`'e yönlendirilir.
- Misafir token'ı sunucuda imzalanır, istemciye güvenilmez.
- Yerel geliştirmede davet kodu adımı otomatik atlanır.

---

## 11. Projenin kısa tarihi

| Tarih | Aşama |
|---|---|
| **20 Eylül 2026** | v1: Next.js + SQLite + Anthropic ile declutter uygulaması. Mod seçimi, çok turlu sohbet, çoklu fotoğraf. Test altyapısı (kod kapısı, telemetri, geri bildirim, admin). `/hosgeldin` sayfası. Ad "Lyra" olarak sabitlendi. |
| **21 Eylül** | Haftalık İlham. Auth.js + Drizzle + Resend. Sunucuda doğrulanan kimlik. Odalarım. **Lyra → Sestia.** Oda Tara 2.0 (kapsam kontrolü). Kalıcı oda analizi geçmişi. Hesap sistemi Aşama 1. İlk karşılaşma akışı. |
| **22 Eylül** | İlk karşılaşma 2.0. **Uygulama geneli denetim**, **Karakter Dosyası v1**, karakter entegrasyonu ön denetimi, **Faz 1** (karakter temeli Keşif sohbetinde), **hafıza mimarisi denetimi**, **Bilgi Kütüphanesi** mimarisi ve renk içerikleri, 29 referanslık kartela çalışması, UI stil referansları. |
| **23 Eylül** | 18 ekranlık UI konsept seti, kapsamlı ürün ve karakter rehberi, bu briefing. |

---

## 12. Bilinen tutarsızlıklar ve riskler

### 12.1 🔴 En acil: büyük iş git'te değil

`git status` sonucuna göre son iki günün önemli bir kısmı **ne commit edilmiş ne yedeklenmiş**:

- **Hiç takip edilmeyenler:** `docs/` (karakter dosyası dahil), `design-references/`, `SESTIA_BILGI_KUTUPHANESI/`, `SESTIA_UYGULAMA_DENETIM_RAPORU.md`, `lib/sestiaLibrary.js`, `app/api/sestia-chat/`.
- **Değiştirilmiş ama commit edilmemiş:** `lib/anthropic.js` (`SESTIA_CHARACTER_BASE` ve `chatFreely`), `lib/db.js`, `proxy.js`, `app/page.js`, `app/globals.css`, `app/hosgeldin/page.js`, `app/api/state/route.js`.

Yani Keşif ekranı ve Sestia sohbeti, son commit'e dönülürse **tamamen kaybolur**. `lib/db.js`'deki commit edilmemiş kod, takip edilmeyen `lib/sestiaLibrary.js`'i import ediyor. Önerilen ilk iş: anlamlı parçalar hâlinde commit etmek.

### 12.2 Metin ve konumlandırma

- `/giris`, `app/layout.js` meta açıklaması ve `manifest.json` hâlâ eski ürünü anlatıyor: *"Bir eşyaya karar ver: tut, sat, bağışla, at ya da geri dönüştür."* Bu, `/hosgeldin` ekranındaki Sestia vizyonuyla çelişiyor.
- **Üç farklı ad dolaşıyor:** "Bir Oda, Bir Karar" (paket ve klasör adı, README), "Bir Oda. Bir Eşya." (kullanıcıya dönük ürün adı), "Sestia" (karakter; aynı zamanda sayfa başlığı ve manifest adı).
- Keşif ekranındaki *"Birlikte düşündüklerimiz burada kalır."* kartı, kalıcı olmayan bir sohbetin yanında duruyor. Kart Odalarım'ı kastediyor, ama kullanıcı sohbetin saklandığını sanabilir. Bu, karakterin *"bilmediğini biliyormuş gibi davranma"* ilkesiyle gerilim yaratıyor.
- Kütüphane metinlerinin çoğu soruyla bitiyor, ses kurallarıyla çelişiyor.

### 12.3 Ürün ve karakter

- 5 AI görevinden 4'ü karakteri taşımıyor (bkz. §4.8).
- "Somut fikir" davranışı test edildi ve kısmen başarısız oldu.
- `homeMessages` hâlâ yalnızca karar sayısına bakıyor. Oda oluşturmuş ama henüz karar vermemiş kullanıcı "ilk karşılaşma" mesajı görebilir.
- Karar renkleri (adaçayı yeşili = Tut) ile keşif için düşünülen yeni renk anlamları çakışabilir.

### 12.4 Teknik

- Tek eşya ve Keşif sohbetleri kalıcı değil. Misafir verisi hesaba taşınmıyor. Misafir çerezi kaybolursa veriler diskte dururken erişim kaybolur.
- Karar kaydı ile analizin nihai hâli ayrı isteklerle yazılıyor (tek transaction değil). Tekrar gönderimi tekilleştiren bir anahtar yok.
- Taramalar arasında kalıcı bir eşya kimliği yok.
- Token kullanımı kaydedilmiyor, prompt caching yok. Takip çağrıları fotoğrafları yeniden gönderiyor. Maliyet ölçülmedi.
- SQLite ve fotoğraflar kalıcı disk (Railway volume) gerektiriyor, yedekleme ve geri yükleme doğrulanmadı. Yerelde `backups/` klasörüne alınmış tek bir yedek var (21 Eylül).
- Geri bildirim geldiğinde hiçbir bildirim gönderilmiyor, `/admin` elle kontrol edilmeli.

---

## 13. Açık kararlar ve önerilen sıradaki adımlar

### 13.1 Karar bekleyen konular

1. Ürünün resmî adı ve adlandırma hiyerarşisi (ürün mü "Sestia" mı, ikisi nasıl birlikte görünür?).
2. `/giris`, meta ve manifest metinlerinin yeni vizyona göre yazılması.
3. Kütüphane metinlerinin editoryal revizyonu (önceki "birebir kullan" kilidinin bilinçli olarak açılması).
4. Karakterin tek eşya, oda ve ipucu promptlarına yayılması (JSON şema uyumunu bozmadan, testle).
5. Hafıza şeması: sohbet kalıcılığı ve kalıcı sohbetin "gerçek çalışma" sayılıp sayılmayacağı.
6. Misafir verisini hesaba taşıma kuralları.
7. Yeni ana sayfa/sohbet düzeninin (mockup 02–03) uygulanıp uygulanmayacağı.
8. Bilgi Kütüphanesi'nin sohbete bağlanma yöntemi, araştırma derinliği ve maliyet sınırları.
9. Geri bildirim bildirimi (anında e-posta mı, günlük özet mi?).
10. İş modeli.

### 13.2 Önerilen sıra (bağlayıcı değil)

1. **Güvenceye al:** Mevcut çalışmayı anlamlı commit'lere böl, `data/` + fotoğraflar için yedekleme rutinini doğrula.
2. **Tutarlılık:** Adlandırmayı netleştir; `/giris`, meta ve manifest metinlerini güncelle; "burada kalır" kartını düzelt.
3. **Tasarım token'ları:** Referanslardan fildişi yüzeyler ve erişilebilir ceviz rengi butonları `globals.css`'e aktar.
4. **Karakter Faz 2:** `TIPS_PROMPT` → `SINGLE_PROMPT` → `ROOM_PROMPT` sırasıyla yaygınlaştır, "somut fikir" testini tekrarla.
5. **Hafıza Aşama 1–2:** Durum ayrımı ve sohbet kalıcılığı.
6. **Ekran ekran UI:** Önce Ana sayfa (02) ve Eşya değerlendirmesi (09).
7. **Kütüphane entegrasyonu:** Önce SQLite tam metin araması ile başla, ihtiyaç kanıtlanırsa anlamsal arama ekle.

### 13.3 Başarı nasıl ölçülmeli?

Başarı yalnızca karar ya da puan sayısıyla ölçülmemeli. Asıl sorular şunlar: Kullanıcı kendi niyetine uygun bir yön buldu mu? Sestia güvenilir davrandı mı?

Örnek testler:

- "Belki satarım" bir karar olarak kaydedilmemeli.
- "Vazgeçtim" güncel duruma yansımalı.
- İki farklı odadaki benzer sandalyeler karışmamalı.
- Hiç konuşulmamış bir ayrıntı "hatırlanmış" gibi sunulmamalı.

---

## 14. Dosya haritası: nerede ne var?

```
SESTIA/
├── README.md                         teknik kurulum (eski "Bir Oda, Bir Karar" dili)
├── AGENTS.md / CLAUDE.md             "Bu Next.js bildiğin gibi değil" uyarısı
├── SESTIA_UYGULAMA_DENETIM_RAPORU.md uygulama geneli denetim (22 Eyl)
├── app/
│   ├── page.js                       tüm ana ekranlar tek dosyada (~2.300 satır)
│   ├── globals.css                   renk/tipografi sistemi
│   ├── hosgeldin/ giris/ admin/ admin-giris/ error.js
│   └── api/                          §10.3
├── components/                       FeedbackButton, GlobalErrorReporter, icons
├── lib/
│   ├── anthropic.js                  tüm promptlar + SESTIA_CHARACTER_BASE
│   ├── sestiaLibrary.js              pusula, 12 karşılama, 15 kıvılcım
│   ├── homeMessages.js               8 kategorili ana ekran mesajları
│   ├── db.js                         şema + tüm SQL
│   ├── identity.js / guestToken.js / auth.js / authSchema.js
│   └── constants.js                  ASSISTANT_NAME, MAX_ROOM_PHOTOS=6 …
├── proxy.js                          erişim kapısı
├── data/                             app.db + room-photos (git dışı)
├── backups/                          yerel DB yedekleri (git dışı)
├── docs/
│   ├── SESTIA_PROJE_BRIEFING.md      ← bu dosya
│   ├── SESTIA_KAPSAMLI_URUN_VE_KARAKTER_REHBERI.md   ayrıntılı rehber
│   ├── SESTIA_KARAKTER_DOSYASI_v1.md (+ .txt kopyası) karakter kanonu
│   ├── SESTIA_KARAKTER_ENTEGRASYONU_ON_DENETIM.md
│   ├── SESTIA_KARAKTER_YENILEME_FAZ1.md
│   └── SESTIA_HAFIZA_MIMARISI_DENETIM.md
├── design-references/                3 stil referansı + sestia-ui-konseptleri-v1/ (18 PNG)
└── SESTIA_BILGI_KUTUPHANESI/         §7
```

**Hangi soruda hangi belge?**

| Soru | Belge |
|---|---|
| Sestia nasıl konuşmalı? | `docs/SESTIA_KARAKTER_DOSYASI_v1.md` |
| Karakter kodda ne kadar uygulandı? | `docs/SESTIA_KARAKTER_YENILEME_FAZ1.md` |
| Hafıza nasıl kurulmalı? | `docs/SESTIA_HAFIZA_MIMARISI_DENETIM.md` |
| Uygulamadaki tüm metinler ve tutarsızlıklar | `SESTIA_UYGULAMA_DENETIM_RAPORU.md` |
| Kütüphane mimarisi | `SESTIA_BILGI_KUTUPHANESI/00_MIMARI_VE_PLANLAMA/` |
| Ekranlar nasıl görünmeli? | `design-references/sestia-ui-konseptleri-v1/INCELEME.md` |
| Her şeyin ayrıntılı özeti | `docs/SESTIA_KAPSAMLI_URUN_VE_KARAKTER_REHBERI.md` |

---

## 15. Sözlük

| Terim | Anlamı |
|---|---|
| **Sestia** | Uygulamanın AI karakteri (eski adı: Lyra) |
| **Keşif** | Henüz gerçek çalışması olmayan kullanıcının ekranı (`KesifView`) |
| **Kişisel Çalışma Alanı** | Gerçek çalışması olan kullanıcının ana sayfası (`HomeView`) |
| **Gerçek çalışma** | En az 1 karar veya en az 1 oda (`hasStartedRealWork`) |
| **Tek Eşya** | Tek fotoğrafla eşya değerlendirme akışı |
| **Oda Taraması** | 1–6 fotoğrafla oda değerlendirme akışı |
| **Kapsam kontrolü** | Fotoğrafların odayı yeterince gösterip göstermediğini soran ucuz ön kontrol |
| **Karşılama / İlham kıvılcımı** | `sestiaLibrary.js` içindeki editoryal metinler |
| **Pusula** | Dört satırlık karakter ilkesi |
| **Karakter temeli** | `SESTIA_CHARACTER_BASE`, AI'ya giden ortak karakter metni |
| **Faz 1** | Karakterin yalnızca Keşif sohbetine aktarıldığı ilk entegrasyon |
| **Misafir kimliği** | Hesapsız kullanıcı için sunucuda imzalanan çerez |
| **Sahibi Paneli** | `/admin`, proje sahibinin izleme ekranı |
| **creative_proposal / source_supported** | Kütüphanede bir bilginin kanıt durumu |

---

*Bu briefing, 23 Eylül 2026 itibarıyla çalışma kopyasının durumunu yansıtır. Kod veya belgeler değiştikçe §6 (durum tablosu), §7 (sayımlar) ve §12 (riskler) güncellenmelidir. Tarihsel raporları güncel durum gibi kopyalamayın. Hedefleri, mockup'ları ve tamamlanmış işleri ayrı tutun.*
