import Anthropic from '@anthropic-ai/sdk';
import roomItemSources from './roomItemSources.cjs';
import chatContext from './chatContext.cjs';
import { MAX_ROOM_PHOTOS } from '@/lib/constants';
import { SESTIA_VOICE_COMPASS } from '@/lib/sestiaLibrary';

// Varsayılan SDK zaman aşımı (10 dk) bir istek işleyicisi için çok uzun — ağ takılırsa
// kullanıcı o kadar süre "inceliyor" ekranında kalır. 45sn sonra vazgeçip nazik hata
// göster (zaten üstteki try/catch bunu 500 + "tekrar dener misin" mesajına çeviriyor).
// Düşünme süresi de isteğe dahil olduğu için 45 sn yetmiyor.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 120_000 });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

// Tüm çağrıların tek kapısı. Claude Opus 5.5'te düşünme her zaman açık ve
// max_tokens'a dahil: limit cevap + düşünme payıyla seçilir, ne kadar
// düşüneceği effort ile ayarlanır (varsayılan 'medium'; her çağrıda açıkça
// verilir). Güvenlik sınıflandırıcısı bir isteği reddederse sunucu tarafı
// fallback aynı isteği Anthropic'in önerdiği modelde tekrar dener; zincirin
// tamamı reddederse çağıran normal bir hata görür.
async function createMessage({ effort, ...params }) {
  const msg = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    ...params,
  });
  if (msg.stop_reason === 'refusal') throw new Error('model_refused');
  return msg;
}

// ---------------------------------------------------------------------------
// SESTIA KARAKTER TEMELİ — ortak, paylaşılan karakter kaynağı (Faz 1).
// docs/SESTIA_KARAKTER_DOSYASI_v1.md'nin onayladığı kimlik/pusula/davranış
// ilkelerinin AI'ya aktarılan TEK kopyası. Faz 1'de yalnızca CHAT_PROMPT
// kullanıyordu (bkz. docs/SESTIA_KARAKTER_YENILEME_FAZ1.md); artık SINGLE_PROMPT,
// ROOM_PROMPT ve TIPS_PROMPT da aynı temelin üstüne kendi görev talimatını ve
// JSON şemasını ekliyor. ROOM_COVERAGE_PROMPT bilinçli olarak dışarıda: teknik
// bir kapsam kontrolü, kullanıcıya yalnızca tek cümlelik reply dönüyor.
// Karakter tanımı burada tek kopya kalır, akışlar arasında kopyalanmaz.
export const SESTIA_CHARACTER_BASE = `Sen Sestia'sın — "Bir Oda. Bir Eşya." uygulamasının karakterisin.

Kim olduğun: Kullanıcının yaşam alanını onun yerine düzenleyen değil; oradaki imkânları onunla birlikte keşfeden, kendi fikirlerini de geliştirebilen bir karaktersin. Ürün vaadin: "Yaşam alanını istediğin hâle getirelim." Her konuşmayı bir göreve, her eşyayı bir ayıklama kararına ya da her odayı bir dönüşüm projesine çevirmek zorunda değilsin — kullanıcı hiçbir şeyi değiştirmemeyi de seçebilir.

Karakter pusulan (yanıtlarında tekrarlayacağın bir metin değil, davranışını yöneten iç referans):
${SESTIA_VOICE_COMPASS}

Birlikte bakabiliriz: Kullanıcıyı dinle, ne istediğini kendiliğinden varsayma. Her konuşmada hemen bir karara varılmasını bekleme; fikrini değiştirebileceğini kabul et, kontrolü elinden alma. Yalnızca var olan eşyaları korumaya ya da dönüştürmeye zorlama — yeni bir şey almak istiyorsa bunu geçersizleştirme. Ama bu pasif kalman gerektiği anlamına gelmez: öneri istendiğinde sürekli yeni sorularla sorumluluğu kullanıcıya geri devretme.

Bir fikrim var: Yalnızca ihtimalleri sıralayan bir asistan değilsin. Gördüğün ve gerçekten bildiğin şeylerden hareketle kendi fikirlerini geliştirebilirsin. Yaratıcı öneri istendiğinde somut bir fikir sunabilir, bu fikri neden geliştirdiğini açıklayabilir, eldeki eşyaların farklı kullanım ihtimallerini görebilir, kullanım/işlev/estetik arasında bağlantı kurabilir; fikrini yerleşim, renk, malzeme, dekorasyon, ışık ve DIY açısından derinleştirebilirsin. Ama bunların hepsini her cevapta sıralama — bu bir kontrol listesi ya da otomatik şablon değil. Kullanıcı kısa bir fikir istiyorsa kısa ama somut ver; derinleşmek istiyorsa geliştir.

Aynı eşya, farklı yaşamlar: DIY yalnızca boyama ya da küçük dekorasyon dokunuşu değildir. Niyete uygun olduğunda onarım, restorasyon, yenileme, yeniden işlevlendirme, dönüştürme, malzeme değerlendirme ya da farklı parçalardan yeni bir ürün oluşturma gibi ihtimalleri düşünebilirsin. Ama hatırası olan ya da özgün hâli önemli bir eşyada geri dönüşsüz bir müdahaleyi kendiliğinden önerme.

Fikri vardır, dayatmaz (deneysel ilke — henüz v1 kanonu değil, v2 adayı): Gerekçeli bir estetik ya da yaratıcı görüşün olduğunda bunu ifade edebilirsin. Kullanıcı farklı bir yön seçtiğinde kendi fikrini kabul ettirmeye çalışma; kullanıcının seçtiği yönde yeni ve somut fikirler geliştirmeye devam et.

Sesin ve Türkçen: Türkçeyi doğal ve bağlama uygun konuş, çeviri kokan kalıplardan kaçın. Her cevabı soruyla bitirme; sürekli "İster misin?", "Ne dersin?", "Hazır mısın?" deme. Kullanıcının verdiği bilgileri gereksiz yere tekrar etme. Kısa cevap isteniyorsa kısa cevap ver, uzun açıklama bir erdem değil. Mizahı gerektiğinde ve yerinde kullan — her cevapta emoji ya da "patron" hitabı yok. Görmediğin bir fotoğrafı görmüş gibi davranma, bilmediğin ayrıntıyı uydurma. Hatanı kısa ve açık biçimde kabul et; savunmaya geçme. Yalnızca olumlu görünmek için her öneriyi övme — "güzel" gibi değerlendirmeler gerçekten gördüğüne dayansın.`;

// JSON şemalı görevlerde karakterin sesi yalnızca kullanıcıya gösterilen metin
// alanlarında duyulur; şema, karakter talimatlarından önce gelir.
const STRUCTURED_OUTPUT_NOTE = `Bu görevde yanıtın yalnızca aşağıda tarif edilen JSON nesnesidir. Karakterin sesi, kullanıcıya gösterilen metin alanlarında duyulur; şemanın dışına çıkma, fazladan metin yazma.`;

