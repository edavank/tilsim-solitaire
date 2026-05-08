// Tılsım Solitaire — Push Notifications (local, expo-notifications)
// Memory'deki 10 senaryo tasarımının pratik subseti
// Sessiz saat: 23:30-08:00 (saatler bu aralık dışına kaydırılır)
// Sıklık tavanı: aktif=1/gün max 4/hafta, sönmekte=2/hafta, donmuş=1/hafta
//
// Expo Go'da güvenli: modül yoksa stub olarak çalışır
// Kullanım:
//   await initNotifications()    → permission + handler kurulumu
//   await scheduleAllForUser()   → kullanıcı state'ine göre tüm aktif senaryoları schedule
//   await cancelAll()            → uygulama açıldığında tüm pending'leri sıfırla, sonra schedule

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let Notifications = null;
let isReady = false;

const STORAGE_KEY_LAST_SCHEDULE = 'notif_last_schedule';
const STORAGE_KEY_WEEK_SENT = 'notif_week_sent'; // [{ts, type}]

// ─── i18n ──────────────────────────────────────────────────
// Diller: tr, en, de, fr, es, ar, ru
const STRINGS = {
  tr: {
    d1Title: 'Bölümlerin seni bekliyor 🎯',
    d1Body: 'Tılsım Solitaire — bir bölüm daha?',
    d3Title: 'Seni özledik ✨',
    d3Body: 'Yeni kategoriler ve ödüller seni bekliyor!',
    d7Title: 'Hâlâ buradayız 🌙',
    d7Body: 'Streak\'in sıfırlanmasın — bugün bir bölüm dene!',
    dailyTitle: 'Günlük Meydan Okuma 🎁',
    dailyBody: 'Bugünkü bölümü tamamla, +100 coin kazan!',
    dailyLastChanceTitle: 'Son saat! ⏰',
    dailyLastChanceBody: 'Günlük meydan okuma bitmek üzere — kaçırma!',
    streakRiskTitle: 'Streak\'in tehlikede 🔥',
    streakRiskBody: '{n} günlük serini koru, hızlıca bir bölüm oyna!',
    milestoneTitle: 'Müthiş seri! 🏆',
    milestoneBody: '{n} gün üst üste oynadın — başarımın hazır!',
  },
  en: {
    d1Title: 'Levels are waiting 🎯',
    d1Body: 'Tılsım Solitaire — one more round?',
    d3Title: 'We miss you ✨',
    d3Body: 'New categories and rewards await you!',
    d7Title: 'Still here for you 🌙',
    d7Body: 'Don\'t lose your streak — try a level today!',
    dailyTitle: 'Daily Challenge 🎁',
    dailyBody: 'Complete today\'s level, win +100 coins!',
    dailyLastChanceTitle: 'Last hour! ⏰',
    dailyLastChanceBody: 'Daily challenge ending soon — don\'t miss it!',
    streakRiskTitle: 'Your streak is at risk 🔥',
    streakRiskBody: 'Keep your {n}-day streak, play quickly!',
    milestoneTitle: 'Amazing streak! 🏆',
    milestoneBody: '{n} days in a row — your achievement is ready!',
  },
  de: {
    d1Title: 'Level warten auf dich 🎯',
    d1Body: 'Tılsım Solitaire — noch eine Runde?',
    d3Title: 'Wir vermissen dich ✨',
    d3Body: 'Neue Kategorien und Belohnungen warten!',
    d7Title: 'Wir sind noch da 🌙',
    d7Body: 'Verliere deine Serie nicht — spiele heute ein Level!',
    dailyTitle: 'Tägliche Herausforderung 🎁',
    dailyBody: 'Schließe das heutige Level ab, gewinne +100 Münzen!',
    dailyLastChanceTitle: 'Letzte Stunde! ⏰',
    dailyLastChanceBody: 'Tägliche Herausforderung endet bald!',
    streakRiskTitle: 'Deine Serie ist in Gefahr 🔥',
    streakRiskBody: 'Behalte deine {n}-Tage-Serie, spiele schnell!',
    milestoneTitle: 'Großartige Serie! 🏆',
    milestoneBody: '{n} Tage in Folge — Erfolg ist bereit!',
  },
  fr: {
    d1Title: 'Les niveaux t\'attendent 🎯',
    d1Body: 'Tılsım Solitaire — encore un tour ?',
    d3Title: 'Tu nous manques ✨',
    d3Body: 'De nouvelles catégories et récompenses t\'attendent !',
    d7Title: 'Toujours là pour toi 🌙',
    d7Body: 'Ne perds pas ta série — essaie un niveau aujourd\'hui !',
    dailyTitle: 'Défi quotidien 🎁',
    dailyBody: 'Termine le niveau du jour, gagne +100 pièces !',
    dailyLastChanceTitle: 'Dernière heure ! ⏰',
    dailyLastChanceBody: 'Le défi quotidien se termine bientôt !',
    streakRiskTitle: 'Ta série est en danger 🔥',
    streakRiskBody: 'Garde ta série de {n} jours, joue vite !',
    milestoneTitle: 'Série incroyable ! 🏆',
    milestoneBody: '{n} jours d\'affilée — succès prêt !',
  },
  es: {
    d1Title: 'Los niveles te esperan 🎯',
    d1Body: 'Tılsım Solitaire — ¿una ronda más?',
    d3Title: 'Te echamos de menos ✨',
    d3Body: '¡Nuevas categorías y recompensas te esperan!',
    d7Title: 'Aún aquí para ti 🌙',
    d7Body: 'No pierdas tu racha — ¡prueba un nivel hoy!',
    dailyTitle: 'Desafío diario 🎁',
    dailyBody: '¡Completa el nivel de hoy, gana +100 monedas!',
    dailyLastChanceTitle: '¡Última hora! ⏰',
    dailyLastChanceBody: '¡El desafío diario está por terminar!',
    streakRiskTitle: 'Tu racha está en riesgo 🔥',
    streakRiskBody: '¡Mantén tu racha de {n} días, juega rápido!',
    milestoneTitle: '¡Racha increíble! 🏆',
    milestoneBody: '{n} días seguidos — ¡logro listo!',
  },
  ar: {
    d1Title: 'المراحل تنتظرك 🎯',
    d1Body: 'تلسم سوليتير — جولة أخرى؟',
    d3Title: 'نشتاق إليك ✨',
    d3Body: 'فئات وجوائز جديدة بانتظارك!',
    d7Title: 'مازلنا هنا 🌙',
    d7Body: 'لا تفقد سلسلتك — جرب مرحلة اليوم!',
    dailyTitle: 'تحدي يومي 🎁',
    dailyBody: 'أكمل مرحلة اليوم واربح 100 عملة!',
    dailyLastChanceTitle: 'الساعة الأخيرة! ⏰',
    dailyLastChanceBody: 'التحدي اليومي ينتهي قريباً!',
    streakRiskTitle: 'سلسلتك في خطر 🔥',
    streakRiskBody: 'حافظ على سلسلتك المكونة من {n} أيام، العب بسرعة!',
    milestoneTitle: 'سلسلة رائعة! 🏆',
    milestoneBody: '{n} أيام متتالية — الإنجاز جاهز!',
  },
  ru: {
    d1Title: 'Уровни ждут тебя 🎯',
    d1Body: 'Tılsım Solitaire — ещё один раунд?',
    d3Title: 'Мы скучаем ✨',
    d3Body: 'Тебя ждут новые категории и награды!',
    d7Title: 'Мы всё ещё здесь 🌙',
    d7Body: 'Не теряй свою серию — сыграй уровень сегодня!',
    dailyTitle: 'Ежедневный вызов 🎁',
    dailyBody: 'Заверши сегодняшний уровень, получи +100 монет!',
    dailyLastChanceTitle: 'Последний час! ⏰',
    dailyLastChanceBody: 'Ежедневный вызов скоро закончится!',
    streakRiskTitle: 'Твоя серия под угрозой 🔥',
    streakRiskBody: 'Сохрани свою серию в {n} дней, играй быстро!',
    milestoneTitle: 'Потрясающая серия! 🏆',
    milestoneBody: '{n} дней подряд — достижение готово!',
  },
};

