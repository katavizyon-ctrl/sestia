import Anthropic from '@anthropic-ai/sdk';
import roomItemSources from './roomItemSources.cjs';
import { MAX_ROOM_PHOTOS } from '@/lib/constants';
import { SESTIA_VOICE_COMPASS } from '@/lib/sestiaLibrary';

// Varsayılan SDK zaman aşımı (10 dk) bir istek işleyicisi için çok uzun — ağ takılırsa
// kullanıcı o kadar süre "inceliyor" ekranında kalır. 45sn sonra vazgeçip nazik hata
// göster (zaten üstteki try/catch bunu 500 + "tekrar dener misin" mesajına çeviriyor).
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 45_000 });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

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


// Keşif ekranındaki serbest sohbet için — tek-eşya/oda analiz akışlarının
// aksine burada fotoğraf YOK ve çıktı sabit bir karar şeması (category/
// recommendation) değil, doğal bir metin yanıtı. Ortak SESTIA_CHARACTER_BASE'i
// kullanır; buraya eklenen tek şey Keşif'e özgü görev bağlamı.
const CHAT_PROMPT = `${SESTIA_CHARACTER_BASE}

Şu an kullanıcıyla serbest bir sohbettesin. Henüz bir fotoğraf paylaşmamış ya da bir analiz başlatmamış olabilir — bu normal, fotoğraf şart değil. Uygulamanın gerçek yeteneklerini (bir eşyanın fotoğrafını analiz etmek, bir odayı taramak) bilirsin ve doğal geldiğinde önerebilirsin, ama her cümlede tekrarlama. Bilmediğin bir şeyi (kullanıcının evini, geçmiş kararlarını, görmediğin bir fotoğrafı) biliyormuş gibi davranma; sadece bu sohbette söylenenleri bilirsin.
Ev/yaşam alanı/eşya dışı bir konu sorulursa nazikçe yaşam alanına geri getir, kaba reddetme.`;

// Kullanıcı bir bölümdeki ("Bir odanın başka bir hayatı olabilir mi?" vb.)
// davetle sohbeti açtığında Sestia'ya HANGİ bölümden geldiğini bildiren
// sabit, önceden tanımlı etiketler — istemciden gelen serbest metni
// doğrudan sistem promptuna enjekte etmemek için (bkz. app/api/sestia-chat).
export const SECTION_CONTEXT_LABELS = {
  oda: 'Bir odanın başka bir hayatı olabilir mi?',
  kose: 'Ya bütün oda değil, yalnızca bir köşeyse?',
  esya: 'Peki ya yalnızca bir eşya?',
  kivilcim: 'İlham kıvılcımı',
};

// analyzeSingleItem/analyzeRoom'un beklediği geçmiş şeklinden (hep 0 ya da
// bos-sonrası-3'ün-katı) farklı: burada ilk mesaj da kullanıcıdan gelebilir,
// önceden mint edilmiş bir "seed" mesajı yok — bu yüzden ayrı bir doğrulayıcı.
export function validChatMessages(messages, maxLength = 2000) {
  return Array.isArray(messages) && messages.length > 0 && messages.length <= 41 &&
    messages.length % 2 === 1 &&
    messages.every((message, index) => message &&
      message.role === (index % 2 === 0 ? 'user' : 'assistant') &&
      typeof message.content === 'string' && message.content.trim().length > 0 &&
      message.content.length <= maxLength);
}

// sectionContext: SECTION_CONTEXT_LABELS'ten bir anahtar ya da null.
export async function chatFreely(history, sectionContext) {
  if (!validChatMessages(history)) throw new Error('invalid_messages');
  const label = sectionContext && SECTION_CONTEXT_LABELS[sectionContext];
  const system = label
    ? `${CHAT_PROMPT}\n\nBAĞLAM (sadece arka plan bilgisi — kullanıcı adına soru ya da niyet uydurma, sadece hangi bölümden geldiğini bil): kullanıcı bu sohbeti "${label}" bölümünü okurken açtı.`
    : CHAT_PROMPT;
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages: history,
  });
  const text = extractText(msg).trim();
  // extractText metin bloğu bulunamazsa '{}' döner (diğer JSON-şemalı
  // çağrılar için uygun bir varsayılan) — serbest sohbette bu geçersiz bir
  // yanıt sayılır, kullanıcıya olduğu gibi gösterilmemeli.
  if (msg.stop_reason === 'max_tokens' || !text || text === '{}') throw new Error('invalid_chat_reply');
  return { reply: text, messages: [...history, { role: 'assistant', content: text }] };
}

export async function generateWeeklyTips(summaryText) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
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
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
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
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
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
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
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
