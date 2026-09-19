import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export const RECOMMENDATIONS = ['tut', 'sat', 'bagisla', 'at', 'geri_donustur'];

const SINGLE_PROMPT = `Bu bir eşyalardan kurtulma (declutter) uygulaması için çekilmiş bir eşya fotoğrafı.
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
{"category": string, "recommendation": "tut"|"sat"|"bagisla"|"at"|"geri_donustur", "reasoning": string}`;

const ROOM_PROMPT = `Bu bir eşyalardan kurtulma (declutter) uygulaması için çekilmiş genel bir oda/köşe fotoğrafı.
Fotoğrafta gördüğün EN BELİRGİN 6 ila 10 eşyayı/alanı tespit et — gördüğün her şeyi sayma,
sadece en net ayırt edilebilenleri listele.

Her eşya için:
- label: eşyayı kısaca tarif et ve konumunu belirt, Türkçe (örn: "sol köşedeki mavi kutu")
- category: kısa bir Türkçe kategori etiketi, en fazla 3 kelime
- recommendation: tam olarak şu beş değerden biri: "tut", "sat", "bagisla", "at", "geri_donustur"
  (aynı kriterler: hâlâ değerli/kullanılabilir -> tut, pahalı ama artık gereksiz -> sat,
   düşük değerli ama iyi durumda -> bagisla, geri dönüştürülebilir malzeme (cam/plastik/metal/kağıt)
   -> geri_donustur, gerçekten çöp -> at)
- reasoning: 1 cümlelik kısa Türkçe gerekçe

Sadece şu şemada bir JSON nesnesi döndür, başka hiçbir metin yazma:
{"items": [{"label": string, "category": string, "recommendation": "tut"|"sat"|"bagisla"|"at"|"geri_donustur", "reasoning": string}, ...]}`;

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

export async function analyzeSingleItem(base64, mediaType) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: SINGLE_PROMPT },
        ],
      },
    ],
  });

  const parsed = safeParseJSON(extractText(msg));
  return {
    category: (parsed.category || 'Genel Eşya').toString().slice(0, 60),
    recommendation: normalizeRecommendation(parsed.recommendation),
    reasoning: (parsed.reasoning || '').toString().slice(0, 300),
  };
}

export async function analyzeRoom(base64, mediaType) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: ROOM_PROMPT },
        ],
      },
    ],
  });

  const parsed = safeParseJSON(extractText(msg));
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items.slice(0, 10).map((item) => ({
    label: (item.label || 'Eşya').toString().slice(0, 80),
    category: (item.category || 'Genel Eşya').toString().slice(0, 60),
    recommendation: normalizeRecommendation(item.recommendation),
    reasoning: (item.reasoning || '').toString().slice(0, 300),
  }));
}
