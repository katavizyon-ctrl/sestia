'use client';

import { useState } from 'react';

export default function GirisPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) throw new Error('wrong_code');
      window.location.href = '/';
    } catch {
      setError('Kod yanlış görünüyor, tekrar dener misin?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <section className="view">
        <div className="scroll center" style={{ paddingTop: 100 }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, textAlign: 'center' }}>Bir Oda, Bir Karar</h1>
          <div className="muted" style={{ marginTop: 6, textAlign: 'center' }}>
            Bu, test grubuna açık kapalı bir sürüm. Erişim kodunu gir.
          </div>

          <form onSubmit={submit} style={{ width: '100%', marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              inputMode="text"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Erişim kodu"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '14px 16px',
                borderRadius: 14,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 16,
              }}
            />
            {error && <div className="errbox">{error}</div>}
            <button className="btn-primary" type="submit" disabled={busy || !code.trim()}>
              {busy ? 'Kontrol ediliyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
