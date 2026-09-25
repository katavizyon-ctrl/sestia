'use client';

import { useState } from 'react';
import { Brand, PageHeading } from '@/components/SestiaExperience';
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

  return <div className="app"><section className="view sestia-onboarding"><div className="scroll"><Brand hero/><PageHeading title="Hoş geldin." center>Sestia’nın erken erişim deneyimine davetlisin.</PageHeading>
    <form onSubmit={submit} className="sestia-form"><label htmlFor="invite-code">Davet kodun</label><input id="invite-code" type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Kodunu yaz" autoComplete="off" disabled={busy}/>{error&&<div role="alert" className="errbox">{error}</div>}<button className="btn-primary" disabled={busy||!code.trim()}>{busy?'Kontrol ediliyor…':'Devam et →'}</button></form>
    <p className="sestia-signature">Bir oda. Bir eşya. Sonsuz fikir.</p>
  </div></section></div>;
}
