'use client';

import { useEffect, useState } from 'react';
import { Brand, PageHeading } from '@/components/SestiaExperience';

// Auth.js hata sayfası yerine (lib/auth.js pages.error). Auth.js ?error=...
// ekler; proxy.js çok fazla denemede ?error=TooMany ile buraya yönlendirir.
const MESSAGES = {
  Verification: 'Kod yanlış, süresi dolmuş ya da daha önce kullanılmış. Yeni bir kod isteyip tekrar dene.',
  TooMany: 'Çok fazla deneme yapıldı. Birkaç dakika sonra yeniden dene.',
  AccessDenied: 'Bu e-posta adresiyle giriş yapılamıyor.',
};

export default function GirisHatasiPage() {
  const [error, setError] = useState(null);
  useEffect(() => { setError(new URLSearchParams(window.location.search).get('error')); }, []);
  return <div className="app"><section className="view sestia-onboarding"><div className="scroll">
    <Brand hero />
    <PageHeading title="Giriş tamamlanamadı." center>{MESSAGES[error] || 'Bir şeyler ters gitti. Tekrar dener misin?'}</PageHeading>
    <button className="btn-primary" onClick={() => window.location.replace('/')}>Yeniden dene</button>
  </div></section></div>;
}
