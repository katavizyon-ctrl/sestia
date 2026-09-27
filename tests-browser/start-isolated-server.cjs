// Prepares and starts an isolated `next dev` instance for the Playwright
// suite — same technique as tests/guest-onboarding-e2e.test.cjs's Node-only
// harness (isolated temp copy, its own empty database, no real credentials),
// just kept as its own script so Playwright's `webServer` can run it directly.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const PORT = process.env.SESTIA_BROWSER_TEST_PORT || '3005';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-browser-e2e-'));
for (const name of ['app', 'lib', 'components', 'public', 'SESTIA_BILGI_KUTUPHANESI', 'package.json', 'next.config.mjs', 'jsconfig.json', 'proxy.js']) {
  fs.cpSync(path.join(root, name), path.join(directory, name), { recursive: true });
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'junction');

const env = { ...process.env, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
  AUTH_SECRET: 'sestia-browser-e2e-only-not-production', ACCESS_CODE: 'e2e',
  ADMIN_ACCESS_CODE: 'e2e-admin', ANTHROPIC_API_KEY: 'isolated-no-real-key', EMAIL_LOGIN_REQUIRED: '1',
  SESTIA_SESSION_POLICY: 'staging-idle-v2',
  RESEND_API_KEY: 're_isolated_not_a_real_key', AUTH_EMAIL_FROM: 'SESTIA Browser E2E <e2e@example.test>' };

const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(PORT)],
  { cwd: directory, env, stdio: 'inherit' });

function cleanup() {
  child.kill();
  try { fs.rmSync(directory, { recursive: true, force: true }); } catch {}
}
process.on('exit', cleanup);
process.on('SIGTERM', () => { cleanup(); process.exit(); });
process.on('SIGINT', () => { cleanup(); process.exit(); });
