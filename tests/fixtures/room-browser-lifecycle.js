import React from 'react';
import { createRoot } from 'react-dom/client';
import Page from '../../app/page';

const result = document.getElementById('result');
const query = new URLSearchParams(location.search);
const failure = query.get('case') === 'failure';
const idle = query.get('idle') === '1';
const pending = [];
let session = 1;
let recoveryReads = 0;
const state = { identityType: 'account', identityId: 'synthetic-browser-owner', name: 'Test', streak: 0, points: 0, totalDecisions: 0 };
const item = { id: 'item-1', label: 'Fixture Chair', category: 'Mobilya', recommendation: 'sat', manual: true, excluded: false,
  reasoning: 'Fixture', modelSuggestion: { recommendation: 'sat', reasoning: 'Fixture' } };
const json = body => Promise.resolve({ ok: true, status: 200, json: async () => body });
// Fail closed: no request may escape to a real API, telemetry service or AI.
window.fetch = (url, options = {}) => {
  if (url === '/api/state') return json(state);
  if (url === '/api/auth/session' || url === '/api/event') return json({});
  if (url === '/api/rooms') return json({ rooms: [{ id: 7, name: 'Lifecycle Room', decisionCount: 0 }] });
  if (url === '/api/rooms/7') return json({ id: 7, name: 'Lifecycle Room', photos: [], decisions: [], analyses: [],
    scanStatus: { active: true, generation: session, sessionKey: `browser-session-${session}` },
    scan: { analysisId: session, revision: 1, sessionKey: `browser-session-${session}`, photoIds: [], items: [item], messages: [] } });
  if (url === '/api/rooms/7/scan' && options.method === 'PUT') return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  if (String(url).startsWith('/api/rooms/7/scan?')) { recoveryReads++; return json({}); }
  throw new Error(`Unexpected fixture request: ${url} ${options.method || 'GET'}`);
};

function check(condition, message) { if (!condition) throw new Error(message); }
function button(text) { return [...document.querySelectorAll('#root button')].find(b => b.textContent.includes(text)); }
function screen() { return document.querySelector('[data-screen]')?.getAttribute('data-screen'); }
async function until(predicate, description) {
  const end = performance.now() + 5000;
  while (!predicate()) {
    if (performance.now() > end) throw new Error(`Timeout: ${description}`);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
async function frame() { await new Promise(resolve => setTimeout(resolve, 30)); }
async function resume() {
  await until(() => button('Lifecycle Room'), 'room card'); button('Lifecycle Room').click();
  await until(() => button('Taramaya Devam Et'), 'resume button'); button('Taramaya Devam Et').click();
  await until(() => screen() === 'room-review', 'review'); await frame();
}
async function settleOld() {
  if (failure) pending[0].reject(new Error('Synthetic old PUT failure'));
  else pending[0].resolve(await json({ state: { ...state, points: 500 }, count: 100, replayed: false }));
  await frame();
}

const root = createRoot(document.getElementById('root'));
root.render(<Page />);
(async () => {
  await resume();
  check(!button('Tümünü Onayla').disabled, 'initial confirmation must be enabled');
  button('Tümünü Onayla').click();
  await until(() => pending.length === 1, 'first PUT');
  await frame();
  // Real browser history traversal triggers Page's actual popstate effect.
  history.back();
  await until(() => screen() === 'home', 'browser-back home'); await frame();
  session++;
  await resume();
  check(!!button('Tümünü Onayla') && !button('Tümünü Onayla').disabled, 'new scan inherited old confirming state');
  if (idle) {
    await settleOld();
    check(screen() === 'room-review' && !button('Tümünü Onayla').disabled, 'old result changed idle new scan');
  }
  const nextButton = button('Tümünü Onayla');
  nextButton.click(); nextButton.click();
  await until(() => pending.length >= 2, 'new PUT');
  check(pending.length === 2, 'same-render repeated click sent duplicate PUT');
  if (!idle) await settleOld();
  check(screen() === 'room-review', 'old PUT navigated the new scan');
  check(!!button('Kaydediliyor...')?.disabled, 'old cleanup unlocked new pending confirmation');
  check(recoveryReads === 0, 'old PUT failure started recovery in new session');
  pending[1].resolve(await json({ state: { ...state, points: 5, totalDecisions: 1 }, count: 1, replayed: true }));
  await until(() => screen() === 'celebration', 'new confirmation completion');
  result.textContent = `PASS: real React + browser popstate; old ${failure ? 'failure' : 'success'}; ${idle ? 'idle then pending' : 'pending'} new scan; double click; replayed confirmation. PUT count=2, stale recovery reads=0.`;
})().catch(error => { result.textContent = `FAIL: ${error.message}`; console.error(error); });
