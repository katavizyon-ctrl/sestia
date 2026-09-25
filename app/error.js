'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/telemetry';
import { Brand, PageHeading } from '@/components/SestiaExperience';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    reportError(error, window.location.pathname);
  }, [error]);

  return (
    <div className="app">
      <section className="view sestia-onboarding">
        <div className="scroll center" style={{ paddingTop: 100 }}>
          <Brand/>
          <PageHeading title="Bir şeyler yolunda gitmedi." center />
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
