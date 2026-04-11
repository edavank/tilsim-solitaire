# 🎮 TALISIM SOLITAIRE — Oyun Tasarım Dokümanı (GDD) v2.0

**Proje:** Tılsım Solitaire
**Platform:** iOS + Android (Expo SDK 54 + React Native)
**Repo:** github.com/edavank/tilsim-solitaire
**Dil:** Türkçe
**Tür:** Kelime/Kart Bulmaca (Word Solitaire)
**Referans:** "Kelime İskambil - Solitaire" (Astrasen Global)
**Maskot:** Bilge (mavi baykuş, sarı gözlü, turuncu gagalı)

---

## 1. OYUNUN TEMEL KONSEPTİ

Klasik Klondike Solitaire'in kart dizilim mekaniği ile kelime kategorizasyonu birleştirilmiş 2D bulmaca oyunu. Oyuncu, sahada üst üste yığılmış kelime kartlarını doğru kategori alanlarına yerleştirerek ekranı temizler. Fark: kartlarda sayılar yerine kelimeler var, suit yerine kategoriler var.

---

## 2. VERİ YAPISI (Data Model)

### 2.1 Kart Objesi (Card)

```javascript
{
  id: string,              // Benzersiz: "w-0-Elma" veya "cat-0"
  type: 'word' | 'category', // İki tür kart var
  word: string,            // Kart üzerindeki metin: "Elma" veya "Soğuk içecekler"
  categoryIndex: number,   // Ait olduğu kategori (0, 1, 2...)
  categoryName: string,    // "Meyveler" (sadece word kartlarında)
  totalWords: number,      // Sadece category kartlarında: bu kategoride kaç kelime var
  emoji: string,           // Kart üzerindeki görsel: "🍎"
  faceUp: boolean,         // Açık mı kapalı mı
}
```

### 2.2 Oynanabilirlik Kuralı (isPlayable)

Bir kart şu koşullarda oynanabilir:
- `faceUp === true` (açık olmalı)
- Sütundaki **en alttaki** kart olmalı (üzerinde başka açık kart olmamalı)
- Bulunduğu sütun kilitli olmamalı

Kapalı kartlar (`faceUp: false`) turuncu arka planla gösterilir, tıklanamaz.

### 2.3 İki Tür Kart

| Özellik | Kelime Kartı | Kategori Kartı |
|---------|-------------|----------------|
| `type` | `'word'` | `'category'` |
| Görünüm | Beyaz bg, krem border, emoji + kelime | Beyaz bg, turuncu border, joker ikon + "0/N" + kategori adı |
| İşlev | Doğru kategoriye yerleştirilir | Foundation slotuna yerleştirilir → kategoriyi aktifleştirir |
| Nerede başlar | Sütunlarda karışık | Sütunlarda karışık (kelime kartlarıyla birlikte) |

### 2.4 Sütun (Column) Objesi

```javascript
{
  locked: boolean,     // Kilitli mi (reklam/coin ile açılır)
  cards: Card[],       // Üst üste yığılmış kartlar (index 0 = en üst/kapalı, son = en alt/açık)
}
```

### 2.5 Foundation Slot Objesi

```javascript
{
  locked: boolean,         // Kilitli mi
  category: Card | null,   // Yerleştirilmiş kategori kartı (null = boş)
  placedCards: Card[],      // Bu kategoriye yerleştirilmiş kelime kartları
}
```

### 2.6 Oyun State'i (GameState)

```javascript
{
  levelId: number,
  moves: number,           // Kalan hamle
  maxMoves: number,        // Başlangıç hamlesi
  hints: number,           // Kalan ipucu hakkı
  undos: number,           // Kalan geri alma hakkı
  deck: Card[],            // Çekilmemiş kartlar (kapalı deste)
  drawnCards: Card[],       // Desteden çekilmiş kartlar (son 3 görünür)
  columns: Column[],       // Tableau sütunları (TEK SATIR)
  slots: Slot[],           // Foundation slotları (üstte)
  coins: number,
  score: number,
  isComplete: boolean,
  isFailed: boolean,
}
```