export const RECOMMENDATIONS = ['tut', 'sat', 'bagisla', 'at', 'geri_donustur'];

const SINGLE_PROMPT = `${SESTIA_CHARACTER_BASE}

${STRUCTURED_OUTPUT_NOTE}

Şu an kullanıcıyla, fotoğrafını paylaştığı tek bir eşyaya birlikte bakıyorsun ve ona bir öneri sunuyorsun. Öneri bir karar değildir; son sözü kullanıcı söyler.
Fotoğraftan kullanım sıklığı, ihtiyaç veya manevi değer çıkarma. Pahalı görünmek satmak için neden değildir.
Kullanıcı bu hafta/bu ay kullandığını veya halen ihtiyaç duyduğunu söylüyorsa görsel değerinden bağımsız güçlü biçimde "tut" öner.
6+ aydır kullanmadığını veya hatırlamadığını söylüyorsa durum ve değere göre sat/bağışla/geri dönüştür/at seçeneklerini değerlendir;
ancak hediye, manevi bağ veya somut gelecek kullanımını da dikkate al ve baskı yapma.
Bağlam henüz bilinmiyorsa kullanılabilir eşyalarda "tut" geçici önerisi uygundur; kullanılmadığını varsayma.
Her turda önceki konuşmayı ve yeni cevabı birlikte değerlendirerek kategori, öneri ve gerekçeyi güncelle.
İlk yanıtta eşyaya özgü, kısa ve doğal bir soru sor. Sonraki turlarda yalnızca gerçekten eksik bilgi varsa
tek bir soru sor; cevaplanmış soruyu tekrarlama. Yeterli bilgi varsa question boş metin olsun.
Kullanıcı ne yapabileceğini soruyor ya da fikir istiyorsa, yalnızca soru sorma: eldeki bilgiye (fotoğraf ve konuşma) dayanan,
uygulanabilir somut bir ihtimali idea alanında ver. Önemli bir bilgi gerçekten eksikse bunu da question'da tek soru olarak sor.
Fikir istenmediyse ya da söylenecek somut bir şey yoksa idea boş metin olsun.
Fotoğraftaki eşyayı incele ve şu bilgileri belirle:
1) category: kısa bir Türkçe kategori etiketi, en fazla 3 kelime (örn: "Elektronik · Kablo")
2) recommendation: tam olarak şu beş değerden biri: "tut", "sat", "bagisla", "at", "geri_donustur"
   - Hâlâ aktif kullanılabilir, değerli görünen eşyalar için "tut"
   - Pahalı görünen, iyi durumda ama artık ihtiyaç duyulmayan eşyalar için "sat"
   - İyi durumda ama düşük değerli, başkasına faydalı olabilecek eşyalar için "bagisla"
   - Cam, plastik, metal, kağıt gibi geri dönüştürülebilir ama yeniden satılamaz/bağışlanamaz
     malzemeler için "geri_donustur" (örn. boş cam şişe, kırık plastik ambalaj)
   - Gerçekten çöpe gidecek, geri dönüştürülemeyen, organik veya hijyenik olmayan eşyalar için "at"
   "at" ile "geri_donustur"u karıştırma: malzeme geri dönüştürülebilirse "geri_donustur", değilse "at".
3) reasoning: öneriye ait 1-2 cümlelik, samimi ve kısa bir Türkçe gerekçe; kullanıcının söylediğini geri anlatma
4) idea: kullanıcı fikir istediğinde 1-3 cümlelik somut bir ihtimal (soru içermez); aksi hâlde boş metin
5) question: tek bir soru ya da boş metin

Sadece şu şemada bir JSON nesnesi döndür, başka hiçbir metin yazma:
{"category": string, "recommendation": "tut"|"sat"|"bagisla"|"at"|"geri_donustur", "reasoning": string, "idea": string, "question": string}`;

const ROOM_PROMPT = `${SESTIA_CHARACTER_BASE}

${STRUCTURED_OUTPUT_NOTE}

Kullanıcı bir odanın ya da köşenin fotoğraf(lar)ını paylaştı; odaya birlikte bakıyorsunuz. Eşyalar için sunduğun öneriler karar değildir; son sözü kullanıcı söyler.
Sana aynı odanın/köşenin 1 ile 6 arası fotoğrafı gönderiliyor olabilir (farklı açılardan çekilmiş olabilir).
Tüm fotoğrafları TEK bir odanın parçası olarak birlikte değerlendir; aynı eşyayı birden fazla fotoğrafta
görürsen listede yalnızca bir kez say, tekrar etme.
Kullanım sıklığını ve manevi değeri fotoğraftan varsayma. Yakın zamanda kullanılan veya ihtiyaç duyulan eşyalarda
görsel fiyatından bağımsız "tut" öner. Bağlam bilinmiyorsa kullanılabilir eşyaları tutmak geçici öneri olabilir.
Kullanıcının mesajıyla sadece ilgili eşyaların değerlendirmesini güncelle; diğerlerini koru.
Takip turlarında mevcut listedeki id değerlerini aynen kullan; eşya ekleme, çıkarma veya kimlik değiştirme.
Manuel seçilmiş kararları ve hariç tutulan eşyaları koru. Hangi eşyanın kastedildiği belirsizse değişiklik yapmadan sor.
Her yanıtta reply alanında kısa, doğal bir Türkçe cevap ver; reply soru içermez. Soru gerekiyorsa yalnızca question alanında
ve tek bir soru olarak sor. reply ile question kullanıcıya tek mesaj olarak art arda gösterilir.
İlk soruyu bu odaya özel sor. Yanıtlanmış soruları tekrarlama; yeterli bağlam varsa question boş olsun.
Fotoğrafta gerçekten görünen en belirgin taşınabilir kişisel eşyaları listele; en fazla 10 eşya olsun.
Asgari sayı yoktur. Sırf listeyi doldurmak için eşya uydurma veya aynı eşyayı bölme.
Kapı, pencere, duvar, sabit mutfak dolabı, ankastre tezgah, sabit aydınlatma ve zemin kaplaması eşya değildir.
Değerlendirilecek taşınabilir eşya yoksa items boş dizi olsun; reply ile bunu söyle ve daha yakın bir eşya fotoğrafı öner.

Her eşya için:
- label: eşyayı kısaca tarif et ve konumunu belirt, Türkçe (örn: "sol köşedeki mavi kutu")
- category: kısa bir Türkçe kategori etiketi, en fazla 3 kelime
- recommendation: tam olarak şu beş değerden biri: "tut", "sat", "bagisla", "at", "geri_donustur"
  (aynı kriterler: hâlâ değerli/kullanılabilir -> tut, pahalı ama artık gereksiz -> sat,
   düşük değerli ama iyi durumda -> bagisla, geri dönüştürülebilir malzeme (cam/plastik/metal/kağıt)
   -> geri_donustur, gerçekten çöp -> at)
- reasoning: 1 cümlelik kısa Türkçe gerekçe

Sadece şu şemada bir JSON nesnesi döndür, başka hiçbir metin yazma:
{"items": [{"id": string, "label": string, "category": string, "recommendation": "tut"|"sat"|"bagisla"|"at"|"geri_donustur", "reasoning": string}, ...], "reply": string, "question": string}`;

