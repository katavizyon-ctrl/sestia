'use client';
import { useEffect, useRef, useState } from 'react';

// "Oda Planı": hosts the tested Blueprint Lab editor (public/blueprint-lab.html)
// in a same-origin iframe and saves every change to this room's blueprint.
// The editor posts the whole model after each change; saves are debounced,
// run one at a time (so an older save can never land after a newer one),
// retry on failure, and the last unsaved change is flushed when the page is
// left.
const SAVE_DELAY_MS = 500;
const RETRY_DELAY_MS = 3000;

export default function BlueprintClient({ roomId }) {
  const frame = useRef(null);
  const [status, setStatus] = useState('Oda planı yükleniyor…');
  const [error, setError] = useState('');
  // The editor is only mounted once the plan has loaded: an iframe in the
  // server-rendered HTML would load and announce "ready" before this effect
  // listens, and that message would be lost.
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    let mounted = true;
    let loaded = null; // the model from the server, once fetched
    let roomPhotos = []; // P2: this room's photos, to place on the plan
    let ready = false; // the editor said it is listening
    let pending = null; // newest unsaved model
    let saving = false;
    let timer = null;
    const url = `/api/rooms/${encodeURIComponent(roomId)}/blueprint`;
    const post = (payload) => frame.current?.contentWindow?.postMessage(payload, location.origin);
    const initialize = () => { if (ready && loaded) post({ type: 'sestia:blueprint:load', model: loaded, photos: roomPhotos }); };
    const put = (model, extra) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model }), ...extra });

    async function load() {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw Error(response.status === 401 ? 'Oturumun kapanmış. Lütfen yeniden giriş yap.' : 'Bu odanın planını açamadım.');
        const data = await response.json();
        if (!mounted) return;
        loaded = data.model;
        roomPhotos = (data.roomPhotos || []).map((id) => ({ id, url: `/api/rooms/${encodeURIComponent(roomId)}/photos/${id}` }));
        setStatus(data.updatedAt ? 'Kayıtlı plan yüklendi.' : 'Yeni plan hazır.');
        setShowEditor(true);
        initialize();
      } catch (e) {
        if (mounted) { setError(e.message || 'Bu odanın planını açamadım.'); setStatus(''); }
      }
    }

    async function save() {
      timer = null;
      if (saving || !pending) return;
      const snapshot = pending;
      pending = null;
      saving = true;
      try {
        const response = await put(snapshot);
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        if (mounted && !pending) { setStatus('Plan kaydedildi.'); post({ type: 'sestia:blueprint:saved' }); }
      } catch {
        if (!pending) pending = snapshot; // a newer change wins over the failed one
        if (mounted) {
          setStatus('Kaydedilemedi, yeniden deniyorum…');
          post({ type: 'sestia:blueprint:error' });
          timer = setTimeout(save, RETRY_DELAY_MS);
        }
      } finally {
        saving = false;
        if (mounted && pending && !timer) timer = setTimeout(save, SAVE_DELAY_MS);
      }
    }

    function flush() {
      if (!pending) return;
      // keepalive lets the request finish while the page goes away.
      put(pending, { keepalive: true }).catch(() => {});
      pending = null;
    }

    function onMessage(e) {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === 'sestia:blueprint:ready') { ready = true; initialize(); }
      if (e.data?.type === 'sestia:blueprint:change' && loaded) {
        pending = e.data.model;
        setStatus('Kaydediliyor…');
        clearTimeout(timer);
        timer = setTimeout(save, SAVE_DELAY_MS);
      }
    }

    window.addEventListener('message', onMessage);
    window.addEventListener('pagehide', flush);
    load();
    return () => {
      mounted = false;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [roomId]);

  return <main style={{ minHeight: '100vh', background: '#eef3ee', color: '#213c30' }}>
    <nav style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#fff' }}>
      <a href="/" style={{ color: '#286e50', textDecoration: 'none', fontWeight: 600 }}>← SESTIA</a>
      <strong>Oda Planı</strong>
      <span role="status" aria-live="polite" style={{ fontSize: 12 }}>{status}</span>
    </nav>
    {error ? <div role="alert" style={{ margin: 24, padding: 18, background: '#fff4ed', borderRadius: 8 }}>{error}</div> : showEditor &&
      <iframe ref={frame} src="/blueprint-lab.html?embedded=1" title="Oda Planı düzenleyicisi" style={{ width: '100%', height: 'calc(100vh - 60px)', border: 0, display: 'block' }} />}
  </main>;
}
