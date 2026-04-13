# Firebase + AdMob Kurulum Rehberi

## ADIM 1: Firebase Projesi Oluştur

1. https://console.firebase.google.com adresine git
2. "Proje Ekle" → Proje adı: `tilsim-solitaire`
3. Google Analytics'i etkinleştir → Devam
4. Proje oluşturulunca:

### Android Uygulaması Ekle:
- Package name: `com.edavank.tilsimsolitaire`
- App nickname: Tılsım Solitaire
- `google-services.json` dosyasını indir
- Projenin root dizinine koy: `tilsim-solitaire/google-services.json`

### iOS Uygulaması Ekle:
- Bundle ID: `com.edavank.tilsimsolitaire`
- App nickname: Tılsım Solitaire
- `GoogleService-Info.plist` dosyasını indir
- Projenin root dizinine koy: `tilsim-solitaire/GoogleService-Info.plist`

## ADIM 2: AdMob Hesabı

1. https://admob.google.com adresine git
2. Hesap oluştur (Firebase hesabıyla aynı Google hesabı)
3. Sol menü → Uygulamalar → Uygulama Ekle

### Android Uygulaması:
- Platform: Android
- "Firebase'e bağlı mı?": Evet → tilsim-solitaire projesini seç
- App ID alacaksın: `ca-app-pub-XXXX~YYYY`
- 3 Ad Unit oluştur:
  - Banner → ID'yi not al
  - Interstitial → ID'yi not al  
  - Rewarded → ID'yi not al

### iOS Uygulaması:
- Aynı adımlar, iOS için

## ADIM 3: ID'leri Yerleştir

### app.json — AdMob App ID'leri:
```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-XXXX~YYYY",  ← Android App ID
    "iosAppId": "ca-app-pub-XXXX~ZZZZ"       ← iOS App ID
  }
]
```

### src/utils/ads.js — Ad Unit ID'leri:
```javascript
production: {
  banner: Platform.select({
    ios: 'ca-app-pub-XXXX/AAAA',     ← iOS Banner Unit ID
    android: 'ca-app-pub-XXXX/BBBB', ← Android Banner Unit ID
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-XXXX/CCCC',
    android: 'ca-app-pub-XXXX/DDDD',
  }),
  rewarded: Platform.select({
    ios: 'ca-app-pub-XXXX/EEEE',
    android: 'ca-app-pub-XXXX/FFFF',
  }),
}
```

## ADIM 4: EAS Projesi Bağla

```bash
cd tilsim-solitaire
npx eas-cli init
```
Bu komutu çalıştırınca Expo hesabına bağlanır ve `app.json`'daki `___EAS_PROJECT_ID___` otomatik dolar.

## ADIM 5: Firebase Config Dosyaları

```bash
# google-services.json'ı git'e ekleme (güvenlik)
echo "google-services.json" >> .gitignore
echo "GoogleService-Info.plist" >> .gitignore
```

⚠️ Bu dosyalar hassas — repo'ya pushlamadan önce .gitignore'a ekle.

## ADIM 6: İlk Production Build

```bash
# Android (AAB — Play Store için)
npx eas-cli build --platform android --profile production

# iOS (App Store için)
npx eas-cli build --platform ios --profile production
```

## ADIM 7: Test (Preview Build ile)

Firebase config dosyaları yerleştikten sonra preview build al:
```bash
npx eas-cli build --platform android --profile preview
```

APK'da test reklamları görünmesi lazım (test ID'leriyle).

## SORUN GİDERME

### "AdMob unavailable" logu:
- `google-services.json` projenin root'unda mı kontrol et
- `npx expo prebuild --clean` dene
- EAS Build loglarını kontrol et

### Reklamlar görünmüyor:
- AdMob hesabı onaylanması 24-48 saat sürebilir
- Test cihazını AdMob'da "Test Device" olarak ekle
- VPN kapalı mı kontrol et

### Build hatası:
- `@react-native-firebase/app` versiyonu uyumlu mu?
- `npm install --legacy-peer-deps` dene
