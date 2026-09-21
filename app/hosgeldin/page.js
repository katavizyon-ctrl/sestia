'use client';

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

  return (
    <div className="app">
      <section className="view">
        <div className="scroll center" style={{ paddingTop: 60, gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <img src="/icon.svg" alt="" width={64} height={64} style={{ borderRadius: 16 }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }}>BİR ODA. BİR EŞYA.</h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300, textAlign: 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.4 }}>Etrafına bir bak.</div>
            <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.4 }}>Her şey tam da istediğin gibi mi?</div>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              Belki değiştirmek istediğin bir şey vardır. Belki de henüz ne olduğunu bilmiyorsundur.
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>Birlikte keşfedebiliriz.</div>
          </div>

          <button className="btn-primary" onClick={handleStart} style={{ marginTop: 12 }}>
            Hadi Başlayalım
          </button>
        </div>
      </section>
    </div>
  );
}