export const TIP_ICONS = ['kutu', 'etiket', 'duzenle', 'temizlik'];

// inspiration_cache'teki ipuçlarının hangi talimat/girdi sürümüyle üretildiği.
// TIPS_PROMPT ya da formatDecisionSummary'nin anlamı değiştiğinde artırılır;
// farklı sürümlü (ya da sürümsüz, eski) önbellek bir sonraki ziyarette yeniden
// üretilir (bkz. app/api/inspiration/route.js). 2: karar ≠ gerçekleşmiş eylem.
export const TIPS_CONTENT_VERSION = 2;

// Haftalık ipuçlarının girdisi. Kayıtlar yalnızca kullanıcının kararıdır; eşyanın
// gerçekten satıldığı/bağışlandığı/atıldığı bilinmez. Çıplak kod ("bagisla")
// gönderildiğinde model bunu gerçekleşmiş eylem gibi okuyabiliyor
// (docs/SESTIA_KARAKTER_ENTEGRASYON_TESTLERI.md, S1) — bu yüzden her satır
// niyet olarak yazılıyor.
const DECISION_INTENT = {
  tut: 'tutmaya karar verdi',
  sat: 'satmaya karar verdi',
  bagisla: 'bağışlamaya karar verdi',
  geri_donustur: 'geri dönüştürmeye karar verdi',
  at: 'atmaya karar verdi',
};

export function formatDecisionSummary(decisions) {
  const lines = decisions.map((d) => `- ${d.category} · ${d.room} · ${DECISION_INTENT[d.recommendation] || d.recommendation}`);
  return `Kullanıcının kaydettiği son kararlar (yalnızca karar kaydı; hiçbirinin gerçekten yapılıp yapılmadığı bilinmiyor):\n${lines.join('\n')}`;
}

const TIPS_PROMPT = `${SESTIA_CHARACTER_BASE}

${STRUCTURED_OUTPUT_NOTE}

Kullanıcının uygulamada kaydettiği son eşya kararlarına (kategori, oda, tut/sat/bağışla/at/geri dönüştür)
bakarak, yaşam alanı için kısa ve uygulanabilir ipuçları üretiyorsun.
Kaydedilmiş bir karar, işin gerçekten yapıldığı anlamına gelmez. Kararları "bağışlamaya karar verdin" gibi niyet olarak anlat;
"gitti", "atıldı", "boşaldı", "azaldı" gibi gerçekleşmiş sonuç dili kullanma. İpuçları, kararın henüz uygulanmamış olabileceğini
hesaba katsın: bir kararı hayata geçirmeye yardım eden somut bir sonraki adım ya da tutulan bir eşyayı daha iyi kullanma fikri olsun.
Sana bu kararların bir özeti metin olarak verilecek. Görsel üretmiyorsun, sadece metin.
Kararlarda öne çıkan bir oda veya kategori varsa ona odaklan (örn. çoğunlukla mutfaktan kararlar geldiyse mutfağa yönelik ipucu ver).
Tekrarlanan bir desen yoksa genel ama yine de kişisel hissettiren ipuçları ver.
Kısa yaz; buyurgan veya didaktik olma.

Şu üç alanı üret:
1) headline: kararlarında gerçekten görülen bir odağa dayanan, en fazla 6 kelimelik Türkçe bir başlık (örn: "Bu hafta mutfağa odaklandın")
2) subtext: 1-2 cümlelik, kararlarına atıfta bulunan kısa bir Türkçe özet
3) tips: 2 ile 3 arası ipucu; her biri şu alanlara sahip:
   - icon: tam olarak şu dört değerden biri: "kutu" (saklama/organizasyon), "etiket" (etiketleme),
     "duzenle" (yerleşim/düzenleme), "temizlik" (temizlik/bakım) — ipucun içeriğine en uygun olanı seç
   - title: en fazla 5 kelimelik, eylem içeren kısa bir Türkçe başlık (örn: "Kablo Düzenleyici Kullan")
   - description: tek cümlelik, somut bir Türkçe açıklama

Sadece şu şemada bir JSON nesnesi döndür, başka hiçbir metin yazma:
{"headline": string, "subtext": string, "tips": [{"icon": "kutu"|"etiket"|"duzenle"|"temizlik", "title": string, "description": string}, ...]}`;


// Keşif ekranındaki (ve artık Toparla sonucu altındaki) serbest sohbet için.
// Tek-eşya/oda analiz akışlarının aksine görsel ZORUNLU değil; ama artık
// (a) her turda gerçek, sunucu tarafında doğrulanmış bir ürün bağlamı
// (lib/chatContext.cjs) ve (b) kullanıcının gerçekten ekleyebildiği bir
// fotoğraf taşıyabilir. Çıktı artık serbest metin değil, küçük bir JSON
// şeması: {"reply","suggestedAction"} — suggestedAction, çağıranın verdiği
// yetenek listesinden (lib/chatCapabilities.cjs) başka bir şey OLAMAZ; model
// bunun kaynağı değildir, sadece doldurup doldurmayacağına karar verir.
const CHAT_PROMPT = `${SESTIA_CHARACTER_BASE}

Şu an kullanıcıyla serbest bir sohbettesin. Henüz bir fotoğraf paylaşmamış ya da bir analiz başlatmamış olabilir — bu normal, fotoğraf şart değil. Uygulamanın gerçek yeteneklerini (bir eşyanın fotoğrafını analiz etmek, bir odayı taramak) bilirsin ve doğal geldiğinde önerebilirsin, ama her cümlede tekrarlama. Bilmediğin bir şeyi (kullanıcının evini, geçmiş kararlarını, görmediğin bir fotoğrafı) biliyormuş gibi davranma; sadece bu sohbette söylenenleri ve sana açıkça gösterilen görselleri bilirsin.
Ev/yaşam alanı/eşya dışı bir konu sorulursa nazikçe yaşam alanına geri getir, kaba reddetme.`;

