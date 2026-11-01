// Three-way merge: spendable balances use deltas, never a maximum.
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const union = (a = [], b = []) => [...new Set([...(Array.isArray(a)?a:[]), ...(Array.isArray(b)?b:[])])];
const number = value => Number.isFinite(value) ? value : 0;
export function cleanSnapshot(value) {
  return Object.fromEntries(Object.entries(object(value)).filter(([key]) => !key.startsWith('_cloud') && key !== 'walletHistory'));
}
function maximumMap(a, b) {
  const out = { ...object(a) };
  for (const [key, value] of Object.entries(object(b))) out[key] = Math.max(number(out[key]), number(value));
  return out;
}
export function mergeProgress(baseValue, localValue, remoteValue) {
  const base = cleanSnapshot(baseValue), local = cleanSnapshot(localValue), remote = cleanSnapshot(remoteValue);
  const merged = { ...remote };
  for (const [key, value] of Object.entries(local)) {
    if (JSON.stringify(value) !== JSON.stringify(base[key])) merged[key] = value;
  }
  const duplicateRuns = Object.keys(object(local.completionReceipts)).filter(key =>
    !base.completionReceipts?.[key] && remote.completionReceipts?.[key]);
  const duplicateClaims = Object.keys(object(local.achievementPayouts)).filter(key =>
    !base.achievementPayouts?.[key] && remote.achievementPayouts?.[key]);
  const duplicateVisits = Object.keys(object(local.dailyLoginReceipts)).filter(key =>
    !base.dailyLoginReceipts?.[key] && remote.dailyLoginReceipts?.[key]);
  const duplicateCoins = duplicateRuns.reduce((n,key) => n + number(local.completionReceipts[key].coins),0)
    + duplicateClaims.reduce((n,key) => n + number(local.achievementPayouts[key].coins),0)
    + duplicateVisits.reduce((n,key) => n + number(local.dailyLoginReceipts[key].coins),0);
  const duplicateXP = duplicateRuns.reduce((n,key) => n + number(local.completionReceipts[key].xp),0);
  for (const key of ['coins','xp','totalGames','totalWins']) {
    const correction = key === 'coins' ? duplicateCoins : key === 'xp' ? duplicateXP : duplicateRuns.length;
    merged[key] = number(remote[key]) + number(local[key]) - number(base[key]) - correction;
    if (merged[key] < 0) throw Object.assign(new Error('Cloud balance conflict'),{code:'BALANCE_CONFLICT'});
  }
  for (const key of ['currentLevel','bestScore']) merged[key] = Math.max(number(local[key]),number(remote[key]));
  merged.streak = local.streak !== base.streak ? number(local.streak) : number(remote.streak);
  for (const key of ['unlockedTools','unlockedThemes','claimedAchievementIds']) merged[key] = union(remote[key],local[key]);
  merged.levelStars = maximumMap(remote.levelStars,local.levelStars);
  for (const key of ['completionReceipts','achievementPayouts','dailyCompletions','dailyLoginReceipts']) merged[key] = { ...object(remote[key]), ...object(local[key]) };
  merged.toolCredits = { ...object(remote.toolCredits) };
  for (const tool of union(Object.keys(object(local.toolCredits)), Object.keys(object(base.toolCredits)))) {
    // Both devices may unlock the same tool, but its gift exists only once.
    const duplicateGift = !base.unlockedTools?.includes(tool) && local.unlockedTools?.includes(tool) && remote.unlockedTools?.includes(tool) ? 3 : 0;
    merged.toolCredits[tool] = number(remote.toolCredits?.[tool]) + number(local.toolCredits?.[tool]) - number(base.toolCredits?.[tool]) - duplicateGift;
    if (merged.toolCredits[tool] < 0) throw Object.assign(new Error('Cloud tool conflict'),{code:'BALANCE_CONFLICT'});
  }
  return merged;
}

