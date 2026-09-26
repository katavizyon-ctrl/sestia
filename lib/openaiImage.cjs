// "Toparlanmış halini gör" — server-side OpenAI image-edit call and the
// aspect-ratio-exact output sizing math validated in Benchmark 01. Kept as a
// plain CommonJS module (like creationStore.cjs/roomDecisionStore.cjs) so
// tests can substitute `generateTidyImage` on the required module object
// without a real network call — callers must invoke it as
// `openaiImage.generateTidyImage(...)`, never destructure it at import time,
// or a test override would not take effect.

const MODEL = 'gpt-image-2.5-sunburst';
const QUALITY = 'medium';
const OUTPUT_FORMAT = 'png';

// Same "tidy, don't redesign" instruction approved in Benchmark 01.
const TOPARLA_PROMPT = `Edit the supplied photograph rather than creating a new interpretation of the room. Preserve the exact room, camera position, perspective, framing, architecture, walls, windows, doors, flooring, built-in elements, major furniture, and overall lighting.

Only tidy and organize the existing room. Remove loose clutter and visual mess from floors and surfaces. Organize existing belongings into plausible, realistic locations. Clear walking paths and working surfaces. Keep the room lived-in and believable.

Do not redesign or redecorate the room. Do not replace the furniture. Do not introduce new furniture or decorative objects. Do not change architectural features, materials, colors, room proportions, camera angle, or layout. Do not turn the room into a luxury interior or staged catalog photograph.

The result must look like a photograph taken from the same position after someone carefully tidied this exact room.`;

// ---------------------------------------------------------------------------
// Source dimensions — only used to pick a sensible output size, never to
// inspect or alter pixel content.

function jpegDims(buf) {
  let offset = 2;
  while (offset < buf.length - 9) {
    if (buf[offset] !== 0xff) { offset++; continue; }
    const marker = buf[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
    }
    const segLen = buf.readUInt16BE(offset + 2);
    offset += 2 + segLen;
  }
  return null;
}

function pngDims(buf) {
  if (buf.length < 24) return null;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (!isPng) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function webpDims(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fourCC = buf.toString('ascii', 12, 16);
  const payload = buf.subarray(20);
  if (fourCC === 'VP8X' && payload.length >= 10) {
    const width = 1 + (payload[4] | (payload[5] << 8) | (payload[6] << 16));
    const height = 1 + (payload[7] | (payload[8] << 8) | (payload[9] << 16));
    return { width, height };
  }
  if (fourCC === 'VP8 ' && payload.length >= 10) {
    const w = payload.readUInt16LE(6);
    const h = payload.readUInt16LE(8);
    return { width: w & 0x3fff, height: h & 0x3fff };
  }
  if (fourCC === 'VP8L' && payload.length >= 5 && payload[0] === 0x2f) {
    const b0 = payload[1], b1 = payload[2], b2 = payload[3], b3 = payload[4];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | (b1 >> 6));
    return { width, height };
  }
  return null;
}

