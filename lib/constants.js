// Asistanin adi — tek merkezden yonetiliyor, ileride tekrar degisirse
// sadece burasi guncellenir. (public/manifest.json bu sabiti import
// edemiyor, statik bir dosya oldugu icin orada ayrica elle senkron
// tutuluyor — bkz. o dosyadaki not.)
export const ASSISTANT_NAME = 'Sestia';

export const ROOM_OPTIONS = ['Mutfak', 'Yatak Odası', 'Salon', 'Banyo', 'Ev Ofisi', 'Balkon/Teras', 'Diğer'];
export const DEFAULT_ROOM = 'Genel';
export const MAX_ROOM_PHOTOS = 6;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB — telefon kameralarının üst sınırının üzerinde bir pay
