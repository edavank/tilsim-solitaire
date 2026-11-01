import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadProgress, updateProgress } from './storage';

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

async function loadLegacyVisit() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : { lastDate:null, streak:0 };
}

function visitStreak(progress, legacy) {
  const today = getToday(), yesterday = getYesterday();
  const current = progress.dailyLoginReceipts?.[today];
  if (current) return { claimed:true, streak:current.streak };
  if (legacy.lastDate === today) return { claimed:true, streak:legacy.streak };
  const previous = progress.dailyLoginReceipts?.[yesterday]?.streak
    ?? (legacy.lastDate === yesterday ? legacy.streak : 0);
  return { claimed:false, streak:(Number.isSafeInteger(previous) && previous > 0 ? previous : 0) + 1 };
}

export async function checkDailyLogin() {
  try {
    const [legacy, progress] = await Promise.all([loadLegacyVisit(), loadProgress()]);
    const visit = visitStreak(progress, legacy);
    return { shouldShow:!visit.claimed, streak:visit.streak,
      reward:visit.claimed ? null : DAILY_REWARDS[Math.min(visit.streak,7)-1], allDays:DAILY_REWARDS };
  } catch (e) { return {shouldShow:false,streak:0,reward:null}; }
}

export async function claimDailyReward(streak) {
  await AsyncStorage.setItem(KEY, JSON.stringify({ lastDate:getToday(), streak }));
}

export async function grantDailyLoginReward(_displayedStreak) {
  const today = getToday(), legacy = await loadLegacyVisit();
  let actualStreak;
  const progress = await updateProgress(cur => {
    const visit = visitStreak(cur,legacy);
    actualStreak = visit.streak;
    if (visit.claimed) return {};
    const reward = DAILY_REWARDS[Math.min(actualStreak,7)-1].coins;
    return { coins:cur.coins + reward,
      dailyLoginReceipts:{...(cur.dailyLoginReceipts || {}),[today]:{coins:reward,streak:actualStreak}} };
  },{id:`daily-login:${today}`,kind:'reward',source:'daily_login',description:'Günlük giriş ödülü'});
  try { await claimDailyReward(actualStreak); } catch (e) {}
  return progress;
}

export { DAILY_REWARDS };

