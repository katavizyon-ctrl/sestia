'use client';

import { useState } from 'react';

// Owner-only Admin login: the same Auth.js + Resend 6-digit email code the
// app uses, prepared by POST /api/admin-login and returning to /admin. No
// invite code, no onboarding, no guest choice.
const SEND_ERRORS = {
  not_admin_owner: 'Bu adres yönetici hesabı değil.',
  too_many_attempts: 'Çok fazla deneme yapıldı. Birkaç dakika sonra yeniden dene.',
};

// Same normalization as the app's code screen (Auth.js's default
// normalizer), so the callback's email matches the stored token.
function normalizeEmail(raw) {
  const [local = '', domain = ''] = raw.normalize('NFKC').trim().toLowerCase().split('@');
  return `${local}@${domain.split(',')[0]}`;
}

export default function AdminOwnerLoginForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('email'); // email | code
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function sendCode(e) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const prep = await fetch('/api/admin-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }),
      });
      if (!prep.ok) {
        const body = await prep.json().catch(() => ({}));
        setError(SEND_ERRORS[body.error] || 'Kod gönderilemedi. Tekrar dener misin?');
        return;
      }
      const { csrfToken } = await (await fetch('/api/auth/csrf')).json();
      const res = await fetch('/api/auth/signin/resend', {
        method: 'POST',
        // Makes Auth.js answer with JSON {url} instead of a redirect, so a
        // failed send is detectable (same as the app's email screen).
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
        body: new URLSearchParams({ email: normalizeEmail(email), csrfToken, callbackUrl: '/admin', json: 'true' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || (data?.url && new URL(data.url, window.location.origin).searchParams.get('error'))) {
        setError('Kod gönderilemedi. Tekrar dener misin?');
        return;
      }
      setStage('code');
    } catch {
      setError('Kod gönderilemedi. Tekrar dener misin?');
    } finally {
      setBusy(false);
    }
  }

  function submitCode(e) {
    e.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    // Relative on purpose: Auth.js accepts a relative callbackUrl under its
    // own base URL regardless of which host name the request arrived on.
    const params = new URLSearchParams({ callbackUrl: '/admin', token: code, email: normalizeEmail(email) });
    window.location.assign(`/api/auth/callback/resend?${params}`);
  }

  if (stage === 'code') {
    return <form className="sestia-form" onSubmit={submitCode}>
      <p className="muted" style={{ textAlign: 'center' }}>{email.trim()} adresine 6 haneli bir giriş kodu gönderdik.</p>
      <label htmlFor="admin-login-code">Giriş kodu</label>
      <input id="admin-login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code}
        onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="123456" autoFocus disabled={busy}/>
      <button className="btn-primary" disabled={busy||code.length!==6}>{busy?'Giriş yapılıyor…':'Panele giriş yap →'}</button>
      <button type="button" className="btn-outline" onClick={()=>{setStage('email');setCode('');setError(null);}} disabled={busy}>E-posta adresini değiştir</button>
    </form>;
  }
  return <form className="sestia-form" onSubmit={sendCode}>
    <label htmlFor="admin-login-email">Sahibi e-posta adresi</label>
    <input id="admin-login-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@email.com" disabled={busy}/>
    {error && <div role="alert" className="errbox">{error}</div>}
    <button className="btn-primary" disabled={busy||!email.trim()}>{busy?'Gönderiliyor…':'Giriş kodu gönder →'}</button>
  </form>;
}
