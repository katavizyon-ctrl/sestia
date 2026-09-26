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
const guest = id => ({ identityType: 'guest', identityId: id, name: null, emailReady: true, streak: 0, points: 0, totalDecisions: 0 });

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
    await until(() => screen() === 'discover', 'app after guest start');
    await open(guest('11111111-1111-4111-8111-111111111111'));
    await until(() => screen() === 'home', 'refresh goes straight to the app');
    check(heading() === 'Merhaba, Ayşe.', `name kept after refresh: ${heading()}`);
  },
  async 'Welcome -> Misafir olarak devam et -> isim verme -> uygulama; refresh keeps identity'() {
    localStorage.clear();
    await open(guest('22222222-2222-4222-8222-222222222222'));
    await anonymousToMethod();
    noBrokenName();
    button('Misafir olarak devam et').click();
    await until(() => screen() === 'discover', 'app after anonymous guest start');
    noBrokenName();
    await open(guest('22222222-2222-4222-8222-222222222222'));
    await until(() => screen() === 'home', 'refresh goes straight to the app');
    check(heading() === 'Merhaba.', `neutral greeting: ${heading()}`);
    noBrokenName();
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
  async 'existing account is never sent to onboarding'() {
    localStorage.clear();
    await open({ identityType: 'account', identityId: 'account-1', name: 'Hesap', emailReady: true, streak: 0, points: 0, totalDecisions: 0 });
    await until(() => screen() === 'home', 'account home');
    check(heading() === 'Merhaba, Hesap.', `account name: ${heading()}`);
  },
  async 'account without a name gets the neutral greeting'() {
    await open({ identityType: 'account', identityId: 'account-2', name: null, emailReady: true, streak: 0, points: 0, totalDecisions: 0 });
    await until(() => screen() === 'home', 'account home');
    check(heading() === 'Merhaba.', `neutral: ${heading()}`);
    noBrokenName();
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
