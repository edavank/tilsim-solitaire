// Başarım Sistemi
let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

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
  { id: 'coins_1k', icon: '🪙', title: 'Cep Harçlığı', desc: '1.000 coin biriktir', reward: 50, check: (s) => s.coins >= 1000 },
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
}

export function getAchievementProgress(stats) {
  return ACHIEVEMENTS.map(ach => ({
    ...ach,
    unlocked: ach.check(stats),
  }));
}
