# Tılsım Solitaire — Store Yayın Checklist (v2)

## ✅ TAMAMLANAN

### Uygulama İçeriği
- [x] Oyun çalışır durumda (50+ bölüm, level generator)
- [x] Türkçe + İngilizce + Almanca + Fransızca + İspanyolca + Arapça
- [x] Tutorial (ilk oyunda)
- [x] Tüm ekranlar (ana sayfa, oyun, ayarlar, mağaza, liderler, bölümler, temalar, turnuva, günlük, koleksiyon, başarımlar)
- [x] Tap-to-select + tap-to-place mekaniği
- [x] Ses efektleri + arka plan müzik
- [x] Coin ekonomisi + yıldız sistemi + XP
- [x] Zamanlı bonus sistemi
- [x] Mevsimsel etkinlikler
- [x] Koleksiyon albümü
- [x] Haftalık turnuva
- [x] Liderboard (Supabase)

### Gizlilik & Yasal
- [x] Gizlilik Politikası (Türkçe) — assets/privacy-policy.html
- [x] Kullanım Şartları — assets/terms-of-use.html
- [x] Ayarlar ekranından gizlilik/şartlar linkleri
- [x] "İlerlemeyi Sıfırla" (veri silme) — GDPR/KVKK uyumlu
- [x] Reklam consent dialog (ConsentDialog.js)
- [x] ATT config (iOS infoPlist)

### Teknik
- [x] EAS Build config (eas.json — dev/preview/production)
- [x] iOS bundle ID: com.edavank.tilsimsolitaire
- [x] Android package: com.edavank.tilsimsolitaire
- [x] AsyncStorage ile kalıcı veri
- [x] Supabase auth (Google OAuth)
- [x] Supabase leaderboard
- [x] Defensive imports (Expo Go uyumlu)
- [x] newArchEnabled: false (stabilite)

### Monetizasyon Altyapısı
- [x] AdMob entegrasyonu (src/utils/ads.js — test + production ID'ler)
- [x] react-native-google-mobile-ads paketi
- [x] Rewarded ads (reklam izle = coin/hamle)
- [x] Interstitial ads (her 3 bölümde bir)
- [x] Banner ads altyapısı
- [x] Frekans kontrolü (agresif reklam yok)
- [x] IAP UI hazır (mağaza ekranı)
- [x] expo-tracking-transparency (ATT)

---

## 🔴 SENİN YAPMAN GEREKEN (Adım adım)

### ADIM 1: Firebase + AdMob Hesabı
Detaylı rehber: `docs/FIREBASE_SETUP.md`
- [ ] Firebase projesi oluştur → google-services.json indir → root'a koy
- [ ] AdMob hesabı oluştur → Android + iOS app ekle → 3 ad unit oluştur
- [ ] app.json'daki "ca-app-pub-XXXX~YYYY" → gerçek App ID
- [ ] src/utils/ads.js production ID'leri → gerçek Ad Unit ID'ler

### ADIM 2: EAS Projesi Bağla
```bash
cd tilsim-solitaire
npx eas-cli init
```
Bu komut app.json'daki `___EAS_PROJECT_ID___` değerini otomatik doldurur.

### ADIM 3: Gizlilik Politikası Hosting
```bash
cd tilsim-solitaire/legal
npx vercel --prod
```
Bu `tilsim-solitaire-legal.vercel.app` gibi bir URL oluşturur.
→ /privacy ve /terms yollarını test et
→ Bu URL'yi Store listing'e koy

### ADIM 4: Production Build + Test
```bash
# Android AAB (Play Store)
npx eas-cli build --platform android --profile production

# Önce preview APK ile test et
npx eas-cli build --platform android --profile preview
```
→ APK'da test reklamları görünmeli
→ Tüm ekranlar crash-free mi test et

### ADIM 5: Google Play Console ($25 tek seferlik)
1. https://play.google.com/console → Geliştirici hesabı oluştur
2. Uygulama oluştur → İsim: Tılsım Solitaire - Kelime Oyunu
3. Content Rating anketi → muhtemelen PEGI 3 / Everyone
4. Data Safety → Advertising ID, App interactions (AdMob)
5. Target audience → Genel kitle (Families programı DEĞİL)
6. Privacy policy URL → Adım 3'teki Vercel URL
7. Store listing → `docs/STORE_LISTING.md` içeriğini kopyala
8. Ekran görüntüleri yükle (min 4)
9. Feature graphic yükle (1024x500)
10. Internal test track'e AAB yükle → test et → production'a geç

### ADIM 6: Apple App Store ($99/yıl)
1. Apple Developer Program'a kayıt
2. App Store Connect → Yeni uygulama
3. Bundle ID: com.edavank.tilsimsolitaire
4. iOS build: `npx eas-cli build --platform ios --profile production`
5. `npx eas-cli submit --platform ios`
6. App Privacy → Data Collected: Advertising ID, Usage Data
7. Age Rating: 4+
8. Review'a gönder

---

## 📋 SON KONTROL (Yayın Günü)

- [ ] Test ad ID'leri → production ID'leriyle değiştirildi mi?
- [ ] google-services.json projenin root'unda mı?
- [ ] Privacy policy URL canlı mı?
- [ ] Production build gerçek cihazda test edildi mi?
- [ ] Tüm ekranlar crash-free mi?
- [ ] Reklamlar test cihazda gösteriliyor mu?
- [ ] Consent dialog ilk açılışta çıkıyor mu?
- [ ] Dil seçimi çalışıyor mu?
- [ ] App icon/splash tüm boyutlarda iyi görünüyor mu?
- [ ] Store açıklama ve ekran görüntüleri yüklendi mi?

---

## ⚠️ POLİCY ÖNEMLİ NOTLAR

### Google Play
- Interstitial reklam oyun sırasında gösterme — sadece bölüm arası ✅ (zaten öyle)
- AdMob kullandığın için "Advertising ID" topladığını beyan et
- Families programına dahil olma — genel kitle yap

### Apple App Store
- Dijital içerik (altın, tema) Apple IAP üzerinden satılmalı
- "Satın Alımları Geri Yükle" butonu ŞART (mağaza ekranına ekle)
- Boş reklam alanı gösterme — reklam yüklenmediyse gizle
- ITSAppUsesNonExemptEncryption: false ✅ (zaten var)

### Her İki Platform
- GDPR: ATT ile reklam izni iste ✅ (ConsentDialog + expo-tracking-transparency)
- KVKK: Gizlilik politikasında veri sorumlusu bilgisi ✅
- Rewarded ads: Kullanıcı kendi isteğiyle izlemeli ✅
