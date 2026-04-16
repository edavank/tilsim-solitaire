// Koleksiyon Albümü — dilden bağımsız (canonical index) anahtar ile saklanır.
// BUG FIX (tur 5/B): Eskiden anahtar olarak dilin yerel kategori adı
// ("Meyveler" / "Fruits" / "Früchte" vb.) kullanılıyordu, dil değiştirince
// aynı kategori farklı kayıt gibi görünüp ilerleme kayboluyordu. Artık
// her kategorinin WORD_POOLS[lang] pool'undaki pozisyonu (index)
// canonical anahtar olarak saklanıyor. İlk 20 kategori tüm dillerde
// hizalı olduğu için indexler diller arası uyumlu.
import { WORD_POOLS } from '../data/wordPools';

let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

const COL_KEY = '@tilsim_collection';

// Serial lock — eşzamanlı markCategoryCompleted çağrılarında kayıp önler
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

// Verilen dildeki kategori adını, o dilin pool'undaki index'e çevir.
// Bulunamazsa herhangi bir dilde arar (migration için). -1 dönerse kayıt atılır.
function nameToIdx(name, language = 'tr') {
  const pool = WORD_POOLS[language] || WORD_POOLS.tr;
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].name === name) return i;
  }
  for (const lang of Object.keys(WORD_POOLS)) {
    if (lang === language) continue;
    const p = WORD_POOLS[lang];
    for (let i = 0; i < p.length; i++) {
      if (p[i].name === name) return i;
    }
  }
  return -1;
}

// Eski (isim anahtarlı) kayıtları yeni (idx anahtarlı) formata taşı.
// Idempotent — her load'da güvenle çalışır.
function migrate(raw) {
  const out = {};
  for (const [key, val] of Object.entries(raw || {})) {
    if (/^idx_\d+$/.test(key)) {
      out[key] = val;
      continue;
    }
    const idx = nameToIdx(key);
    if (idx >= 0) {
      const newKey = `idx_${idx}`;
      if (out[newKey]) {
        out[newKey] = {
          seen: (out[newKey].seen || 0) + (val.seen || 0),
          completed: (out[newKey].completed || 0) + (val.completed || 0),
          firstSeen: Math.min(out[newKey].firstSeen || Date.now(), val.firstSeen || Date.now()),
          lastCompleted: Math.max(out[newKey].lastCompleted || 0, val.lastCompleted || 0),
        };
      } else {
        out[newKey] = val;
      }
    }
  }
  return out;
}

async function loadRaw() {
  try {
    if (!AsyncStorage) return {};
    const raw = await AsyncStorage.getItem(COL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

async function saveRaw(data) {
  try {
    if (!AsyncStorage) return;
    await AsyncStorage.setItem(COL_KEY, JSON.stringify(data));
  } catch (e) {}
}

// Public API — geriye dönük uyumlu. `language` verilirse o dildeki isimlerle
// anahtarlanmış map döner (UI'lar isimle sorguluyor). Verilmezse idx-keyed.
export async function loadCollection(language) {
  const raw = await loadRaw();
  const migrated = migrate(raw);
  if (JSON.stringify(raw) !== JSON.stringify(migrated)) {
    await saveRaw(migrated);
  }
  if (language) {
    const pool = WORD_POOLS[language] || WORD_POOLS.tr;
    const byName = {};
    for (let i = 0; i < pool.length; i++) {
      const rec = migrated[`idx_${i}`];
      if (rec) byName[pool[i].name] = rec;
    }
    return byName;
  }
  return migrated;
}

export async function markCategorySeen(catName, language = 'tr') {
  if (!AsyncStorage) return;
  const idx = nameToIdx(catName, language);
  if (idx < 0) return;
  return withLock(COL_KEY, async () => {
    try {
      const raw = await loadRaw();
      const col = migrate(raw);
      const key = `idx_${idx}`;
      if (!col[key]) col[key] = { seen: 0, completed: 0, firstSeen: Date.now() };
      col[key].seen++;
      await saveRaw(col);
    } catch (e) {}
  });
}

export async function markCategoryCompleted(catName, language = 'tr') {
  if (!AsyncStorage) return;
  const idx = nameToIdx(catName, language);
  if (idx < 0) return;
  return withLock(COL_KEY, async () => {
    try {
      const raw = await loadRaw();
      const col = migrate(raw);
      const key = `idx_${idx}`;
      if (!col[key]) col[key] = { seen: 0, completed: 0, firstSeen: Date.now() };
      col[key].completed++;
      col[key].lastCompleted = Date.now();
      await saveRaw(col);
    } catch (e) {}
  });
}
