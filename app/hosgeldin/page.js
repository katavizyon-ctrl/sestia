'use client';

import { REC_META } from '@/components/icons';

const ACTION_ORDER = ['tut', 'sat', 'bagisla', 'geri_donustur', 'at'];

export default function HosgeldinPage() {
  return (
    <div className="app">
      <section className="view">
        <div className="scroll" style={{ paddingTop: 44, gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <img src="/icon.svg" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
            <h1 style={{ fontSize: 27, fontWeight: 600, textAlign: 'center', lineHeight: 1.25 }}>
              Evini adım adım,<br />birlikte sadeleştirelim.
            </h1>
          </div>

          <div style={{ textAlign: 'center', fontSize: 14.5, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
            Dolaptaki, çekmecedeki ya da o köşede duran bir eşyaya ne yapacağına karar vermek
            bazen yorucu olabilir. Biz bunu kolaylaştırmak istedik: bir fotoğraf çek, yapay zeka
            sana dürüst bir öneri sunsun — kararı hep sen verirsin.
          </div>

          <div className="roomchips" style={{ justifyContent: 'center' }}>
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

          <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Bu erken bir test sürümü</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Birkaç dakikanı ayırıp denemen bizim için gerçekten kıymetli. Aklına takılan her şeyi
              uygulama içindeki geri bildirim butonuyla bize ulaştırabilirsin.
            </div>
          </div>

          <button
            className="btn-primary"
            style={{ marginTop: 4 }}
            onClick={() => { window.location.href = '/giris'; }}
          >
            Hadi Başlayalım
          </button>
        </div>
      </section>
    </div>
  );
}
