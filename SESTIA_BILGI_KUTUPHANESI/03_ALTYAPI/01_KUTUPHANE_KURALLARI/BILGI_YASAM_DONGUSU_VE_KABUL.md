---
belge_turu: yasam_dongusu_standardi
durum: canonical
last_updated: 2026-09-25
---

# SESTIA Bilgi Kütüphanesi — Bilgi Yaşam Döngüsü ve Kabul

## 1. Amaç ve kapsam

Bu belge, bir bilginin ham kaynaktan kalıcı bilgiye nasıl ilerlediğini ve kalıcı bilginin zamanla nasıl kullanım dışı kaldığını tanımlar. Kurallar; insan, Claude/Codex ve ileride SESTIA tarafından aynı biçimde uygulanabilecek kadar açık, ama bir solo proje için gereksiz süreç üretmeyecek kadar sade tutulmuştur.

**Bu belgenin tek yetkili tanımı olduğu konular:**
- araştırmadan kalıcı bilgiye geçiş,
- kabul, düzeltme ve araştırmaya geri dönüş,
- `lifecycle` değerleri arasındaki geçişler,
- duplicate ve canonical kayıt yönetimi,
- `deprecated` / `superseded` kullanımı,
- araştırma ve arşiv sınırları.

**Bu belgede tanımlanmayan konular:**

| Konu | Yetkili belge |
|---|---|
| `lifecycle` alanının biçimi ve izin verilen değerleri, `superseded_by`, `schema_version`, `id` biçimi, `status` değerleri | [`bilgi_tipleri_ve_iliski_semasi.md`](../03_BILGI_ILISKILERI/bilgi_tipleri_ve_iliski_semasi.md) |
| Klasör yapısı, fiziksel yerleşim, inbox, arşivin yeri, relative link ilkesi, Git kapsamı | [`KUTUPHANE_MIMARISI.md`](KUTUPHANE_MIMARISI.md) |
| Kaynak yeterliliği ve atıf | `02_KAYNAK_VE_REFERANS_SISTEMI/KAYNAK_VE_ATIF_STANDARDI.md` (henüz oluşturulmadı) |
| Doğrulama ve kalite ölçütlerinin ayrıntısı, kontrol listeleri | `04_DOGRULAMA_VE_KALITE/DOGRULAMA_VE_KALITE_STANDARDI.md` (henüz oluşturulmadı) |
| Kategori ve `primary_domain` seçimi | `05_SINIFLANDIRMA_VE_ETIKETLER/SINIFLANDIRMA_STANDARDI.md` (henüz oluşturulmadı) |
| Taşıma, rename ve değişiklik sonrası kontrol prosedürü | `01_KUTUPHANE_KURALLARI/BAKIM_VE_DEGISIKLIK_YONETIMI.md` (henüz oluşturulmadı) |

Açık kararlar §12'de listelenmiştir ve metin içinde **[Açık karar Aₙ]** olarak işaretlidir.

---

## 2. Temel ayrımlar

| Kavram | Ne olduğu | Nerede yaşar |
|---|---|---|
| **Ham kaynak** | Dışarıdan gelen, üzerinde düzenleme yapılmamış materyal. Analiz edilmiş, araştırılmış veya bilgi üretiminde kullanılmış olsa bile ham kaynak olarak kalır. | Root `_INBOX` veya `02_KUTUPHANE/<kategori>/_INBOX/` |
| **Araştırma** | Ham kaynaklar ve dış kaynaklar üzerinde yürütülen çalışma: araştırma kaydı, kaynak karşılaştırması, çalışma notu, sentez, açık sorular. | `01_ARASTIRMA/` |
| **Kalıcı bilgi** | Konu bazlı, düzenlenmiş, başka belgelerce kullanılabilen bilgi dosyası. | `02_KUTUPHANE/<kategori>/…` |
| **`status`** | Bilginin dayanağı ve üretim niteliği: kaynaklı mı, belgelenmiş mi, yaratıcı öneri mi, kullanıcı deneyimi mi. | Bilgi dosyasının frontmatter'ı |
| **`lifecycle`** | Kaydın kullanım yaşam durumu: taslak mı, aktif mi, kullanım dışı mı, yerini başkasına bırakmış mı. | Bilgi dosyasının frontmatter'ı |
| **Arşiv** | Aktif kullanılmayan, tarihsel veya korunması gereken materyalin fiziksel saklama katmanı. | `99_ARSIV/` |

