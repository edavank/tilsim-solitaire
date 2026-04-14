# Tılsım Solitaire — Stitch Tema Projesi

## Proje Özeti
11 tema için tüm sayfa ve bileşenlerin görsel tasarımı.
Her tema: arkaplan gradient, kart yüzü, kart arkası, slotlar, toolbar, paneller, popup'lar.

---

## SAYFALAR (11 adet)

### 1. Ana Sayfa (`index.js`)
- **Arkaplan**: Tam ekran gradient
- **Üst bar**: Coin göstergesi (🪙 badge), XP bar
- **Ortada**: Seviye numarası, "OYNA" butonu
- **Alt**: Günlük görev kartı, turnuva kartı
- **Bottom Nav**: 4 sekme (Mağaza, Ana Sayfa, Başarımlar, Liderler)

### 2. Oyun Ekranı (`game.js`) — EN KARMAŞIK
- **Arkaplan**: Tam ekran gradient
- **Üst bar**: Geri ok, seviye numarası, hamle sayacı/zamanlayıcı, coin, skor
- **Foundation slotları**: 4-5 kategori yuvası (üst kısım)
  - Boş slot: kesikli çerçeve
  - Dolu slot: kategori emoji + sayaç + renkli çerçeve
  - Tamamlanmış slot: yeşil tik
- **Tableau sütunları**: 4-7 kart sütunu
  - Açık kart (FaceUpCard): emoji + kelime + kategori renk noktası
  - Kapalı kart (FaceDownCard): gradient + iç çerçeve deseni
  - Kategori kartı: emoji + isim + sayaç badge
  - Joker kart: altın çerçeve + özel arkaplan
  - Seçili kart: parlak çerçeve + glow
- **Çekilen kartlar alanı**: Sol alt, üst üste binmiş 3 kart
- **Deste**: Sağ alt, kapalı kart yığını
- **Toolbar**: 5 araç butonu (İpucu, Geri Al, Joker, Karıştır, Sil)
  - Her buton: ikon + badge (kredi sayısı veya 🪙)
  - Kilitli buton: kilit ikonu + "Lv.X" yazısı
- **Alt banner**: Reklam alanı (60px)
- **Feedback bar**: Üstte geçici mesaj çubuğu
- **Skor popup'ları**: Animasyonlu "+5", "+25" yazıları

### 3. Seviyeler (`levels.js`)
- **Arkaplan**: Tam ekran gradient
- **Üst bar**: Geri ok, "SEVİYELER" başlık, XP bar
- **Bölüm grid**: 4x sütun, her bölüm bir kare
  - Tamamlanmış: yeşil çerçeve + 1-3 yıldız
  - Mevcut: parlak animasyonlu çerçeve
  - Kilitli: gri, kilit ikonu
  - Boss (her 10. bölüm): altın çerçeve + "BOSS" yazısı
- **Bottom Nav**

### 4. Mağaza (`store.js`)
- **Arkaplan**: Tam ekran gradient
- **Üst bar**: Geri ok, "PREMIUM" başlık, coin göstergesi
- **Coin paketleri**: 3 kart (500, 2500, 6000 coin)
  - "Popüler" badge
  - Fiyat butonu (₺)
- **Araç güçlendiriciler**: İpucu, Geri Al
  - Coin fiyatı badge
  - Satın al butonu
- **Premium üyelik**: Büyük CTA kart
- **Satın alımları geri yükle** butonu
- **Bottom Nav**

### 5. Başarımlar (`achievements.js`)
- **Arkaplan**: Tam ekran gradient
- **Üst bar**: Geri ok, "BAŞARIMLAR" başlık, ilerleme
- **İstatistik kartları**: Toplam oyun, galibiyet, seri
- **Başarım listesi**: Her başarım bir satır
  - Kilitli: gri, kilit ikonu
  - Açık: renkli, ikon + başlık + açıklama
  - Coin ödülü badge
- **Bottom Nav**

