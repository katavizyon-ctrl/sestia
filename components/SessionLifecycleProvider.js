'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import sessionClient from '@/lib/sessionClient.cjs';

const { isQualifyingActivityEvent, shouldSendActivityReport, remainingMs, warningCopy, ACTIVITY_EVENT_TYPES } = sessionClient;

const BROADCAST_CHANNEL_NAME = 'sestia-session-v2';
const STORAGE_NOTIFY_KEY = 'sestia_session_v2_notify';
const ESTABLISH_LOCK_NAME = 'sestia-session-establish';

const SessionLifecycleContext = createContext(null);

// The ONE place this app captures "true user activity" and talks to the
// Session V2 endpoints. Everything else (app/page.js, SestiaExperience.js)
// reads lifecycle state from this provider's context rather than trusting a
// localStorage guest-id heuristic or an implicit cookie the way the pre-V2
// app did.
export function SessionLifecycleProvider({ children, onLifecycleEnded }) {
  const [status, setStatusState] = useState({ state: 'unknown', identityType: null, ownerId: null });
  const [warningVisible, setWarningVisible] = useState(false);
  const familyRevisionRef = useRef(null);
  const lastReportSentAtRef = useRef(null);
  const deadlineTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const lifecycleTokenRef = useRef(0); // bumped on every confirmed transition; in-flight work checks it before acting
  const channelRef = useRef(null);
  // Mirrors `status` for reads from callbacks that must stay referentially
  // stable across renders (scheduleTimers/validate below are captured ONCE,
  // at mount, by effects with an empty dependency array — reading `status`
  // directly from those closures would silently see stale, mount-time values
  // forever, which previously meant the deadline/focus/visibility/broadcast
  // -triggered validation could never detect "was active, now expired" and
  // so never called endLifecycle(). Reading statusRef.current instead always
  // sees the true current status, regardless of which render's closure runs.
  const statusRef = useRef(status);
  const setStatus = useCallback((next) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const endLifecycle = useCallback((reason) => {
    lifecycleTokenRef.current += 1;
    setWarningVisible(false);
    setStatus({ state: 'session_required', identityType: null, ownerId: null });
    if (channelRef.current) { try { channelRef.current.postMessage({ type: 'ended', reason }); } catch {} }
    try { localStorage.setItem(STORAGE_NOTIFY_KEY, JSON.stringify({ type: 'ended', reason, ts: Date.now() })); } catch {}
    onLifecycleEnded?.(reason);
  }, [onLifecycleEnded, setStatus]);

  const scheduleTimers = useCallback((warningAt, idleExpiresAt, serverNow) => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (deadlineTimerRef.current) clearTimeout(deadlineTimerRef.current);
    if (typeof warningAt !== 'number' || typeof idleExpiresAt !== 'number') return;
    const localSkew = Date.now() - serverNow;
    const warningDelay = Math.max(0, warningAt + localSkew - Date.now());
    const deadlineDelay = Math.max(0, idleExpiresAt + localSkew - Date.now());
    warningTimerRef.current = setTimeout(() => setWarningVisible(true), warningDelay);
    // The timer only triggers a VALIDATION, never itself an expiry decision —
    // a suspended tab cannot run JS at the exact deadline anyway, so the real
    // enforcement is server-side; this just makes an awake tab check promptly.
    deadlineTimerRef.current = setTimeout(() => { validate(); }, deadlineDelay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyActiveStatus = useCallback((data) => {
    setStatus({ state: 'active', identityType: data.identityType, ownerId: data.ownerId });
    setWarningVisible(Boolean(data.warning));
    scheduleTimers(data.warningAt, data.idleExpiresAt, data.serverNow);
  }, [scheduleTimers]);

  // Non-renewing status read — used at mount, on visibility/focus/pageshow
  // return, and near the locally-scheduled deadline. Never reports activity.
  // Reads statusRef.current (never the `status` state variable directly) so
  // this function can stay referentially stable — see statusRef above.
  const validate = useCallback(async () => {
    const myToken = lifecycleTokenRef.current;
    let res;
    try { res = await fetch('/api/session'); } catch { return; }
    if (myToken !== lifecycleTokenRef.current) return; // a newer lifecycle superseded this validation
    const data = await res.json().catch(() => null);
    if (!data) return;
    const current = statusRef.current;
    if (data.state === 'active') {
      const rotated = current.ownerId && data.ownerId && current.ownerId !== data.ownerId;
      applyActiveStatus(data);
      if (rotated) endLifecycle('rotated');
    } else if (current.state === 'active') {
      endLifecycle(data.state);
    } else {
      setStatus({ state: data.state, identityType: data.identityType || null, ownerId: null });
    }
  }, [applyActiveStatus, endLifecycle, setStatus]);

  // Establishes the browser coordination scope and reads initial status.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const boot = await fetch('/api/session/bootstrap', { method: 'POST' }).then((r) => r.json());
        if (!cancelled) familyRevisionRef.current = boot.familyRevision ?? 0;
      } catch {}
      if (!cancelled) validate();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Explicit guest entry — the only way a guest session is created.
  const establishGuest = useCallback(async () => {
    const run = async () => {
      const creationKey = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      let entryPath = null, utmSource = null, utmMedium = null, utmCampaign = null;
      try {
        entryPath = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        utmSource = params.get('utm_source'); utmMedium = params.get('utm_medium'); utmCampaign = params.get('utm_campaign');
      } catch {}
      const res = await fetch('/api/session/guest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyRevision: familyRevisionRef.current ?? 0, creationKey, entryPath, utmSource, utmMedium, utmCampaign }),
      });
      if (!res.ok) {
        // A stale revision (session_replaced) — re-bootstrap and let the
        // caller retry rather than silently minting a second identity.
        const boot = await fetch('/api/session/bootstrap', { method: 'POST' }).then((r) => r.json()).catch(() => null);
        if (boot) familyRevisionRef.current = boot.familyRevision ?? familyRevisionRef.current;
        throw new Error('guest_establish_failed');
      }
      const data = await res.json();
      applyActiveStatus(data);
      return data;
    };
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      return navigator.locks.request(ESTABLISH_LOCK_NAME, run);
    }
    return run();
  }, [applyActiveStatus]);

  // Activity reporting: capture-phase listeners on the six trusted event
  // types, coalesced client-side, sent only while a session is active.
  useEffect(() => {
    const appRoot = document.body;
    function handle(event) {
      if (status.state !== 'active') return;
      if (!isQualifyingActivityEvent(event, { appRoot })) return;
      const now = Date.now();
      // Coalescing only decides local send cadence; the server independently
      // re-derives and enforces the real deadline on every accepted report.
      if (!shouldSendActivityReport({ nowMs: now, lastReportSentAtMs: lastReportSentAtRef.current })) return;
      lastReportSentAtRef.current = now;
      const myToken = lifecycleTokenRef.current;
      fetch('/api/session/activity', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: event.type, eventAt: now }),
      }).then(async (res) => {
        if (myToken !== lifecycleTokenRef.current) return;
        if (!res.ok) { endLifecycle('idle'); return; }
        const data = await res.json();
        setWarningVisible(Boolean(data.warning));
        scheduleTimers(data.warningAt, data.idleExpiresAt, data.serverNow);
        if (channelRef.current) { try { channelRef.current.postMessage({ type: 'renewed', warningAt: data.warningAt, idleExpiresAt: data.idleExpiresAt }); } catch {} }
      }).catch(() => {});
    }
    const types = [...ACTIVITY_EVENT_TYPES];
    types.forEach((t) => document.addEventListener(t, handle, { capture: true }));
    return () => types.forEach((t) => document.removeEventListener(t, handle, { capture: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.state, endLifecycle, scheduleTimers]);

  // Visibility/focus/pageshow/BFCache restore: VALIDATE, never renew.
  useEffect(() => {
    function onVisible() { if (document.visibilityState === 'visible') validate(); }
    function onFocus() { validate(); }
    function onPageshow() { validate(); }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageshow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageshow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Multi-tab coordination: BroadcastChannel primary, storage-event fallback.
  // Messages carry only non-secret lifecycle metadata, never cookies/content,
  // and never themselves authorize anything — every receipt still validates.
  useEffect(() => {
    let channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (e) => {
        if (e.data?.type === 'ended') endLifecycle('remote');
        else if (e.data?.type === 'renewed') validate();
      };
    }
    function onStorage(e) {
      if (e.key !== STORAGE_NOTIFY_KEY || !e.newValue) return;
      try {
        const msg = JSON.parse(e.newValue);
        if (msg.type === 'ended') endLifecycle('remote');
        else if (msg.type === 'renewed') validate();
      } catch {}
    }
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      channel?.close();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/session/logout', { method: 'POST' }).catch(() => {});
    endLifecycle('logout');
  }, [endLifecycle]);

  const warning = warningVisible ? warningCopy(status.identityType) : null;

  return (
    <SessionLifecycleContext.Provider value={{ status, establishGuest, validate, logout, lifecycleToken: lifecycleTokenRef }}>
      {warning && (
        <div className="sestia-session-warning" role="status" aria-live="polite">
          <strong>{warning.title}</strong> {warning.body}
        </div>
      )}
      {children}
    </SessionLifecycleContext.Provider>
  );
}

export function useSessionLifecycle() {
  return useContext(SessionLifecycleContext);
}
