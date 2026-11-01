import { updateProgress, loadLevelStars, loadXP } from './storage';

export const TOOL_UNLOCK_LEVELS = { hint: 2, undo: 3, joker: 5, shuffle: 7, delete: 10 };

export function calculateCompletion({ game, level, mode = 'classic', elapsedTime = 0, timeLimit = 180 }) {
  const remaining = Math.min(level.moves, Math.max(0, game.moves - (game.extraMovesGranted || 0)));
  const ratio = remaining / level.moves;
  const moveBonus = mode === 'timed' ? Math.min(level.id * 2, 50) : Math.floor(8 * ratio);
  const speedBonus = elapsedTime < 60 ? 20 : elapsedTime < 120 ? 10 : elapsedTime < 180 ? 5 : 0;
  const stars = mode === 'timed'
    ? (elapsedTime <= timeLimit * .5 ? 3 : elapsedTime <= timeLimit * .75 ? 2 : 1)
    : (ratio > .5 ? 3 : ratio > .25 ? 2 : 1);
  return { baseCoins: mode === 'daily' ? 100 : 30, moveBonus, speedBonus,
    coins: (mode === 'daily' ? 100 : 30) + moveBonus + speedBonus, stars,
    xp: mode === 'daily' ? 0 : stars * 50 + Math.floor(level.id / 5) * 10 };
}

// All completion money, XP, stars and unlock gifts are one progress write.
// Navigation and retries can call this repeatedly using the same receipt key.
export async function settleCompletion(input) {
  const { game, level, mode = 'classic', date, dailyAlreadyCompleted = false } = input;
  if (!game.isComplete || !game.runId) throw new Error('Invalid completed game');
  const key = mode === 'daily' ? `daily:${date}` : `run:${game.runId}`;
  if (mode === 'daily' && !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Missing daily date');
  const summary = calculateCompletion(input);
  const [legacyStars, legacyXP] = await Promise.all([loadLevelStars(), loadXP()]);
  let receipt;
  let firstSettlement = false;
  const progress = await updateProgress(cur => {
    if ((game.resetEpoch || null) !== (cur.resetEpoch || null)) throw Object.assign(new Error('Bu bölüm sıfırlama öncesine ait.'),{code:'DATA_RESET'});
    if (cur.completionReceipts?.[key]) {
      receipt = cur.completionReceipts[key];
      if (mode === 'daily' && receipt.runId !== game.runId) receipt = { ...receipt, coins:0, xp:0, baseCoins:0, moveBonus:0, speedBonus:0, alreadyRewarded:true };
      return {};
    }
    firstSettlement = true;
    const paid = mode === 'daily' && dailyAlreadyCompleted ? { ...summary, baseCoins:0, moveBonus:0, speedBonus:0, coins:0, xp:0, alreadyRewarded:true } : summary;
    const nextLevel = mode === 'daily' ? (cur.currentLevel || 1) : Math.max(cur.currentLevel || 1, level.id + 1);
    const unlockedTools = [...(cur.unlockedTools || [])];
    const toolCredits = { ...(cur.toolCredits || {}) };
    const newTools = [];
    if (mode !== 'daily') for (const [tool, threshold] of Object.entries(TOOL_UNLOCK_LEVELS)) {
      if (nextLevel >= threshold && !unlockedTools.includes(tool)) {
        unlockedTools.push(tool); newTools.push(tool); toolCredits[tool] = (toolCredits[tool] || 0) + 3;
      }
    }
    receipt = { ...paid, key, runId: game.runId, levelId: level.id, mode, date,
      newTools, finishedAt: Date.now(), score: game.score };
    const levelStars = { ...(cur.levelStars || legacyStars) };
    if (mode !== 'daily') levelStars[level.id] = Math.max(levelStars[level.id] || 0, paid.stars);
    const dailyCompletions = { ...(cur.dailyCompletions || {}) };
    if (mode === 'daily') dailyCompletions[date] = true;
    return { currentLevel: nextLevel, coins: (cur.coins || 0) + paid.coins,
      totalGames: (cur.totalGames || 0) + 1, totalWins: (cur.totalWins || 0) + 1,
      bestScore: Math.max(cur.bestScore || 0, game.score),
      streak: mode === 'daily' ? (cur.streak || 0) : (cur.streak || 0) + 1,
      xp: (Number.isFinite(cur.xp) ? cur.xp : legacyXP.xp) + paid.xp,
      levelStars, dailyCompletions, unlockedTools, toolCredits,
      completionReceipts: { ...(cur.completionReceipts || {}), [key]: receipt }, lastPlayedAt: Date.now() };
  }, { id:`completion:${key}`,kind:'reward',source:mode === 'daily' ? 'daily' : 'level',levelId:level.id,
    description:mode === 'daily' ? 'Günlük bulmaca ödülü' : `Bölüm ${level.id} ödülü`,runId:game.runId });
  return { progress, receipt, firstSettlement };
}
