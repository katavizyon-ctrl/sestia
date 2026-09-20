// Telemetri ve hata raporlama: ana akışı asla bozmamalı, bu yüzden her şey
// fire-and-forget ve try/catch ile sarılı.

export function logEvent(deviceId, eventType, payload) {
  if (!deviceId) return;
  try {
    fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, eventType, payload }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // yut
  }
}

export function reportError(deviceId, error, screen) {
  try {
    fetch('/api/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
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
