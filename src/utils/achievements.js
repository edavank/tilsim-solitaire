// Başarım Sistemi
let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

// Race-safe serial lock — eşzamanlı achievement check'lerinde kayıp önler
const _locks = new Map();
async function withLock(key, fn) {
  const prev = _locks.get(key) || Promise.resolve();
  let release;
  const next = new Promise((r) => { release = r; });
  _locks.set(key, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (_locks.get(key) === next) _locks.delete(key);
  }
}

const ACHIEVEMENTS = [
  // İlerleme
  { id: 'first_win', icon: '🏅', title: 'İlk Zafer', desc: 'İlk bölümü tamamla', reward: 20, check: (s) => s.totalWins >= 1 },
  { id: 'win_10', icon: '🥉', title: 'Çırak', desc: '10 bölüm tamamla', reward: 50, check: (s) => s.totalWins >= 10 },
  { id: 'win_50', icon: '🥈', title: 'Usta', desc: '50 bölüm tamamla', reward: 100, check: (s) => s.totalWins >= 50 },
  { id: 'win_100', icon: '🥇', title: 'Efsane', desc: '100 bölüm tamamla', reward: 200, check: (s) => s.totalWins >= 100 },
  { id: 'win_250', icon: '👑', title: 'Kral', desc: '250 bölüm tamamla', reward: 500, check: (s) => s.totalWins >= 250 },
  { id: 'win_500', icon: '🏛️', title: 'İmparator', desc: '500 bölüm tamamla', reward: 1000, check: (s) => s.totalWins >= 500 },
  { id: 'level_10', icon: '⭐', title: 'Yıldız Avcısı', desc: 'Bölüm 10\'a ulaş', reward: 30, check: (s) => s.currentLevel >= 10 },
  { id: 'level_25', icon: '🌟', title: 'Parlayan Yıldız', desc: 'Bölüm 25\'e ulaş', reward: 75, check: (s) => s.currentLevel >= 25 },
  { id: 'level_50', icon: '💫', title: 'Süpernova', desc: 'Bölüm 50\'ye ulaş', reward: 150, check: (s) => s.currentLevel >= 50 },
  { id: 'level_100', icon: '✨', title: 'Galaktik', desc: 'Bölüm 100\'e ulaş', reward: 300, check: (s) => s.currentLevel >= 100 },
  { id: 'level_200', icon: '🌠', title: 'Kozmik', desc: 'Bölüm 200\'e ulaş', reward: 500, check: (s) => s.currentLevel >= 200 },
  // Coin
  { id: 'coins_1k', icon: '💰', title: 'Cep Harçlığı', desc: '1.000 coin biriktir', reward: 50, check: (s) => s.coins >= 1000 },
  { id: 'coins_5k', icon: '💰', title: 'Hazine', desc: '5.000 coin biriktir', reward: 100, check: (s) => s.coins >= 5000 },
  { id: 'coins_10k', icon: '🏦', title: 'Banka', desc: '10.000 coin biriktir', reward: 200, check: (s) => s.coins >= 10000 },
  { id: 'coins_50k', icon: '💎', title: 'Milyoner', desc: '50.000 coin biriktir', reward: 500, check: (s) => s.coins >= 50000 },
  // Skor
  { id: 'score_500', icon: '🎯', title: 'Nişancı', desc: 'Tek bölümde 500+ puan', reward: 30, check: (s) => s.bestScore >= 500 },
  { id: 'score_1000', icon: '🏆', title: 'Şampiyon', desc: 'Tek bölümde 1000+ puan', reward: 75, check: (s) => s.bestScore >= 1000 },
  // Seri
  { id: 'streak_3', icon: '🔥', title: 'Ateş Başladı', desc: '3 bölüm üst üste kazan', reward: 30, check: (s) => s.streak >= 3 },
  { id: 'streak_7', icon: '🔥', title: 'Durdurulamaz', desc: '7 bölüm üst üste kazan', reward: 75, check: (s) => s.streak >= 7 },
  { id: 'streak_15', icon: '💎', title: 'Elmas Seri', desc: '15 bölüm üst üste kazan', reward: 200, check: (s) => s.streak >= 15 },
  { id: 'streak_30', icon: '🏆', title: 'Yenilmez', desc: '30 bölüm üst üste kazan', reward: 500, check: (s) => s.streak >= 30 },
  // Daily
  { id: 'daily_1', icon: '📅', title: 'Günlük Savaşçı', desc: 'İlk günlük görevi tamamla', reward: 20, check: (s) => s.dailyCount >= 1 },
  { id: 'daily_7', icon: '📅', title: 'Haftalık Rutin', desc: '7 günlük görev tamamla', reward: 50, check: (s) => s.dailyCount >= 7 },
  { id: 'daily_30', icon: '📅', title: 'Aylık Maratonu', desc: '30 günlük görev tamamla', reward: 150, check: (s) => s.dailyCount >= 30 },
  // Özel
  { id: 'no_hint', icon: '🧠', title: 'Deha', desc: 'İpucu kullanmadan bölüm tamamla', reward: 30, check: (s) => s.noHintWin },
  { id: 'speed', icon: '⚡', title: 'Hız Şeytanı', desc: 'Hamlelerin yarısını kullanmadan bitir', reward: 30, check: (s) => s.speedWin },
  { id: 'perfect', icon: '💯', title: 'Mükemmel', desc: 'Hiç yanlış yerleştirmeden tamamla', reward: 50, check: (s) => s.perfectWin },
  { id: 'combo_5', icon: '🔥', title: 'Kombo Ustası', desc: '5+ kombo yap', reward: 30, check: (s) => s.maxCombo >= 5 },
  { id: 'combo_10', icon: '💥', title: 'Kombo Kralı', desc: '10+ kombo yap', reward: 75, check: (s) => s.maxCombo >= 10 },
];