// Returns { width, height } or null if the format is unrecognized/corrupt —
// callers must fall back to a documented default, never crash the feature
// over a sizing detail.
function readImageDims(buffer, mimeType) {
  try {
    if (mimeType === 'image/jpeg') return jpegDims(buffer);
    if (mimeType === 'image/png') return pngDims(buffer);
    if (mimeType === 'image/webp') return webpDims(buffer);
  } catch {
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Output size — exact source aspect ratio whenever a multiple-of-16 pair can
// represent it (true for any rational ratio), anchored near a ~1MP cost/
// latency budget; only falls back to the nearest ratio the API can accept
// when the reduced ratio itself falls outside [1:3, 3:1].
const TARGET_AREA = 1024 * 1024;
const MIN_AREA = 655360;
const MAX_AREA = 8294400;
const MAX_EDGE = 3840;

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function lcm(a, b) { return (a / gcd(a, b)) * b; }

function exactRatioSize(width, height) {
  const g = gcd(width, height);
  const a = width / g;
  const b = height / g;
  const ratio = a / b;
  if (ratio < 1 / 3 || ratio > 3) return null;

  const need = (x) => 16 / gcd(x, 16);
  const s0 = lcm(need(a), need(b));
  const baseW = a * s0;
  const baseH = b * s0;

  let n = Math.max(1, Math.round(Math.sqrt(TARGET_AREA / (baseW * baseH))));
  let w = baseW * n;
  let h = baseH * n;
  while ((w * h < MIN_AREA || w > MAX_EDGE || h > MAX_EDGE) && w <= MAX_EDGE && h <= MAX_EDGE) { n += 1; w = baseW * n; h = baseH * n; }
  while (w * h > MAX_AREA && n > 1) { n -= 1; w = baseW * n; h = baseH * n; }
  if (w > MAX_EDGE || h > MAX_EDGE || w * h < MIN_AREA || w * h > MAX_AREA) return null;
  return { width: w, height: h, appliedRatio: w / h, sourceRatio: width / height, exact: true };
}

function nearestSupportedSize(width, height) {
  const rawRatio = width / height;
  const ratio = Math.min(3, Math.max(1 / 3, rawRatio));
  let h = Math.sqrt(TARGET_AREA / ratio);
  let w = h * ratio;
  w = Math.max(16, Math.round(w / 16) * 16);
  h = Math.max(16, Math.round(h / 16) * 16);
  w = Math.min(MAX_EDGE, w);
  h = Math.min(MAX_EDGE, h);
  while (w * h < MIN_AREA) { w += 16; h += 16; }
  while (w * h > MAX_AREA) { w -= 16; h -= 16; }
  return { width: w, height: h, appliedRatio: w / h, sourceRatio: rawRatio, exact: false };
}

// dims: { width, height } | null (unknown source dimensions — a documented,
// honest fallback, not a silent guess about the room's real proportions).
function pickOutputSize(dims) {
  if (!dims || !dims.width || !dims.height) {
    return { width: 1024, height: 1024, appliedRatio: 1, sourceRatio: null, exact: false, sourceDimsUnknown: true };
  }
  return exactRatioSize(dims.width, dims.height) || nearestSupportedSize(dims.width, dims.height);
}

// ---------------------------------------------------------------------------
// The one network call. Server-side only — never invoked from client code,
// and the API key never leaves this function.

class OpenAIImageError extends Error {
  constructor(code, message, extra) {
    super(message || code);
    this.code = code;
    Object.assign(this, extra);
  }
}

// source: { bytes: Buffer, mimeType: string, filename: string }
// sizeInfo: from pickOutputSize()
// Returns { bytes: Buffer, latencyMs, usage } or throws OpenAIImageError.
async function generateTidyImage(source, sizeInfo) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpenAIImageError('missing_api_key', 'OPENAI_API_KEY is not configured');

  const form = new FormData();
  form.append('model', MODEL);
  form.append('image[]', new Blob([source.bytes], { type: source.mimeType }), source.filename);
  form.append('prompt', TOPARLA_PROMPT);
  form.append('quality', QUALITY);
  form.append('size', `${sizeInfo.width}x${sizeInfo.height}`);
  form.append('output_format', OUTPUT_FORMAT);
  form.append('n', '1');

  const start = Date.now();
  let res, text;
  try {
    res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    text = await res.text();
  } catch (err) {
    throw new OpenAIImageError('network_error', err.message);
  }
  const latencyMs = Date.now() - start;

  let json = null;
  try { json = JSON.parse(text); } catch { /* handled below */ }

  if (!res.ok) {
    throw new OpenAIImageError('api_error', `OpenAI image edit failed (${res.status})`, { httpStatus: res.status, body: json || text.slice(0, 2000) });
  }
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) {
    throw new OpenAIImageError('malformed_response', 'OpenAI response did not include an image', { httpStatus: res.status });
  }
  return { bytes: Buffer.from(b64, 'base64'), latencyMs, usage: json.usage || null };
}

module.exports = {
  MODEL,
  QUALITY,
  OUTPUT_FORMAT,
  TOPARLA_PROMPT,
  readImageDims,
  pickOutputSize,
  exactRatioSize,
  nearestSupportedSize,
  generateTidyImage,
  OpenAIImageError,
};
