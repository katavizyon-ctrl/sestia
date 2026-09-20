'use client';

import { useState } from 'react';
import { CameraIcon, StarIcon, CheckIcon, REC_META } from '@/components/icons';

const ACTION_ORDER = ['tut', 'sat', 'bagisla', 'geri_donustur', 'at'];

function StepRow({ icon, title, text }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div className="flamewrap-compact" style={{ flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.4, marginTop: 2 }}>{text}</div>
      </div>
    </div>
  );
}

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
        <div className="scroll" style={{ paddingTop: 36 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img src="/icon.svg" alt="" width={56} height={56} style={{ borderRadius: 14 }} />
            <h1 style={{ fontSize: 25, fontWeight: 600, textAlign: 'center' }}>Lyra</h1>
            <div className="muted" style={{ textAlign: 'center', maxWidth: 300, lineHeight: 1.5, fontSize: 13.5 }}>
              Evindeki eşyalara tek tek bakıp karar vermene yardım eden bir uygulama.
              Bir fotoğraf çek, yapay zeka bir öneri sunsun — kararı hep sen verirsin.
            </div>
          </div>

          <div className="roomchips" style={{ justifyContent: 'center', marginTop: 18 }}>
            {ACTION_ORDER.map((key) => {
              const m = REC_META[key];
              return (
                <div
                  key={key}
                  className="roomchip"
                  style={{ background: `var(--${m.varName}-tint)`, color: `var(--${m.varName})`, display: 'flex', gap: 6, alignItems: 'center' }}
                >
                  <m.Icon style={{ width: 13, height: 13 }} />
                  {m.label}
                </div>
              );
            })}
          </div>

          <div className="card" style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="label" style={{ color: 'var(--text-muted)' }}>Nasıl Çalışır?</div>
            <StepRow
              icon={<CameraIcon style={{ width: 18, height: 18 }} />}
              title="1. Fotoğrafını çek"
              text="Bir eşyayı ya da bütün bir odayı — kamerayla ya da galeriden."
            />
            <StepRow
              icon={<StarIcon style={{ width: 18, height: 18 }} />}
              title="2. Yapay zeka önersin"
              text="Tut, sat, bağışla, geri dönüştür ya da at — kısa bir gerekçeyle birlikte."
            />
            <StepRow
              icon={<CheckIcon style={{ width: 18, height: 18 }} />}
              title="3. Sen karar ver"
              text="Öneriyi onayla ya da kendi kararını seç, kaydedilsin."
            />
          </div>

          <div className="muted" style={{ marginTop: 16, textAlign: 'center', fontSize: 12, lineHeight: 1.5 }}>
            Bu, küçük bir gruba özel açılmış erken bir test sürümü. Ne düşündüğün bizim için çok
            değerli — uygulama içindeki geri bildirim butonunu kullanmaktan çekinme.
          </div>

          <form onSubmit={submit} style={{ width: '100%', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="label" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Devam etmek için erişim kodu</div>
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