---

## 3. ÇEKİRDEK OYNANIŞI (Core Game Loop)

### 3.1 Oyun Başlangıcı

1. Bölüm verisi yüklenir (level JSON)
2. Tüm kelime kartları + kategori kartları karıştırılır
3. Kartlar sütunlara dağıtılır (her sütunda N kart, sadece en alttaki açık)
4. Kalan kartlar desteye konur
5. Foundation slotları boş başlar (kategoriler henüz aktif değil)

### 3.2 Oyun Akışı (Turn Flow)

```
┌─────────────────────────────────────────────────┐
│  1. Oyuncu bir kaynak seçer:                     │
│     a) Sütundaki en alttaki açık karta dokunur   │
│     b) Desteden kart çeker (desteye dokunur)     │
│     c) Çekilen kartlar yığınının üstüne dokunur  │
│                                                   │
│  2. Kart seçilir (pembe glow + büyüme)           │
│                                                   │
│  3. Oyuncu hedef seçer:                           │
│     → Foundation slotuna dokunur                  │
│                                                   │
│  4. Doğrulama (Validation):                       │
│     ┌──────────────────────────────────────┐      │
│     │ Seçili kart = KATEGORİ kartı?        │      │
│     │   Hedef slot boş mu?                 │      │
│     │     EVET → Kategori yerleşir ✅       │      │
│     │     HAYIR → Ret (zaten dolu) ⚠️      │      │
│     │                                      │      │
│     │ Seçili kart = KELİME kartı?          │      │
│     │   Hedef slotta kategori var mı?      │      │
│     │     HAYIR → Ret (önce kategori) ⚠️   │      │
│     │     EVET → categoryIndex eşleşiyor mu?│     │
│     │       EVET → Doğru yerleşme ✅ +10    │      │
│     │       HAYIR → Yanlış ❌ -1 hamle      │      │
│     └──────────────────────────────────────┘      │
│                                                   │
│  5. Kart kaynaktan kaldırılır                     │
│     → Sütundan kaldırıldıysa: altındaki kart     │
│       otomatik açılır (flip animasyonu)           │
│                                                   │
│  6. Hamle sayısı -1                               │
│                                                   │
│  7. Kazanma/kaybetme kontrolü                     │
└─────────────────────────────────────────────────┘
```

### 3.3 Kategorilerin Keşfedilme Mekaniği

**⚠️ KRİTİK MEKANİK — Orijinal oyundan farklı kılan özellik:**

Kategoriler oyun başında görünür DEĞİL. Kategori kartları, normal kelime kartlarıyla birlikte sütunlarda karışık olarak bulunur. Oyuncu:

1. Sütunlarda kapalı kartları açarak kategori kartını bulur
2. Kategori kartını seçer
3. Üstteki boş foundation slotuna yerleştirir
4. O andan itibaren o kategoriye kelime kartları yerleştirilebilir

**Strateji boyutu:** Oyuncu hangi kategoriyi önce açacağına karar verir. Yanlış sırada açmak oyunu çıkmaza sokabilir.

### 3.4 Kart Kaynakları

Oyuncunun kart alabileceği 2 kaynak:

| Kaynak | Nasıl | Kural |
|--------|-------|-------|
| **Sütunlar** | En alttaki açık karta dokunma | Sadece en alt kart seçilebilir |
| **Çekilen kartlar** | Desteye dokunarak kart çekme, sonra çekilen kartın üstüne dokunma | Sadece en üstteki çekilen kart seçilebilir, son 3 kart görünür |

### 3.5 Katman Açılma Mekaniği (Solitaire Core)