### 6. Liderler (`leaderboard.js`)
- **Arkaplan**: Tam ekran gradient
- **Üst bar**: Geri ok, "LİDERLER" başlık
- **Podyum**: İlk 3 sıra büyük kartlar
- **Liste**: 4-100 arası sıralar
- **Oyuncunun kendi sırası** (sabitlenmiş)
- **Bottom Nav**

### 7. Ayarlar (`settings.js`)
- **Arkaplan**: Tam ekran gradient
- **Profil kartı**: İsim, seviye, avatar
- **Ayar satırları**: Ses, Titreşim, Bildirimler (switch)
- **Dil seçici**: Bayrak + dil adı
- **Hesap bölümü**: Giriş/Çıkış butonu
- **İlerlemeyi sıfırla** butonu (kırmızı)
- **Versiyon numarası**
- **Bottom Nav**

### 8. Tema Mağazası (`themes.js`)
- **Arkaplan**: Tam ekran gradient (aktif tema)
- **Üst bar**: Geri ok, "TEMALAR" başlık, coin
- **Tema grid**: 2 sütun, her tema bir kart
  - Tema önizleme: gradient + kart önizleme
  - Tema adı + açıklama
  - Durum: Aktif ✓, Kilitli 🔒, Fiyat 🪙, Reklam ▶
- **Bottom Nav**

### 9. Günlük Görev (`daily.js`)
- **Arkaplan**: Tam ekran gradient
- **Üst bar**: Geri ok, "GÜNLÜK GÖREV" başlık
- **Takvim**: 7 günlük grid
- **Ödül bilgisi**: Coin + XP
- **Oyna butonu**

### 10. Turnuva (`tournament.js`)
- **Arkaplan**: Tam ekran gradient
- **Üst bar**: Geri ok, "TURNUVA" başlık
- **Sıralama listesi**: Oyuncu kartları
- **Zamanlayıcı**: Kalan süre
- **Ödüller**: 1-2-3. sıra ödülleri

### 11. Koleksiyon (`collection.js`)
- **Arkaplan**: Tam ekran gradient
- **Kategori kartları**: Tamamlanmış kategoriler
- **İlerleme barı**

---

## POPUP / MODAL / OVERLAY (8 adet)

### P1. Seviye Tamamlama Overlay (`LevelCompleteOverlay`)
- **Tam ekran**: Yarı saydam koyu arkaplan
- **Kart**: Beyaz/koyu panel
  - Baykuş resmi
  - "TEBRİKLER" başlık
  - Skor detayları: Hamle bonusu, hız bonusu, toplam coin
  - 3 yıldız animasyonu
  - "Sonraki Bölüm" butonu (gradient)
  - "Tekrar Oyna" ve "Ana Sayfa" butonları

### P2. Seviye Başarısız Overlay (`LevelFailedOverlay`)
- **Tam ekran**: Yarı saydam koyu arkaplan
- **Kart**: Beyaz/koyu panel
  - Baykuş resmi + konuşma balonu
  - "HAMLENİZ BİTTİ" başlık
  - "+20 Hamle Ekle" butonu (reklam — gradient)
  - "500 Coin → +20" butonu (altın çerçeve)
  - "Karıştır" butonu (ikincil çerçeve)
  - "Tekrar Oyna" ve "Ana Sayfa" butonları

### P3. Araç Satın Alma Modal (`toolModal`)
- **Tam ekran**: Yarı saydam koyu arkaplan
- **Kart**: Koyu panel
  - Araç ikonu (büyük, 48px)
  - Araç açıklaması
  - "🪙 500" butonu (altın, coin ile al)
  - "▶ AD Kullan" butonu (yeşil, reklam ile al)
  - Kapatma (✕) butonu

### P4. Başarım Popup (`achievementPopup`)
- **Pozisyon**: Üstte, sayfanın %30'u
- **Şekil**: Yatay banner, altın çerçeve
- **İçerik**: Başarım ikonu + başlık + "Topla" butonu (coin ödülü)

### P5. Tutorial Overlay (`showTutorial`)
- **Tam ekran**: Yarı saydam koyu arkaplan
- **Adım kartları**: Sıralı açıklama panelleri
  - Adım numarası
  - İkon + açıklama metni
  - "Sonraki" / "Başla" butonu

