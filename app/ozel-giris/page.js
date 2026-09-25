'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Brand, PageHeading } from '@/components/SestiaExperience';

export default function PrivateSignIn() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  async function submit(event) {
    event.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const result = await signIn('resend', { email: email.trim(), redirect: false, redirectTo: '/' });
      setStatus(result?.ok && !result?.error ? 'sent' : 'error');
    } catch { setStatus('error'); }
  }
  return <div className="app"><section className="view sestia-onboarding"><div className="scroll">
    <Brand hero />
    <PageHeading title="Sana özel bir alan." center>SESTIA şu anda yalnızca sahibine açık.</PageHeading>
    {status === 'sent' ? <div className="sestia-form" role="status"><p>Giriş bağlantın e-posta adresine gönderildi. Gelen kutunu ve spam klasörünü kontrol et.</p><button className="btn-primary" onClick={() => setStatus('idle')}>Geri dön</button></div> :
      <form className="sestia-form" onSubmit={submit}>
        <label htmlFor="private-email">E-posta adresin</label>
        <input id="private-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={status === 'sending'} placeholder="E-posta adresini yaz" />
        {status === 'error' && <p className="errbox" role="alert">Giriş bağlantısı gönderilemedi. İzin verilen e-posta adresini kontrol edip tekrar dene.</p>}
        <button className="btn-primary" disabled={status === 'sending'}>{status === 'sending' ? 'Gönderiliyor…' : 'Giriş bağlantısı gönder →'}</button>
      </form>}
    <p className="sestia-signature">Yaşam alanında, hep yanında.</p>
  </div></section></div>;
}
