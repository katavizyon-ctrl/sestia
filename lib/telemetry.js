// Telemetri ve hata raporlama: ana akışı asla bozmamalı, bu yüzden her şey
// fire-and-forget ve try/catch ile sarılı.

// Kimlik artik client'tan gonderilmiyor — sunucu, cookie/oturumdan kendi
// cozuyor (bkz. lib/identity.js). Buradan sadece eventType/payload gidiyor.
export function logEvent(eventType, payload) {
  try {
    fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, payload }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // yut
  }
}

export function reportError(error, screen) {
  try {
    fetch('/api/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error?.message || String(error) || 'bilinmeyen hata',
        stack: error?.stack || '',
        screen,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // yut
  }
}