### P6. Duraklama Overlay (`paused`)
- **Tam ekran**: Yarı saydam koyu arkaplan
- **Panel**: Koyu kart
  - "DURAKLADI" başlık
  - "Devam Et" butonu (gradient)
  - "Çık" butonu (ikincil)
  - Ses açma/kapama

### P7. Skor Popup Animasyonu (`ScorePopup`)
- **Pozisyon**: Kartın üzerinde (mutlak)
- **Animasyon**: Yukarı kayma + fade out
- **İçerik**: "+5", "+25", "🎉 +25" gibi metinler

### P8. Feedback Bar
- **Pozisyon**: Üstte, yatay çubuk
- **Arkaplan**: Yarı saydam siyah
- **İçerik**: Kısa mesaj (hata, uyarı, bilgi)
- **Süre**: 2.5 saniye sonra kaybolur

---

## ALERT POPUP'LARI (Native — tema uygulanmaz)

| Alert | Sayfa | İçerik |
|-------|-------|--------|
| Tema Değiştirildi | themes.js | "✨ Tema Değiştirildi — X teması aktif!" |
| Tema Kilitli | themes.js | "Bölüm X tamamla" |
| Yetersiz Coin | themes.js, store.js | "X coin gerekli" |
| Satın Al Onay | themes.js | "X coin'e almak ister misin?" |
| Tema Açıldı | themes.js | "X artık senin!" |
| Dil Değiştirildi | settings.js | "Dil değiştirildi" |
| İlerleme Sıfırla | settings.js | "Emin misin?" onay |
| Araç Satın Alındı | store.js | "X satın alındı" |
| Yakında | store.js | Premium yakında |

---

## ORTAK BİLEŞENLER (Her sayfada)

### Bottom Nav Bar
- 4 sekme: Mağaza, Ana Sayfa, Başarımlar, Liderler
- Aktif sekme: vurgu rengi + büyük ikon
- Badge: başarım sayacı (kırmızı nokta)

### Coin Badge
- Üst sağ köşe (çoğu sayfada)
- 🪙 ikon + coin sayısı

### Geri Ok
- Sol üst köşe
- Beyaz ok ikonu

---

## TEMALAR (11 adet)

Her tema için aşağıdaki bileşenlerin renkleri değişir:

| Bileşen | Değişen Özellik |
|---------|----------------|
| Arkaplan gradient | 2 renk (tüm sayfalar) |
| Kart yüzü | backgroundColor, borderColor |
| Kart metni | color |
| Kart glow | shadowColor |
| Kapalı kart | backgroundColor + iç çerçeve rengi |
| Slot çerçeve | borderColor |
| Slot arkaplan | backgroundColor |
| Toolbar buton | backgroundColor |
| Panel arkaplan | backgroundColor |
| Panel çerçeve | borderColor |

### Tema Listesi

| # | ID | Ad | Tip | Fiyat/Koşul |
|---|----|----|-----|-------------|
| 1 | cosmic | Kozmik Mor | Ücretsiz | Varsayılan |
| 2 | ocean | Okyanus Derinliği | Bölüm | Lv.20 |
| 3 | sunset | Gün Batımı | Bölüm | Lv.40 |
| 4 | forest | Sonbahar Ormanı | Bölüm | Lv.60 |
| 5 | sakura | Kiraz Çiçeği | Bölüm | Lv.80 |
| 6 | gold | Altın Lüks | Premium | 2000 coin |
| 7 | neon | Neon Şehir | Premium | 2500 coin |
| 8 | ruby | Yakut | Premium | 3000 coin |
| 9 | arctic | Buz Krallığı | Premium | 3500 coin |
| 10 | midnight | Gece Yarısı | Reklam | 3 reklam |
| 11 | desert | Çöl Güneşi | Reklam | 5 reklam |

### Renk Paleti (Mevcut)

