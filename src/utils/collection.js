// Koleksiyon Albümü — keşfedilen kategoriler
let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

const COL_KEY = '@tilsim_collection';

export async function loadCollection() {
  try {
    if (!AsyncStorage) return {};
    const raw = await AsyncStorage.getItem(COL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

export async function markCategorySeen(catName) {
  try {
    if (!AsyncStorage) return;
    const col = await loadCollection();
    if (!col[catName]) col[catName] = { seen: 0, completed: 0, firstSeen: Date.now() };
    col[catName].seen++;
    await AsyncStorage.setItem(COL_KEY, JSON.stringify(col));
  } catch (e) {}
}

export async function markCategoryCompleted(catName) {
  try {
    if (!AsyncStorage) return;
    const col = await loadCollection();
    if (!col[catName]) col[catName] = { seen: 0, completed: 0, firstSeen: Date.now() };
    col[catName].completed++;
    col[catName].lastCompleted = Date.now();
    await AsyncStorage.setItem(COL_KEY, JSON.stringify(col));
  } catch (e) {}
}
