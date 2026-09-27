// Real-browser coverage for the small slice of Session V2 behavior Node-only
// tests structurally cannot prove: multi-tab BroadcastChannel coordination,
// actual browser Cache-Control receipt, and OS-level trusted interaction.
// See docs/reports/SESTIA_SESSION_V2_AND_VISITOR_OBSERVABILITY_IMPLEMENTATION_REPORT.md
// for why this is a deliberately small, targeted suite rather than the full
// architecture's 58-scenario matrix. Never calls a live AI/email/geo provider.
const PORT = 3005;

module.exports = {
  testDir: './tests-browser',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
  },
  webServer: {
    command: `node tests-browser/start-isolated-server.cjs`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120000,
    env: { SESTIA_BROWSER_TEST_PORT: String(PORT) },
  },
};