export { ACHIEVEMENTS };

const ACHIEV_KEY = '@tilsim_achievements';

export async function loadAchievements() {
  try {
    if (!AsyncStorage) return {};
    const raw = await AsyncStorage.getItem(ACHIEV_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

export async function saveAchievements(map) {
  try {
    if (!AsyncStorage) return;
    await AsyncStorage.setItem(ACHIEV_KEY, JSON.stringify(map));
  } catch (e) {}
}

export async function checkAchievements(stats) {
  return withLock(ACHIEV_KEY, async () => {
    const current = await loadAchievements();
    const newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
      if (current[ach.id]) continue; // Zaten kazanılmış
      if (ach.check(stats)) {
        current[ach.id] = { unlockedAt: Date.now() };
        newlyUnlocked.push(ach);
      }
    }

    if (newlyUnlocked.length > 0) {
      await saveAchievements(current);
    }

    return newlyUnlocked;
  });
}

export function getAchievementProgress(stats) {
  return ACHIEVEMENTS.map(ach => ({
    ...ach,
    unlocked: ach.check(stats),
  }));
}

// Multi-language achievement titles
export const ACHIEVEMENT_I18N = {
  tr: {
    pageTitle: 'Başarımlar',
    earned: 'Başarım Kazanıldı!',
    first_win: ['İlk Zafer', 'İlk bölümü tamamla'],
    win_10: ['Çırak', '10 bölüm tamamla'],
    win_50: ['Usta', '50 bölüm tamamla'],
    win_100: ['Efsane', '100 bölüm tamamla'],
    win_250: ['Kral', '250 bölüm tamamla'],
    win_500: ['İmparator', '500 bölüm tamamla'],
    level_10: ['Yıldız Avcısı', 'Bölüm 10\'a ulaş'],
    level_25: ['Parlayan Yıldız', 'Bölüm 25\'e ulaş'],
    level_50: ['Süpernova', 'Bölüm 50\'ye ulaş'],
    level_100: ['Galaktik', 'Bölüm 100\'e ulaş'],
    level_200: ['Kozmik', 'Bölüm 200\'e ulaş'],
    coins_1k: ['Cep Harçlığı', '1.000 coin biriktir'],
    coins_5k: ['Hazine', '5.000 coin biriktir'],
    coins_10k: ['Banka', '10.000 coin biriktir'],
    coins_50k: ['Milyoner', '50.000 coin biriktir'],
    score_500: ['Nişancı', '500+ puan'],
    score_1000: ['Şampiyon', '1000+ puan'],
    streak_3: ['Ateş Başladı', '3 üst üste'],
    streak_7: ['Durdurulamaz', '7 üst üste'],
    streak_15: ['Elmas Seri', '15 üst üste'],
    streak_30: ['Yenilmez', '30 üst üste'],
    daily_1: ['Günlük Savaşçı', 'İlk günlük görev'],
    daily_7: ['Haftalık Rutin', '7 günlük görev'],
    daily_30: ['Aylık Maratonu', '30 günlük görev'],
    no_hint: ['Deha', 'İpucu kullanmadan tamamla'],
    speed: ['Hız Şeytanı', 'Yarı hamleyle bitir'],
    perfect: ['Mükemmel', 'Yanlışsız tamamla'],
    combo_5: ['Kombo Ustası', '5+ kombo'],
    combo_10: ['Kombo Kralı', '10+ kombo'],
  },
  en: {
    pageTitle: 'Achievements',
    earned: 'Achievement Earned!',
    first_win: ['First Victory', 'Complete first level'],
    win_10: ['Apprentice', 'Complete 10 levels'],
    win_50: ['Master', 'Complete 50 levels'],
    win_100: ['Legend', 'Complete 100 levels'],
    win_250: ['King', 'Complete 250 levels'],
    win_500: ['Emperor', 'Complete 500 levels'],
    level_10: ['Star Hunter', 'Reach level 10'],
    level_25: ['Shining Star', 'Reach level 25'],
    level_50: ['Supernova', 'Reach level 50'],
    level_100: ['Galactic', 'Reach level 100'],
    level_200: ['Cosmic', 'Reach level 200'],
    coins_1k: ['Pocket Money', 'Collect 1,000 coins'],
    coins_5k: ['Treasure', 'Collect 5,000 coins'],
    coins_10k: ['Bank', 'Collect 10,000 coins'],
    coins_50k: ['Millionaire', 'Collect 50,000 coins'],
    score_500: ['Marksman', '500+ score'],
    score_1000: ['Champion', '1000+ score'],
    streak_3: ['On Fire', '3 in a row'],
    streak_7: ['Unstoppable', '7 in a row'],
    streak_15: ['Diamond Streak', '15 in a row'],
    streak_30: ['Invincible', '30 in a row'],
    daily_1: ['Daily Warrior', 'First daily challenge'],
    daily_7: ['Weekly Routine', '7 daily challenges'],
    daily_30: ['Monthly Marathon', '30 daily challenges'],
    no_hint: ['Genius', 'Complete without hints'],
    speed: ['Speed Demon', 'Finish with half moves'],
    perfect: ['Perfect', 'No wrong placements'],
    combo_5: ['Combo Master', '5+ combo'],
    combo_10: ['Combo King', '10+ combo'],
  },
  de: {
    pageTitle: 'Erfolge',
    earned: 'Erfolg freigeschaltet!',
    first_win: ['Erster Sieg', 'Erstes Level abschließen'],
    win_10: ['Lehrling', '10 Level abschließen'],
    win_50: ['Meister', '50 Level abschließen'],
    win_100: ['Legende', '100 Level abschließen'],
    win_250: ['König', '250 Level abschließen'],
    win_500: ['Kaiser', '500 Level abschließen'],
    level_10: ['Sternenjäger', 'Level 10 erreichen'],
    level_25: ['Leuchtender Stern', 'Level 25 erreichen'],
    level_50: ['Supernova', 'Level 50 erreichen'],
    level_100: ['Galaktisch', 'Level 100 erreichen'],
    level_200: ['Kosmisch', 'Level 200 erreichen'],
    coins_1k: ['Taschengeld', '1.000 Münzen sammeln'],
    coins_5k: ['Schatz', '5.000 Münzen sammeln'],
    coins_10k: ['Bank', '10.000 Münzen sammeln'],
    coins_50k: ['Millionär', '50.000 Münzen sammeln'],
    score_500: ['Scharfschütze', '500+ Punkte'],
    score_1000: ['Champion', '1000+ Punkte'],
    streak_3: ['Feuer!', '3 in Folge'],
    streak_7: ['Unaufhaltsam', '7 in Folge'],
    streak_15: ['Diamant-Serie', '15 in Folge'],
    streak_30: ['Unbesiegbar', '30 in Folge'],
    daily_1: ['Täglicher Krieger', 'Erste tägliche Aufgabe'],
    daily_7: ['Wöchentliche Routine', '7 tägliche Aufgaben'],
    daily_30: ['Monatsmarathon', '30 tägliche Aufgaben'],
    no_hint: ['Genie', 'Ohne Hinweise abschließen'],
    speed: ['Geschwindigkeitsdämon', 'Mit halben Zügen beenden'],
    perfect: ['Perfekt', 'Keine Fehler'],
    combo_5: ['Kombo-Meister', '5+ Kombo'],
    combo_10: ['Kombo-König', '10+ Kombo'],
  },
  fr: {
    pageTitle: 'Succès',
    earned: 'Succès débloqué !',
    first_win: ['Première Victoire', 'Terminer le premier niveau'],
    win_10: ['Apprenti', 'Terminer 10 niveaux'],
    win_50: ['Maître', 'Terminer 50 niveaux'],
    win_100: ['Légende', 'Terminer 100 niveaux'],
    win_250: ['Roi', 'Terminer 250 niveaux'],
    win_500: ['Empereur', 'Terminer 500 niveaux'],
    level_10: ['Chasseur d\'étoiles', 'Atteindre le niveau 10'],
    level_25: ['Étoile brillante', 'Atteindre le niveau 25'],
    level_50: ['Supernova', 'Atteindre le niveau 50'],
    level_100: ['Galactique', 'Atteindre le niveau 100'],
    level_200: ['Cosmique', 'Atteindre le niveau 200'],
    coins_1k: ['Argent de poche', '1 000 pièces'],
    coins_5k: ['Trésor', '5 000 pièces'],
    coins_10k: ['Banque', '10 000 pièces'],
    coins_50k: ['Millionnaire', '50 000 pièces'],
    score_500: ['Tireur', '500+ points'],
    score_1000: ['Champion', '1000+ points'],
    streak_3: ['En feu', '3 de suite'],
    streak_7: ['Inarrêtable', '7 de suite'],
    streak_15: ['Série diamant', '15 de suite'],
    streak_30: ['Invincible', '30 de suite'],
    daily_1: ['Guerrier quotidien', 'Premier défi quotidien'],
    daily_7: ['Routine hebdomadaire', '7 défis quotidiens'],
    daily_30: ['Marathon mensuel', '30 défis quotidiens'],
    no_hint: ['Génie', 'Sans indices'],
    speed: ['Démon de vitesse', 'Moitié des coups'],
    perfect: ['Parfait', 'Sans erreur'],
    combo_5: ['Maître combo', '5+ combo'],
    combo_10: ['Roi combo', '10+ combo'],
  },
  es: {
    pageTitle: 'Logros',
    earned: '¡Logro desbloqueado!',
    first_win: ['Primera Victoria', 'Completar primer nivel'],
    win_10: ['Aprendiz', 'Completar 10 niveles'],
    win_50: ['Maestro', 'Completar 50 niveles'],
    win_100: ['Leyenda', 'Completar 100 niveles'],
    win_250: ['Rey', 'Completar 250 niveles'],
    win_500: ['Emperador', 'Completar 500 niveles'],
    level_10: ['Cazador de estrellas', 'Alcanzar nivel 10'],
    level_25: ['Estrella brillante', 'Alcanzar nivel 25'],
    level_50: ['Supernova', 'Alcanzar nivel 50'],
    level_100: ['Galáctico', 'Alcanzar nivel 100'],
    level_200: ['Cósmico', 'Alcanzar nivel 200'],
    coins_1k: ['Calderilla', '1.000 monedas'],
    coins_5k: ['Tesoro', '5.000 monedas'],
    coins_10k: ['Banco', '10.000 monedas'],
    coins_50k: ['Millonario', '50.000 monedas'],
    score_500: ['Tirador', '500+ puntos'],
    score_1000: ['Campeón', '1000+ puntos'],
    streak_3: ['En llamas', '3 seguidos'],
    streak_7: ['Imparable', '7 seguidos'],
    streak_15: ['Serie diamante', '15 seguidos'],
    streak_30: ['Invencible', '30 seguidos'],
    daily_1: ['Guerrero diario', 'Primer desafío diario'],
    daily_7: ['Rutina semanal', '7 desafíos diarios'],
    daily_30: ['Maratón mensual', '30 desafíos diarios'],
    no_hint: ['Genio', 'Sin pistas'],
    speed: ['Demonio veloz', 'Mitad de movimientos'],
    perfect: ['Perfecto', 'Sin errores'],
    combo_5: ['Maestro combo', '5+ combo'],
    combo_10: ['Rey combo', '10+ combo'],
  },
  ar: {
    pageTitle: 'الإنجازات',
    earned: 'تم فتح إنجاز!',
    first_win: ['النصر الأول', 'أكمل المستوى الأول'],
    win_10: ['المتدرب', 'أكمل 10 مستويات'],
    win_50: ['الأستاذ', 'أكمل 50 مستوى'],
    win_100: ['الأسطورة', 'أكمل 100 مستوى'],
    win_250: ['الملك', 'أكمل 250 مستوى'],
    win_500: ['الإمبراطور', 'أكمل 500 مستوى'],
    level_10: ['صائد النجوم', 'الوصول للمستوى 10'],
    level_25: ['نجم ساطع', 'الوصول للمستوى 25'],
    level_50: ['سوبرنوفا', 'الوصول للمستوى 50'],
    level_100: ['مجري', 'الوصول للمستوى 100'],
    level_200: ['كوني', 'الوصول للمستوى 200'],
    coins_1k: ['مصروف الجيب', '1000 عملة'],
    coins_5k: ['كنز', '5000 عملة'],
    coins_10k: ['بنك', '10000 عملة'],
    coins_50k: ['مليونير', '50000 عملة'],
    score_500: ['قناص', '500+ نقطة'],
    score_1000: ['بطل', '1000+ نقطة'],
    streak_3: ['مشتعل', '3 متتالية'],
    streak_7: ['لا يوقف', '7 متتالية'],
    streak_15: ['سلسلة ماسية', '15 متتالية'],
    streak_30: ['لا يقهر', '30 متتالية'],
    daily_1: ['محارب يومي', 'أول تحدي يومي'],
    daily_7: ['روتين أسبوعي', '7 تحديات يومية'],
    daily_30: ['ماراثون شهري', '30 تحدي يومي'],
    no_hint: ['عبقري', 'بدون تلميحات'],
    speed: ['شيطان السرعة', 'نصف الحركات'],
    perfect: ['مثالي', 'بدون أخطاء'],
    combo_5: ['أستاذ كومبو', '5+ كومبو'],
    combo_10: ['ملك كومبو', '10+ كومبو'],
  },
  ru: {
    pageTitle: 'Достижения',
    earned: 'Достижение получено!',
    first_win: ['Первая победа', 'Пройди первый уровень'],
    win_10: ['Ученик', 'Пройди 10 уровней'],
    win_50: ['Мастер', 'Пройди 50 уровней'],
    win_100: ['Легенда', 'Пройди 100 уровней'],
    win_250: ['Король', 'Пройди 250 уровней'],
    win_500: ['Император', 'Пройди 500 уровней'],
    level_10: ['Звездолов', 'Достигни уровня 10'],
    level_25: ['Яркая звезда', 'Достигни уровня 25'],
    level_50: ['Сверхновая', 'Достигни уровня 50'],
    level_100: ['Галактический', 'Достигни уровня 100'],
    level_200: ['Космический', 'Достигни уровня 200'],
    coins_1k: ['Карманные деньги', '1000 монет'],
    coins_5k: ['Сокровище', '5000 монет'],
    coins_10k: ['Банк', '10000 монет'],
    coins_50k: ['Миллионер', '50000 монет'],
    score_500: ['Снайпер', '500+ очков'],
    score_1000: ['Чемпион', '1000+ очков'],
    streak_3: ['В огне', '3 подряд'],
    streak_7: ['Неудержимый', '7 подряд'],
    streak_15: ['Алмазная серия', '15 подряд'],
    streak_30: ['Непобедимый', '30 подряд'],
    daily_1: ['Ежедневный боец', 'Первое ежедневное'],
    daily_7: ['Недельный ритуал', '7 ежедневных'],
    daily_30: ['Месячный марафон', '30 ежедневных'],
    no_hint: ['Гений', 'Без подсказок'],
    speed: ['Демон скорости', 'Половина ходов'],
    perfect: ['Идеально', 'Без ошибок'],
    combo_5: ['Мастер комбо', '5+ комбо'],
    combo_10: ['Король комбо', '10+ комбо'],
  },
};
