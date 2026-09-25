// SESTIA KÜTÜPHANESİ
//
// Karakter / Kütüphane / Canlı asistan ayrımı (bkz. görev brief'i, Bölüm 1):
// - Karakter çekirdeği: SESTIA_VOICE_COMPASS — Sestia'nın tutarlı yaklaşımı
//   ve sesi. Bu dosyada GENİŞLETİLMİYOR, sadece referans olarak tutuluyor.
// - Sestia Kütüphanesi (bu dosya): belirli karşılaşmalar için hazırlanmış,
//   düzenlenebilir, zamanla büyüyen bir içerik kaynağı. Rastgele bir cümle
//   seçen bir mekanizma DEĞİL — karakterin sesini taşıyan, editoryal olarak
//   seçilmiş bir koleksiyon.
// - Canlı asistan davranışı: kullanıcının gerçek girdilerine/fotoğraflarına
//   verilen bağlama uygun karşılıklar — bkz. lib/anthropic.js (analiz/sohbet
//   akışları), BURADA DEĞİL.
//
// Bu üçünü tek bir rastgele metin listesine indirgememek için: mevcut Ana
// Sayfa mesaj sistemi (lib/homeMessages.js) kasıtlı olarak DOKUNULMADAN
// bırakıldı — o, zaten gerçek çalışması olan kullanıcının HomeView'ında
// kullanılmaya devam ediyor. Bu dosya SADECE Keşif deneyimi için, YENİ ve
// AYRI bir içerik kaynağı.

export const SESTIA_VOICE_COMPASS = `
Davet et, emir verme. Merak uyandır, yapay gizem yaratma.
İlham ver, kullanıcı adına karar verme. Bildiğini hatırla,
bilmediğini biliyormuş gibi davranma.
`.trim();

// A — KARŞILAMALAR (12/12, brief'te verildiği gibi birebir)
export const SESTIA_GREETINGS = [
  { id: 1, ton: 'dogrudan_davet', metin: 'Birlikte neler yapabileceğimize bakmaya ne dersin?' },
  { id: 2, ton: 'dogrudan_davet', metin: 'Şimdi birlikte neler yapabileceğimize bakalım mı?' },
  { id: 3, ton: 'merak', metin: 'Yaşam alanınla ilgili neler yapabileceğimizi merak ediyor musun?' },
  { id: 4, ton: 'davet', metin: 'Etrafında değiştirmek istediğin bir şey var mı?\nBirlikte düşünebiliriz.' },
  { id: 5, ton: 'kararsizlikta_destek', metin: 'Nereden başlayacağına henüz karar vermedin mi?\nBirlikte keşfedebiliriz.' },
  { id: 6, ton: 'ozgur_secim', metin: 'Bir odadan mı, küçük bir köşeden mi, yoksa tek bir eşyadan mı başlamak istersin?' },
  { id: 7, ton: 'davet', metin: 'Aklında bir değişiklik var mı?\nNasıl yapabileceğimize birlikte bakabiliriz.' },
  { id: 8, ton: 'merak', metin: 'Elindekilerle neler yapabileceğimizi keşfetmeye ne dersin?' },
  { id: 9, ton: 'dogrudan_davet', metin: 'Yaşam alanını biraz daha sana göre hâle getirmek ister misin?' },
  { id: 10, ton: 'sicak_destekleyici', metin: 'Bazen küçücük bir değişiklik bile fark yaratabilir.\nBirlikte deneyelim mi?' },
  { id: 11, ton: 'birlikte_kesif', metin: 'İstediğin yaşam alanına giden ilk adım ne olabilir,\nbirlikte düşünelim mi?' },
  { id: 12, ton: 'kararsizlikta_destek', metin: 'Belki de nereden başlayacağına henüz karar vermedin.\nBirlikte bulabiliriz.' },
];

// B — İLHAM KIVILCIMLARI (15/15, 4 kategori, brief'te verildiği gibi birebir)
export const SESTIA_SPARKS = [
  // Başka Türlü Bakmak
  { id: 1, kategori: 'Başka Türlü Bakmak', metin: 'Ya sorun odanın küçüklüğü değil, eşyaların yeriyse?' },
  { id: 2, kategori: 'Başka Türlü Bakmak', metin: 'Uzun zamandır görmezden geldiğin bir köşe var mı?' },
  { id: 3, kategori: 'Başka Türlü Bakmak', metin: 'Bir odanın ne için kullanıldığı, ne için kullanılabileceğini belirlemek zorunda mı?' },
  { id: 4, kategori: 'Başka Türlü Bakmak', metin: 'Bazen bir şeyi değiştirmek için önce ona başka bir gözle bakmak yeterli olabilir. Ne dersin?' },
  // Elindekilerin İhtimalleri
  { id: 5, kategori: 'Elindekilerin İhtimalleri', metin: 'Belki ihtiyacın olan şeylerden biri zaten evindedir.' },
  { id: 6, kategori: 'Elindekilerin İhtimalleri', metin: 'Artık kullanmadığın bir eşya, başka bir yerde yeniden işe yarayabilir mi?' },
  { id: 7, kategori: 'Elindekilerin İhtimalleri', metin: 'Yeni bir şey almadan neleri değiştirebileceğimizi merak ediyor musun?' },
  { id: 8, kategori: 'Elindekilerin İhtimalleri', metin: 'Bir eşyanın tek bir işi olmak zorunda mı?' },
  // Küçük Başlangıçlar
  { id: 9, kategori: 'Küçük Başlangıçlar', metin: 'Bütün odayı değil, yalnızca bir köşeyi düşünsek?' },
  { id: 10, kategori: 'Küçük Başlangıçlar', metin: 'Bir çekmece, bir raf, bir masa…\nHangisiyle ilgilenmek iyi gelebilir?' },
  { id: 11, kategori: 'Küçük Başlangıçlar', metin: 'Bugün hiçbir şeyi değiştirmesek bile, neyin değişebileceğini keşfedebiliriz. İster misin?' },
  { id: 12, kategori: 'Küçük Başlangıçlar', metin: 'Büyük bir plan yapmadan küçük bir ihtimale bakmaya ne dersin?' },
  // Kullanıcının Yaşam Alanı
  { id: 13, kategori: 'Kullanıcının Yaşam Alanı', metin: 'Evinin hangi köşesinde kendini en iyi hissediyorsun?\nPeki neden?' },
  { id: 14, kategori: 'Kullanıcının Yaşam Alanı', metin: 'Yaşadığın yer bugün ihtiyaçlarına ne kadar uyuyor?' },
  { id: 15, kategori: 'Kullanıcının Yaşam Alanı', metin: 'Bir odanı tam da istediğin gibi kullanabilseydin,\norada neler yapardın?' },
];

// son gösterilen index hariç rastgele seç; havuz tek satırlıysa aynısını
// döner. lib/homeMessages.js'deki ayni-amaçlı fonksiyonla birebir ayni —
// gereksiz yere yeniden yazmamak için oradan da import edilebilirdi, ama
// bu kütüphane kasıtlı olarak o dosyaya hiç bağımlı değil (ikisi ayrı,
// bağımsız içerik kaynakları — bkz. dosya başı not).
export function pickLibraryIndex(poolLength, lastIndex) {
  if (poolLength <= 1) return 0;
  let index = Math.floor(Math.random() * (poolLength - 1));
  if (index >= lastIndex) index += 1;
  return index;
}
