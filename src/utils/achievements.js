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
  // === v1.0.5 yeni başarımlar ===
  { id: 'win_5', icon: '🎮', title: 'Yeni Başlangıç', desc: '5 bölüm tamamla', reward: 30, check: (s) => s.totalWins >= 5 },
  { id: 'win_25', icon: '🎯', title: 'Kararlı', desc: '25 bölüm tamamla', reward: 75, check: (s) => s.totalWins >= 25 },
  { id: 'win_150', icon: '🏵️', title: 'Asil', desc: '150 bölüm tamamla', reward: 300, check: (s) => s.totalWins >= 150 },
  { id: 'win_230', icon: '🏆', title: 'Tılsımın Hakimi', desc: 'Tüm bölümleri tamamla', reward: 1000, check: (s) => s.totalWins >= 230 },
  { id: 'level_75', icon: '🌙', title: 'Aydan Daha Uzakta', desc: 'Bölüm 75\'e ulaş', reward: 200, check: (s) => s.currentLevel >= 75 },
  { id: 'level_150', icon: '🌌', title: 'Samanyolu', desc: 'Bölüm 150\'ye ulaş', reward: 400, check: (s) => s.currentLevel >= 150 },
  { id: 'level_230', icon: '👑', title: 'Sonsuzluk', desc: 'Tüm bölümleri aç', reward: 800, check: (s) => s.currentLevel >= 230 },
  { id: 'coins_100k', icon: '💎', title: 'Sultan', desc: '100.000 coin biriktir', reward: 1000, check: (s) => s.coins >= 100000 },
  { id: 'score_2000', icon: '🎖️', title: 'Süper Yıldız', desc: 'Tek bölümde 2000+ puan', reward: 150, check: (s) => s.bestScore >= 2000 },
  { id: 'streak_50', icon: '👹', title: 'Tanrısal', desc: '50 bölüm üst üste kazan', reward: 1000, check: (s) => s.streak >= 50 },
  { id: 'daily_60', icon: '🗓️', title: 'İki Aylık Bağlılık', desc: '60 günlük görev tamamla', reward: 300, check: (s) => s.dailyCount >= 60 },
  { id: 'combo_15', icon: '🚀', title: 'Roket Kombo', desc: '15+ kombo yap', reward: 150, check: (s) => s.maxCombo >= 15 },
];

export { ACHIEVEMENTS };

const ACHIEV_KEY = '@tilsim_achievements';

// Migration: eski format (claimed yok) → claimed: true (geriye dönük, çift coin önle)
function migrateEntry(entry) {
  if (!entry) return entry;
  if (typeof entry.claimed === 'undefined') {
    return { ...entry, claimed: true }; // Eski kazanılmış başarım — coin zaten alınmış sayılır
  }
  return entry;
}

export async function loadAchievements() {
  try {
    if (!AsyncStorage) return {};
    const raw = await AsyncStorage.getItem(ACHIEV_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Migration: her entry'ye claimed: true ekle (eski user'lar)
    const migrated = {};
    let didMigrate = false;
    for (const id in parsed) {
      const entry = parsed[id];
      const newEntry = migrateEntry(entry);
      migrated[id] = newEntry;
      if (newEntry !== entry) didMigrate = true;
    }
    // Migration olduysa kaydı güncelle
    if (didMigrate) {
      await AsyncStorage.setItem(ACHIEV_KEY, JSON.stringify(migrated));
    }
    return migrated;
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
        // YENİ: claimed: false olarak kaydet — kullanıcı topla'ya basacak
        current[ach.id] = { unlockedAt: Date.now(), claimed: false };
        newlyUnlocked.push(ach);
      }
    }

    if (newlyUnlocked.length > 0) {
      await saveAchievements(current);
    }

    return newlyUnlocked;
  });
}

// YENİ: Tek bir başarımın ödülünü topla
export async function claimAchievement(id) {
  return withLock(ACHIEV_KEY, async () => {
    const current = await loadAchievements();
    const entry = current[id];
    if (!entry) return { success: false, reward: 0, reason: 'not_unlocked' };
    if (entry.claimed) return { success: false, reward: 0, reason: 'already_claimed' };

    const ach = ACHIEVEMENTS.find(a => a.id === id);
    const reward = ach?.reward || 0;

    current[id] = { ...entry, claimed: true, claimedAt: Date.now() };
    await saveAchievements(current);

    return { success: true, reward };
  });
}

// YENİ: Toplanmamış (unclaimed) başarımları say
export function countUnclaimed(unlockedMap) {
  let count = 0;
  for (const id in unlockedMap) {
    if (unlockedMap[id] && unlockedMap[id].claimed === false) count++;
  }
  return count;
}

