import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tilsim_daily_login';

// Günlük ödüller (1-7 gün)
const DAILY_REWARDS = [
  { day: 1, coins: 10 },
  { day: 2, coins: 20 },
  { day: 3, coins: 30 },
  { day: 4, coins: 40 },
  { day: 5, coins: 50 },
  { day: 6, coins: 75 },
  { day: 7, coins: 100 },
];

function getToday() {
  const d = new Date();
  // Kullanıcının yerel saatini kullan (gece yarısı geçişi doğru olsun)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function checkDailyLogin() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : { lastDate: null, streak: 0 };
    const today = getToday();
    const yesterday = getYesterday();

    // Bugün zaten ödül alındıysa
    if (data.lastDate === today) {
      return { shouldShow: false, streak: data.streak, reward: null };
    }

    let newStreak;
    if (data.lastDate === yesterday) {
      // Dün giriş yapılmış → seriyi devam ettir
      newStreak = data.streak + 1;
    } else {
      // Dün giriş yapılmamış → seri sıfırlanır
      newStreak = 1;
    }

    // 7 günden sonra 7'de kal (hep 100 coin)
    const dayIndex = Math.min(newStreak, 7) - 1;
    const reward = DAILY_REWARDS[dayIndex];

    return {
      shouldShow: true,
      streak: newStreak,
      reward: reward,
      allDays: DAILY_REWARDS,
    };
  } catch (e) {
    return { shouldShow: false, streak: 0, reward: null };
  }
}

export async function claimDailyReward(streak) {
  const today = getToday();
  await AsyncStorage.setItem(KEY, JSON.stringify({ lastDate: today, streak }));
}

export { DAILY_REWARDS };
