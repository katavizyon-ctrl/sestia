// Pure, framework/DOM-agnostic session-lifecycle logic shared by
// components/SessionLifecycleProvider.js — kept separate from the React
// component (same reason as chatComposerClient.cjs/roomScanClient.cjs) so the
// actual activity-classification and coalescing rules are unit-testable
// without a browser. See docs/reports/SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md §4.

// Trusted, deliberate-interaction DOM event types that MAY count as
// activity — never mousemove/pointermove/hover/wheel/scroll/focus/blur/
// visibilitychange/pageshow/pagehide/timers/network responses/renders.
const ACTIVITY_EVENT_TYPES = new Set(['pointerdown', 'click', 'keydown', 'input', 'compositionend', 'change']);

// Only a genuinely trusted, non-repeat event inside the live app root counts.
// `warningDismissSelector` lets a warning-only dismiss control opt itself out
// of the classifier entirely (§12: "Exclude warning-only dismissal controls").
function isQualifyingActivityEvent(event, { appRoot, warningDismissSelector } = {}) {
  if (!event || !ACTIVITY_EVENT_TYPES.has(event.type)) return false;
  if (event.isTrusted === false) return false; // undefined (older/synthetic test events) is allowed; explicit false is not
  if (event.type === 'keydown' && event.repeat) return false;
  if (appRoot && event.target && typeof appRoot.contains === 'function' && !appRoot.contains(event.target)) return false;
  if (warningDismissSelector && event.target?.closest?.(warningDismissSelector)) return false;
  return true;
}

const REPORT_COALESCE_MS = 10000; // "at most one report per 10 seconds during continuous interaction"
const NEAR_DEADLINE_FLUSH_MS = 15000; // flush immediately within 15s of the known deadline

// Decides whether a qualifying event, arriving at `nowMs` given the last
// report was sent at `lastReportSentAtMs` (or null), should trigger an
// immediate POST /api/session/activity — event-driven, never a periodic
// heartbeat. `idleExpiresAt` (if known) forces an immediate flush near the
// deadline rather than waiting out the normal coalescing window.
function shouldSendActivityReport({ nowMs, lastReportSentAtMs, idleExpiresAt }) {
  if (typeof idleExpiresAt === 'number' && idleExpiresAt - nowMs <= NEAR_DEADLINE_FLUSH_MS) return true;
  if (lastReportSentAtMs == null) return true;
  return nowMs - lastReportSentAtMs >= REPORT_COALESCE_MS;
}

// Warning is due exactly when serverNow is within [warningAt, idleExpiresAt);
// expiry takes precedence over warning at exact equality with idleExpiresAt.
function computeLifecycleView({ lastActivityAtMs, warningAfterMs, idleTimeoutMs, serverNow }) {
  const warningAt = lastActivityAtMs + warningAfterMs;
  const idleExpiresAt = lastActivityAtMs + idleTimeoutMs;
  if (serverNow >= idleExpiresAt) return { phase: 'expired', warningAt, idleExpiresAt };
  if (serverNow >= warningAt) return { phase: 'warning', warningAt, idleExpiresAt };
  return { phase: 'active', warningAt, idleExpiresAt };
}

// Never negative, never invents extra time — render-only helper.
function remainingMs(idleExpiresAt, estimatedServerNow) {
  return Math.max(0, idleExpiresAt - estimatedServerNow);
}

const COPY = {
  guest: { title: 'Hâlâ burada mısın?', body: 'Misafir oturumun 2 dakika içinde sona erecek.' },
  account: { title: 'Hâlâ burada mısın?', body: 'Oturumun 5 dakika içinde sona erecek. Kaydedilmiş verilerin korunacak; yeniden e-postanla giriş yapman gerekecek.' },
};
function warningCopy(identityType) {
  return COPY[identityType] || COPY.guest;
}

module.exports = {
  ACTIVITY_EVENT_TYPES,
  isQualifyingActivityEvent,
  shouldSendActivityReport,
  computeLifecycleView,
  remainingMs,
  warningCopy,
  REPORT_COALESCE_MS,
  NEAR_DEADLINE_FLUSH_MS,
};
