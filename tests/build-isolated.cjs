// Optional integration check: node tests/build-isolated.cjs
// Never copy credentials, data, git state or the existing .next directory.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-build-'));
function fingerprints() {
  return ['app.db', 'app.db-wal', 'app.db-shm'].map(name => {
    const file = path.join(root, 'data', name);
    return fs.existsSync(file) ? createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
  });
}
const before = fingerprints();
let status = 1;
try {
  for (const name of ['app', 'lib', 'components', 'public', 'SESTIA_BILGI_KUTUPHANESI',
    'package.json', 'package-lock.json', 'next.config.mjs', 'jsconfig.json', 'proxy.js']) {
    fs.cpSync(path.join(root, name), path.join(directory, name), { recursive: true });
  }
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'junction');
  const block = path.join(directory, 'block-network.cjs');
  fs.writeFileSync(block, "globalThis.fetch = async () => { throw new Error('Network disabled in isolated build'); };\n");
  const env = {};
  for (const key of ['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','TEMP','TMP','COMSPEC','ComSpec']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, { NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    AUTH_SECRET: 'isolated-build-only-not-a-real-secret', ANTHROPIC_API_KEY: 'isolated-not-a-real-key',
    NODE_OPTIONS: `--require "${block.replaceAll('\\', '/')}"` });
  console.log('Building copied sources with an empty temporary data directory; no real credentials.');
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], {
    cwd: directory, env, stdio: 'inherit', timeout: 180000,
  });
  if (result.error) console.error(result.error.message);
  status = result.status ?? 1;
  assert.deepEqual(fingerprints(), before, 'real DB files must remain unchanged');
  console.log('Real DB/WAL/SHM fingerprints unchanged.');
} finally {
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith('sestia-build-'));
  // Remove junction itself first; never recurse into workspace dependencies.
  const junction = path.join(resolved, 'node_modules');
  if (fs.existsSync(junction)) fs.rmdirSync(junction);
  fs.rmSync(resolved, { recursive: true, force: true });
}
process.exitCode = status;
