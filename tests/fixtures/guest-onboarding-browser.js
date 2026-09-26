import React from 'react';
import { createRoot } from 'react-dom/client';
import Page from '../../app/page';

// Guest onboarding regression: the real Page in a real browser, all fetches
// are fixtures. A "refresh" unmounts and remounts Page; localStorage is kept.
const result = document.getElementById('result');
let state = null;
const unexpected = [];
const prechecks = [];
const signins = [];
const json = body => Promise.resolve({ ok: true, status: 200, json: async () => body });
window.fetch = (url, options = {}) => {
  if (url === '/api/state') return json(state);
  if (url === '/api/auth/session' || url === '/api/event') return json({});
  if (url === '/api/rooms') return json({ rooms: [] });
  if (url === '/api/inspiration') return json({});
  // Email/account flow up to the existing code screen; no email is sent.
  if (url === '/api/account/precheck') { prechecks.push(JSON.parse(options.body)); return json({ ok: true, emailReady: true }); }
  if (url === '/api/auth/csrf') return json({ csrfToken: 'fixture-csrf' });
  if (url === '/api/auth/signin/resend') { signins.push(String(options.body)); return json({ url: `${location.origin}/api/auth/verify-request?provider=resend` }); }
  unexpected.push(`${options.method || 'GET'} ${url}`);
  return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'fixture' }) });
};
// work: the /api/state fields the approved landing rule reads (lib/db.js hasStartedRealWork).
const NO_WORK = { totalDecisions: 0, hasStartedWork: false };
const guest = (id, work = NO_WORK) => ({ identityType: 'guest', identityId: id, name: null, emailReady: true, streak: 0, points: 0, ...work });
const account = (id, name, work = NO_WORK) => ({ identityType: 'account', identityId: id, name, emailReady: true, streak: 0, points: 0, ...work });
const ROOM_WORK = { totalDecisions: 0, hasStartedWork: true };
const DECISION_WORK = { totalDecisions: 2, hasStartedWork: true };