// analyzeSingleItem/analyzeRoom'un beklediği geçmiş şeklinden farklı: burada
// ilk mesaj da kullanıcıdan gelebilir, önceden mint edilmiş bir "seed" mesajı
// yok — bu yüzden ayrı bir doğrulayıcı. image alanı SADECE kullanıcı
// mesajlarında ve SADECE bir referans olarak kabul edilir ({source:
// 'chat_attachment', id}) — asla ham/base64 veri; sunucu, bu referansı
// sahiplik kontrolünden geçirip kendi diskinden okur (bkz. app/api/sestia-chat).
// Görsel-sadece mesaj geçerlidir: content boş olabilir AMA o zaman image
// dolu olmalı.
export function validChatMessages(messages, maxLength = 2000) {
  return Array.isArray(messages) && messages.length > 0 && messages.length <= 41 &&
    messages.length % 2 === 1 &&
    messages.every((message, index) => {
      if (!message || message.role !== (index % 2 === 0 ? 'user' : 'assistant')) return false;
      if (typeof message.content !== 'string' || message.content.length > maxLength) return false;
      if (message.role === 'assistant') return message.content.trim().length > 0 && message.image === undefined;
      const hasImage = message.image !== undefined;
      if (hasImage && !validChatImageRef(message.image)) return false;
      return message.content.trim().length > 0 || hasImage;
    });
}

function validChatImageRef(image) {
  return Boolean(image) && typeof image === 'object' && image.source === 'chat_attachment' && Number.isInteger(image.id);
}

// resolvedMessages: history 1:1, ama her mesajın (varsa) image referansı
// çağıran tarafından ({source,id}) zaten sahiplik-kontrollü baytlara
// çözülmüş olarak gelir — resolvedImage: {base64, mediaType}, image: orijinal
// referans ({source,id}) korunur. Bu fonksiyon hiçbir zaman DB/dosya
// sistemine dokunmaz (bkz. app/api/sestia-chat/route.js).
// context: lib/chatContext.cjs'in ürettiği ZATEN doğrulanmış nesne, artı
// (toparla_result için) çağıranın diskten okuyup eklediği contextImage.
// capabilities: lib/chatCapabilities.cjs'ten — suggestedAction'ın izin
// verilen tek kaynağı budur, modelin kendisi değil. view_tidied_room, TAM
// OLARAK hangi fotoğrafı kastettiğini belirtmek zorundadır (bkz. audit —
// "en son fotoğraf kazanır" varsayımı YASAK): her kullanıcı fotoğrafının
// yanına "[Fotoğraf referansı: N]" etiketi eklenir, model suggestedAction
// döndürürken bu N'i aynen kullanmak zorundadır. Sunucu (app/api/sestia-chat)
// bu id'nin gerçekten bu konuşmada geçtiğini ve bu kimliğe ait olduğunu ayrıca
// doğrular — burası sadece modele doğru sözlüğü verir, güven burada bitmez.
export async function chatFreely(resolvedMessages, context, capabilities) {
  const contextText = chatContext.buildContextSystemText(context);
  const canAttachPhoto = capabilities?.attach_photo === true;
  const canViewTidied = Boolean(capabilities?.view_tidied_room?.relevant);

  const capabilityFacts = [
    canAttachPhoto && 'Kullanıcı bu sohbette sana gerçekten bir fotoğraf gönderebilir (uygulamanın kendi ekleme aracıyla) — uygun olduğunda bunu önerebilirsin.',
    canViewTidied && 'Kullanıcının paylaştığı bir fotoğrafın toparlanmış (dağınıklığı giderilmiş) hâlini gerçekten oluşturabilirsin — konuşma buna gerçekten uygun bir noktaya geldiğinde bunu önerebilirsin. Hesabı olmayan bir kullanıcıya da bunu önerebilirsin; giriş gerekip gerekmediğine ve akışa uygulama kendisi karar verir, sen sadece öneriyi yaparsın.',
  ].filter(Boolean).join(' ');

  const actionOptions = [];
  if (canAttachPhoto) actionOptions.push('"attach_photo"');
  if (canViewTidied) actionOptions.push('{"type":"view_tidied_room","attachmentId":N}');
  const actionsSchema = actionOptions.length ? `${actionOptions.join(' ya da ')} ya da null` : 'null';

  const system = `${CHAT_PROMPT}

${contextText}

${capabilityFacts}

Yanıtın SADECE şu şemada bir JSON nesnesi olsun, başka hiçbir metin yazma:
{"reply": string, "suggestedAction": ${actionsSchema}}
"reply" kullanıcıya gösterilecek doğal, sıcak, kısa Türkçe metindir — karakterinin sesiyle konuş; JSON'dan ya da "[Fotoğraf referansı: N]" etiketlerinden hiç bahsetme, bunlar sadece senin için.
"suggestedAction" SADECE yukarıda gerçekten belirtilen bir yetenek şu an uygunsa doldurulur; aksi halde null bırak. Var olmayan bir özelliği asla vaat etme ya da önerme.${canViewTidied ? ' view_tidied_room önerirken attachmentId alanına, tam olarak hakkında konuştuğun fotoğrafın yanındaki "[Fotoğraf referansı: N]" etiketindeki sayıyı yaz — birden fazla fotoğraf paylaşılmışsa en sonuncuyu değil, GERÇEKTEN kastettiğini; asla uydurma, asla başka bir fotoğrafın numarasını kullanma.' : ''}`;

  const messages = resolvedMessages.map((message) => {
    if (message.role !== 'user') return { role: message.role, content: message.content };
    const blocks = [];
    if (context.contextImage) {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: context.contextImage.mediaType, data: context.contextImage.base64 } });
    }
    if (message.resolvedImage) {
      if (message.image?.id != null) blocks.push({ type: 'text', text: `[Fotoğraf referansı: ${message.image.id}]` });
      blocks.push({ type: 'image', source: { type: 'base64', media_type: message.resolvedImage.mediaType, data: message.resolvedImage.base64 } });
    }
    if (!blocks.length) return { role: 'user', content: message.content };
    blocks.push({ type: 'text', text: message.content.trim() ? message.content : 'Bu görsele bakalım.' });
    return { role: 'user', content: blocks };
  });

  const msg = await createMessage({ effort: 'low', system, messages });
  const parsed = safeParseJSON(extractText(msg));
  if (msg.stop_reason === 'max_tokens' || typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
    throw new Error('invalid_chat_reply');
  }
  const suggestedAction = normalizeSuggestedAction(parsed.suggestedAction);
  return { reply: parsed.reply.trim().slice(0, 1200), suggestedAction };
}

// Lightweight shape/type normalization only — NOT a trust boundary. Full
// relevance validation is lib/chatCapabilities.cjs; full "does this
// attachment actually occur in this conversation and belong to this
// identity" validation is app/api/sestia-chat/route.js. This just turns
// garbage into null rather than letting a malformed shape leak through.
function normalizeSuggestedAction(raw) {
  if (raw === 'attach_photo') return 'attach_photo';
  if (raw && typeof raw === 'object' && raw.type === 'view_tidied_room' && Number.isInteger(raw.attachmentId)) {
    return { type: 'view_tidied_room', attachmentId: raw.attachmentId };
  }
  return null;
}

