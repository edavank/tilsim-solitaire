# Tılsım Solitaire — Store Yayın Rehberi (v3)

> Bu rehber Apple App Store ve Google Play Store yayın sürecinin tamamını kapsar.
> Auth sistemi (Google + Apple Sign-In) entegre edilmiştir.

---

## BÖLÜM A: ÖN HAZIRLIK (Her İki Platform)

### A1. Supabase — Auth Provider Kurulumu

#### Google OAuth (Android + iOS):
1. https://supabase.com → Tılsım Solitaire projesi → Authentication → Providers
2. Google provider'ı aç
3. Google Cloud Console'a git → APIs & Services → Credentials
4. OAuth 2.0 Client ID oluştur:
   - **Web application** (Supabase redirect için):
     - Authorized redirect URI: `https://levaibmnnwxqvuodcdxb.supabase.co/auth/v1/callback`
   - **Android** (native sign-in için):
     - Package: `com.edavank.tilsimsolitaire`
     - SHA-1: `npx eas-cli credentials -p android` ile al
   - **iOS** (native sign-in için):
     - Bundle ID: `com.edavank.tilsimsolitaire`
5. Client ID + Client Secret'ı Supabase Google Provider'a yapıştır

#### Apple OAuth (iOS):
1. Supabase → Authentication → Providers → Apple → Enable
2. Apple Developer → Certificates, Identifiers & Profiles:
   - **App ID**: `com.edavank.tilsimsolitaire` → "Sign In with Apple" capability'yi aç
   - **Services ID**: `com.edavank.tilsimsolitaire.auth` oluştur
     - Sign In with Apple → Configure
     - Domain: `levaibmnnwxqvuodcdxb.supabase.co`
     - Return URL: `https://levaibmnnwxqvuodcdxb.supabase.co/auth/v1/callback`
   - **Key**: Sign In with Apple için key oluştur → .p8 dosyasını indir
3. Supabase'e gir:
   - Service ID: `com.edavank.tilsimsolitaire.auth`
   - Team ID: Apple Developer hesabından
   - Key ID: Oluşturduğun key'in ID'si
   - Private Key: .p8 dosyasının içeriği

#### Supabase — user_progress Tablosu:
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
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);
```

### A2. Gizlilik Politikası Deploy

```bash
cd tilsim-solitaire/legal
npx vercel --prod
```
→ URL'yi not al: `https://tilsim-solitaire-legal.vercel.app`
→ Test et: `/privacy` ve `/terms`

### A3. Firebase + AdMob (Detay: docs/FIREBASE_SETUP.md)

1. Firebase projesi → `google-services.json` (Android) + `GoogleService-Info.plist` (iOS)
2. AdMob → 3 ad unit (banner, interstitial, rewarded) × 2 platform
3. ID'leri `src/utils/ads.js` ve `app.json`'a yerleştir

---

## BÖLÜM B: APPLE APP STORE

### B1. Apple Developer Account ($99/yıl)
1. https://developer.apple.com/enroll
2. Bireysel veya şirket hesabı oluştur
3. Ödeme yap → Onay 24-48 saat

### B2. App Store Connect Kurulumu
1. https://appstoreconnect.apple.com → My Apps → (+) New App
2. Bilgileri doldur:
   - Platform: iOS
   - Name: `Tılsım Solitaire - Kelime Oyunu`
   - Primary Language: Turkish
   - Bundle ID: `com.edavank.tilsimsolitaire`
   - SKU: `tilsim-solitaire-001`
3. App Information:
   - Category: Games → Word
   - Secondary: Games → Card
   - Content Rights: Does not contain third-party content
   - Age Rating: 4+ (Infrequent/Mild — no objectionable content)

### B3. App Privacy (ZORUNLU)
App Store Connect → App Privacy:
- ☑ Email Address — App Functionality — Linked to User (optional sign-in)
- ☑ User ID — App Functionality — Linked to User
- ☑ Device ID — Third-Party Advertising — Not Linked to User
- ☑ Product Interaction — Analytics — Not Linked to User

### B4. Sign In with Apple Capability
1. Apple Developer → Certificates, Identifiers & Profiles
2. App IDs → `com.edavank.tilsimsolitaire` → Capabilities
3. ☑ Sign In with Apple → Save
4. Bu adım ZORUNLU — Apple Sign-In sunuyorsan capability açık olmalı

### B5. iOS Production Build
```bash
# Önce paketleri kur
npm install

# iOS production build (EAS Cloud'da)
npx eas-cli build --platform ios --profile production
```
EAS ilk build'de sana soracak:
- Apple ID + App-specific password (2FA varsa)
- Distribution certificate → EAS otomatik oluşturur
- Provisioning profile → EAS otomatik yönetir