// YENİ: Toplanmamış başarımların toplam ödülünü hesapla
export function totalUnclaimedReward(unlockedMap) {
  let total = 0;
  for (const id in unlockedMap) {
    if (unlockedMap[id] && unlockedMap[id].claimed === false) {
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) total += (ach.reward || 0);
    }
  }
  return total;
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
    claim: 'TOPLA',
    claimAll: 'Tümünü Topla',
    first_win: ['İlk Zafer', 'İlk bölümü tamamla'],
    win_10: ['Çırak', '10 bölüm tamamla'],
    win_50: ['Usta', '50 bölüm tamamla'],
    win_100: ['Efsane', '100 bölüm tamamla'],
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
    win_5: ['Yeni Başlangıç', '5 bölüm tamamla'],
    win_25: ['Kararlı', '25 bölüm tamamla'],
    win_150: ['Asil', '150 bölüm tamamla'],
    win_230: ['Tılsımın Hakimi', 'Tüm bölümleri tamamla'],
    level_75: ['Aydan Daha Uzakta', 'Bölüm 75\'e ulaş'],
    level_150: ['Samanyolu', 'Bölüm 150\'ye ulaş'],
    level_230: ['Sonsuzluk', 'Tüm bölümleri aç'],
    coins_100k: ['Sultan', '100.000 coin biriktir'],
    score_2000: ['Süper Yıldız', '2000+ puan'],
    streak_50: ['Tanrısal', '50 üst üste'],
    daily_60: ['İki Aylık Bağlılık', '60 günlük görev'],
    combo_15: ['Roket Kombo', '15+ kombo'],
  },
  en: {
    pageTitle: 'Achievements',
    earned: 'Achievement Earned!',
    claim: 'CLAIM',
    claimAll: 'Claim All',
    first_win: ['First Victory', 'Complete first level'],
    win_10: ['Apprentice', 'Complete 10 levels'],
    win_50: ['Master', 'Complete 50 levels'],
    win_100: ['Legend', 'Complete 100 levels'],
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
    win_5: ['Fresh Start', 'Complete 5 levels'],
    win_25: ['Determined', 'Complete 25 levels'],
    win_150: ['Noble', 'Complete 150 levels'],
    win_230: ['Master of Tilsim', 'Complete all levels'],
    level_75: ['Past the Moon', 'Reach level 75'],
    level_150: ['Milky Way', 'Reach level 150'],
    level_230: ['Eternity', 'Unlock all levels'],
    coins_100k: ['Sultan', 'Collect 100,000 coins'],
    score_2000: ['Superstar', '2000+ score'],
    streak_50: ['Godlike', '50 in a row'],
    daily_60: ['Two-Month Devotion', '60 daily challenges'],
    combo_15: ['Rocket Combo', '15+ combo'],
  },
  de: {
    pageTitle: 'Erfolge',
    earned: 'Erfolg freigeschaltet!',
    claim: 'ABHOLEN',
    claimAll: 'Alle abholen',
    first_win: ['Erster Sieg', 'Erstes Level abschließen'],
    win_10: ['Lehrling', '10 Level abschließen'],
    win_50: ['Meister', '50 Level abschließen'],
    win_100: ['Legende', '100 Level abschließen'],
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
    win_5: ['Neuer Anfang', '5 Level abschließen'],
    win_25: ['Entschlossen', '25 Level abschließen'],
    win_150: ['Edel', '150 Level abschließen'],
    win_230: ['Meister von Tilsim', 'Alle Level abschließen'],
    level_75: ['Hinter dem Mond', 'Level 75 erreichen'],
    level_150: ['Milchstraße', 'Level 150 erreichen'],
    level_230: ['Ewigkeit', 'Alle Level freischalten'],
    coins_100k: ['Sultan', '100.000 Münzen sammeln'],
    score_2000: ['Superstar', '2000+ Punkte'],
    streak_50: ['Gottgleich', '50 in Folge'],
    daily_60: ['Zweimonatige Hingabe', '60 tägliche Aufgaben'],
    combo_15: ['Raketenkombo', '15+ Kombo'],
  },
  fr: {
    pageTitle: 'Succès',
    earned: 'Succès débloqué !',
    claim: 'RÉCLAMER',
    claimAll: 'Tout réclamer',
    first_win: ['Première Victoire', 'Terminer le premier niveau'],
    win_10: ['Apprenti', 'Terminer 10 niveaux'],
    win_50: ['Maître', 'Terminer 50 niveaux'],
    win_100: ['Légende', 'Terminer 100 niveaux'],
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
    win_5: ['Nouveau Départ', 'Terminer 5 niveaux'],
    win_25: ['Déterminé', 'Terminer 25 niveaux'],
    win_150: ['Noble', 'Terminer 150 niveaux'],
    win_230: ['Maître de Tilsim', 'Terminer tous les niveaux'],
    level_75: ['Au-delà de la Lune', 'Atteindre le niveau 75'],
    level_150: ['Voie Lactée', 'Atteindre le niveau 150'],
    level_230: ['Éternité', 'Débloquer tous les niveaux'],
    coins_100k: ['Sultan', '100 000 pièces'],
    score_2000: ['Superstar', '2000+ points'],
    streak_50: ['Divin', '50 de suite'],
    daily_60: ['Dévotion de Deux Mois', '60 défis quotidiens'],
    combo_15: ['Combo Fusée', '15+ combo'],
  },
  es: {
    pageTitle: 'Logros',
    earned: '¡Logro desbloqueado!',
    claim: 'RECLAMAR',
    claimAll: 'Reclamar todo',
    first_win: ['Primera Victoria', 'Completar primer nivel'],
    win_10: ['Aprendiz', 'Completar 10 niveles'],
    win_50: ['Maestro', 'Completar 50 niveles'],
    win_100: ['Leyenda', 'Completar 100 niveles'],
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
    win_5: ['Nuevo Comienzo', 'Completar 5 niveles'],
    win_25: ['Decidido', 'Completar 25 niveles'],
    win_150: ['Noble', 'Completar 150 niveles'],
    win_230: ['Maestro de Tilsim', 'Completar todos los niveles'],
    level_75: ['Más allá de la Luna', 'Alcanzar nivel 75'],
    level_150: ['Vía Láctea', 'Alcanzar nivel 150'],
    level_230: ['Eternidad', 'Desbloquear todos los niveles'],
    coins_100k: ['Sultán', '100.000 monedas'],
    score_2000: ['Superestrella', '2000+ puntos'],
    streak_50: ['Divino', '50 seguidos'],
    daily_60: ['Devoción de Dos Meses', '60 desafíos diarios'],
    combo_15: ['Combo Cohete', '15+ combo'],
  },
  ar: {
    pageTitle: 'الإنجازات',
    earned: 'تم فتح إنجاز!',
    claim: 'استلام',
    claimAll: 'استلام الكل',
    first_win: ['النصر الأول', 'أكمل المستوى الأول'],
    win_10: ['المتدرب', 'أكمل 10 مستويات'],
    win_50: ['الأستاذ', 'أكمل 50 مستوى'],
    win_100: ['الأسطورة', 'أكمل 100 مستوى'],
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
    win_5: ['بداية جديدة', 'أكمل 5 مستويات'],
    win_25: ['مصمم', 'أكمل 25 مستوى'],
    win_150: ['نبيل', 'أكمل 150 مستوى'],
    win_230: ['سيد تلسم', 'أكمل جميع المستويات'],
    level_75: ['وراء القمر', 'الوصول للمستوى 75'],
    level_150: ['درب التبانة', 'الوصول للمستوى 150'],
    level_230: ['الخلود', 'افتح جميع المستويات'],
    coins_100k: ['سلطان', '100000 عملة'],
    score_2000: ['نجم خارق', '2000+ نقطة'],
    streak_50: ['إلهي', '50 متتالية'],
    daily_60: ['التزام شهرين', '60 تحدي يومي'],
    combo_15: ['كومبو صاروخي', '15+ كومبو'],
  },
  ru: {
    pageTitle: 'Достижения',
    earned: 'Достижение получено!',
    claim: 'ЗАБРАТЬ',
    claimAll: 'Забрать всё',
    first_win: ['Первая победа', 'Пройди первый уровень'],
    win_10: ['Ученик', 'Пройди 10 уровней'],
    win_50: ['Мастер', 'Пройди 50 уровней'],
    win_100: ['Легенда', 'Пройди 100 уровней'],
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
    win_5: ['Свежий старт', 'Пройди 5 уровней'],
    win_25: ['Решительный', 'Пройди 25 уровней'],
    win_150: ['Благородный', 'Пройди 150 уровней'],
    win_230: ['Мастер Тылсым', 'Пройди все уровни'],
    level_75: ['За Луной', 'Достигни уровня 75'],
    level_150: ['Млечный путь', 'Достигни уровня 150'],
    level_230: ['Вечность', 'Открой все уровни'],
    coins_100k: ['Султан', '100000 монет'],
    score_2000: ['Суперзвезда', '2000+ очков'],
    streak_50: ['Богоподобный', '50 подряд'],
    daily_60: ['Двухмесячная преданность', '60 ежедневных'],
    combo_15: ['Ракетное комбо', '15+ комбо'],
  },
};