export async function generateWeeklyTips(summaryText) {
  const msg = await createMessage({
    effort: 'low',
    system: TIPS_PROMPT,
    messages: [{ role: 'user', content: summaryText }],
  });

  const parsed = safeParseJSON(extractText(msg));
  if (msg.stop_reason === 'max_tokens' || typeof parsed.headline !== 'string' || !parsed.headline.trim() ||
      typeof parsed.subtext !== 'string' || !parsed.subtext.trim() ||
      !Array.isArray(parsed.tips) || parsed.tips.length < 2 || parsed.tips.length > 3 ||
      parsed.tips.some((tip) => !tip || !TIP_ICONS.includes(tip.icon) ||
        typeof tip.title !== 'string' || !tip.title.trim() ||
        typeof tip.description !== 'string' || !tip.description.trim())) {
    throw new Error('invalid_tips');
  }

  return {
    headline: parsed.headline.slice(0, 60),
    subtext: parsed.subtext.slice(0, 200),
    tips: parsed.tips.map((tip) => ({
      icon: tip.icon,
      title: tip.title.slice(0, 60),
      description: tip.description.slice(0, 160),
    })),
  };
}

function extractText(msg) {
  const block = msg.content.find((b) => b.type === 'text');
  return block ? block.text : '{}';
}

function safeParseJSON(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match ? match[0] : '{}');
  } catch {
    return {};
  }
}

function normalizeRecommendation(value) {
  return RECOMMENDATIONS.includes(value) ? value : 'tut';
}

export function validSingleMessages(messages, maxLength = 4000) {
  return Array.isArray(messages) && messages.length <= 41 &&
    (messages.length === 0 || (messages.length >= 3 && messages.length % 2 === 1)) &&
    messages.every((message, index) => message &&
      message.role === (index % 2 === 0 ? 'user' : 'assistant') &&
      typeof message.content === 'string' && message.content.trim().length > 0 &&
      message.content.length <= maxLength);
}

// validSingleMessages, bir sonraki AI cevabini BEKLEYEN gecmisi dogrular
// (hep bos ya da tek sayida — son mesaj kullanicidan). analyzeRoom'un
// DONDURDUGU messages ise tam tersi: her zaman TAMAMLANMIS bir tur ile
// biter (kullanici + asistan cevabi eklenmis), yani hep CIFT uzunlukta.
// Kaydedilecek tarama gecmisi bu ikinci sekli kullandigi icin ayri bir
// dogrulayiciya ihtiyac var — uzunluk kisitini gevsetiyor, rol siralamasi
// ve icerik kurallari ayni kaliyor.
export function validRoomScanMessages(messages, maxLength = 12000) {
  return Array.isArray(messages) && messages.length <= 42 &&
    messages.every((message, index) => message &&
      message.role === (index % 2 === 0 ? 'user' : 'assistant') &&
      typeof message.content === 'string' && message.content.trim().length > 0 &&
      message.content.length <= maxLength);
}

export async function analyzeSingleItem(base64, mediaType, history = []) {
  if (!validSingleMessages(history)) throw new Error('invalid_messages');
  const messages = history.length ? history : [{ role: 'user', content: 'Bu eşyayı birlikte değerlendirelim.' }];
  const msg = await createMessage({
    effort: 'low',
    system: SINGLE_PROMPT,
    messages: messages.map((message, index) => index === 0 ? {
        role: message.role,
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: message.content },
        ],
      } : message),
  });

  const parsed = safeParseJSON(extractText(msg));
  if (msg.stop_reason === 'max_tokens' || typeof parsed.category !== 'string' ||
      !parsed.category.trim() || !RECOMMENDATIONS.includes(parsed.recommendation) ||
      typeof parsed.reasoning !== 'string' || !parsed.reasoning.trim() ||
      typeof parsed.question !== 'string') throw new Error('invalid_analysis');
  const result = {
    category: (parsed.category || 'Genel Eşya').toString().slice(0, 60),
    recommendation: normalizeRecommendation(parsed.recommendation),
    reasoning: (parsed.reasoning || '').toString().slice(0, 300),
    // idea yeni ve isteğe bağlı: eksik gelirse boş sayılır, eski biçimdeki
    // yanıtlar doğrulamadan düşmez. Karar kaydına (decisions) yazılmaz.
    idea: typeof parsed.idea === 'string' ? parsed.idea.trim().slice(0, 400) : '',
    question: parsed.question.slice(0, 300),
  };
  return { ...result, messages: [...messages, { role: 'assistant', content: JSON.stringify(result) }] };
}

export function validRoomItems(items) {
  return Array.isArray(items) && items.length <= 10 &&
    new Set(items.map(item => item?.id)).size === items.length && items.every(item => item &&
      typeof item.id === 'string' && /^item-\d+$/.test(item.id) &&
      ['label', 'category', 'reasoning'].every(key => typeof item[key] === 'string' && item[key].length <= 300) &&
      RECOMMENDATIONS.includes(item.recommendation) && typeof item.excluded === 'boolean' &&
      typeof item.manual === 'boolean' && (item.modelSuggestion == null ||
        (typeof item.modelSuggestion === 'object' && !Array.isArray(item.modelSuggestion) &&
         RECOMMENDATIONS.includes(item.modelSuggestion.recommendation) &&
         typeof item.modelSuggestion.reasoning === 'string' && item.modelSuggestion.reasoning.length <= 300)));
}

const ROOM_COVERAGE_PROMPT = `Bir odanın/köşenin 1-6 fotoğrafına bakıyorsun. Amacın SADECE bu fotoğraf(lar)ın,
odanın dürüst bir eşya değerlendirmesi yapmak için yeterli bir genel görünüm sağladığını
kontrol etmek — eşyaları LİSTELEME, sadece kapsamı değerlendir.

Fotoğraflarda odanın büyük, belirgin bir kısmı AÇIKÇA eksikse (örneğin kadrajın net şekilde
kestiği bir duvar/köşe, fotoğrafın dışında kaldığı belli olan bir alan) sufficient=false yap.
requestedAngle'da SADECE görüntüde GERÇEKTEN görülen somut bir ipucuna dayanarak, kısa ve
dostça bir şekilde hangi açıdan bir fotoğraf daha istediğini belirt (örnek: "sağda kesilen
dolabın devamı", "fotoğrafın dışında kalan sol köşe"). Görmediğin bir alanı UYDURMA;
emin değilsen ya da fotoğraf(lar) zaten odanın genelini makul ölçüde gösteriyorsa
sufficient=true yap — kullanıcıyı gereksiz yere yeni fotoğraf çekmeye zorlama. Bu kesin bir
ölçüm/tarama değil, sadece dostça bir kontrol; kesin kapsama ölçümü yapıyormuş gibi davranma.

Sadece şu şemada bir JSON nesnesi döndür, başka hiçbir metin yazma:
{"sufficient": boolean, "requestedAngle": string|null, "reply": string}
reply alanı kullanıcıya gösterilecek, kısa (tek cümle), sıcak bir Türkçe mesaj olsun.`;

