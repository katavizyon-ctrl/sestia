const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const swc = require('next/dist/build/swc');
const roomItemSources = require('../lib/roomItemSources.cjs');

async function component() {
  await swc.loadBindings();
  const page = fs.readFileSync(path.join(__dirname, '../app/page.js'), 'utf8');
  const start = page.indexOf('function RoomReviewView(');
  const body = page.slice(start, page.indexOf('function CelebrationView(', start));
  const compiled = await swc.transform(body, {
    filename: 'room-history.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, target: 'es2022' },
  });
  const ctx = { React, useRef: React.useRef, useEffect: React.useEffect, roomItemSources,
    BackIcon: () => null, CloseIcon: () => null, SaveScanToRoom: () => null,
    ASSISTANT_NAME: 'Sestia', ACTION_ORDER: ['sat','tut'], REC_META: { sat: { label: 'Sat', Icon: () => null }, tut: { label: 'Tut', Icon: () => null } },
  };
  vm.createContext(ctx); vm.runInContext(compiled.code, ctx);
  return ctx.RoomReviewView;
}
const base = { id: 'item-1', label: 'Koltuk', recommendation: 'tut', reasoning: 'Son konuşma gerekçesi',
  category: 'Mobilya', manual: true, excluded: false,
  modelSuggestion: { recommendation: 'sat', reasoning: 'İlk model gerekçesi' } };

test('history renders original model source and final decision distinctly', async () => {
  const View = await component();
  const html = renderToStaticMarkup(React.createElement(View, {
    photos: [], messages: [], items: [base], finalItems: [base], readOnly: true,
  }));
  assert.match(html, /Sestia&#x27;nın ilk önerisi: Sat/);
  assert.match(html, /Kararın: Tut/);
  assert.match(html, /İlk model gerekçesi/);
  assert.doesNotMatch(html, /Sestia&#x27;nın ilk önerisi: Tut/);
});
test('legacy history labels missing model source without guessing', async () => {
  const View = await component();
  const html = renderToStaticMarkup(React.createElement(View, {
    photos: [], messages: [], items: [{ ...base, modelSuggestion: null }], readOnly: true,
  }));
  assert.match(html, /Kayıtlı son öneri — özgün kaynağı doğrulanamıyor: Tut/);
  assert.doesNotMatch(html, /ilk önerisi: Tut/);
});
test('unsaved draft is visibly unsaved and confirmation stays disabled', async () => {
  const View = await component();
  const html = renderToStaticMarkup(React.createElement(View, {
    photos: [], messages: [], items: [base], draftDirty: true, scanSaved: false,
  }));
  assert.match(html, /taslak henüz kaydedilmedi/);
  assert.match(html, /Taslak Seçimlerini Kaydet/);
  assert.match(html, /disabled=""[^>]*>Tümünü Onayla/);
});

test('closed history shows correct status and final exclusion controls card appearance', async () => {
  const View = await component();
  const render = extra => renderToStaticMarkup(React.createElement(View, { photos: [], messages: [], items: [base], readOnly: true, ...extra }));
  assert.match(render({ closed: true, closeReason: 'unconfirmed' }), /Onaylanmadan kapatıldı\./);
  assert.match(render({ closed: true, closeReason: 'legacy_unknown' }), /Eski tarama kapatıldı — onay durumu bilinmiyor/);
  assert.match(render({ finalItems: [{ ...base, excluded: true }] }), /roomcard excluded/);
  assert.match(render({ draftItems: [base] }), /Kaydedilmiş taslak: Tut — henüz onaylanmadı/);
});

test('legacy active scan has close action, no editable choices and no retry/save warnings', async () => {
  const View = await component();
  const html = renderToStaticMarkup(React.createElement(View, {
    photos: [], messages: [], items: [{ ...base, modelSuggestion: null }], legacyApprovalUnknown: true, onCloseScan() {},
  }));
  assert.match(html, /Bu eski taramayı kapat/);
  assert.doesNotMatch(html, /roomcard-actionbtn|Tekrar Dene|Taslak Seçimlerini Kaydet/);
  assert.match(html, /disabled=""[^>]*>Tümünü Onayla/);
});

test('selection buttons actually render and are locked during writes', async () => {
  const View = await component();
  const html = renderToStaticMarkup(React.createElement(View, { photos: [], messages: [], items: [base], scanSaving: true }));
  assert.equal((html.match(/class="roomcard-actionbtn[^>]*disabled=""/g) || []).length, 2);
});

async function saveScanToRoom() {
  await swc.loadBindings();
  const page = fs.readFileSync(path.join(__dirname, '../app/page.js'), 'utf8');
  const start = page.indexOf('function SaveScanToRoom(');
  const body = page.slice(start, page.indexOf('\nfunction ', start + 1));
  const compiled = await swc.transform(body, {
    filename: 'save-scan.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, target: 'es2022' },
  });
  const ctx = { React, useState: React.useState };
  vm.createContext(ctx); vm.runInContext(compiled.code, ctx);
  return ctx.SaveScanToRoom;
}

test('E2E §4.1: "kaydetme yarım kaldı" appears only after a real save error', async () => {
  const View = await saveScanToRoom();
  const render = props => renderToStaticMarkup(React.createElement(View, { rooms: [], pendingRoomName: 'Salon', onSave() {}, ...props }));
  const saving = render({ saving: true, error: null });
  assert.doesNotMatch(saving, /yarım kaldı/); assert.match(saving, /“Salon” odasına kaydediliyor/);
  assert.doesNotMatch(render({ saving: true, error: 'önceki hata' }), /yarım kaldı/); // Retry in progress.
  assert.match(render({ saving: false, error: 'Kaydetme tamamlanamadı.' }), /“Salon” odasına kaydetme yarım kaldı/);
});
