'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/telemetry';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    reportError(error, window.location.pathname);
  }, [error]);

  return (
    <div className="app">
      <section className="view">
        <div className="scroll center" style={{ paddingTop: 100 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, textAlign: 'center' }}>Bir şeyler ters gitti</h1>
          <div className="muted" style={{ marginTop: 8, textAlign: 'center', maxWidth: 280 }}>
            Sorun bizde, senin bir şey yapmana gerek yok. Tekrar dener misin?
          </div>
          <button className="btn-primary" style={{ marginTop: 24, maxWidth: 220 }} onClick={() => reset()}>
            Tekrar Dene
          </button>
        </div>
      </section>
    </div>
  );
}
