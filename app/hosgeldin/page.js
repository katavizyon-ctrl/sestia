'use client';

import { REC_META } from '@/components/icons';

const ACTION_ROW_1 = ['tut', 'sat', 'bagisla'];
const ACTION_ROW_2 = ['geri_donustur', 'at'];

function ActionChip({ recKey }) {
  const m = REC_META[recKey];
  return (
    <div
      className="roomchip"
      style={{ background: `var(--${m.varName}-tint)`, color: `var(--${m.varName})`, display: 'flex', gap: 6, alignItems: 'center' }}
    >
      <m.Icon style={{ width: 13, height: 13 }} />
      {m.label}
    </div>
  );
}

export default function HosgeldinPage() {
  return (
    <div className="app">
      <section className="view">
        <div className="scroll" style={{ paddingTop: 40, gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img src="/icon.svg" alt="" width={64} height={64} style={{ borderRadius: 16 }} />
            <h1 style={{ fontSize: 27, fontWeight: 600, textAlign: 'center', lineHeight: 1.25 }}>
              Bir Oda. Bir Eşya.
            </h1>
          </div>

          <div className="muted" style={{ textAlign: 'center', fontSize: 14, lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
            Bir oda veya bir eşya seç.<br />
            Fotoğrafını çek ya da galerinden yükle.<br />
            Yapay zekâ incelesin.<br />
            Sonra birlikte değerlendirip karar verelim.
          </div>

          <div style={{ textAlign: 'center', fontSize: 15.5, fontWeight: 600, lineHeight: 1.4, maxWidth: 300, margin: '0 auto' }}>
            Tutmalı mı, satmalı mı, bağışlamalı mı?
          </div>

          <div style={{ textAlign: 'center', fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, color: 'var(--terracotta)' }}>
            Son karar her daim senin.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="roomchips" style={{ justifyContent: 'center', flexWrap: 'nowrap' }}>
              {ACTION_ROW_1.map((key) => <ActionChip key={key} recKey={key} />)}
            </div>
            <div className="roomchips" style={{ justifyContent: 'center', flexWrap: 'nowrap' }}>
              {ACTION_ROW_2.map((key) => <ActionChip key={key} recKey={key} />)}
            </div>
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