**`status` ile `lifecycle` birbirinden bağımsızdır.** Biri diğerinden çıkarılmaz ve biri değiştiğinde diğeri otomatik değişmez. Örneğin `status: creative_proposal` olan bir kayıt `lifecycle: active` olabilir: bu kayıt test edilmemiş bir öneridir, ama güncel ve kullanılan bir öneridir.

**Arşiv bir yaşam durumu değildir.** Bir kaydın neden aktif olmadığını arşivdeki konumu değil, `lifecycle` alanı ifade eder.

---

## 3. Bilginin yaşam akışı

```
ham kaynak ──► araştırma ──► kalıcı bilgi (draft) ──► kalıcı bilgi (active)
 (_INBOX)    (01_ARASTIRMA)       (02_KUTUPHANE)            │
                   ▲                    │                   ├──► deprecated
                   └──── geri dönüş ────┘                   └──► superseded
```

- Akışta ilerleyen şey, üretilen bilgidir. Ham kaynak da araştırma kaydı da bir sonraki aşama üretildiğinde yerinde kalır; taşınmaz, silinmez, otomatik arşivlenmez.
- Her bilgi dosyasının bir araştırma kaydından geçmesinin zorunlu olup olmadığı tanımlanmamıştır. **[Açık karar A11]** Kabul koşulları (§5) her durumda aynıdır.
- `lifecycle` yalnızca kalıcı bilgi dosyalarında kullanılır. Araştırma kayıtları ve diğer profillerin bu alanı taşıyıp taşımayacağı şemada açık konudur.
---

## 4. Araştırmadan kalıcı bilgiye geçiş

### 4.1 Bir çalışma ne zaman yalnızca araştırma olarak kalır?

Bir çalışma, aşağıdakilerden biri geçerliyse araştırma olarak kalır ve `01_ARASTIRMA`'da yaşar:

- İçeriği **süreçtir**: kaynak karşılaştırması, çalışma notu, açık sorular, bilgi boşlukları, hangi kaynağın neden kullanıldığı veya kullanılmadığı.
- İçeriği henüz **konu bazlı ve tek başına kullanılabilir** bir bilgiye dönüşmemiştir.
- İçeriğin dayanağı henüz belirsizdir. Hangi iddianın hangi kaynağa dayandığı veya bir önerinin mi yoksa kaynaklı bilginin mi olduğu ayrıştırılamamıştır.

Tamamlanmış bir araştırma da araştırma olarak kalır. Tamamlanmak onu kalıcı bilgiye çevirmez; kalıcı bilgi, araştırmadan **ayrı bir dosya olarak** türetilir.

### 4.2 Bir araştırma çıktısı ne zaman kalıcı bilgiye dönüşebilir?

Bir araştırma çıktısı, şu durumda `02_KUTUPHANE` içinde bir bilgi dosyasına dönüşebilir:

- Tek bir konuyu, araştırma sürecine ihtiyaç duymadan okunabilecek biçimde anlatabiliyorsa.
- Bu anlatım başka belgeler tarafından kullanılabilecek, ilişkilendirilebilecek bir birim oluşturuyorsa.
- Dayanağı `status` değerlerinden biriyle dürüstçe ifade edilebiliyorsa.

Bu durumda yeni bir bilgi dosyası `lifecycle: draft` ile oluşturulur. `active` olması için §5'teki kabul koşulları gerekir.

### 4.3 Geçişte araştırmaya ne olur?

- Araştırma dosyası silinmez, taşınmaz ve otomatik arşivlenmez.
- Araştırmanın içeriği bilgi dosyasına kopyalanarak araştırmadan çıkarılmaz; araştırma kaydı olduğu gibi kalır.
- Provenance korunur: bilgi dosyası ile onu üreten araştırma arasındaki bağ kaybolmaz (bkz. §10).

---

## 5. Kabul koşulları

### 5.1 "Kabul edilmiş bilgi" nedir?

Kabul edilmiş bilgi, `02_KUTUPHANE` içinde `lifecycle: active` olan bilgi dosyasıdır. Kabul, kaydın güncel ve kullanılabilir olduğunu gösterir.

Kabul **mutlak doğruluk garantisi değildir**. Bir bilginin ne kadar güvenilir olduğunu `status` ve kaynakları gösterir. Kabul yalnızca kaydın bu dayanakla birlikte kullanılabilir olduğunu söyler.

### 5.2 `draft → active` için minimum koşullar

Bir kayıt, aşağıdakilerin hepsi sağlandığında `active` yapılabilir:

