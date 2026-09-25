const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const swc = require('next/dist/build/swc');

test('changed application files compile without executing DB or calling services', async () => {
  await swc.loadBindings();
  for (const file of ['app/page.js', 'lib/db.js', 'lib/anthropic.js',
    'components/SestiaExperience.js', 'app/hosgeldin/page.js', 'app/giris/page.js',
    'app/admin-giris/page.js', 'app/admin/page.js', 'app/error.js', 'app/layout.js',
    'app/api/decide/route.js', 'app/api/rooms/[id]/scan/route.js', 'proxy.js',
    'app/api/access/route.js', 'app/api/admin-access/route.js', 'app/api/health/route.js',
    'app/ozel-giris/page.js', 'lib/auth.js', 'lib/identity.js']) {
    await swc.transform(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
      filename: file,
      jsc: { parser: { syntax: 'ecmascript', jsx: true }, target: 'es2022' },
      module: { type: 'commonjs' },
    });
  }
});
