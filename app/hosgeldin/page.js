'use client';
import { Brand, PageHeading } from '@/components/SestiaExperience';

export default function HosgeldinPage() {
  async function handleStart() {
    // Yerel gelistirmede (NODE_ENV !== 'production') paylasimli erisim
    // kodu ekranini (/giris) hic gostermiyoruz — dogrudan /api/access'i
    // cagirip devam ediyoruz. O rota, production disinda kodu hic
    // sormadan gecerli sayiyor (bkz. app/api/access/route.js) — bu blok
    // production build'inde (NODE_ENV==='production') ASLA calismiyor,
    // orada davranis tamamen degismeden /giris'e yonlendiriyor.
    if (process.env.NODE_ENV !== 'production') {
      try {
        await fetch('/api/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: '' }),
        });
      } catch {}
      window.location.href = '/';
      return;
    }
    window.location.href = '/giris';
  }

  return <div className="app"><section className="view sestia-onboarding sestia-welcome"><div className="scroll">
    <Brand hero/>
    <PageHeading title="Etrafına bir bak." center>Evinde, ofisinde, “yaşam alanım” dediğin her yerde, birlikte yeni olasılıklar keşfedebiliriz.</PageHeading>
    <p className="sestia-intro-copy">Düzenlemeden yerleşime,<br/>dekorasyondan organizasyona…<br/>Seninle birlikte düşünmek,<br/>denemek ve yaratmak için buradayım.</p>
    <button className="btn-primary" onClick={handleStart}>Hadi Başlayalım <span aria-hidden="true">→</span></button>
    <p className="sestia-signature">Bir oda. Bir eşya. Sonsuz fikir.</p>
  </div></section></div>;
}
