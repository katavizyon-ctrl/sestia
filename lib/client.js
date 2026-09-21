const LAST_ROOM_KEY = 'boba_last_room';
const USER_NAME_KEY = 'boba_user_name';
const USER_NAME_GUEST_ID_KEY = 'boba_user_name_guest_id';

// Kullanıcının en son etiketlediği oda: bir sonraki eşyada ön-seçili gelsin diye.
export function getLastRoom() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_ROOM_KEY);
}

export function setLastRoom(room) {
  if (typeof window === 'undefined') return;
  if (room) {
    window.localStorage.setItem(LAST_ROOM_KEY, room);
  } else {
    window.localStorage.removeItem(LAST_ROOM_KEY);
  }
}

// Misafir ismi, kaydedildigi ANDAKI misafir kimlik id'siyle birlikte
// saklanir — guest_session cerezi silinip yeniden olusursa (ya da farkli
// bir Private/Incognito oturumu farkli bir kimlik getirirse) eski isim
// YENI kimlige otomatik devrolmasin diye. currentGuestId verilirse,
// saklanan isim SADECE o kimlik icin kaydedilmisse donuyor; eslesmiyorsa
// (farkli/bilinmeyen bir misafir) null donuyor.
export function getUserName(currentGuestId) {
  if (typeof window === 'undefined') return null;
  const name = window.localStorage.getItem(USER_NAME_KEY);
  if (!name) return null;
  if (currentGuestId) {
    const storedGuestId = window.localStorage.getItem(USER_NAME_GUEST_ID_KEY);
    if (storedGuestId !== currentGuestId) return null;
  }
  return name;
}

export function setUserName(name, guestId) {
  if (typeof window === 'undefined') return;
  const clean = (name || '').trim();
  if (clean) {
    window.localStorage.setItem(USER_NAME_KEY, clean);
    if (guestId) window.localStorage.setItem(USER_NAME_GUEST_ID_KEY, guestId);
  } else {
    window.localStorage.removeItem(USER_NAME_KEY);
    window.localStorage.removeItem(USER_NAME_GUEST_ID_KEY);
  }
}

// Fotoğrafı yüklemeden önce küçültür: hem yükleme hızını hem analiz
// güvenilirliğini artırır (telefon kameraları 10MB+ üretebiliyor).
export function compressImage(file, maxDimension = 1440, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('compress_failed'));
          resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_load_failed'));
    };
    img.src = url;
  });
}
