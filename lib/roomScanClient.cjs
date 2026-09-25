// Shared transport; an error never means a write definitely failed.
async function write(fetcher, roomId, method, body) {
  const response = await fetcher(`/api/rooms/${roomId}/scan`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, protocol: 2 }),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'scan_failed'), { status: response.status });
  return result;
}
async function read(fetcher, roomId, key) {
  const response = await fetcher(`/api/rooms/${roomId}/scan?sessionKey=${encodeURIComponent(key || '')}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('read_failed');
  return response.json();
}
function errorMessage(error) {
  return error.message === 'client_upgrade_required'
    ? 'Uygulama güncellendi. Sayfayı yenileyip odayı yeniden aç.'
    : 'İstek sonucu kesinleşmedi veya kayıt başka bir işlemle değişti. Sunucudaki kaydı kontrol et; kaydedilmemiş seçimlerin bu ekranda korunuyor.';
}
module.exports = { write, read, errorMessage };
