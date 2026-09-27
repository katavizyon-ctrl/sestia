const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyUserAgent } = require('../lib/userAgentClass.cjs');

test('classifies common desktop/mobile/tablet browsers correctly (coarse fields only)', () => {
  assert.deepEqual(
    classifyUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'),
    { deviceClass: 'mobile', os: 'iOS', osVersion: '17', browser: 'Safari', browserVersion: '17' },
  );
  assert.deepEqual(
    classifyUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'),
    { deviceClass: 'mobile', os: 'Android', osVersion: '14', browser: 'Chrome', browserVersion: '126' },
  );
  assert.deepEqual(
    classifyUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'),
    { deviceClass: 'desktop', os: 'Windows', osVersion: '10.0', browser: 'Edge', browserVersion: '126' },
  );
  assert.deepEqual(
    classifyUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'),
    { deviceClass: 'desktop', os: 'macOS', osVersion: '10.15', browser: 'Safari', browserVersion: '17' },
  );
  assert.deepEqual(
    classifyUserAgent('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1').deviceClass,
    'tablet',
  );
});

test('missing/empty/garbage User-Agent degrades to unknown, never throws', () => {
  assert.deepEqual(classifyUserAgent(''), { deviceClass: 'unknown', os: null, osVersion: null, browser: null, browserVersion: null });
  assert.deepEqual(classifyUserAgent(undefined), { deviceClass: 'unknown', os: null, osVersion: null, browser: null, browserVersion: null });
  assert.deepEqual(classifyUserAgent(null), { deviceClass: 'unknown', os: null, osVersion: null, browser: null, browserVersion: null });
  const bot = classifyUserAgent('SomeBot/1.0');
  assert.equal(bot.deviceClass, 'desktop');
  assert.equal(bot.os, 'other');
  assert.equal(bot.browser, 'other');
});

test('produces only coarse, low-entropy fields — never a fingerprinting-grade shape', () => {
  const result = classifyUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36');
  assert.deepEqual(Object.keys(result).sort(), ['browser', 'browserVersion', 'deviceClass', 'os', 'osVersion'].sort());
  assert.equal(result.browserVersion, '126', 'only the major version is kept, not the full 126.0.0.0 string');
});
