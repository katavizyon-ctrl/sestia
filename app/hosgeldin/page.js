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
    <div className="app hosgeldin-app">
      {/* Referans gorseldeki bitki golgesi — gercek bir fotograf varligimiz
          olmadigi icin (bkz. tasarim notu) dogal isik/golge hissini SVG ile
          veriyoruz, sahte bir stok gorsel/URL kullanmiyoruz. */}
      <div className="hosgeldin-shadow" aria-hidden="true">
        <svg viewBox="0 0 400 420" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M390 6 C 344 52, 318 78, 268 146 C 244 178, 232 206, 222 240" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
          <path d="M300 78 C 288 96, 270 108, 246 118" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
          <ellipse cx="352" cy="34" rx="24" ry="11" transform="rotate(18 352 34)" fill="currentColor" opacity="0.4" />
          <ellipse cx="316" cy="66" rx="27" ry="12" transform="rotate(38 316 66)" fill="currentColor" opacity="0.42" />
          <ellipse cx="278" cy="104" rx="23" ry="10" transform="rotate(52 278 104)" fill="currentColor" opacity="0.38" />
          <ellipse cx="244" cy="144" rx="20" ry="9" transform="rotate(64 244 144)" fill="currentColor" opacity="0.34" />
          <ellipse cx="226" cy="192" rx="18" ry="8" transform="rotate(74 226 192)" fill="currentColor" opacity="0.3" />
          <ellipse cx="252" cy="92" rx="16" ry="7" transform="rotate(10 252 92)" fill="currentColor" opacity="0.3" />
        </svg>
      </div>

      <section className="view">
        <div className="scroll center hosgeldin-scroll">
          <div className="hosgeldin-logo">
            <img src="/icon.svg" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
            <h1 className="hosgeldin-title">BİR ODA. BİR EŞYA.</h1>
          </div>

          <div className="hosgeldin-copy">
            <div className="hosgeldin-lead">Etrafına bir bak.</div>
            <div className="hosgeldin-question">Her şey tam da istediğin gibi mi?</div>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              Belki değiştirmek istediğin bir şey vardır. Belki de henüz ne olduğunu bilmiyorsundur.
            </div>
            <div className="hosgeldin-invite">Birlikte keşfedebiliriz.</div>
          </div>

          <button className="hosgeldin-cta" onClick={handleStart}>
            <span>Hadi Başlayalım</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  );
}