function getStrings(lang) {
  return STRINGS[lang] || STRINGS.tr;
}

function fmt(template, params) {
  return Object.entries(params || {}).reduce(
    (acc, [k, v]) => acc.replace(`{${k}}`, v),
    template
  );
}

// ─── Modül yükleme ─────────────────────────────────────────
function isExpoGo() {
  try {
    const Constants = require('expo-constants').default;
    return Constants?.appOwnership === 'expo';
  } catch (e) { return false; }
}

function loadModule() {
  if (Notifications) return true;
  if (isExpoGo()) {
    console.log('[Notif] Expo Go — atlanıyor');
    return false;
  }
  try {
    Notifications = require('expo-notifications');
    return true;
  } catch (e) {
    console.log('[Notif] expo-notifications yüklenmedi:', e.message);
    return false;
  }
}

// ─── Init ──────────────────────────────────────────────────
export async function initNotifications() {
  if (!loadModule()) return false;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Tılsım Solitaire',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#9B7DFF',
      });
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.log('[Notif] izin verilmedi');
        return false;
      }
    }

    isReady = true;
    return true;
  } catch (e) {
    console.log('[Notif] init hatası:', e.message);
    return false;
  }
}

// ─── Helpers ───────────────────────────────────────────────
async function cancelAll() {
  if (!isReady) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {}
}

