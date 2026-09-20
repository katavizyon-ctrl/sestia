'use client';

import { useEffect } from 'react';
import { getDeviceId } from '@/lib/client';
import { reportError } from '@/lib/telemetry';

// React render hatalarını app/error.js zaten yakalıyor (ve kullanıcıya nazik bir
// mesaj gösteriyor). Burası, event handler'larda veya promise'lerde patlayıp
// React'in sınırlarının dışında kalan hatalar için — bunları sessizce kaydediyoruz;
// çoğu zaman uygulamayı tamamen kilitlemediği için kullanıcıya ayrıca bir şey
// göstermek gereksiz kesintiye yol açar.
export default function GlobalErrorReporter() {
  useEffect(() => {
    function onError(event) {
      reportError(getDeviceId(), event.error || event.message, window.location.pathname);
    }
    function onRejection(event) {
      reportError(getDeviceId(), event.reason, window.location.pathname);
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