1. **Profil tam:** Kayıt, şemadaki bilgi dosyası profiline uygundur. `id` benzersizdir, `related` hedefleri mevcuttur.
2. **Doğru yerde:** Kayıt, mimarideki fiziksel yerleşim kurallarına uygun konumdadır.
3. **Dayanak dürüst:** `status` değeri kaydın gerçek dayanağını yansıtır. Kaynağa dayandığı söylenen iddiaların kaynağı gösterilmiştir. Öneri niteliğindeki içerik öneri olarak işaretlidir.
4. **Duplicate değil:** Aynı konu, kapsam ve kullanım bağlamı için başka bir aktif kayıt yoktur (bkz. §8).
5. **Kalite kontrolü geçmiştir:** Kayıt, `DOGRULAMA_VE_KALITE_STANDARDI.md`'deki kabul ölçütlerini karşılar. **[Açık karar A1]**

Kaydı `active` yapma yetkisinin kimde olduğu tanımlanmamıştır. **[Açık karar A2]**

### 5.3 Bilgi henüz yeterince doğrulanmamışsa

- Kayıt `draft` olarak kalır. `draft` bir kayıt `02_KUTUPHANE` içinde yaşayabilir; aktif bilgi olarak kullanılmaz.
- İçerik hâlâ süreç niteliğindeyse (karşılaştırma, açık soru) bilgi dosyası açılmaz; çalışma `01_ARASTIRMA`'da sürer.
- Doğrulanamayan içerik, dayanağından daha güçlü gösterilmez. Kaynakla desteklenemeyen bir sentez `source_supported` olarak işaretlenmez. Dürüstçe `creative_proposal` olarak işaretlenirse diğer koşulları sağladığında kabul edilebilir.

---

## 6. Düzeltme ve araştırmaya geri dönüş

Kalite kontrolü başarısız olduğunda sonuç, sorunun türüne göre belirlenir:

| Sorunun türü | Sonuç | `lifecycle` |
|---|---|---|
| Biçim, metadata, yerleşim, eksik referans, ifade netliği gibi kayıt içinde giderilebilen sorunlar | **Düzeltme.** Kayıt yerinde düzeltilir ve kontrol tekrarlanır. | Yeni kayıtsa `draft` kalır. |
| Dayanak yetersiz, kaynaklar çelişkili veya açık sorular çözülmeden bilgi kurulamıyor | **Araştırmaya geri dönüş.** Eksik çalışma `01_ARASTIRMA`'da yürütülür. | Kayıt `draft` kalır. |
| İçerik aslında ayrı bir kayıt değil, mevcut bir kaydın kopyası | **Duplicate yönetimi** (bkz. §8). | — |

**Kurallar:**
- Araştırmaya geri dönüş, bilgi dosyasının silinmesi anlamına gelmez. Eksik araştırma, mevcut veya yeni bir araştırma kaydında yürütülür.
- Kontrol sonucu açıkça üç sonuçtan biri olarak ifade edilir: **kabul**, **düzeltme gerekli** veya **araştırmaya geri dönüş**.

Daha önce `active` olan bir kayıtta sonradan ciddi bir sorun bulunursa:
- Sorun düzeltilebiliyorsa kayıt yerinde düzeltilir.
- Kayıt artık kullanılmamalıysa `deprecated` yapılır (bkz. §9).
- Kaydın tekrar `draft`'a çekilip çekilemeyeceği tanımlanmamıştır. **[Açık karar A4]**

---

## 7. `lifecycle` geçişleri

Değerlerin anlamları ve biçimi şemadadır. Bu bölüm yalnızca hangi geçişlerin tanımlı olduğunu ve koşullarını belirtir.

| Geçiş | Koşul | Tanımlı olduğu yer |
|---|---|---|
| (yok) → `draft` | Yeni bilgi dosyası oluşturulduğunda | §4.2 |
| `draft` → `active` | §5.2'deki minimum koşullar | §5.2 |
| `active` → `deprecated` | Kayıt aktif kullanım için artık önerilmiyorsa ve yerine bir kayıt geçmiyorsa | §9.1 |
| `active` → `superseded` | Kaydın yerini başka bir kayıt aldıysa | §9.2 |

**Tanımlanmamış geçişler:**
- `deprecated` → `active` **[Açık karar A3]**
- `active` → `draft` **[Açık karar A4]**
- Hiç kabul edilmemiş bir `draft`'ın vazgeçilerek kapatılması **[Açık karar A9]**

**Legacy kayıtlar:**
- `lifecycle` alanı olmayan mevcut kayıtlar hiçbir `lifecycle` değerine sahip sayılmaz.
- Bu belge onlar için bir geçiş başlatmaz; toplu geçiş ayrı bir çalışmadır.
- Legacy kayıtların geçişe kadar kullanımda nasıl ele alınacağı tanımlanmamıştır. **[Açık karar A8]**

