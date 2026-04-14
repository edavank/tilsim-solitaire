# Tılsım Solitaire — Yayın Öncesi Yapılacaklar (v1)

> Tarih: Nisan 2026
> Durum: Auth kodu hazır, store altyapısı hazır, AdMob stub

---

## ADIM 1: Eksik Paketleri Kur

```bash
cd tilsim-solitaire

# AdMob (Firebase gerektirir)
npm install react-native-google-mobile-ads --legacy-peer-deps

# Tracking transparency (iOS ATT)
npx expo install expo-tracking-transparency
```

Sonra `app.json` plugins'e ekle:
```json
"plugins": [
  "expo-router",
  "expo-font",
  "expo-apple-authentication",
  "expo-tracking-transparency",
  [
    "react-native-google-mobile-ads",
    {
      "androidAppId": "ca-app-pub-XXXX~YYYY",
      "iosAppId": "ca-app-pub-XXXX~ZZZZ"
    }
  ]
]
```

---

## ADIM 2: Firebase Projesi + AdMob

1. https://console.firebase.google.com → Yeni proje: `tilsim-solitaire`
2. Android app ekle → `com.edavank.tilsimsolitaire` → `google-services.json` indir → root'a koy
3. iOS app ekle → `com.edavank.tilsimsolitaire` → `GoogleService-Info.plist` indir → root'a koy
4. https://admob.google.com → Android + iOS app → Her biri için 3 ad unit:
   - Banner, Interstitial, Rewarded
5. `app.json`'daki `ca-app-pub-XXXX~YYYY` → gerçek AdMob App ID'ler
6. `.gitignore`'a ekle:
   ```
   google-services.json
   GoogleService-Info.plist
   play-store-key.json
   ```

