// Small, deterministic, dependency-free User-Agent classifier. Produces only
// coarse, low-entropy fields (device class, OS, browser, major version) —
// deliberately NOT a fingerprinting library. Order matters: more specific
// checks (e.g. Edge, which also contains "Chrome" and "Safari" tokens) must
// run before their more generic siblings.
function classifyUserAgent(ua) {
  const s = typeof ua === 'string' ? ua : '';

  let deviceClass = 'unknown';
  if (/ipad|tablet(?!.*mobile)|kindle|playbook|nexus (7|9|10)/i.test(s)) deviceClass = 'tablet';
  else if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(s)) deviceClass = 'mobile';
  else if (s) deviceClass = 'desktop';

  let os = null;
  let osVersion = null;
  let m;
  if ((m = s.match(/windows nt ([\d.]+)/i))) { os = 'Windows'; osVersion = m[1]; }
  else if (/mac os x/i.test(s) && !/iphone|ipad|ipod/i.test(s)) {
    os = 'macOS';
    const v = s.match(/mac os x ([\d_]+)/i);
    if (v) osVersion = v[1].replace(/_/g, '.').split('.').slice(0, 2).join('.');
  } else if ((m = s.match(/iphone os ([\d_]+)/i)) || (m = s.match(/cpu os ([\d_]+)/i))) { os = 'iOS'; osVersion = m[1].split('_')[0]; }
  else if ((m = s.match(/android ([\d.]+)/i))) { os = 'Android'; osVersion = m[1].split('.')[0]; }
  else if (/cros /i.test(s)) os = 'ChromeOS';
  else if (/linux/i.test(s)) os = 'Linux';
  else if (s) os = 'other';

  let browser = null;
  let browserVersion = null;
  if ((m = s.match(/edg\/([\d.]+)/i))) { browser = 'Edge'; browserVersion = m[1].split('.')[0]; }
  else if ((m = s.match(/opr\/([\d.]+)/i)) || (m = s.match(/opera[/ ]([\d.]+)/i))) { browser = 'Opera'; browserVersion = m[1].split('.')[0]; }
  else if ((m = s.match(/firefox\/([\d.]+)/i))) { browser = 'Firefox'; browserVersion = m[1].split('.')[0]; }
  else if ((m = s.match(/chrome\/([\d.]+)/i)) || (m = s.match(/crios\/([\d.]+)/i))) { browser = 'Chrome'; browserVersion = m[1].split('.')[0]; }
  else if ((m = s.match(/version\/([\d.]+).*safari/i))) { browser = 'Safari'; browserVersion = m[1].split('.')[0]; }
  else if (/safari/i.test(s)) browser = 'Safari';
  else if (s) browser = 'other';

  return { deviceClass, os, osVersion: osVersion || null, browser, browserVersion: browserVersion || null };
}

module.exports = { classifyUserAgent };