### B6. App Store'a Gönder
```bash
npx eas-cli submit --platform ios --profile production
```
Veya Transporter app ile (macOS):
1. EAS build tamamlanınca .ipa indir
2. Transporter'a sürükle → Upload

### B7. App Store Listing
- Ekran görüntüleri: min 3, max 10
  - iPhone 6.7" (1290×2796) — iPhone 15 Pro Max
  - iPhone 6.5" (1242×2688) — iPhone 11 Pro Max
  - iPad 12.9" (2048×2732) — opsiyonel
- Açıklama: `docs/STORE_LISTING.md` içeriğini kopyala
- Keywords: `solitaire,kelime,bulmaca,kart,oyun,türkçe,kategori,iskambil,eğitici,strateji`
- Support URL: Vercel privacy URL
- Marketing URL: opsiyonel

### B8. Review'a Gönder
- Review notes (opsiyonel): "Word card game with optional Google/Apple sign-in for cloud save. No IAP in v1.0."
- Demo account: Gerekmiyor (opsiyonel giriş)
- Submit for Review → genellikle 24-48 saat

### B9. Apple Policy Hatırlatmalar
- ⚠️ Uygulamada giriş zorunlu DEĞIL → "Giriş yapmadan devam et" var ✅
- ⚠️ Google Sign-In sunuyorsan Apple Sign-In de sunmalısın → var ✅
- ⚠️ Dijital içerik satışı varsa Apple IAP zorunlu → v1.0'da IAP yok ✅
- ⚠️ "Satın Alımları Geri Yükle" butonu — IAP eklenince ŞART
- ⚠️ ITSAppUsesNonExemptEncryption: false → var ✅

---

## BÖLÜM C: GOOGLE PLAY STORE

### C1. Google Play Console ($25 tek seferlik)
1. https://play.google.com/console
2. Developer hesabı oluştur → $25 öde
3. Hesap doğrulama (kimlik — birkaç gün sürebilir)

### C2. Uygulama Oluştur
1. All apps → Create app
2. App name: `Tılsım Solitaire - Kelime Oyunu`
3. Default language: Turkish
4. App or game: Game
5. Free or paid: Free
6. Declarations: Kabul et

### C3. Store Listing
1. Main store listing:
   - Short description (80 char): `docs/STORE_LISTING.md`'den kopyala
   - Full description: `docs/STORE_LISTING.md`'den kopyala
   - App icon: 512×512 PNG (assets/icon.png yeterli)
   - Feature graphic: 1024×500 PNG (oluşturulmalı)
   - Screenshots: min 2, max 8 (phone + tablet opsiyonel)
   - Video: opsiyonel YouTube link
2. Categorization:
   - App type: Game
   - Category: Word
   - Tags: Solitaire, Word game, Card game, Puzzle

### C4. Content Rating (ZORUNLU)
1. Policy → App content → Content rating
2. IARC anketi doldur:
   - Violence: None
   - Sexuality: None
   - Language: None
   - Controlled Substances: None
   - Ads: Yes (AdMob)
   → Sonuç: PEGI 3 / Everyone

### C5. Data Safety (ZORUNLU)
1. Policy → App content → Data safety
2. Sorulara cevap ver:
   - Does your app collect or share user data? → Yes
   - Data types:
     - ☑ Email address — Collected — Optional — App functionality (sign-in)
     - ☑ Personal identifiers (User ID) — Collected — Required if signed in — App functionality
     - ☑ Device or other IDs — Collected & Shared — Required — Advertising
     - ☑ App interactions — Collected — Required — Analytics
   - Security:
     - ☑ Data encrypted in transit
     - ☑ Users can request data deletion
   - Is your app a game? → Yes
   - Does your app target children? → No

### C6. Target Audience & Content
- Target age: All ages (NOT for children under 13)
- Families program: HAYIR — başvurma
- Ads: Contains ads ☑
- Ad SDK: AdMob

### C7. Android Production Build (AAB)
```bash
# Production AAB build
npx eas-cli build --platform android --profile production
```
→ AAB dosyası EAS dashboard'dan indirilir

### C8. Play Console'a Yükle
1. Release → Testing → Internal testing → Create new release
2. AAB yükle
3. Release notes yaz (Türkçe):
   ```
   İlk sürüm! 200 seviye, 96 kategori, 599 kelime.
   Google hesabıyla giriş yaparak ilerlemenizi buluta kaydedebilirsiniz.
   ```
4. Save → Review release → Start rollout

