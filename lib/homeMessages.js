// Ana ekran mesaj sistemi — kullanıcının paylaştığı ana-ekran-mesajlari.json'dan
// birebir taşındı. 8 kategori, her biri gerçek bir davranışsal duruma göre
// tetiklenir (takvim günü değil). Her kategorinin soru_havuzu'ndaki satırlar
// haftalar/aylar boyunca dönüşümlü kullanılacak bir havuzdur.

export const CATEGORIES = {
  '01_ilk_karsilasma': {
    baslik: 'Bir eşya, bir oda.',
    alt_baslik: 'Sen seç, beraber değerlendirelim.',
    soru_havuzu: [
      { ton: 'oyunbaz', metin: 'İlk hamle senden ;)' },
      { ton: 'dogrudan_davet', metin: 'İlk olarak bir eşya seçmeye ne dersin?' },
      { ton: 'merak', metin: 'Bakalım dikkatimizi ilk ne çekecek?' },
      { ton: 'kararsizlikta_destek', metin: 'Kararsız mısın? Beraber seçelim.' },
      { ton: 'ozgur_secim', metin: 'Yaşadığın yerde gözüne takılan bir şey var mı?' },
      { ton: 'mekana_merak', metin: 'Hangi köşeden başlamak istersin?' },
      { ton: 'birlikte_kesif', metin: 'Bir eşya mı, bir oda mı? Birlikte keşfedelim mi?' },
    ],
  },
  '02_devamlilik': {
    baslik: 'Kaldığın yerden.',
    alt_baslik: 'Küçük adımlar, güzel alışkanlıklar.',
    soru_havuzu: [
      { ton: 'birlikte_odaklanma', metin: 'Bugün neye odaklanalım?' },
      { ton: 'sicak_davetkar', metin: 'Bugün birlikte neler yapabiliriz?' },
      { ton: 'merak_uyandiran', metin: 'Bakalım bugün neler dikkatimizi çekecek?' },
      { ton: 'yeni_bakis', metin: 'Bugün başka bir gözle bakalım mı?' },
      { ton: 'hafif_oyunbaz', metin: 'Bugün sırada ne var? ;)' },
      { ton: 'kucuk_kesif', metin: 'Belki bugün yeni bir ayrıntı keşfederiz.' },
      { ton: 'kontrol_kullanicida', metin: 'Bugün nereden devam etmek istersin?' },
    ],
  },
  '03_bir_adim_daha': {
    baslik: 'Bir adım daha atalım mı?',
    alt_baslik: 'Sen yeter ki iste, birlikte yaparız!',
    soru_havuzu: [
      { ton: 'dogrudan_davet', metin: 'Bugün ne yapmak istersin?' },
      { ton: 'sicak_destekleyici', metin: 'Aklını kurcalayan bir şey varsa birlikte bakalım.' },
      { ton: 'hafif_oyunbaz', metin: 'Söyle bakalım, sırada ne var? ;)' },
      { ton: 'kucuk_bir_adim', metin: 'Bu kez bir eşyaya mı, bir odaya mı odaklanalım?' },
      { ton: 'merak_uyandiran', metin: 'Bakalım bugün neler bulacağız?' },
      { ton: 'kisisel_samimi', metin: 'Aklında ne var?' },
      { ton: 'birlikte_kesif', metin: 'Bir köşenin gözden kaçan ayrıntılarına bakalım mı?' },
    ],
  },
  '04_kontrol_sende': {
    baslik: 'Patron sensin ;)',
    alt_baslik: 'Söz sende, ben hazırım!',
    soru_havuzu: [
      { ton: 'sicak_destekleyici', metin: 'Sen seç; ben hep yanındayım.' },
      { ton: 'hafif_muzip', metin: 'Talimatlarını bekliyorum, patron! ;)' },
      { ton: 'dogal_davetkar', metin: 'Sıradaki seçimin belli mi?' },
      { ton: 'kontrol_kullanicida', metin: 'Sence en çok ilgi bekleyen köşe/kenar hangisi?' },
      { ton: 'oyunbaz', metin: 'Bir eşya mı, bir oda mı? Nasıl istersen, öyle ilerleyelim.' },
      { ton: 'sakin_samimi', metin: 'Senin hızın, senin kararın.' },
      { ton: 'birlikte_ilerleme', metin: 'İstersen seçenekleri birlikte tartalım.' },
    ],
  },
  '05_kendi_ritminde': {
    baslik: 'Kendi ritminde.',
    alt_baslik: 'Yaşadığın yere biraz daha yakından bak.',
    soru_havuzu: [
      { ton: 'sakin_destekleyici', metin: 'Acele etmeden, birlikte ilerleriz.' },
      { ton: 'dogal_davetkar', metin: 'İstersen bugün odanın bir köşesine ya da kenarına göz atalım.' },
      { ton: 'sicak_oyunbaz', metin: 'Bakalım bugün neler keşfedeceğiz?' },
      { ton: 'sakin_kisisel', metin: 'Bugün ne kadarını ele almak istersin?' },
      { ton: 'hafif_muzip', metin: 'Bir ucundan tutalım mı? ;)' },
      { ton: 'merak_uyandiran', metin: 'Belki bugün gözümüze başka bir şey takılır.' },
      { ton: 'birlikte_kesif', metin: 'Bir ayrıntı seç, nereye varacağımızı birlikte görelim.' },
    ],
  },
  '06_kucuk_adimlar': {
    baslik: 'Yaşam alanını istediğin gibi iyileştiriyoruz!',
    alt_baslik: 'Küçük şeyler zamanla büyür.',
    soru_havuzu: [
      { ton: 'kucuk_bir_adim', metin: 'Bugün bir eşya seçsen, o bile yeter.' },
      { ton: 'sicak_destekleyici', metin: 'Az olsun, senin olsun.' },
      { ton: 'dogal_davetkar', metin: 'Bugün küçük bir köşeyle ilgilenmeye ne dersin?' },
      { ton: 'sakin_kisisel', metin: 'Bir raf, bir çekmece… Hangisinden devam edelim?' },
      { ton: 'hafif_oyunbaz', metin: 'Bir eşyanın hatırını soralım mı? ;)' },
      { ton: 'merak_uyandiran', metin: 'Küçücük bir ayrıntı bile çok şey değiştirebilir.' },
      { ton: 'birlikte_ilerleme', metin: 'Bir yerden tutalım; gerisi gelir.' },
    ],
  },
  '07_ilerleme': {
    baslik: 'Çok iyi gidiyorsun!',
    alt_baslik: 'Yaşadığın yer, her dokunuşunla daha da güzelleşiyor.',
    kosullar: {
      yuksek_aktivite: {
        soru_havuzu: [
          { ton: 'dogrudan_davet', metin: 'Bugün ne seçeceksin? Sabırsızlıkla bekliyorum!' },
          { ton: 'sicak_destekleyici', metin: 'Güzel işler çıkarıyorsun, farkında mısın?' },
          { ton: 'merak_uyandiran', metin: 'Bakalım bugün neleri değiştireceğiz?' },
          { ton: 'hafif_oyunbaz', metin: 'Sırada ne var? ;)' },
          { ton: 'kucuk_basarilar', metin: 'Yaşadığın yerde değiştirmek istediğin başka neler var?' },
          { ton: 'birlikte_kesif', metin: 'Bugün başka bir köşeye göz atalım mı?' },
          { ton: 'kisisel_samimi', metin: 'Sıradaki dokunuşun nerede olsun istersin?' },
        ],
      },
      orta_aktivite: {
        soru_havuzu: [
          { ton: 'sakin_gercekci', metin: 'Küçük adımlar da sayılır.' },
          { ton: 'sakin_gercekci', metin: 'Azar azar, güzel gidiyor.' },
          { ton: 'sakin_gercekci', metin: 'Bu hafta da bir şeyler ilerledi.' },
        ],
      },
      dusuk_aktivite: {
        soru_havuzu: [
          { ton: 'baskisiz_davet', metin: 'Bu hafta biraz sakin geçti, sorun değil — ne zaman hazır olursan buradayız.' },
          { ton: 'baskisiz_davet', metin: 'Bazen ara vermek de gerekir. Hazır olduğunda buradayız.' },
          { ton: 'baskisiz_davet', metin: 'Acele yok, sen ne zaman istersen.' },
        ],
      },
    },
  },
  '08_yeniden_karsilasma': {
    baslik: 'Seni bugün de burada görmek çok güzel.',
    alt_baslik: 'Neye odaklanmak istersin? Belki bir eşya, belki de bütün bir oda.',
    soru_havuzu: [
      { ton: 'esya_ve_oda', metin: 'Belki bir eşya, belki de bütün bir oda.' },
      { ton: 'sicak_samimi', metin: 'Bakalım bugün bizi neler bekliyor?' },
      { ton: 'devamlilik', metin: 'Nereden devam etmek istersin?' },
      { ton: 'hafif_oyunbaz', metin: 'Sen geldin ya! Ben hazırım! ;)' },
      { ton: 'sakin_destekleyici', metin: 'Kendi ritmimizde devam ediyor muyuz?' },
      { ton: 'birlikte_kesif', metin: 'Bugün yeni bir şeyler keşfedelim mi?' },
      { ton: 'kisisel_davetkar', metin: 'Aklında yeni bir şeyler mi var?' },
    ],
  },
};