function meaningful(p) {
  return number(p.currentLevel) > 1 || number(p.totalGames) > 0 || number(p.coins) !== 500;
}
function sameLegacyBalance(a,b) {
  return ['coins','currentLevel','totalGames','totalWins','bestScore','streak'].every(k=>number(a[k])===number(b[k]));
}
export function createCloudSync(deps) {
  let queue = Promise.resolve();
  const guard = id => { if (deps.getAccountId() !== id) throw Object.assign(new Error('Account changed during sync'),{code:'ACCOUNT_CHANGED'}); };
  async function run(id, choice) {
    guard(id);
    let journal = await deps.readJournal(id) || {};
    let local = await deps.loadLocal(); guard(id);
    if (local._cloudOwner && local._cloudOwner !== id) throw Object.assign(new Error('Local save belongs to another account'),{code:'ACCOUNT_CHANGED'});
    if (!local._cloudOwner && !meaningful(local) && journal.backup && meaningful(journal.backup)) {
      local = await deps.applyLocal(cur => { guard(id); return { ...cur, ...journal.backup, _cloudOwner:id }; }); guard(id);
    }
    // Keep the last local copy even if the first network read fails.
    journal = { ...journal, backup: local }; await deps.writeJournal(id,journal);
    let remote = await deps.readRemote(id); guard(id);
    if (!journal.baseline && !journal.pending) {
      journal = { ...journal, bootstrapLocal:journal.bootstrapLocal || cleanSnapshot(local), bootstrapRemote:remote.state };
      await deps.writeJournal(id,journal);
      if (remote.state && meaningful(local) && !sameLegacyBalance(local,remote.state) && !choice) {
        throw Object.assign(new Error('Choose the device or cloud save'), {code:'BOOTSTRAP_CONFLICT', local:cleanSnapshot(local), remote:remote.state});
      }
      if (remote.state && (choice === 'cloud' || (!meaningful(local) && choice !== 'device'))) {
        const restored = await deps.applyLocal(cur => { guard(id); return { ...cur, ...remote.state, _cloudOwner:id }; }); guard(id);
        journal = { ...journal, baseline:cleanSnapshot(restored), backup:restored };
        await deps.writeJournal(id,journal);
        return restored;
      }
      // Explicit device selection replaces the ambiguous initial balance once.
      // Preserve both copies for recovery rather than silently using max().
      journal = { ...journal, bootstrapRemote:remote.state, baseline:remote.state || {
        coins:500,xp:0,totalGames:0,totalWins:0,currentLevel:1,bestScore:0,streak:0,toolCredits:{},unlockedTools:[],completionReceipts:{},achievementPayouts:{} } };
      if (choice === 'device') journal.baseline = cleanSnapshot(local);
    }
    if (!journal.pending && remote.state && JSON.stringify(cleanSnapshot(local)) === JSON.stringify(journal.baseline)
      && JSON.stringify(remote.state) === JSON.stringify(journal.baseline)) return local;
    if (!journal.pending) {
      local = await deps.loadLocal(); guard(id);
      journal.pending = { id:deps.createRequestId(), sent:cleanSnapshot(local), base:journal.baseline,
        initial:!remote.state, replace:choice === 'device' };
      await deps.writeJournal(id,journal);
    }
    const pending = journal.pending;
    let accepted;
    for (let attempt=0;attempt<4;attempt++) {
      guard(id);
      const state = !remote.state || pending.replace ? pending.sent : mergeProgress(pending.base,pending.sent,remote.state);
      try { accepted = await deps.commitRemote(id,pending.id,remote.revision,state); break; }
      catch (e) {
        if (e.code !== 'SYNC_CONFLICT' || pending.replace) throw e;
        remote = await deps.readRemote(id); guard(id);
      }
    }
    if (!accepted) throw Object.assign(new Error('Cloud changed repeatedly'),{code:'SYNC_CONFLICT'});
    guard(id);
    const applied = await deps.applyLocal(cur => {
      guard(id);
      if (cur._cloudAppliedRequests?.includes(pending.id)) return cur;
      const state = mergeProgress(pending.sent,cur,accepted.state);
      return { ...cur, ...state, _cloudOwner:id,
        _cloudAppliedRequests:union(cur._cloudAppliedRequests,[pending.id]).slice(-64) };
    });
    guard(id);
    await deps.writeJournal(id,{ ...journal, baseline:accepted.state, backup:applied, pending:null, lastSyncedAt:Date.now() });
    return applied;
  }
  return (id,choice) => {
    const next = queue.then(()=>run(id,choice));
    queue = next.catch(()=>{});
    return next;
  };
}