```
Sütun durumu (başlangıç):
  [Kapalı] ← index 0, en üstte
  [Kapalı] ← index 1
  [Kapalı] ← index 2
  [Açık: "Elma"] ← index 3, en altta, oynanabilir

Oyuncu "Elma"yı doğru kategoriye yerleştirir:
  [Kapalı] ← index 0
  [Kapalı] ← index 1
  [Açık: "Kedi"] ← index 2, OTOMATİK AÇILDI, artık oynanabilir

Bu şekilde sütun tamamen boşalana kadar devam eder.
```

---

## 4. KAZANMA VE KAYBETME (Win/Fail States)

### Kazanma (Win)
Tüm koşullar karşılandığında:
- Tüm kategori kartları foundation slotlarına yerleştirilmiş
- Her kategorinin tüm kelime kartları yerleştirilmiş (placedCards.length === totalWords)
- `isComplete = true` → Tebrikler ekranı

### Kaybetme (Fail)
- `moves <= 0` VE `isComplete === false`
- `isFailed = true` → Hamlen Bitti ekranı
- Seçenekler: +20 hamle (video izle), tekrar oyna, ana sayfa

### Puan Hesaplama

| Aksiyon | Puan |
|---------|------|
| Kategori yerleştirme | +5 |
| Doğru kelime yerleştirme | +10 |
| Yanlış yerleştirme | +0 (sadece hamle kaybı) |
| Bölüm tamamlama bonusu | +50 × kalan hamle oranı |

---

## 5. ZORLUK EĞRİSİ (Level Scaling)

### Bölüm Parametreleri

```javascript
// Bölüm veri yapısı
{
  id: number,
  moves: number,           // Başlangıç hamle sayısı
  hints: number,           // İpucu hakkı
  undos: number,           // Geri alma hakkı
  categories: [            // Kategoriler
    { name: string, words: string[] }
  ],
  totalSlots: number,      // Foundation slot sayısı
  lockedSlots: number,     // Kilitli slot sayısı (sol baştan)
  columns: [               // Sütun tanımları (TEK SATIR)
    { locked: true },      // Kilitli sütun
    { depth: 6 },          // Aktif sütun, 6 kart derinliğinde
    { depth: 5 },
    ...
  ],
}
```

### Zorluk Tablosu

| Bölüm | Kategori | Kelime/Kat. | Sütun | Derinlik | Hamle | Kilitli |
|-------|----------|-------------|-------|----------|-------|---------|
| 1-5 | 3 | 4 | 4-5 | 2-3 | 50-60 | 1 slot, 1 sütun |
| 6-15 | 3-4 | 4-5 | 5 | 3-4 | 40-55 | 1 slot, 1 sütun |
| 16-30 | 4-5 | 4-6 | 5-6 | 4-5 | 35-50 | 1-2 slot, 1 sütun |
| 31-50 | 5-6 | 5-8 | 5-6 | 5-6 | 30-45 | 2 slot, 1 sütun |
| 51+ | 6+ | 6-8 | 6 | 6+ | 25-40 | 2 slot, 1 sütun |

### Zorluk Mekanikleri

1. **Daha fazla kategori** (3 → 6+)
2. **Daha az hamle** (60 → 25)
3. **Daha derin sütunlar** (2 → 6+ kapalı kart)
4. **Daha fazla kelime per kategori** (4 → 8)
5. **Kesişen kelimeler** (Örn: "Dal" hem ağaç hem müzik terimi — ileri seviyelerde)
6. **Nadir/zor kelimeler** (yaygın → nadir Türkçe kelimeler)

### Çözülebilirlik Garantisi (Solvability)

Her bölümün çözülebilir olduğu garanti edilmelidir:
- Kart dağıtımı tamamen rastgele DEĞİL
- `generateGameState()` fonksiyonu kartları karıştırır ama her zaman en az bir çözüm yolu olacak şekilde dağıtır
- Kategori kartları, o kategorinin kelime kartlarından ÖNCE erişilebilir pozisyonda olmalı (en azından destede veya sığ derinlikte)

