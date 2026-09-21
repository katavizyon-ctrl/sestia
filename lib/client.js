const LAST_ROOM_KEY = 'boba_last_room';
const USER_NAME_KEY = 'boba_user_name';

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

// Not: bu şu an sadece okunuyor — kullanıcıya adını soran bir ekran/akış henüz yok.
// Biri eklenirse setUserName() ile buraya yazması yeterli, kutlama ekranı zaten hazır.
export function getUserName() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(USER_NAME_KEY);
}

export function setUserName(name) {
  if (typeof window === 'undefined') return;
  const clean = (name || '').trim();
  if (clean) {
    window.localStorage.setItem(USER_NAME_KEY, clean);
  } else {
    window.localStorage.removeItem(USER_NAME_KEY);
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
