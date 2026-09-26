const test = require('node:test');
const assert = require('node:assert/strict');
const openaiImage = require('../lib/openaiImage.cjs');

// Minimal, hand-built (not decodable) image headers — just enough bytes for
// the dimension readers to find what they look for, nothing else.
function fakePng(width, height) {
  const buf = Buffer.alloc(24);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buf.write('IHDR', 12);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}
function fakeJpeg(width, height) {
  return Buffer.from([
    0xff, 0xd8, // SOI
    0xff, 0xc0, // SOF0
    0x00, 0x11, // segment length (unused by the parser)
    0x08, // precision
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0, 0, 0, 0, 0, 0, 0, 0,
  ]);
}
function fakeWebpVp8x(width, height) {
  const w1 = width - 1, h1 = height - 1;
  const payload = Buffer.from([
    0, 0, 0, 0,
    w1 & 0xff, (w1 >> 8) & 0xff, (w1 >> 16) & 0xff,
    h1 & 0xff, (h1 >> 8) & 0xff, (h1 >> 16) & 0xff,
  ]);
  const header = Buffer.alloc(20);
  header.write('RIFF', 0);
  header.writeUInt32LE(20 + payload.length - 8, 4);
  header.write('WEBP', 8);
  header.write('VP8X', 12);
  header.writeUInt32LE(payload.length, 16);
  return Buffer.concat([header, payload]);
}

test('readImageDims reads png, jpeg (SOF0) and webp (VP8X) headers', () => {
  assert.deepEqual(openaiImage.readImageDims(fakePng(1080, 1440), 'image/png'), { width: 1080, height: 1440 });
  assert.deepEqual(openaiImage.readImageDims(fakeJpeg(1080, 1440), 'image/jpeg'), { width: 1080, height: 1440 });
  assert.deepEqual(openaiImage.readImageDims(fakeWebpVp8x(1080, 1440), 'image/webp'), { width: 1080, height: 1440 });
});

test('readImageDims returns null instead of throwing on garbage input', () => {
  assert.equal(openaiImage.readImageDims(Buffer.from('not an image'), 'image/jpeg'), null);
  assert.equal(openaiImage.readImageDims(Buffer.alloc(2), 'image/png'), null);
  assert.equal(openaiImage.readImageDims(Buffer.alloc(2), 'image/webp'), null);
});

test('pickOutputSize preserves a representable source ratio exactly', () => {
  // 1080x1440 reduces to 3:4 exactly.
  const size = openaiImage.pickOutputSize({ width: 1080, height: 1440 });
  assert.equal(size.exact, true);
  assert.equal(size.width / size.height, 3 / 4);
  assert.equal(size.width % 16, 0);
  assert.equal(size.height % 16, 0);
  // Stays near the ~1MP cost/latency budget, not the 8.3MP ceiling.
  assert.ok(size.width * size.height < 1_200_000, 'unexpectedly large output for a ~1MP target');
});

test('pickOutputSize is exact for a landscape ratio too', () => {
  const size = openaiImage.pickOutputSize({ width: 1440, height: 1080 });
  assert.equal(size.exact, true);
  assert.equal(size.width / size.height, 4 / 3);
});

test('pickOutputSize falls back to the nearest ratio the API can accept for an extreme panorama', () => {
  const size = openaiImage.pickOutputSize({ width: 5000, height: 400 }); // ratio 12.5, API max is 3:1
  assert.equal(size.exact, false);
  assert.ok(size.appliedRatio <= 3, `applied ratio ${size.appliedRatio} exceeds the API's 3:1 limit`);
  assert.equal(size.width % 16, 0);
  assert.equal(size.height % 16, 0);
});

test('pickOutputSize never exceeds the API size/area constraints', () => {
  for (const dims of [{ width: 1, height: 1 }, { width: 4000, height: 4000 }, { width: 21, height: 9 }]) {
    const size = openaiImage.pickOutputSize(dims);
    assert.ok(size.width <= 3840 && size.height <= 3840, `edge too large for ${JSON.stringify(dims)}`);
    assert.ok(size.width * size.height >= 655360 && size.width * size.height <= 8294400, `area out of bounds for ${JSON.stringify(dims)}`);
  }
});

test('pickOutputSize falls back to a documented default when dimensions are unknown', () => {
  const size = openaiImage.pickOutputSize(null);
  assert.deepEqual(size, { width: 1024, height: 1024, appliedRatio: 1, sourceRatio: null, exact: false, sourceDimsUnknown: true });
});

test('the locked edit instruction is present verbatim, with the tidy != redesign contract intact', () => {
  assert.match(openaiImage.TOPARLA_PROMPT, /Only tidy and organize the existing room/);
  assert.match(openaiImage.TOPARLA_PROMPT, /Do not redesign or redecorate the room/);
  assert.match(openaiImage.TOPARLA_PROMPT, /Do not replace the furniture/);
  assert.match(openaiImage.TOPARLA_PROMPT, /same position after someone carefully tidied this exact room/);
  assert.equal(openaiImage.MODEL, 'gpt-image-2.5-sunburst');
  assert.equal(openaiImage.QUALITY, 'medium');
});