const STREAK_MILESTONES = [7, 14, 30];

// Hangi kategorinin (ve 07 için hangi alt-koşulun) tetikleneceğine karar verir.
// Sıra önemli: en spesifik/zamana-duyarlı durumdan genel varsayılana doğru.
// Not: 05/06 için JSON'da kesin sayısal eşik verilmemişti — burada belgelenen
// makul varsayılanlar kullanıldı (05: tam 1 gün ara, 06: ilk 5 karara kadar).
export function selectCategory({ totalDecisions, streak, daysSinceLastActive, sessionDecisions, weekDecisions }) {
  if (totalDecisions === 0) {
    return { key: '01_ilk_karsilasma' };
  }
  if (STREAK_MILESTONES.includes(streak)) {
    const sub = weekDecisions >= 3 ? 'yuksek_aktivite' : weekDecisions >= 1 ? 'orta_aktivite' : 'dusuk_aktivite';
    return { key: '07_ilerleme', subKey: sub };
  }
  if (sessionDecisions >= 5) {
    return { key: '04_kontrol_sende' };
  }
  if (daysSinceLastActive !== null && daysSinceLastActive >= 2) {
    return { key: '08_yeniden_karsilasma' };
  }
  if (sessionDecisions >= 1) {
    return { key: '03_bir_adim_daha' };
  }
  if (totalDecisions < 5) {
    return { key: '06_kucuk_adimlar' };
  }
  if (daysSinceLastActive === 1) {
    return { key: '05_kendi_ritminde' };
  }
  return { key: '02_devamlilik' };
}

export function getPool(key, subKey) {
  const category = CATEGORIES[key];
  if (!category) return null;
  return subKey ? category.kosullar[subKey].soru_havuzu : category.soru_havuzu;
}

// son gösterilen index hariç rastgele seç; havuz tek satırlıysa aynısını döner.
export function pickIndex(poolLength, lastIndex) {
  if (poolLength <= 1) return 0;
  let index = Math.floor(Math.random() * (poolLength - 1));
  if (index >= lastIndex) index += 1;
  return index;
}