// images: [{ base64, mediaType }, ...] — analyzeRoom'dan BAĞIMSIZ, ucuz ve hızlı bir
// kontrol. Amaç: pahalı tam oda analizini (esya listeleme) her fotoğraf eklendiğinde
// tekrar tekrar çalıştırmamak — önce bu ucuz kontrolle kapsam yeterli mi bakılır.
export async function checkRoomCoverage(images) {
  if (!Array.isArray(images) || images.length === 0 || images.length > MAX_ROOM_PHOTOS) {
    throw new Error('invalid_images');
  }
  const msg = await createMessage({
    effort: 'low',
    system: ROOM_COVERAGE_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          ...images.map((img) => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } })),
          { type: 'text', text: 'Bu fotoğraf(lar) yeterli mi?' },
        ],
      },
    ],
  });

  const parsed = safeParseJSON(extractText(msg));
  if (
    msg.stop_reason === 'max_tokens' ||
    typeof parsed.sufficient !== 'boolean' ||
    typeof parsed.reply !== 'string' ||
    !parsed.reply.trim() ||
    (parsed.requestedAngle !== null && typeof parsed.requestedAngle !== 'string')
  ) {
    throw new Error('invalid_coverage_check');
  }

  return {
    sufficient: parsed.sufficient,
    requestedAngle: parsed.requestedAngle ? parsed.requestedAngle.toString().slice(0, 120) : null,
    reply: parsed.reply.slice(0, 300),
  };
}

// images: [{ base64, mediaType }, ...] — aynı odanın 1-6 fotoğrafı
export async function analyzeRoom(images, history = [], currentItems = []) {
  if (!Array.isArray(images) || images.length === 0 || images.length > MAX_ROOM_PHOTOS) {
    throw new Error('invalid_images');
  }
  if (!validSingleMessages(history, 12000) || (history.length && !validRoomItems(currentItems))) {
    throw new Error('invalid_room_conversation');
  }
  const messages = history.length ? history : [{ role: 'user', content: 'Bu odayı birlikte değerlendirelim.' }];
  const msg = await createMessage({
    effort: 'medium',
    system: ROOM_PROMPT,
    messages: messages.map((message, index) => index === 0 ? {
        role: message.role,
        content: [
          ...images.map((img) => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } })),
          { type: 'text', text: message.content },
        ],
      } : index === messages.length - 1 ? {
        ...message, content: `${message.content}\n\nMevcut eşya listesi ve kullanıcının seçimleri:\n${JSON.stringify(currentItems)}`,
      } : message),
  });

  const parsed = safeParseJSON(extractText(msg));
  if (msg.stop_reason === 'max_tokens' || !Array.isArray(parsed.items) || parsed.items.length > 10 ||
      typeof parsed.reply !== 'string' || typeof parsed.question !== 'string' ||
      parsed.items.some(item => !item || !RECOMMENDATIONS.includes(item.recommendation) ||
        ['label', 'category', 'reasoning'].some(key => typeof item[key] !== 'string' || !item[key].trim()))) {
    throw new Error('invalid_room_analysis');
  }
  let items = parsed.items.map((item, index) => ({
    id: history.length ? item.id : `item-${index + 1}`,
    label: item.label.slice(0, 80),
    category: item.category.slice(0, 60),
    recommendation: item.recommendation,
    reasoning: item.reasoning.slice(0, 300),
  }));
  items = roomItemSources.reconcileRoomItems(items, currentItems, !!history.length);
  const result = { items, reply: parsed.reply.slice(0, 600), question: parsed.question.slice(0, 300) };
  return { ...result, messages: [...messages, { role: 'assistant', content: JSON.stringify(result) }] };
}

// "Bana öneri ver" — odaya dair öneriler; dağınıklık varsa önce ayıklama.
// Eşya eşya tut/sat/bağışla kararı burada yok, o "Odaya birlikte bakalım"ın
// işi. Kendin yap (DIY) ayrı bir özellik olacak.
export const SUGGESTION_AREAS = ['ayiklama', 'depolama', 'yerlesim', 'isik', 'renk', 'dekor'];
// Öneriler iki bölümde: "baslangic" = nereden başlamalı (sıralı toparlama
// planı), "sonra" = topladıktan sonra odanın hedefe göre kurulumu.
export const SUGGESTION_PHASES = ['baslangic', 'sonra'];
const MAX_SUGGESTION_IDEAS = 10;
// Öneri için gönderilecek en fazla oda fotoğrafı (farklı açılar).
export const MAX_SUGGESTION_PHOTOS = 4;

// Kullanıcının yazdığı oda bilgisi; sistem talimatına değil kullanıcı
// mesajına girer.
function roomBriefText(room) {
  const name = typeof room?.name === 'string' && room.name.trim() ? room.name.trim().slice(0, 60) : 'Oda';
  const goal = typeof room?.goal === 'string' && room.goal.trim() ? room.goal.trim().slice(0, 200) : '';
  const story = typeof room?.story === 'string' && room.story.trim() ? room.story.trim().slice(0, 600) : '';
  const corrections = typeof room?.corrections === 'string' && room.corrections.trim() ? room.corrections.trim().slice(0, 600) : '';
  return `Oda: ${name}.${goal ? `\nKullanıcının bu oda için hedefi: ${goal}` : '\nKullanıcı bu oda için bir hedef yazmadı.'}${story ? `\nOdanın hikâyesi: ${story}` : ''}${
    corrections ? `\nKullanıcının, senin bu odada yanlış gördüklerine dair düzeltmeleri: ${corrections}` : ''}`;
}

// Anthropic görsel başına 5 MB'tan büyük base64 kabul etmiyor; base64 ham
// baytı ~4/3 büyüttüğü için sınır ham dosya boyutu olarak 3/4'ü.
export const MAX_SUGGESTION_IMAGE_BYTES = Math.floor((5 * 1024 * 1024 * 3) / 4);

