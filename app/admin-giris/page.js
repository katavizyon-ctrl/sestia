'use client';

import { useState } from 'react';
import { Brand, PageHeading } from '@/components/SestiaExperience';

export default function AdminGirisPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.status === 429) {
        setError('Çok fazla deneme yapıldı. Birkaç dakika sonra yeniden deneyebilirsin.');
        return;
      }
      if (!res.ok) throw new Error('wrong_code');
      window.location.href = '/admin';
    } catch {
      setError('Kod yanlış görünüyor, tekrar dener misin?');
    } finally {
      setBusy(false);
    }
  }

  return <div className="app"><section className="view sestia-onboarding"><div className="scroll"><Brand/><PageHeading title="Sahibi Paneli" center>Yönetici erişim kodunu gir.</PageHeading><form className="sestia-form" onSubmit={submit}><label htmlFor="admin-code">Yönetici kodu</label><input id="admin-code" type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Yönetici kodu" autoComplete="off" disabled={busy}/>{error&&<div role="alert" className="errbox">{error}</div>}<button className="btn-primary" disabled={busy||!code.trim()}>{busy?'Kontrol ediliyor…':'Giriş yap →'}</button></form></div></section></div>;
}