**Güncelleme ve geçiş farkı:** Bir kaydın içeriği güncellendiğinde, düzeltildiğinde veya genişletildiğinde aynı kayıt güncellenir; `lifecycle` değişmez. `superseded`, yalnızca **farklı bir kayıt** (farklı `id`) eskisinin yerini aldığında kullanılır.

---

## 8. Duplicate ve canonical kayıt yönetimi

### 8.1 Canonical kayıt

**Canonical kayıt**, aynı konu, kapsam ve kullanım bağlamı için bakımı yapılan ana kayıttır. Canonical olmak mutlak doğruluk garantisi değildir; yalnızca o bağlamda güncel tutulan kaydın bu olduğunu gösterir.

### 8.2 Duplicate nedir, ne değildir?

İki kayıt, **aynı konuyu, aynı kapsamda ve aynı kullanım bağlamında** ele alıyorsa duplicate'tir.

Aynı kavramın farklı amaçlarla birden fazla dosyada geçmesi duplicate değildir. Örneğin:
- bir malzeme dosyası ahşap türlerinin alt tonlarını malzeme bilgisi olarak anlatır;
- bir renk paleti veya uygulama rehberi bu bilgiyi bir palet kurmak için kullanır.

İkisi ayrı amaç taşır ve ayrı kayıt olarak kalır. Kullanan dosya, bilginin kendisini yeniden kurmak yerine ilgili kayda bağlanır (`related` ve gerekiyorsa relative link). Kütüphanedeki palet dosyalarının ahşap bilgisine bağlanması bu biçimdedir.

Kullanan dosya bilgiyi kendi amacı için özetleyebilir. Ama özet, kaynak kayıtla çelişen veya onun yerine geçen ikinci bir tanıma dönüşmemelidir.

### 8.3 Yeni kayıt açmadan önce

Yeni bir bilgi dosyası açmadan önce aynı konu için mevcut kayıt aranır: başlık, `id`, `tags` ve konu kapsamı. Uygun bir kayıt varsa yeni kayıt açmak yerine o kayıt güncellenir.

### 8.4 Duplicate bulunduğunda

1. **Ana kayıt belirlenir.** Birleştirmeden sonra bakımı sürdürülecek kayıt canonical kayıt olur. Bunun hangi ölçüte göre seçileceği tanımlanmamıştır. **[Açık karar A5]**
2. **Özgün katkı korunur.** Diğer kayıtta bulunan ve ana kayıtta olmayan bilgi, kaynak ve ilişkiler ana kayda aktarılır. Hiçbir özgün içerik sessizce kaybolmaz.
3. **Eski kayıt `superseded` olur.** `superseded_by` alanı ana kaydın `id`'sini taşır (biçim: şema).
4. **Eski `id` yeniden kullanılmaz.** `id` kalıcı bir kimliktir; başka bir kayda verilmez.
5. **Gelen ilişkiler ve linkler:** Eski kayda işaret eden `related` girdileri ve Markdown linklerinin ana kayda güncellenip güncellenmeyeceği tanımlanmamıştır. **[Açık karar A7]**
6. **Eski kaydın fiziksel yeri:** Eski kaydın yerinde mi kalacağı, `99_ARSIV`'e mi taşınacağı tanımlanmamıştır. **[Açık karar A6]**

---

## 9. `deprecated` ve `superseded` kayıtlar

### 9.1 `deprecated`

**Ne zaman kullanılır:** Kayıt aktif kullanım için artık önerilmediğinde ve yerine geçen bir kayıt bulunmadığında. Örneğin:
- içeriği güncelliğini yitirmiştir;
- dayanağının yanlış olduğu anlaşılmış ve düzeltilmeyecektir;
- kütüphanenin kapsamı açısından artık gerekli değildir.

**Kurallar:**
- Ek bir metadata alanı kullanılmaz.
- Gerekçe gerekiyorsa belgenin gövdesinde açıklanır.
- Kayıt silinmez.

### 9.2 `superseded`

**Ne zaman kullanılır:** Kaydın yerini başka bir kayıt aldığında. Örneğin:
- duplicate birleştirmesi sonrası ana kayıt dışındaki kayıt;
- konunun yeni bir kapsamla, farklı bir kayıt olarak yeniden yazılması.

**Kurallar:**
- `superseded_by` alanı zorunludur (şemadaki kural). Yerine geçen kaydın var olan, kalıcı `id`'sini taşır.
- Aynı kaydın güncellenmesi `superseded` değildir (bkz. §7).
- Kayıt silinmez.