function check(condition, message) { if (!condition) throw new Error(message); }
const $root = () => document.getElementById('root');
function button(text) { return [...$root().querySelectorAll('button')].find(b => b.textContent.includes(text)); }
function screen() { return $root().querySelector('[data-screen]')?.getAttribute('data-screen'); }
function heading() { return $root().querySelector('h1')?.textContent || ''; }
async function until(predicate, description) {
  const end = performance.now() + 5000;
  while (!predicate()) {
    if (performance.now() > end) throw new Error(`Timeout: ${description} (screen=${screen()}, h1=${heading()})`);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
function type(input, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
function noBrokenName() {
  const text = $root().textContent;
  for (const bad of ['undefined', 'null', 'Merhaba, .', 'Memnun oldum, .']) check(!text.includes(bad), `broken name text: "${bad}"`);
}
let reactRoot = null;
async function open(nextState) {
  state = nextState;
  if (reactRoot) reactRoot.unmount();
  reactRoot = createRoot($root());
  reactRoot.render(<Page />);
  await until(() => screen(), 'first screen');
}
async function welcomeToGuestMethod() {
  await until(() => screen() === 'welcome' && heading().includes('Sana nasıl hitap'), 'hitap screen');
  check(button('Devam Et').disabled, 'Devam Et needs a name');
}
async function namedToMethod(name) {
  await welcomeToGuestMethod();
  type(document.getElementById('preferred-name'), name);
  await until(() => !button('Devam Et').disabled, 'Devam Et enabled');
  button('Devam Et').click();
  await methodScreen();
}
async function anonymousToMethod() {
  await welcomeToGuestMethod();
  // A half-typed name is not a given name once the person skips.
  type(document.getElementById('preferred-name'), 'Yarım');
  button('Şimdilik isimsiz devam et').click();
  await methodScreen();
}
// The hitap screen is the only name source: the email card asks for the email only.
async function methodScreen() {
  await until(() => button('Misafir olarak devam et'), 'method screen');
  check(heading() === 'Nasıl devam etmek istersin?', `method heading: ${heading()}`);
  check(!document.getElementById('signup-name'), 'duplicate hitap input in the email card');
  for (const copy of ['Tercih ettiğin hitap', 'Hesabın için bir hitap']) check(!$root().innerHTML.includes(copy), `duplicate hitap copy: ${copy}`);
  const card = document.getElementById('signup-email')?.closest('form');
  check(card && card.querySelectorAll('input').length === 1, 'email card has exactly one input');
}
// Landing must be the settled screen, not a flash before a later redirect.
async function landsOn(expected, description) {
  await until(() => screen() === expected, description);
  await new Promise(resolve => setTimeout(resolve, 150));
  check(screen() === expected, `${description}: moved on to ${screen()}`);
}
async function navTo(label) {
  const tab = [...$root().querySelectorAll('nav.sestia-nav button')].find(b => b.textContent.trim() === label);
  check(tab, `bottom navigation has ${label}`);
  tab.click();
}
// Keşif keeps its own copy: no greeting is added there.
function discoverUnchanged() {
  check(heading() === 'Birlikte bakalım.', `Keşif heading: ${heading()}`);
  check(!$root().textContent.includes('Merhaba'), 'no greeting on Keşif');
}
async function sendEmail(address) {
  type(document.getElementById('signup-email'), address);
  await until(() => !button('Giriş kodu gönder').disabled, 'send enabled with only an email');
  button('Giriş kodu gönder').click();
  await until(() => document.getElementById('signin-code'), 'existing code screen');
  check(heading() === 'E-posta yolda.', `code screen heading: ${heading()}`);
}

const cases = {
  async 'Welcome -> Misafir olarak devam et -> isim ver -> uygulama; refresh keeps the name'() {
    localStorage.clear();
    await open(guest('11111111-1111-4111-8111-111111111111'));
    await namedToMethod('  Ayşe ');
    check($root().textContent.includes('Memnun oldum, Ayşe.'), 'method stage greets by name');
    check(button('Giriş kodu gönder'), 'email option still offered');
    button('Misafir olarak devam et').click();
    await landsOn('discover', '1. new named guest, no work -> Keşif');
    discoverUnchanged();
    await open(guest('11111111-1111-4111-8111-111111111111'));
    await landsOn('discover', '5/9. returning guest / refresh, no work -> Keşif');
    await navTo('Ana sayfa');
    await landsOn('home', '11. no-work user taps Ana sayfa and stays there');
    check(heading() === 'Merhaba, Ayşe.', `name kept after refresh: ${heading()}`);
    await navTo('Keşif');
    await landsOn('discover', '12. Keşif tab works normally');
    discoverUnchanged();
  },
  async 'Welcome -> Misafir olarak devam et -> isim verme -> uygulama; refresh keeps identity'() {
    localStorage.clear();
    await open(guest('22222222-2222-4222-8222-222222222222'));
    await anonymousToMethod();
    noBrokenName();
    button('Misafir olarak devam et').click();
    await landsOn('discover', '2. new anonymous guest, no work -> Keşif');
    discoverUnchanged();
    noBrokenName();
    await open(guest('22222222-2222-4222-8222-222222222222'));
    await landsOn('discover', '5/9. returning anonymous guest / refresh, no work -> Keşif');
    await navTo('Ana sayfa');
    await landsOn('home', '11. anonymous no-work user can open Ana sayfa');
    check(heading() === 'Merhaba.', `neutral greeting: ${heading()}`);
    noBrokenName();
  },
  async '7/10. guest with real work (a room, or decisions) -> Ana Sayfa, also after refresh'() {
    for (const [id, work] of [['66666666-6666-4666-8666-666666666666', ROOM_WORK], ['77777777-7777-4777-8777-777777777777', DECISION_WORK]]) {
      localStorage.clear();
      localStorage.setItem('sestia_guest_id_confirmed', id);
      localStorage.setItem('sestia_intro_skipped', id);
      await open(guest(id, work));
      await landsOn('home', `returning guest with work ${JSON.stringify(work)}`);
      check(heading() === 'Merhaba.', `home greeting: ${heading()}`);
      await open(guest(id, work));
      await landsOn('home', 'refresh with work -> Ana Sayfa');
    }
  },
  async 'guest who finishes onboarding on an identity that already has work -> Ana Sayfa'() {
    localStorage.clear();
    await open(guest('88888888-8888-4888-8888-888888888888', ROOM_WORK));
    await anonymousToMethod();
    button('Misafir olarak devam et').click();
    await landsOn('home', 'onboarding completion follows the same rule');
  },
  async 'Hitap Ayşe -> E-posta ile devam et -> yalnız e-posta -> kod ekranı; Ayşe hesaba taşınır'() {
    localStorage.clear();
    prechecks.length = 0; signins.length = 0;
    await open(guest('44444444-4444-4444-8444-444444444444'));
    await namedToMethod('Ayşe');
    await sendEmail('ayse@example.test');
    check(prechecks.length === 1 && prechecks[0].flow === 'signup' && prechecks[0].name === 'Ayşe' && prechecks[0].email === 'ayse@example.test',
      `onboarding name carried to the account flow: ${JSON.stringify(prechecks)}`);
    check(signins.length === 1 && new URLSearchParams(signins[0]).get('email') === 'ayse@example.test', 'existing code sign-in started');
  },
  async 'Şimdilik isimsiz -> E-posta ile devam et -> yalnız e-posta -> isim yüzünden bloklanmaz'() {
    localStorage.clear();
    prechecks.length = 0; signins.length = 0;
    await open(guest('55555555-5555-4555-8555-555555555555'));
    await anonymousToMethod();
    await sendEmail('isimsiz@example.test');
    check(prechecks.length === 1 && prechecks[0].name === '', `no name invented: ${JSON.stringify(prechecks)}`);
    check(signins.length === 1, 'code sign-in started without a name');
    noBrokenName();
  },
  async 'a new guest identity does not inherit the previous guest name or skip'() {
    await open(guest('33333333-3333-4333-8333-333333333333'));
    await welcomeToGuestMethod();
    check(document.getElementById('preferred-name').value === '', 'no inherited name');
  },
  // A new account and a returning account arrive the same way: the code
  // sign-in reloads the page and /api/state reports the account.
  async '3/6. named account (new or returning), no work -> Keşif; never onboarding'() {
    localStorage.clear();
    await open(account('account-1', 'Hesap'));
    await landsOn('discover', 'named account without work -> Keşif');
    discoverUnchanged();
    await navTo('Ana sayfa');
    await landsOn('home', 'account can open Ana sayfa');
    check(heading() === 'Merhaba, Hesap.', `account name: ${heading()}`);
  },
  async '4/6. anonymous account (new or returning), no work -> Keşif; neutral greeting on Ana Sayfa'() {
    await open(account('account-2', null));
    await landsOn('discover', 'anonymous account without work -> Keşif');
    noBrokenName();
    await navTo('Ana sayfa');
    await landsOn('home', 'account can open Ana sayfa');
    check(heading() === 'Merhaba.', `neutral: ${heading()}`);
    noBrokenName();
  },
  async '8/10. account with real work -> Ana Sayfa, also after refresh'() {
    for (const work of [ROOM_WORK, DECISION_WORK]) {
      await open(account('account-3', 'Hesap', work));
      await landsOn('home', `account with work ${JSON.stringify(work)}`);
      check(heading() === 'Merhaba, Hesap.', `account name: ${heading()}`);
      await open(account('account-3', 'Hesap', work));
      await landsOn('home', 'refresh with work -> Ana Sayfa');
    }
  },
};

(async () => {
  const lines = [];
  for (const [name, run] of Object.entries(cases)) {
    try { await run(); lines.push(`PASS ${name}`); } catch (error) { lines.push(`FAIL ${name}: ${error.message}`); console.error(error); }
  }
  if (unexpected.length) lines.push(`NOTE unmocked requests: ${[...new Set(unexpected)].join(', ')}`);
  result.textContent = lines.join('\n');
})();