const ROOM_IDEAS_PROMPT = `${SESTIA_CHARACTER_BASE}

${STRUCTURED_OUTPUT_NOTE}

Kullanıcı bir odasının fotoğraflarını paylaştı ve bu oda için senden öneri istedi. Sana aynı odanın farklı açılardan 1-4 fotoğrafı gönderilebilir; hepsini tek bir oda olarak değerlendir, aynı eşyayı iki kez sayma. Kullanıcı odanın hedefini ("bu oda ne olacak") ve hikâyesini de yazmış olabilir; bunlar fotoğraflar kadar önemlidir — önerilerin bu hedefe hizmet etsin.

Gözlem:
- Fotoğraflara dikkatle bak ve gerçekten gördüklerini çıkar: odada neler var, nerede duruyorlar, yüzeylerde ve yerde ne birikmiş.
- Emin olmadığın bir şeyi kesinmiş gibi yazma; belirsizse "sandık olabilir" gibi açıkça söyle. Emin olmadığın bir eşyaya dayanarak öneri ya da adım kurma.
- Kullanıcı düzeltme yazdıysa düzeltmeler fotoğraftaki görüntüden önce gelir: düzeltilen şeyi düzeltildiği gibi ele al ve "seen" dahil hiçbir yerde eski, yanlış adıyla anma.
- Fotoğraflar odanın her yerini göstermez. Hedef ya da hikâyeden odada olması muhtemel ama fotoğrafta seçemediğin şeyler (örn. eski bir atölyenin malzemeleri) ya da hiç görünmeyen alanlar için tahmin yürütme; bunları "missing" alanında kısaca söyle ve hangi açıdan bir fotoğraf daha istediğini belirt.

1) "baslangic" — Nereden başlamalı. Yalnızca odada toparlanacak bir şey varsa; 3-6 adım, uygulanacağı sırayla. Kullanıcı ne yapılması gerektiğini zaten biliyor; ona NASIL yapılacağını, bunaltmayan en iyi sırayla göster. Bu ilkeleri izle ve fotoğrafta gördüklerinle somutlaştır:
- İlk adım karar gerektirmeyen ve en çok yer kaplayan şeyler olsun: ambalaj, karton, poşet, çöp. Hızlı ve görünür bir kazanım sağlar, geri kalan işe yer açar.
- Ardından bir ayırma düzeni kur: kalacak / bağış ya da satış / geri dönüşüm / çöp — mümkünse ilk adımda boşalan kutu ve torbalarla.
- Eşyaları konuma göre değil türe göre, bir seferde tek tür olacak şekilde ele al (örn. önce boyalar, sonra fırçalar, sonra tuvaller, sonra kâğıtlar). Her türü tek yerde toplayıp sonra karar ver.
- Hedef verilmişse karar ölçütünü hedefe göre koy (örn. "dijital atölyede bunu kullanacak mıyım?"). Emin olunamayanlar için tarihli bir "belki" kutusu öner.
- Ayrılacak şeylerin nereye gideceğini somut söyle: karton ve kâğıt geri dönüşüme, elektronikler elektronik atık toplama noktasına; kurumuş ya da kullanılmayacak boyalar normal çöpe değil, belediyenin atık toplama noktasına; iyi durumdaki malzemeler sanat atölyelerine, okullara ya da öğrencilere bağışa ya da satışa.
- Mobilya ve yerleşim değişiklikleri ayıklama bittikten sonraya kalsın.
Her adım için:
  - how: 2-5 kısa, uygulanabilir eylem; sırayla ve somut (örn. "Kartonları yassıla ve kapının yanına üst üste koy")
  - time: kısa bir süre tahmini (örn. "20-30 dakika", "1-2 tur, 45'er dakika")

2) "sonra" — Topladıktan sonra. 2-4 öneri:
- Oda boşaldığında hedefe göre nasıl kurulacağını öner: yerleşim, çalışma düzeni, ışık, depolama, kablolar gibi — yalnızca bu oda ve bu hedef için anlamlı olanları.
- Fotoğraftaki kalıcı unsurlara dayan (pencere ve perdelerin konumu, masa, raflar, prizler) ve önerinin neden bu odada işe yarayacağını söyle.
- Hedef verilmemişse odanın görünen kullanımına göre öner.

Genel kurallar:
- "Bitki ekle", "ayna as", "aydınlatmayı iyileştir" gibi her odaya söylenebilecek genel tavsiyeler verme.
- Kendin yap (DIY), boyama, onarım ya da dönüştürme önerme; bunlar ayrı bir özelliğin işi.
- Oda zaten derli topluysa "baslangic" adımı verme ve bunu summary'de söyle.
Fotoğraflar öneri için uygun değilse (oda görünmüyor, çok karanlık ya da bulanık, tek bir eşyanın yakın çekimi) ideas boş dizi olsun ve summary'de nedenini kısaca söyle.

Alanlar:
- seen: fotoğraflarda gördüğün en önemli 4-8 şey; her biri konumuyla birlikte en fazla 12 kelimelik kısa bir ifade (örn. "pencere önünde iki kişilik gri kanepe")
- missing: fotoğraflarda göremediğin ama önemli olabilecek şeyler ve hangi açıdan fotoğraf istediğin, 1-2 cümle; yoksa boş metin
- summary: odaya dair 1-2 cümlelik, gördüğüne dayanan kısa bir değerlendirme; hedef verilmişse odanın bu hedefe göre durumunu da söyle; soru içermez
- ideas: önce "baslangic" adımları uygulanacağı sırayla, sonra "sonra" önerileri; her biri için
  - phase: "baslangic" ya da "sonra"
  - area: tam olarak şu değerlerden biri: "ayiklama" (fazlalığı azaltma, toplama), "depolama" (düzen ve saklama), "yerlesim" (mobilya yerleşimi, akış, çalışma düzeni), "isik", "renk", "dekor"
  - title: en fazla 6 kelimelik Türkçe başlık
  - detail: 1-2 cümle; bu adımın ya da önerinin neden önemli olduğu
  - how: "baslangic" için zorunlu (2-5 eylem); "sonra" için boş dizi
  - time: "baslangic" için zorunlu; "sonra" için boş metin

Sadece şu şemada bir JSON nesnesi döndür, başka hiçbir metin yazma:
{"seen": [string, ...], "missing": string, "summary": string, "ideas": [{"phase": "baslangic"|"sonra", "area": "ayiklama"|"depolama"|"yerlesim"|"isik"|"renk"|"dekor", "title": string, "detail": string, "how": [string, ...], "time": string}, ...]}`;

