# Tılsım Solitaire — Store Yayın Checklist

## ✅ TAMAMLANAN

### Uygulama İçeriği
- [x] Oyun çalışır durumda (50 bölüm)
- [x] Türkçe dil desteği
- [x] Crash-free temel mekanikler
- [x] Tutorial (ilk oyunda)
- [x] Tüm ekranlar (ana sayfa, oyun, ayarlar, mağaza, liderler, bölümler, temalar)

### Gizlilik & Yasal
- [x] Gizlilik Politikası (Türkçe) — assets/privacy-policy.html
- [x] Kullanım Şartları — assets/terms-of-use.html
- [x] Ayarlar ekranından gizlilik/şartlar linkleri
- [x] "İlerlemeyi Sıfırla" (veri silme) — GDPR/KVKK uyumlu
- [x] Çocuk güvenliği bildirimi (gizlilik politikasında)

### Teknik
- [x] EAS Build config (eas.json)
- [x] iOS bundle ID (com.edavank.tilsimsolitaire)
- [x] Android package (com.edavank.tilsimsolitaire)
- [x] app.json production config
- [x] AsyncStorage ile kalıcı veri

### Monetizasyon
- [x] AdMob altyapısı (src/utils/ads.js)
- [x] Test ad ID'leri tanımlı
- [x] Rewarded ads (reklam izle = coin/hamle)
- [x] Interstitial ads (bölüm arası)
- [x] Banner ads altyapısı
- [x] IAP UI hazır (mağaza ekranı)

---

## 🔴 YAPILMASI GEREKEN (Yayın Öncesi)

### 1. AdMob Hesabı (Senin yapman gereken)
- [ ] https://admob.google.com adresinde hesap aç
- [ ] iOS uygulaması oluştur → App ID al
- [ ] Android uygulaması oluştur → App ID al
- [ ] 3 ad unit oluştur: Banner, Interstitial, Rewarded
- [ ] app.json'daki "ca-app-pub-XXXX~YYYY" değerlerini gerçek ID'lerle değiştir
- [ ] src/utils/ads.js'deki test ID'leri gerçek ad unit ID'leriyle değiştir

### 2. Gizlilik Politikası Hosting
- [ ] assets/privacy-policy.html → Vercel'e deploy et
- [ ] assets/terms-of-use.html → Vercel'e deploy et
- [ ] URL'leri settings.js'de güncelle
- [ ] App Store Connect'te privacy policy URL ekle
- [ ] Google Play Console'da privacy policy URL ekle

### 3. Apple Developer Account
- [ ] Apple Developer Program'a kayıt ol ($99/yıl)
- [ ] App Store Connect'te uygulama oluştur
- [ ] Bundle ID kaydet: com.edavank.tilsimsolitaire
- [ ] App Privacy detaylarını doldur:
  - Veri toplama: Identifiers (Advertising ID — AdMob), Usage Data (AdMob)
  - Tracking: Evet (AdMob reklam kişiselleştirme)
- [ ] Age Rating: 4+ (şiddet yok, cinsel içerik yok)
- [ ] Content Rights: Tüm içerik orijinal (emoji hariç — system emoji)
- [ ] ITSAppUsesNonExemptEncryption: false ✅ (zaten app.json'da)

### 4. Google Play Console
- [ ] Google Play Console hesabı ($25 tek seferlik)
- [ ] Uygulama oluştur
- [ ] Content Rating anketi doldur → muhtemelen PEGI 3 / Everyone
- [ ] Data Safety bölümünü doldur:
  - Device or other IDs: Advertising ID (AdMob)
  - App activity: App interactions (AdMob analytics)
  - Veri paylaşımı: Google (AdMob)
- [ ] Target audience: Tüm yaşlar (ama Families programına dahil olmayacak)
- [ ] Store listing: 4-8 ekran görüntüsü, feature graphic, açıklama
- [ ] Privacy policy URL ekle

### 5. EAS Build
- [ ] `npm install -g eas-cli`
- [ ] `eas login` (Expo hesabı)
- [ ] `eas init` (proje bağla)
- [ ] `eas build --profile production --platform ios`
- [ ] `eas build --profile production --platform android`
- [ ] Test: gerçek cihazda production build test et

### 6. Store Listing Materyalleri
- [ ] App ikonu: 1024x1024 (iOS), 512x512 (Android)
- [ ] Feature Graphic: 1024x500 (Android)
- [ ] Ekran görüntüleri: en az 4 (iPhone 6.7", iPhone 6.5", iPad)
- [ ] Kısa açıklama (80 karakter): "Kelime bulmaca + kart solitaire oyunu"
- [ ] Uzun açıklama (4000 karakter max)
- [ ] Anahtar kelimeler: solitaire, kelime oyunu, bulmaca, kart oyunu, Türkçe

---

## ⚠️ POLİCY UYARI NOTLARI

### Apple App Store
1. **IAP Zorunluluğu**: Dijital içerik (altın, tema) Apple IAP üzerinden satılmalı. Üçüncü parti ödeme KULLANILAMAZ.
2. **Restore Purchases**: Mağaza ekranına "Satın Alımları Geri Yükle" butonu ŞART.
3. **Boş reklam alanı gösterme**: Reklam yüklenmediyse boşluk gösterme — Apple 2.5.10 kuralı.
4. **Subscription**: Reklamsız paket abonelik ise otomatik yenileme koşullarını açıkça göster.
5. **Nisan 2026**: iOS 26 SDK ile build gerekli (Expo SDK 54 uyumlu).

### Google Play
1. **Families Policy**: Eğer "Families" programına dahil olacaksan, AdMob yerine AdMob for Families kullan. Aksi takdirde "designed for everyone" olarak işaretle.
2. **Better Ads Standards**: Interstitial reklam oyun sırasında (kart yerleştirme anında) GÖSTERME. Sadece bölüm arası veya kullanıcı isteğiyle göster.
3. **Data Safety**: AdMob kullandığın için "Advertising ID" topladığını beyan et.
4. **CSAE Requirements**: Çocuk güvenliği politikası (content abuse) beyanı gerekli — Privacy Policy'de var.

### Her İki Platform
1. **GDPR (Avrupa)**: ATT (App Tracking Transparency) ile reklam izni iste.
2. **KVKK (Türkiye)**: Gizlilik politikasında veri sorumlusu bilgisi.
3. **Reklam frekansı**: Her bölüm sonunda değil, her 3-5 bölümde bir interstitial göster.
4. **Rewarded ads**: Kullanıcı kendi isteğiyle izlemeli — zorla gösterme.

---

## 📋 SON KONTROL (Yayın Günü)

- [ ] Test ad ID'leri production ID'leriyle değiştirildi mi?
- [ ] Privacy policy URL canlı mı?
- [ ] Production build gerçek cihazda test edildi mi?
- [ ] IAP sandbox'ta test edildi mi?
- [ ] Rewarded/interstitial ads gerçek ID'lerle çalışıyor mu?
- [ ] Tüm ekranlar crash-free mi?
- [ ] "Satın Alımları Geri Yükle" çalışıyor mu?
- [ ] App icon/splash tüm boyutlarda iyi görünüyor mu?