### C9. Internal Test → Production Geçiş
1. Internal test'te 14 gün test et (policy gerekliliği değişebilir)
2. Her şey OK ise: Release → Production → Create new release
3. Aynı AAB'yi seç → Review → Start rollout to production
4. Review süresi: genellikle 1-7 gün (ilk uygulama daha uzun)

### C10. Google Play Policy Hatırlatmalar
- ⚠️ Interstitial reklam → sadece bölüm arası ✅
- ⚠️ Reklam consent → ConsentDialog var ✅
- ⚠️ Data Safety doldurulmalı → yukarıda detaylı ✅
- ⚠️ Target audience → "not for children" ✅
- ⚠️ Privacy policy URL zorunlu → Vercel'de ✅

---

## BÖLÜM D: EAS SUBMIT AYARLARI

### D1. Google Play — Service Account Key
1. Google Cloud Console → IAM → Service Accounts
2. Yeni service account oluştur → "Play Store Publisher" gibi isim ver
3. JSON key indir → `play-store-key.json` olarak projeye koy
4. Google Play Console → Settings → API access → Link Google Cloud project
5. Service account'a "Release manager" yetkisi ver

```bash
# eas.json'daki serviceAccountKeyPath doğru mu kontrol et
npx eas-cli submit --platform android --profile production
```

### D2. Apple — Otomatik Submit
```bash
# İlk seferde Apple ID ve app-specific password sorar
npx eas-cli submit --platform ios --profile production
```
App-specific password: https://appleid.apple.com → Sign-In & Security → App-Specific Passwords

### D3. eas.json submit bölümünü doldur
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./play-store-key.json",
      "track": "internal"
    },
    "ios": {
      "appleId": "senin@email.com",
      "ascAppId": "APP_STORE_CONNECT_APP_ID",
      "appleTeamId": "TEAM_ID"
    }
  }
}
```

---

## BÖLÜM E: AUTH SİSTEMİ ÖZETİ

### Akış:
1. İlk açılış → Dil seçimi → Login ekranı (Google / Apple / Atla)
2. "Atla" → Lokal oynama (AsyncStorage), giriş sonra ayarlardan yapılabilir
3. Giriş yap → Supabase session → Lokal ilerleme bulutla merge (en yüksek değer kazanır)
4. Her oyun sonunda → otomatik cloud sync (giriş yapılmışsa)

### Dosyalar:
- `src/utils/auth.js` — Google + Apple sign-in, cloud sync
- `src/context/AuthContext.js` — React context, login state
- `app/login.js` — Giriş ekranı (opsiyonel)
- `app/settings.js` — Hesap yönetimi (giriş/çıkış)

### Supabase Providers:
- Google OAuth → Android + iOS
- Apple OAuth → iOS only (ZORUNLU: Google sunuyorsan Apple da sunmalısın)

---

## BÖLÜM F: YAYIN GÜNÜ SON KONTROL

```
[ ] Firebase config dosyaları yerinde mi? (google-services.json, GoogleService-Info.plist)
[ ] AdMob test ID'leri → production ID'lere çevrildi mi?
[ ] Supabase Google OAuth + Apple OAuth aktif mi?
[ ] user_progress tablosu + RLS politikaları oluşturuldu mu?
[ ] Privacy policy URL canlı mı?
[ ] Production build gerçek cihazda test edildi mi?
[ ] Google Sign-In çalışıyor mu? (Android + iOS)
[ ] Apple Sign-In çalışıyor mu? (iOS)
[ ] "Giriş yapmadan devam et" çalışıyor mu?
[ ] Cloud sync doğru merge yapıyor mu?
[ ] Tüm 6 dilde auth string'leri doğru mu?
[ ] Reklamlar gerçek cihazda gösteriliyor mu?
[ ] Consent dialog ilk açılışta çıkıyor mu?
[ ] App icon/splash tüm boyutlarda iyi görünüyor mu?
[ ] Store açıklama ve ekran görüntüleri yüklendi mi?
[ ] Data Safety / App Privacy doğru dolduruldu mu?
```

---

## BÖLÜM G: YARDIMCI KOMUTLAR

```bash
# Preview APK (test için)
npx eas-cli build --platform android --profile preview

# Production AAB (Play Store)
npx eas-cli build --platform android --profile production

# Production iOS (App Store)
npx eas-cli build --platform ios --profile production

# Store'a gönder
npx eas-cli submit --platform android --profile production
npx eas-cli submit --platform ios --profile production

# OTA güncelleme (build almadan)
npx eas-cli update --branch production --message "v1.0.1 — bug fixes"

# SHA-1 fingerprint (Google OAuth için)
npx eas-cli credentials -p android
```
