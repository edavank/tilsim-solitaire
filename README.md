# 🎮 Tılsım Solitaire

Kelime/Kart bulmaca oyunu. Klasik Klondike Solitaire mekaniği + kelime kategorizasyonu.

## 🚀 Kurulum

```bash
npm install --legacy-peer-deps
npx expo start
```

## 📱 Özellikler

- 50 bölüm (artan zorluk)
- Türkçe kelime kategorileri (meyveler, hayvanlar, gezegenler...)
- Sütunlar arası kart yığma (solitaire mekaniği)
- Toplu kart yerleştirme
- Akıllı ipucu sistemi
- Deste geri dönüşümü
- AsyncStorage ile kalıcı kayıt
- Sparkle + shake animasyonları
- Haptic feedback
- 9 farklı ekran (ana sayfa, oyun, ayarlar, mağaza, liderler, bölümler, temalar)

## 🏗️ EAS Build

```bash
npx eas build --profile production --platform ios
npx eas build --profile production --platform android
```

## 📂 Dosya Yapısı

```
app/
  index.js        # Ana sayfa
  game.js         # Oyun ekranı
  settings.js     # Ayarlar
  store.js        # Mağaza
  leaderboard.js  # Liderler
  levels.js       # Bölüm seçimi
  themes.js       # Tema seçici
src/
  constants/theme.js     # Cosmic Dawn design system
  components/BottomNav.js
  data/levels.js         # 10 elle yazılmış bölüm
  data/levelGenerator.js # 40 otomatik bölüm
  utils/storage.js       # AsyncStorage
  utils/sounds.js        # Haptic + ses altyapısı
```

## 🎨 Tasarım: Cosmic Dawn

- Gradient: `#6B5B8A` → `#3D3560`
- Primary: `#FF8AA7` (pembe)
- Tertiary: `#FF9F4A` (turuncu)
- Font: Plus Jakarta Sans + Be Vietnam Pro + Fondamento
- Maskot: Bilge (baykuş)