```
COSMIC (Varsayılan):
  Gradient: #1e0a38 → #150629
  Kart yüzü: #FFFFFF, metin: #1a1a2e
  Kart arkası: #6B5B8A
  Accent: #9B7DFF, Toolbar: #4A6CF7

OCEAN:
  Gradient: #061828 → #040E1A
  Kart yüzü: #D4F1F9, metin: #0A2540
  Kart arkası: #0D47A1
  Accent: #00BCD4, Toolbar: #0097A7

SUNSET:
  Gradient: #1A0808 → #2A1018
  Kart yüzü: #FFF0E0, metin: #4E2A00
  Kart arkası: #BF360C
  Accent: #FF6D00, Toolbar: #E65100

FOREST:
  Gradient: #0A1A0A → #051005
  Kart yüzü: #F0E8D0, metin: #2E4A1E
  Kart arkası: #33691E
  Accent: #8BC34A, Toolbar: #558B2F

SAKURA:
  Gradient: #1A0810 → #2A0D1A
  Kart yüzü: #FFE4EC, metin: #5E1A3A
  Kart arkası: #AD1457
  Accent: #FF69B4, Toolbar: #C2185B

GOLD:
  Gradient: #0A0800 → #1A1400
  Kart yüzü: #FFF8DC, metin: #4A3800
  Kart arkası: #B8860B
  Accent: #FFD700, Toolbar: #DAA520

NEON:
  Gradient: #020208 → #050510
  Kart yüzü: #0A1A0A, metin: #39FF14 (neon yeşil)
  Kart arkası: #003300
  Accent: #39FF14, Toolbar: #00C853

RUBY:
  Gradient: #1A0505 → #280808
  Kart yüzü: #FFE0E0, metin: #4A0A0A
  Kart arkası: #B71C1C
  Accent: #FF1744, Toolbar: #D50000

ARCTIC:
  Gradient: #081828 → #0A2035
  Kart yüzü: #E8F4FF, metin: #1A3A5C
  Kart arkası: #1565C0
  Accent: #87CEEB, Toolbar: #1976D2

MIDNIGHT:
  Gradient: #030308 → #08081A
  Kart yüzü: #1A1A2E, metin: #C8C8E8
  Kart arkası: #311B92
  Accent: #7C4DFF, Toolbar: #651FFF

DESERT:
  Gradient: #1A0E04 → #0E0802
  Kart yüzü: #FFF3E0, metin: #4E3418
  Kart arkası: #D84315
  Accent: #FF9100, Toolbar: #EF6C00
```

---

## STİTCH İÇİN ÖNERİLEN FRAME YAPISI

### Frame 1: Ana Sayfa (11 tema varyasyonu)
### Frame 2: Oyun Ekranı — Normal Durum (11 varyasyon)
### Frame 3: Oyun Ekranı — Kartlar (FaceUp, FaceDown, Joker, Seçili, Kategori)
### Frame 4: Oyun Ekranı — Slotlar (Boş, Dolu, Tamamlanmış)
### Frame 5: Oyun Ekranı — Toolbar (5 buton, kilitli/açık)
### Frame 6: Seviye Tamamlama Overlay
### Frame 7: Seviye Başarısız Overlay
### Frame 8: Araç Satın Alma Modal
### Frame 9: Başarım Popup + Feedback Bar
### Frame 10: Tutorial Overlay + Duraklama
### Frame 11: Seviyeler Sayfası
### Frame 12: Mağaza
### Frame 13: Başarımlar
### Frame 14: Liderler
### Frame 15: Ayarlar
### Frame 16: Tema Mağazası
### Frame 17: Bottom Nav Bar (4 durum)

**Toplam: ~17 ana frame × 11 tema = ~187 varyasyon**
**Pratik öneri:** Önce 1 tema tam tasarla, sonra renk değişkenleriyle diğerlerini türet.

---

## FONT BİLGİLERİ

- **Başlık**: System font, Black weight (headlineBlack)
- **Gövde**: System font, Regular weight
- **Boyutlar**: 8-36px arası (responsive)

## EKRAN BOYUTLARI

- **Telefon**: 375×812 (iPhone), 360×800 (Android)
- **Tablet**: 768×1024 (iPad)
- **Uygulamada**: IS_TABLET ile responsive layout