### 9.3 İkisinin ortak sınırı

- `deprecated` ve `superseded` kayıtlar aktif bilgi olarak kullanılmaz.
- Tarihsel ve provenance değerleri için korunurlar.
- Fiziksel yerleri için bkz. **[Açık karar A6]**.
- Daha önce `deprecated` edilmiş bir kaydın tekrar kullanılabilir hâle gelmesi durumu tanımlanmamıştır. **[Açık karar A3]**

---

## 10. Araştırma ve provenance'ın korunması

- Tamamlanmış bir araştırma, provenance veya referans değeri taşıdığı sürece `01_ARASTIRMA` içinde kalır. Tamamlanmış olması tek başına `99_ARSIV`'e taşınma nedeni değildir.
- Bir araştırmadan bilgi dosyası türetilmesi, araştırma kaydının silinmesine, taşınmasına veya arşivlenmesine yol açmaz.
- Bilgi dosyası ile onu üreten araştırma arasındaki bağ korunur.

Bugünkü uygulamada bu bağ iki yönlü, serbest metinle kurulmuştur:
- Araştırma kaydı, ürettiği bilgi dosyalarını listeler.
- Bilgi dosyası, gerektiğinde araştırma kaydına gövde metninde relative path ile referans verir.

Bu bağın metadata ile standart biçimde kurulup kurulmayacağı tanımlanmamıştır. **[Açık karar A10]**

---

## 11. Arşiv sınırı

- `99_ARSIV` fiziksel bir saklama katmanıdır. Kaydın yaşam durumunu değil, konumunu ifade eder.
- Hiçbir kayıt yalnızca şu nedenlerle arşive taşınmaz:
  - tamamlanmış bir araştırma olmak;
  - işlenmiş bir ham kaynak olmak;
  - `draft` olmak.
- İşlenmiş ham kaynak otomatik olarak `99_ARSIV`'e taşınmaz. Kategori `_INBOX`'ında kalabilir.
- `deprecated` ve `superseded` kayıtların arşive taşınıp taşınmayacağı tanımlanmamıştır. **[Açık karar A6]**
- Arşivin iç düzeni bu belgenin kapsamında değildir.

---

## 12. Açık kararlar

Aşağıdaki konular mevcut canonical kurallardan kesin olarak çıkarılamadığı için tanımlanmamıştır. Karar verildiğinde ilgili bölüm güncellenir ve madde bu listeden çıkarılır.

| No | Konu | Etkilediği bölüm |
|---|---|---|
| A1 | `DOGRULAMA_VE_KALITE_STANDARDI.md` oluşturulana kadar `draft → active` için kalite kontrolünün neye göre yapılacağı | §5.2 |
| A2 | Bir kaydı `active` yapma yetkisi: yalnızca kullanıcı mı, yoksa Claude/Codex/SESTIA da kurallara göre yapabilir mi | §5.2 |
| A3 | `deprecated` bir kayıt tekrar kullanılabilir hâle gelirse aynı kaydın `active`'e dönmesi mi, yoksa yeni kayıt mı açılacağı | §7, §9.3 |
| A4 | `active` bir kaydın ciddi sorun nedeniyle tekrar `draft`'a çekilip çekilemeyeceği | §6, §7 |
| A5 | Duplicate kayıtlar arasında hangisinin canonical kayıt olacağının seçim ölçütü | §8.4 |
| A6 | `deprecated` ve `superseded` kayıtların fiziksel yeri: yerinde kalma veya `99_ARSIV`'e taşınma | §8.4, §9.3, §11 |
| A7 | Bir kayıt `superseded` olduğunda ona gelen `related` girdilerinin ve Markdown linklerinin yeni kayda güncellenip güncellenmeyeceği | §8.4 |
| A8 | `lifecycle` alanı olmayan legacy kayıtların, toplu geçişe kadar kullanımda nasıl ele alınacağı | §7 |
| A9 | Hiç kabul edilmemiş bir `draft`'tan vazgeçildiğinde kaydın nasıl kapatılacağı | §7 |
| A10 | Bilgi dosyası ile kaynağı olan araştırma kaydı arasındaki provenance bağının metadata ile standart biçimde kurulup kurulmayacağı | §10 |
| A11 | Her bilgi dosyasının bir araştırma kaydından geçmesinin zorunlu olup olmadığı; tek bir kaynaktan doğrudan bilgi dosyası yazılıp yazılamayacağı | §3 |