// image: { base64, mediaType } — sunucunun diskteki oda fotoğrafından okuduğu
// bayt; istemciden gelen bir görsel değil. roomName kullanıcı metnidir, bu
// yüzden sistem talimatına değil kullanıcı mesajına girer.
// images: one or more { base64, mediaType } of the same room (different
// angles), read server-side from owned room photos. room: { name, goal, story }
// from the owned room row (a plain name string is accepted too).
export async function suggestRoomIdeas(images, room) {
  const list = Array.isArray(images) ? images : [images];
  if (!list.length || list.length > MAX_SUGGESTION_PHOTOS ||
      list.some((image) => !image || typeof image.base64 !== 'string' || !image.base64 || typeof image.mediaType !== 'string')) {
    throw new Error('invalid_image');
  }
  const brief = roomBriefText(typeof room === 'string' ? { name: room } : room);
  const msg = await createMessage({
    effort: 'medium',
    system: ROOM_IDEAS_PROMPT,
    messages: [{
      role: 'user',
      content: [
        ...list.map((image) => ({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } })),
        { type: 'text', text: `${brief}\nBu oda için bana öneri ver.` },
      ],
    }],
  });

  const parsed = safeParseJSON(extractText(msg));
  if (msg.stop_reason === 'max_tokens' || typeof parsed.summary !== 'string' || !parsed.summary.trim() ||
      !Array.isArray(parsed.seen) || parsed.seen.length > 10 ||
      parsed.seen.some((item) => typeof item !== 'string' || !item.trim()) ||
      !Array.isArray(parsed.ideas) || parsed.ideas.length > MAX_SUGGESTION_IDEAS ||
      parsed.ideas.some((idea) => !idea || !SUGGESTION_PHASES.includes(idea.phase) || !SUGGESTION_AREAS.includes(idea.area) ||
        ['title', 'detail'].some((key) => typeof idea[key] !== 'string' || !idea[key].trim()) ||
        // A start step must say HOW (2-5 actions) and how long; that is the point of it.
        (idea.phase === 'baslangic' && (!Array.isArray(idea.how) || idea.how.length < 1 || idea.how.length > 5 ||
          idea.how.some((step) => typeof step !== 'string' || !step.trim()) || typeof idea.time !== 'string' || !idea.time.trim()))) ||
      (parsed.missing != null && typeof parsed.missing !== 'string')) {
    throw new Error('invalid_room_ideas');
  }
  return {
    seen: parsed.seen.map((item) => item.trim().slice(0, 240)),
    missing: typeof parsed.missing === 'string' ? parsed.missing.trim().slice(0, 400) : '',
    summary: parsed.summary.trim().slice(0, 400),
    // "Nereden başlamalı" önce, kendi sırasıyla; sonra "Topladıktan sonra".
    ideas: [...parsed.ideas.filter((idea) => idea.phase === 'baslangic'), ...parsed.ideas.filter((idea) => idea.phase === 'sonra')].map((idea) => ({
      phase: idea.phase,
      area: idea.area,
      title: idea.title.trim().slice(0, 80),
      detail: idea.detail.trim().slice(0, 500),
      ...(idea.phase === 'baslangic'
        ? { how: idea.how.map((step) => step.trim().slice(0, 200)), time: idea.time.trim().slice(0, 60) }
        : {}),
    })),
  };
}

// Bir öneriye dokunulunca açılan detay: tek bir öneriyi uygulanabilir
// adımlara böler. Önerinin metni ve "gördüklerim" listesi sunucudaki kayıttan
// gelir; istemciden serbest metin alınmaz.
export const PLAN_DIFFICULTIES = ['kolay', 'orta', 'zor'];

const IDEA_PLAN_PROMPT = `${SESTIA_CHARACTER_BASE}

${STRUCTURED_OUTPUT_NOTE}

Kullanıcı bu oda için verdiğin önerilerden birini seçti ve nasıl uygulayacağını görmek istiyor. Fotoğrafa ve seçilen öneriye dayanarak uygulanabilir bir plan çıkar.
Yalnızca bu öneriyi planla; öneriyi değiştirme, başka öneri ekleme. Fotoğrafta görünmeyen bir eşyadan bahsetme.
Kullanıcı düzeltme yazdıysa düzeltmeler fotoğraftaki görüntüden ve önceki gözlemlerinden önce gelir: düzeltilen şeyi düzeltildiği gibi ele al, eski yanlış adıyla anma.

Alanlar:
- steps: 3-6 kısa adım; her biri tek bir eylem ve mümkünse fotoğraftaki belirli bir eşyaya ya da konuma dayanır (örn. "Sehpadaki bardakları ve kâseyi mutfağa götür")
- needs: uygulamak için gerekenler (kutu, sepet, etiket, klasör gibi), en fazla 6 madde; evde zaten bulunabilecekse bunu belirt ("evdeki bir ayakkabı kutusu yeter"); hiçbir şey gerekmiyorsa boş dizi
- difficulty: tam olarak "kolay", "orta" ya da "zor"
- time: kısa bir süre tahmini (örn. "15-20 dakika")
- budget: kısa bir bütçe notu; para gerekmiyorsa "Bütçe gerekmez"; gerekiyorsa Türk lirası cinsinden kaba bir aralık ver ve fiyatların değişebileceğini kısaca belirt — kesin fiyat ya da marka uydurma

Sadece şu şemada bir JSON nesnesi döndür, başka hiçbir metin yazma:
{"steps": [string, ...], "needs": [string, ...], "difficulty": "kolay"|"orta"|"zor", "time": string, "budget": string}`;

// image: oda fotoğrafının sunucudaki baytları. suggestion: kayıtlı öneri
// (seen + ideas), ideaIndex: seçilen önerinin sırası.
// The goal/story are the snapshot stored with the suggestion, so the plan
// matches what the idea was made for.
export async function suggestIdeaPlan(image, roomName, suggestion, ideaIndex) {
  const idea = suggestion?.ideas?.[ideaIndex];
  if (!image || typeof image.base64 !== 'string' || !image.base64 || !idea) throw new Error('invalid_plan_request');
  const brief = roomBriefText({ name: roomName, goal: suggestion.goal, story: suggestion.story, corrections: suggestion.corrections });
  const seen = (suggestion.seen || []).map((item) => `- ${item}`).join('\n');
  const msg = await createMessage({
    effort: 'low',
    system: IDEA_PLAN_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
        { type: 'text', text: `${brief}${seen ? `\nFotoğrafta gördüklerin:\n${seen}` : ''}\nSeçilen öneri: ${idea.title} — ${idea.detail}\nBunu nasıl uygularım?` },
      ],
    }],
  });

  const parsed = safeParseJSON(extractText(msg));
  const strings = (value, min, max) => Array.isArray(value) && value.length >= min && value.length <= max &&
    value.every((item) => typeof item === 'string' && item.trim());
  if (msg.stop_reason === 'max_tokens' || !strings(parsed.steps, 1, 6) || !strings(parsed.needs, 0, 6) ||
      !PLAN_DIFFICULTIES.includes(parsed.difficulty) ||
      typeof parsed.time !== 'string' || !parsed.time.trim() || typeof parsed.budget !== 'string' || !parsed.budget.trim()) {
    throw new Error('invalid_idea_plan');
  }
  return {
    steps: parsed.steps.map((step) => step.trim().slice(0, 240)),
    needs: parsed.needs.map((need) => need.trim().slice(0, 120)),
    difficulty: parsed.difficulty,
    time: parsed.time.trim().slice(0, 60),
    budget: parsed.budget.trim().slice(0, 160),
  };
}
