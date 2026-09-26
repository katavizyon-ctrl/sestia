// Run explicitly, then open the printed localhost URL. No DB, credentials or AI.
// The actual Page and React DOM run in a real browser; all fetches are fixtures.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { webpack } = require('next/dist/compiled/webpack/webpack');
const root = path.resolve(__dirname, '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-lifecycle-'));
const compiler = webpack({
  mode: 'development', devtool: false, context: root,
  entry: path.join(__dirname, 'fixtures/room-browser-lifecycle.js'),
  output: { path: directory, filename: 'test.js' },
  resolve: { alias: { '@': root } },
  module: { rules: [{ test: /\.js$/, exclude: /node_modules/,
    use: path.join(__dirname, 'helpers/browser-swc-loader.cjs') }] },
});
compiler.run((error, stats) => compiler.close(() => {
  if (error || stats.hasErrors()) {
    console.error(error || stats.toString({ all: false, errors: true })); process.exitCode = 1; cleanup(); return;
  }
  const bundle = fs.readFileSync(path.join(directory, 'test.js'));
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.url === '/test.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle); return; }
    if (req.url.startsWith('/sestia/')) { res.writeHead(204); res.end(); return; }
    if (req.url.startsWith('/api/')) { res.writeHead(500); res.end('Unexpected real API call'); return; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><meta charset="utf-8"><title>SESTIA isolated React lifecycle test</title><h1>Isolated React lifecycle regression</h1><pre id="result">RUNNING</pre><div id="root"></div><script src="/test.js"></script>');
  });
  server.listen(3002, '127.0.0.1', () => console.log('Browser tests: http://127.0.0.1:3002/?case=success and ?case=failure (also &idle=1)'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { cleanup(); process.exit(); }));
}));
function cleanup() {
  const resolved = path.resolve(directory);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('sestia-lifecycle-')) throw new Error('Unsafe cleanup path');
  fs.rmSync(resolved, { recursive: true, force: true });
}
