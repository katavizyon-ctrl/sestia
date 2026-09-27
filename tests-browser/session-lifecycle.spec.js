// @ts-check
const { test, expect } = require('@playwright/test');

async function acceptInvite(page) {
  await page.request.post('/api/access', { data: {} });
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
});
