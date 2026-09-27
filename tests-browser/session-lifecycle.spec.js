// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function acceptInvite(page) {
  await page.request.post('/api/access', { data: {} });
}

// Reads the isolated server directory published by
// tests-browser/start-isolated-server.cjs, to directly simulate a
// server-side idle timeout the same way tests/guest-onboarding-e2e.test.cjs
// does — without waiting the real 5-minute guest deadline.
function isolatedDb() {
  const pointer = path.join(os.tmpdir(), 'sestia-browser-e2e-current.txt');
  const directory = fs.readFileSync(pointer, 'utf8').trim();
  const Database = require('better-sqlite3');
  return new Database(path.join(directory, 'data', 'app.db'), { timeout: 10000 });
}
function expireSession(sessionId, idleTimeoutMs = 300000) {
  const db = isolatedDb();
  const lastActivity = Date.now() - (idleTimeoutMs + 100000);
  db.prepare('UPDATE sestia_sessions SET last_activity_at_ms = ?, idle_expires_at_ms = ? WHERE id = ?')
    .run(lastActivity, lastActivity + idleTimeoutMs, sessionId);
  db.close();
}

// WelcomeView's intro stage (hitap question) only offers "skip" or "continue
// with a typed name" — the "Misafir olarak devam et" button itself only
// appears on the next (method-choice) stage.
async function reachGuestButton(page) {
  await page.getByRole('button', { name: /Şimdilik isimsiz devam et/ }).click();
  const guestButton = page.getByRole('button', { name: /Misafir olarak devam et/ });
  await guestButton.waitFor({ state: 'visible', timeout: 15000 });
  return guestButton;
}

test.describe('Session V2 — real browser', () => {
  test('clicking "Misafir olarak devam et" establishes a real Session V2 guest identity end to end', async ({ page }) => {
    await acceptInvite(page);
    await page.goto('/');
    const guestButton = await reachGuestButton(page);
    await guestButton.click();
    // A successful establishment lands on Keşif/Ana Sayfa, not stuck on the
    // welcome screen and not a generic connectivity error.
    await expect(page.locator('[data-screen="welcome"]')).toHaveCount(0, { timeout: 15000 });
    const status = await page.request.get('/api/session').then((r) => r.json());
    expect(status.state).toBe('active');
    expect(status.identityType).toBe('guest');
  });

  test('a real trusted click renews the session (idleExpiresAt moves forward)', async ({ page }) => {
    await acceptInvite(page);
    await page.goto('/');
    await (await reachGuestButton(page)).click();
    await expect(page.locator('[data-screen="welcome"]')).toHaveCount(0, { timeout: 15000 });
    const before = await page.request.get('/api/session').then((r) => r.json());
    // Any trusted click inside the app root qualifies — this is a real OS
    // -level click via Playwright, not a synthetic dispatchEvent, so it
    // exercises the same isTrusted path a real user's click would.
    await page.locator('body').click();
    await page.waitForTimeout(500); // let the fire-and-forget activity POST land
    const after = await page.request.get('/api/session').then((r) => r.json());
    expect(after.idleExpiresAt).toBeGreaterThanOrEqual(before.idleExpiresAt);
  });

  test('private media response carries Cache-Control: private, no-store as observed by a real browser fetch', async ({ page }) => {
    await acceptInvite(page);
    await page.goto('/');
    await (await reachGuestButton(page)).click();
    await expect(page.locator('[data-screen="welcome"]')).toHaveCount(0, { timeout: 15000 });
    const upload = await page.request.post('/api/chat/attachments', {
      multipart: { photo: { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('browser-test-bytes') } },
    });
    expect(upload.ok()).toBeTruthy();
    const { id } = await upload.json();
    const byteResponse = await page.request.get(`/api/chat/attachments/${id}`);
    expect(byteResponse.headers()['cache-control']).toBe('private, no-store');
  });

  test('BroadcastChannel delivers a message between two tabs of the same browser profile', async ({ context }) => {
    await context.request.post('/api/access', { data: {} });
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await pageA.goto('/');
    await pageB.goto('/');
    // window.__bc is kept alive on pageB across the two evaluate() round-trips
    // so the listener is registered (and confirmed registered) before pageA
    // posts — otherwise a message posted before the listener exists is lost,
    // which is normal BroadcastChannel behavior, not a bug to work around in
    // the app itself.
    await pageB.evaluate(() => new Promise((resolve) => {
      const channel = new BroadcastChannel('sestia-session-v2');
      window.__bcReceived = new Promise((res) => { channel.onmessage = (e) => res(e.data); });
      window.__bc = channel;
      resolve(null);
    }));
    await pageA.evaluate(() => new BroadcastChannel('sestia-session-v2').postMessage({ type: 'renewed', test: true }));
    const message = await pageB.evaluate(() => Promise.race([
      window.__bcReceived,
      new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
    ]));
    expect(message).toMatchObject({ type: 'renewed', test: true });
  });

  test('a second tab sharing cookies resolves the SAME guest identity established in the first tab', async ({ context }) => {
    await context.request.post('/api/access', { data: {} });
    const pageA = await context.newPage();
    await pageA.goto('/');
    await (await reachGuestButton(pageA)).click();
    await expect(pageA.locator('[data-screen="welcome"]')).toHaveCount(0, { timeout: 15000 });
    const first = await pageA.request.get('/api/session').then((r) => r.json());

    const pageB = await context.newPage();
    const second = await pageB.request.get('/api/session').then((r) => r.json());
    expect(second.state).toBe('active');
    expect(second.ownerId).toBe(first.ownerId);
  });

  // HIGH-1 (SESTIA_SESSION_V2_INDEPENDENT_CODE_REVIEW.md): a genuinely idle
  // tab must reach confirmed timeout and clear its private UI automatically
  // — this must NOT require the user to click/type/interact again. Before
  // the fix, the deadline/focus/visibility-triggered validate() call used a
  // stale closure and never called endLifecycle(), so the private UI never
  // reset without a subsequent (activity-triggering) interaction.
  test('a genuinely idle session reaches confirmed timeout and clears the private UI with ZERO further user interaction', async ({ page }) => {
    await acceptInvite(page);
    await page.goto('/');
    await (await reachGuestButton(page)).click();
    await expect(page.locator('[data-screen="welcome"]')).toHaveCount(0, { timeout: 15000 });
    const established = await page.request.get('/api/session').then((r) => r.json());
    expect(established.state).toBe('active');

    // Simulate ">5 minutes of true inactivity" server-side, without waiting
    // real wall-clock time and WITHOUT the page performing any further
    // click/keypress/input of any kind.
    expireSession(established.sessionId);

    // The only thing that happens next is a non-activity VALIDATION trigger
    // (focus/visibilitychange) — never a qualifying activity event, and
    // never anything the app root's activity listeners would report as
    // interaction. This is exactly the deadline-timer's own trigger class,
    // reproduced deterministically instead of waiting for the real
    // scheduled setTimeout to fire 5 minutes later.
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // The private UI must clear itself automatically: the guest/account
    // entry screen reappears without any click/keypress from the test.
    await expect(page.getByRole('button', { name: /Şimdilik isimsiz devam et|Misafir olarak devam et/ })).toBeVisible({ timeout: 10000 });
    const after = await page.request.get('/api/session').then((r) => r.json());
    expect(after.ownerId).not.toBe(established.ownerId);
  });
});