---

## 6. EKRAN YAPISI VE UI

### 6.1 Oyun Ekranı Layout (Üstten Alta)

```
┌─────────────────────────────────────────┐
│ [$310]      BÖLÜM 23           [⚙️]     │ ← Header
├─────────────────────────────────────────┤
│ ┌──────┐                    ┌──────┐    │
│ │HAMLE │  [Çekilen kartlar] │Deste │    │ ← Deck Row
│ │ 128  │  (son 3 görünür)   │  24  │    │
│ │+20 ▶ │                    │      │    │
│ └──────┘                    └──────┘    │
├─────────────────────────────────────────┤
│ [KİLİT] [0/6] [0/6] [0/6] [0/6] [0/6] │ ← Foundation Slotları
│  ▶AD    🃏    🃏    🃏    🃏    🃏     │   (boş, kategori bekliyor)
├─────────────────────────────────────────┤
│ [KİLİT] [████] [████] [████] [████]    │ ← Tableau Sütunları
│  ▶AD    [████] [████] [████] [Ayran]   │   (TEK SATIR)
│         [████] [████] [Bas ]           │
│         [████] [Çam ]                  │
│         [Müzik]                        │
│          0/4                           │
├─────────────────────────────────────────┤
│   [⚡İPUCU] [↩GERİ AL] [✨SİL] [🔍]   │ ← Toolbar
├─────────────────────────────────────────┤
│  🏪 MAĞAZA   🏠 ANA SAYFA  📊 LİDERLER │ ← Bottom Nav
└─────────────────────────────────────────┘
```

**⚠️ Sütunlar TEK SATIR — İkinci satır YOK. Kartlar derinleştikçe aşağı uzar, sayfa scroll olur.**

### 6.2 Kart Görünümleri

**Açık Kart (Kelime):**
```
┌─────────┐
│   🍎    │ ← Emoji/illüstrasyon
│  ELMA   │ ← Kelime (uppercase, küçük font)
└─────────┘
Beyaz bg, krem border (#E8DDCC), rounded 10px
```

**Açık Kart (Kategori):**
```
┌─────────┐
│    0/6 🃏│ ← Sağ üst: ilerleme + joker
│   🎵    │ ← Joker/kategori ikonu
│  Müzik  │ ← Kategori adı
└─────────┘
Beyaz bg, turuncu border (#FFB074, 2.5px)
```

**Kapalı Kart:**
```
┌─────────────┐
│ ┌─────────┐ │ ← Turuncu gradient (#FF8C42→#E67530)
│ │ ┌─────┐ │ │ ← İç çerçeve 1 (beyaz %30)
│ │ │     │ │ │ ← İç çerçeve 2 (beyaz %15)
│ │ └─────┘ │ │
│ └─────────┘ │
└─────────────┘
Border: #FFB074, DOKU/PATTERN YOK
```