### ads.js Güncelleme
`src/utils/ads.js` stub'ını gerçek AdMob entegrasyonuyla değiştir.
(Bunu Claude ile birlikte yapabiliriz — gerçek ID'leri aldıktan sonra)

---

## ADIM 3: Supabase Auth Providers

### Google OAuth
1. Google Cloud Console → APIs & Services → Credentials
2. 3 OAuth 2.0 Client ID oluştur:

| Tip | Ayar |
|-----|------|
| Web application | Redirect URI: `https://levaibmnnwxqvuodcdxb.supabase.co/auth/v1/callback` |
| Android | Package: `com.edavank.tilsimsolitaire`, SHA-1: `npx eas-cli credentials -p android` |
| iOS | Bundle ID: `com.edavank.tilsimsolitaire` |

3. Web client ID + Secret → Supabase → Authentication → Providers → Google

### Apple OAuth
1. Apple Developer → Certificates, Identifiers & Profiles
2. App ID `com.edavank.tilsimsolitaire` → Capabilities → ☑ Sign In with Apple
3. Services ID oluştur: `com.edavank.tilsimsolitaire.auth`
   - Configure → Domain: `levaibmnnwxqvuodcdxb.supabase.co`
   - Return URL: `https://levaibmnnwxqvuodcdxb.supabase.co/auth/v1/callback`
4. Keys → Sign In with Apple key oluştur → .p8 indir
5. Supabase → Providers → Apple:
   - Service ID: `com.edavank.tilsimsolitaire.auth`
   - Team ID: (Apple Developer'dan)
   - Key ID: (oluşturduğun key)
   - Private Key: (.p8 dosya içeriği)

### Supabase user_progress Tablosu
```sql
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 500,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress"
  ON user_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE USING (auth.uid() = user_id);
```

---

## ADIM 4: Gizlilik Politikası Deploy

```bash
cd tilsim-solitaire/legal
npx vercel --prod
```
→ URL not al: `https://tilsim-solitaire-legal.vercel.app`
→ Test: `/privacy` ve `/terms`

---

## ADIM 5: Preview Build ile Test

```bash
# Android preview APK
npx eas-cli build --platform android --profile preview

# Test checklist:
# [ ] Tüm ekranlar crash-free
# [ ] Google Sign-In çalışıyor
# [ ] "Giriş yapmadan devam et" çalışıyor
# [ ] Cloud sync (lokal → bulut merge)
# [ ] Reklamlar görünüyor (test modda)
# [ ] Consent dialog ilk açılışta çıkıyor
# [ ] 6 dil seçimi çalışıyor
# [ ] Günlük meydan okuma açılıyor
# [ ] Turnuva/liderlik tablosu çalışıyor
# [ ] Ses/müzik toggle çalışıyor
```

---

## ADIM 6: Google Play Store ($25 tek seferlik)

1. https://play.google.com/console → Developer hesabı → $25 öde
2. Kimlik doğrulama (birkaç gün sürebilir)
3. Uygulama oluştur:
   - İsim: `Tılsım Solitaire - Kelime Oyunu`
   - Dil: Turkish
   - Tür: Game → Free
4. Store listing → `docs/STORE_LISTING.md`'den kopyala
5. Feature graphic oluştur (1024×500)
6. Ekran görüntüleri yükle (min 4)
7. Content Rating anketi → PEGI 3 / Everyone
8. Data Safety → `docs/STORE_LISTING.md` "Data Safety" bölümünden
9. Target audience → Genel kitle (Families HAYIR)
10. Privacy policy URL → Adım 4'teki Vercel URL

### Production Build + Submit
```bash
# AAB build
npx eas-cli build --platform android --profile production

# Service account key oluştur (Google Cloud → IAM → Service Accounts → JSON key)
# play-store-key.json olarak root'a koy

# Submit
npx eas-cli submit --platform android --profile production
```

İlk olarak Internal Testing track'e yükle → test et → Production'a geç

---

## ADIM 7: Apple App Store ($99/yıl)

1. https://developer.apple.com/enroll → Bireysel hesap → $99 öde
2. Onay: 24-48 saat
3. App Store Connect → My Apps → New App:
   - Platform: iOS
   - Name: `Tılsım Solitaire - Kelime Oyunu`
   - Bundle ID: `com.edavank.tilsimsolitaire`
   - SKU: `tilsim-solitaire-001`
   - Primary Language: Turkish
4. Category: Games → Word, Secondary: Games → Card
5. Age Rating: 4+
6. App Privacy → `docs/STORE_LISTING.md` "Privacy Details" bölümünden
7. Ekran görüntüleri:
   - iPhone 6.7" (1290×2796)
   - iPhone 6.5" (1242×2688)
8. Açıklama + Keywords → `docs/STORE_LISTING.md`'den

### eas.json submit bölümünü doldur
```json
"ios": {
  "appleId": "senin@email.com",
  "ascAppId": "APP_STORE_CONNECT_APP_ID",
  "appleTeamId": "TEAM_ID"
}
```

### iOS Build + Submit
```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

Apple Sign-In test:
```bash
# iOS preview build (test için)
npx eas-cli build --platform ios --profile preview
```

---

## ADIM 8: Son Kontrol (Yayın Günü)

```
[ ] google-services.json + GoogleService-Info.plist root'ta
[ ] AdMob test ID → production ID değiştirildi
[ ] app.json AdMob App ID'leri gerçek
[ ] Supabase Google + Apple OAuth aktif
[ ] user_progress tablosu + RLS oluşturuldu
[ ] Privacy policy URL canlı
[ ] Production build gerçek cihazda test edildi
[ ] Google Sign-In: Android ✓ iOS ✓
[ ] Apple Sign-In: iOS ✓
[ ] "Giriş yapmadan devam et" ✓
[ ] Cloud sync merge doğru çalışıyor
[ ] Tüm 6 dilde auth string'leri doğru
[ ] Reklamlar gerçek cihazda gösteriliyor
[ ] Consent dialog ilk açılışta çıkıyor
[ ] App icon/splash tüm boyutlarda iyi
[ ] Store listing + ekran görüntüleri yüklendi
[ ] Data Safety / App Privacy dolduruldu
[ ] play-store-key.json .gitignore'da
```

---

## ÖNEMLİ NOTLAR

### Apple Policy
- Google Sign-In sunuyorsan Apple Sign-In de sunmalısın → ✅ var
- Giriş opsiyonel olmalı → ✅ "Giriş yapmadan devam et" var
- Dijital içerik satışı → v1.0'da IAP yok, sorun değil
- IAP eklenince "Satın Alımları Geri Yükle" butonu ŞART

### Google Play Policy
- Interstitial reklam sadece bölüm arası → ✅
- Families programına başvurma → ✅ genel kitle
- Data Safety doğru doldurulmalı → rehberde detaylı

### AdMob
- Hesap onayı 24-48 saat sürebilir
- İlk günlerde düşük doluluk normal
- Test cihazını AdMob'da "Test Device" olarak ekle

### Build Sonrası
- Her code change'den sonra: `git pull && npx expo start --clear`
- APK build sonrası: (1) APK download link, (2) OTA update komutu
