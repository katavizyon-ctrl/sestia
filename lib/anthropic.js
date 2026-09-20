import Anthropic from '@anthropic-ai/sdk';
import { MAX_ROOM_PHOTOS } from '@/lib/constants';

// Varsayılan SDK zaman aşımı (10 dk) bir istek işleyicisi için çok uzun — ağ takılırsa
// kullanıcı o kadar süre "inceliyor" ekranında kalır. 45sn sonra vazgeçip nazik hata
// göster (zaten üstteki try/catch bunu 500 + "tekrar dener misin" mesajına çeviriyor).
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 45_000 });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export const RECOMMENDATIONS = ['tut', 'sat', 'bagisla', 'at', 'geri_donustur'];

const SINGLE_PROMPT = `Kullanıcının evindeki bir eşyaya karar vermesine yardım ediyorsun.
Fotoğraftan kullanım sıklığı, ihtiyaç veya manevi değer çıkarma. Pahalı görünmek satmak için neden değildir.
Kullanıcı bu hafta/bu ay kullandığını veya halen ihtiyaç duyduğunu söylüyorsa görsel değerinden bağımsız güçlü biçimde "tut" öner.
6+ aydır kullanmadığını veya hatırlamadığını söylüyorsa durum ve değere göre sat/bağışla/geri dönüştür/at seçeneklerini değerlendir;
ancak hediye, manevi bağ veya somut gelecek kullanımını da dikkate al ve baskı yapma.
Bağlam henüz bilinmiyorsa kullanılabilir eşyalarda "tut" geçici önerisi uygundur; kullanılmadığını varsayma.
Her turda önceki konuşmayı ve yeni cevabı birlikte değerlendirerek kategori, öneri ve gerekçeyi güncelle.
İlk yanıtta eşyaya özgü, kısa ve doğal bir soru sor. Sonraki turlarda yalnızca gerçekten eksik bilgi varsa
tek bir soru sor; cevaplanmış soruyu tekrarlama. Yeterli bilgi varsa question boş metin olsun.
Fotoğraftaki eşyayı incele ve şu üç bilgiyi belirle:
1) category: kısa bir Türkçe kategori etiketi, en fazla 3 kelime (örn: "Elektronik · Kablo")
2) recommendation: tam olarak şu beş değerden biri: "tut", "sat", "bagisla", "at", "geri_donustur"
   - Hâlâ aktif kullanılabilir, değerli görünen eşyalar için "tut"
   - Pahalı görünen, iyi durumda ama artık ihtiyaç duyulmayan eşyalar için "sat"
   - İyi durumda ama düşük değerli, başkasına faydalı olabilecek eşyalar için "bagisla"
   - Cam, plastik, metal, kağıt gibi geri dönüştürülebilir ama yeniden satılamaz/bağışlanamaz
     malzemeler için "geri_donustur" (örn. boş cam şişe, kırık plastik ambalaj)
   - Gerçekten çöpe gidecek, geri dönüştürülemeyen, organik veya hijyenik olmayan eşyalar için "at"
   "at" ile "geri_donustur"u karıştırma: malzeme geri dönüştürülebilirse "geri_donustur", değilse "at".
3) reasoning: 1-2 cümlelik, samimi ve kısa bir Türkçe gerekçe

Sadece şu şemada bir JSON nesnesi döndür, başka hiçbir metin yazma:
{"category": string, "recommendation": "tut"|"sat"|"bagisla"|"at"|"geri_donustur", "reasoning": string, "question": string}`;

const ROOM_PROMPT = `Bu bir eşyalardan kurtulma (declutter) uygulaması için çekilmiş bir oda/köşenin fotoğraf(lar)ı.
Sana aynı odanın/köşenin 1 ile 6 arası fotoğrafı gönderiliyor olabilir (farklı açılardan çekilmiş olabilir).
Tüm fotoğrafları TEK bir odanın parçası olarak birlikte değerlendir; aynı eşyayı birden fazla fotoğrafta
görürsen listede yalnızca bir kez say, tekrar etme.
Kullanım sıklığını ve manevi değeri fotoğraftan varsayma. Yakın zamanda kullanılan veya ihtiyaç duyulan eşyalarda
görsel fiyatından bağımsız "tut" öner. Bağlam bilinmiyorsa kullanılabilir eşyaları tutmak geçici öneri olabilir.
Kullanıcının mesajıyla sadece ilgili eşyaların değerlendirmesini güncelle; diğerlerini koru.
Takip turlarında mevcut listedeki id değerlerini aynen kullan; eşya ekleme, çıkarma veya kimlik değiştirme.
Manuel seçilmiş kararları ve hariç tutulan eşyaları koru. Hangi eşyanın kastedildiği belirsizse değişiklik yapmadan sor.
Her yanıtta reply alanında kısa, doğal bir Türkçe cevap ve gerekiyorsa question alanında tek bir soru ver.
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
      typeof item.manual === 'boolean');
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
  if (history.length) {
    // AI id'leri tekrar kullanmayı beklesek de (bkz. ROOM_PROMPT) hatalı/eksik
    // eşleşmede sohbeti 500'e düşürmek yerine listeyi kullanıcı kaybı olmadan
    // uzlaştırıyoruz: eşleşen id'ler güncellenir (manuel/hariç tutulanlar korunur),
    // eşleşmeyenler (örn. ilk taramada 0 eşya bulunup sohbette yeni eşya
    // tarif edildiğinde) yeni id'yle listeye eklenir, mevcutta olup AI'ın bu
    // turda bahsetmediği eşyalar olduğu gibi kalır.
    const byId = new Map(items.map((item) => [item.id, item]));
    const currentIds = new Set(currentItems.map((item) => item.id));
    let nextIdNum = currentItems.reduce((max, item) => {
      const match = /^item-(\d+)$/.exec(item.id);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);

    const reconciled = currentItems.map((current) => {
      if (current.manual || current.excluded) return { ...current };
      const updated = byId.get(current.id);
      return updated ? { ...updated, excluded: current.excluded, manual: false } : { ...current };
    });
    const added = items
      .filter((item) => !currentIds.has(item.id))
      .slice(0, Math.max(0, 10 - reconciled.length))
      .map((item) => ({ ...item, id: `item-${++nextIdNum}`, excluded: false, manual: false }));

    items = [...reconciled, ...added];
  }
  const result = { items, reply: parsed.reply.slice(0, 600), question: parsed.question.slice(0, 300) };
  return { ...result, messages: [...messages, { role: 'assistant', content: JSON.stringify(result) }] };
}