**Seçili Kart:**
- Pembe border (#FF8AA7, 2.5px)
- Pembe glow shadow
- Scale 1.05 (hafif büyüme)

### 6.3 Foundation Slot Durumları

| Durum | Görünüm | Etkileşim |
|-------|---------|-----------|
| Kilitli | "KİLİDİ AÇ" + joker ikon + "▶ AD" badge | Reklam izleyerek açılır |
| Boş | Joker ikon (soluk) + "0/6" | Kategori kartı yerleştirilir |
| Aktif | Beyaz bg, renkli border, kategori adı + ilerleme | Kelime kartı yerleştirilir |
| Dolu | Yeşil ✓ badge | Etkileşim yok |

### 6.4 Tüm Ekranlar

| # | Ekran | Açıklama |
|---|-------|----------|
| 1 | Ana Sayfa | Logo, Bilge, "Bölüm X" butonu, reklam butonu |
| 2 | Oyun Ekranı | Ana oyun ekranı (yukarıdaki layout) |
| 3 | Bölüm Tamamlandı | Mutlu Bilge, yıldız, skor, coin, "Sonraki Bölüm" |
| 4 | Bölüm Başarısız | Üzgün Bilge, "+20 Hamle", "Tekrar Oyna" |
| 5 | Mağaza | Coin paketleri, güçlendiriciler, premium |
| 6 | Ayarlar | Ses, müzik, dil, hesap, gizlilik |
| 7 | Liderler | Haftalık/aylık sıralama, podium |
| 8 | Tema Seçici | Arkaplan + kart arkaları, kilitli temalar |
| 9 | Reklam Popup | Reklamsız deneyim satın alma |

---

## 7. EKONOMİ SİSTEMİ

### 7.1 Coin Kazanma

| Kaynak | Miktar |
|--------|--------|
| Bölüm tamamlama | +50-100 (zorluğa göre) |
| Reklam izleme | +30-50 |
| Günlük giriş bonusu | +20 |
| Ardışık giriş (streak) | +20 × gün sayısı (max 7) |

### 7.2 Coin Harcama

| Aksiyon | Maliyet |
|---------|---------|
| İpucu kullanma | 10 coin |
| Geri alma kullanma | 15 coin |
| Sil kullanma | 20 coin |
| +20 hamle ekleme | 25 coin |
| Kilitli sütun/slot açma (coin ile) | 40 coin |
| Kilitli tema açma | 200-1000 coin |

### 7.3 Premium (IAP)

| Ürün | Fiyat |
|------|-------|
| 100 Altın | ₺9.99 |
| 500 Altın | ₺29.99 |
| 2000 Altın | ₺79.99 |
| 5x İpucu | 100 Altın |
| 5x Geri Al | 150 Altın |
| Reklamsız | ₺49.99/yıl |

---

## 8. ARAÇ ÇUBUĞU (Toolbar)

### 8.1 İpucu (Hint)

- **İkon:** ⚡ (bolt)
- **Badge:** Kalan hak sayısı (kırmızı)
- **Etki:** Sahada oynanabilir bir doğru kart bulur → o kartı ve gitmesi gereken hedefi parlatır (pulse animasyonu, 3x büyü-küçül, 2 saniye)
- **Maliyet:** 10 coin VEYA 1 hak
- **Hamle düşürme:** Hayır (ipucu hamle düşürmez)

### 8.2 Geri Al (Undo)

- **İkon:** ↩ (undo)
- **Badge:** "+" (yeşil, reklam ile yenilenebilir)
- **Etki:** Son hamleyi geri alır (state history'den önceki state'e döner)
- **Maliyet:** 15 coin VEYA reklam izle
- **Kısıt:** Sadece 1 hamle geri alınabilir (ardışık undo yok, reklam/coin ile yenilenir)

### 8.3 Sil (Delete)

- **İkon:** ✨ (auto_fix_normal)
- **Badge:** "+" (yeşil)
- **Etki:** Çekilen kartlar yığınından en üstteki kartı tamamen siler (oyundan çıkarır)
- **Maliyet:** 20 coin VEYA reklam izle
- **Hamle düşürme:** -1 hamle
- **Not:** Sütundaki kartları silemez, sadece çekilen kartları siler

### 8.4 Arama (Search)

- **İkon:** 🔍 (search)
- **Etki:** Seçili kelimenin anlamını/açıklamasını gösterir
- **Maliyet:** Ücretsiz
- **Not:** Eğitici boyut — oyuncu bilmediği kelimeleri öğrenir

---

## 9. ANİMASYONLAR

| Animasyon | Tetikleyici | Açıklama | Süre |
|-----------|-------------|----------|------|
| cardFlip | Kapalı kart açılır | 3D Y ekseni flip | 400ms |
| popIn | Kart kategoriye yerleşir | Scale 0.6→1 + bounce | 300ms |
| shake | Yanlış yerleştirme | Slot sola-sağa ±8px | 250ms |
| sparkle | Doğru yerleştirme | 10-14 renkli parçacık | 500ms |
| pulse | İpucu gösterimi | 3x scale 1→1.08 | 600ms |
| glowPulse | Ana sayfa butonu | Turuncu glow 0.3→0.7 opacity | 2s loop |
| owlBounce | Ana sayfa Bilge | 15px yukarı-aşağı | 4s loop |
| snapBack | Sürükleme iptal | Spring animasyonu ile geri | 300ms |
| cardDeal | Desteden kart çekme | Desteden sola kayma | 200ms |
| fadeIn | Sayfa geçişi | Opacity 0→1 + translateY 12→0 | 600ms |

---

## 10. TEKNİK MİMARİ

### 10.1 Dosya Yapısı

```
tilsim-solitaire/
├── app/
│   ├── _layout.js          # Root layout (font yükleme, StatusBar)
│   ├── index.js             # Ana Sayfa
│   ├── game.js              # Oyun Ekranı
│   ├── settings.js          # Ayarlar (TODO)
│   ├── store.js             # Mağaza (TODO)
│   └── leaderboard.js       # Liderler (TODO)
├── src/
│   ├── constants/
│   │   └── theme.js         # Renk paleti, fontlar, spacing
│   ├── components/
│   │   ├── Header.js        # Üst bar
│   │   └── BottomNav.js     # Alt navigasyon
│   ├── data/
│   │   └── levels.js        # Bölüm verileri + generateGameState()
│   └── utils/
│       ├── gameEngine.js    # Oyun motoru (TODO: ayrıştır)
│       └── storage.js       # AsyncStorage (TODO)
├── assets/
│   ├── bilge-happy.png      # Maskot (mutlu)
│   ├── bilge-sad.png        # Maskot (üzgün) (TODO)
│   └── ...
└── package.json
```

### 10.2 State Yönetimi

Şu an: `useState` + `useCallback` ile lokal state
Hedef: `zustand` veya `useReducer` ile merkezi state

```javascript
// Gelecek: useReducer pattern
function gameReducer(state, action) {
  switch (action.type) {
    case 'DRAW_CARD': ...
    case 'SELECT_CARD': ...
    case 'PLACE_CARD': ...
    case 'UNDO': ...
    case 'USE_HINT': ...
    case 'DELETE_DRAWN': ...
    case 'UNLOCK_SLOT': ...
    case 'UNLOCK_COLUMN': ...
  }
}
```

### 10.3 Kart Boyutlandırma (Responsive)

```javascript
const COL_COUNT = 5;
const COL_GAP = 5;
const CARD_W = Math.floor((SCREEN_WIDTH - 20 - (COL_COUNT - 1) * COL_GAP) / COL_COUNT);
const CARD_H = Math.floor(CARD_W * 1.35);
const OVERLAP = -Math.floor(CARD_H * 0.72); // Kapalı kartlar %72 örtüşür
```

### 10.4 Etkileşim Sistemi

**Mevcut:** Tap-to-select + tap-to-place
1. Karta dokunma → `selected` state güncellenir → pembe glow
2. Foundation slotuna dokunma → `placeCard()` çağrılır → doğrulama + yerleştirme
3. Feedback bar ile kullanıcıya bilgi: "✅ Doğru!", "❌ Yanlış!", "✋ Seçildi"

**Hedef:** Sürükle-bırak (development build gerekli)
- `react-native-gesture-handler` Gesture.Pan() + Gesture.Tap()
- `react-native-reanimated` useSharedValue + useAnimatedStyle
- 150ms basılı tut → sürükleme başlar → slot üzerine bırak → yerleşir
- Expo Go'da çalışmıyor, EAS Build gerekli

### 10.5 Kalıcı Veri (Persistence)

```javascript
// AsyncStorage ile kaydedilecek veriler:
{
  currentLevel: number,        // Son kaldığı bölüm
  coins: number,               // Toplam coin
  unlockedThemes: string[],    // Açılmış temalar
  settings: {
    sound: boolean,
    music: boolean,
    vibration: boolean,
    language: string,
  },
  savedGame: GameState | null,  // Yarım kalan oyun
  stats: {
    totalGames: number,
    totalWins: number,
    bestScore: number,
    streak: number,
  },
}
```

---

## 11. TASARIM SİSTEMİ (Cosmic Dawn)

### Renk Paleti

| Token | HEX | Kullanım |
|-------|-----|----------|
| Gradient üst | #6B5B8A | Mor arka plan üst |
| Gradient alt | #3D3560 | Mor arka plan alt |
| Primary | #FF8AA7 | Pembe — aktif tab, seçim glow |
| Tertiary | #FF9F4A | Turuncu — kart arkası, butonlar |
| Coin | #FFD166 | Altın — coin, ödül |
| Success | #5DBE6E | Yeşil — doğru cevap |
| Error | #EF5350 | Kırmızı — yanlış, badge |
| Button Blue | #3D8BD4 | Mavi — toolbar butonları |
| Panel bg | rgba(255,255,255,0.08) | Glassmorphic panel |
| Panel border | rgba(255,255,255,0.12) | Panel kenarı |
| Card face | #FFFFFF | Beyaz — açık kart |
| Card border | #E8DDCC | Krem — kart kenarı |
| Card back | #FF8C42→#E67530 | Turuncu gradient — kapalı kart |

### Font
- **Headline:** Plus Jakarta Sans 700/800
- **Body:** Be Vietnam Pro 400/500/700
- **Logo:** Fondamento Italic

### Arka Plan
Tüm sayfalar: `linear-gradient(#6B5B8A, #3D3560)` — MOR, tutarlı.

---

## 12. GELİŞTİRME YOLHARITASI

### ✅ Tamamlanan
- [x] Ana sayfa (logo, Bilge, bölüm butonu, bottom nav)
- [x] Oyun ekranı layout (hamleler, deste, foundation, tableau)
- [x] Kart render (açık/kapalı/kategori)
- [x] Foundation slotları (kilitli/boş/aktif)
- [x] Tableau sütunları (tek satır, overlap)
- [x] Tap-to-select + tap-to-place mekaniği
- [x] Kategori kartı yerleştirme → kategori aktifleştirme
- [x] Doğru/yanlış yerleştirme + feedback
- [x] Hamle sayacı
- [x] Undo sistemi (state history)
- [x] Deste çekme
- [x] Sil (çekilen kart silme)
- [x] Cosmic Dawn mor tema
- [x] Stitch tasarım exportları (9 ekran)

### 🔄 Devam Eden
- [ ] Sürükle-bırak (EAS Build sonrası)
- [ ] Kart flip animasyonu
- [ ] Sparkle/pop-in animasyonları

### 📋 Yapılacak
- [ ] Bölüm 1-10 level data (kelime listeleri)
- [ ] Bölüm tamamlandı ekranı (kod)
- [ ] Bölüm başarısız ekranı (kod)
- [ ] Mağaza ekranı (kod)
- [ ] Ayarlar ekranı (kod)
- [ ] Liderler ekranı (kod)
- [ ] Tema seçici ekranı (kod)
- [ ] AsyncStorage ile kalıcı kayıt
- [ ] Ses efektleri (kart çevirme, yerleştirme, hata, başarı)
- [ ] İpucu sistemi (akıllı kart önerisi)
- [ ] Reklam entegrasyonu (AdMob)
- [ ] IAP (in-app purchase)
- [ ] Çözülebilirlik algoritması
- [ ] Bilge-sad.png (üzgün maskot)
- [ ] Kart illüstrasyonları (emoji → SVG çizimler)
- [ ] EAS Build (development build)
- [ ] App Store / Google Play yayınlama