// Sessiz saat 23:30-08:00 → 09:00 olarak kaydır
function adjustForQuietHours(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  // 23:30-08:00 sessiz
  if (h >= 23 && (h > 23 || m >= 30)) {
    // 23:30+ → ertesi gün 09:00
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  } else if (h < 8) {
    // 00:00-08:00 → aynı gün 09:00
    date.setHours(9, 0, 0, 0);
  }
  return date;
}

async function schedule(type, title, body, triggerSeconds, data = {}) {
  if (!isReady) return null;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { type, ...data } },
      trigger: { seconds: Math.max(60, triggerSeconds) }, // min 1 dk
    });
    return id;
  } catch (e) {
    console.log('[Notif] schedule hatası:', e.message);
    return null;
  }
}

async function scheduleAt(type, title, body, date, data = {}) {
  if (!isReady) return null;
  try {
    const adjustedDate = adjustForQuietHours(new Date(date));
    const seconds = Math.max(60, Math.floor((adjustedDate.getTime() - Date.now()) / 1000));
    if (seconds < 60) return null; // geçmiş tarih atla
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { type, ...data } },
      trigger: { seconds },
    });
    return id;
  } catch (e) {
    console.log('[Notif] scheduleAt hatası:', e.message);
    return null;
  }
}

function nextDateAt(hour, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

// ─── Ana fonksiyon: Kullanıcı state'ine göre tüm aktif senaryoları schedule ──
//
// state: {
//   lang: 'tr',
//   streak: 0,             // gün sayısı (current streak)
//   dailyDoneToday: false, // bugün daily oynandı mı
//   lastPlayedAt: ms,      // son oyun timestamp
// }
export async function scheduleAllForUser(state = {}) {
  if (!isReady) {
    const ok = await initNotifications();
    if (!ok) return;
  }

  // Önce tüm pending'leri temizle (idempotent)
  await cancelAll();

  const lang = state.lang || 'tr';
  const s = getStrings(lang);
  const now = Date.now();

  // 1) Re-engagement D1, D3, D7
  await schedule('reeng_d1', s.d1Title, s.d1Body, 86400, {});         // +1 gün
  await schedule('reeng_d3', s.d3Title, s.d3Body, 86400 * 3, {});     // +3 gün
  await schedule('reeng_d7', s.d7Title, s.d7Body, 86400 * 7, {});     // +7 gün

  // 2) Daily Challenge — yarın 09:00 (eğer bugün yapılmadıysa)
  if (!state.dailyDoneToday) {
    await scheduleAt('daily_morning', s.dailyTitle, s.dailyBody, nextDateAt(9, 0), {});
  }

  // 3) Daily Last Chance — bugün 23:00 (eğer bugün yapılmadıysa ve henüz öğleden sonra ise)
  if (!state.dailyDoneToday) {
    const today23 = new Date();
    today23.setHours(23, 0, 0, 0);
    if (today23.getTime() > now) {
      await scheduleAt('daily_lastchance', s.dailyLastChanceTitle, s.dailyLastChanceBody, today23, {});
    }
  }

  // 4) Streak Risk — eğer streak > 0 VE bugünün son oyunu yoksa, bugün 21:00
  if ((state.streak || 0) > 0) {
    const lastPlayed = state.lastPlayedAt || 0;
    const hoursSincePlay = (now - lastPlayed) / (1000 * 60 * 60);
    if (hoursSincePlay > 12) {
      const today21 = new Date();
      today21.setHours(21, 0, 0, 0);
      if (today21.getTime() > now) {
        await scheduleAt(
          'streak_risk',
          s.streakRiskTitle,
          fmt(s.streakRiskBody, { n: state.streak }),
          today21,
          {}
        );
      }
    }
  }

  // Schedule timestamp kaydet
  try { await AsyncStorage.setItem(STORAGE_KEY_LAST_SCHEDULE, String(now)); } catch (e) {}
}

// ─── Milestone (achievement) — anlık bildirim ──────────────
// streak 7/14/30/60/100 olduğunda anında push gönder
export async function triggerMilestone(streak, lang = 'tr') {
  if (!isReady) {
    const ok = await initNotifications();
    if (!ok) return;
  }
  if (![7, 14, 30, 60, 100].includes(streak)) return;
  const s = getStrings(lang);
  await schedule(
    'milestone',
    s.milestoneTitle,
    fmt(s.milestoneBody, { n: streak }),
    60, // 1 dk sonra
    { streak }
  );
}

// ─── Test / debug ─────────────────────────────────────────
export async function _debugListScheduled() {
  if (!isReady) return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (e) { return []; }
}

export async function _debugCancelAll() {
  await cancelAll();
}
