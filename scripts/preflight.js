#!/usr/bin/env node
// Tılsım Solitaire — Production Build Hazırlık Kontrolü
// Kullanım: node scripts/preflight.js

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let errors = 0;
let warnings = 0;

function check(label, condition, isError = true) {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else if (isError) {
    console.log(`  ❌ ${label}`);
    errors++;
  } else {
    console.log(`  ⚠️  ${label}`);
    warnings++;
  }
}

function fileExists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

function fileContains(p, str) {
  if (!fileExists(p)) return false;
  return fs.readFileSync(path.join(ROOT, p), 'utf8').includes(str);
}

function fileNotContains(p, str) {
  if (!fileExists(p)) return true;
  return !fs.readFileSync(path.join(ROOT, p), 'utf8').includes(str);
}

console.log('\n🔍 Tılsım Solitaire — Pre-flight Check\n');

// ── app.json ──
console.log('📱 app.json:');
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const expo = appJson.expo;
check('version belirlenmiş', expo.version && expo.version !== '0.0.0');
check('iOS bundleIdentifier', expo.ios?.bundleIdentifier === 'com.edavank.tilsimsolitaire');
check('Android package', expo.android?.package === 'com.edavank.tilsimsolitaire');
check('usesAppleSignIn: true', expo.ios?.usesAppleSignIn === true);
check('scheme tanımlı', expo.scheme === 'tilsim-solitaire');
check('EAS projectId var', expo.extra?.eas?.projectId && !expo.extra.eas.projectId.includes('___'));
check('orientation: portrait', expo.orientation === 'portrait');
check('ITSAppUsesNonExemptEncryption: false', expo.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === false);
check('NSUserTrackingUsageDescription var', !!expo.ios?.infoPlist?.NSUserTrackingUsageDescription);
check('expo-apple-authentication plugin', expo.plugins?.includes('expo-apple-authentication'));

// AdMob plugin check
const hasAdMobPlugin = expo.plugins?.some(p => 
  (Array.isArray(p) && p[0] === 'react-native-google-mobile-ads') ||
  p === 'react-native-google-mobile-ads'
);
check('AdMob plugin app.json\'da (react-native-google-mobile-ads)', hasAdMobPlugin, false);

console.log('');

// ── Firebase Config ──
console.log('🔥 Firebase:');
check('google-services.json var', fileExists('google-services.json'), false);
check('GoogleService-Info.plist var', fileExists('GoogleService-Info.plist'), false);
check('google-services.json .gitignore\'da', fileContains('.gitignore', 'google-services.json'));

console.log('');

// ── AdMob ──
console.log('📢 AdMob:');
check('ads.js production ID\'leri değiştirildi', fileNotContains('src/utils/ads.js', 'ca-app-pub-XXXX'), false);
check('ads.js test ID\'leri mevcut (fallback)', fileContains('src/utils/ads.js', 'ca-app-pub-3940256099942544'));

console.log('');

// ── Auth ──
console.log('🔐 Auth:');
check('auth.js mevcut', fileExists('src/utils/auth.js'));
check('AuthContext.js mevcut', fileExists('src/context/AuthContext.js'));
check('login.js mevcut', fileExists('app/login.js'));
check('supabase.js mevcut', fileExists('src/utils/supabase.js'));
check('Supabase URL yapılandırılmış', fileNotContains('src/utils/supabase.js', 'YOUR_SUPABASE'));

console.log('');

// ── Legal ──
console.log('⚖️  Yasal:');
check('privacy-policy.html var', fileExists('assets/privacy-policy.html') || fileExists('legal/privacy.html'));
check('terms-of-use.html var', fileExists('assets/terms-of-use.html') || fileExists('legal/terms.html'));
check('legal/vercel.json var (hosting)', fileExists('legal/vercel.json'));

console.log('');

// ── EAS ──
console.log('🏗️  EAS Build:');
const easJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));
check('production profili var', !!easJson.build?.production);
check('production android → app-bundle', easJson.build?.production?.android?.buildType === 'app-bundle');
check('submit config var', !!easJson.submit?.production);
check('play-store-key.json yolu tanımlı', !!easJson.submit?.production?.android?.serviceAccountKeyPath);
check('iOS appleId dolduruldu', easJson.submit?.production?.ios?.appleId && !easJson.submit.production.ios.appleId.includes('YOUR'), false);
check('play-store-key.json var', fileExists('play-store-key.json'), false);

console.log('');

// ── Packages ──
console.log('📦 Paketler:');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
check('@supabase/supabase-js', !!deps['@supabase/supabase-js']);
check('expo-apple-authentication', !!deps['expo-apple-authentication']);
check('expo-auth-session', !!deps['expo-auth-session']);
check('expo-web-browser', !!deps['expo-web-browser']);
check('react-native-google-mobile-ads', !!deps['react-native-google-mobile-ads'], false);
check('expo-tracking-transparency', !!deps['expo-tracking-transparency'], false);

console.log('');

// ── i18n Auth Keys ──
console.log('🌍 i18n Auth:');
if (fileExists('src/i18n/translations.js')) {
  const i18n = fs.readFileSync(path.join(ROOT, 'src/i18n/translations.js'), 'utf8');
  const requiredKeys = ['signInGoogle', 'signInApple', 'skipLogin', 'loginSubtitle', 'loginError', 'signOut'];
  const langs = ['tr', 'en', 'de', 'fr', 'es', 'ar'];
  let allPresent = true;
  for (const lang of langs) {
    const section = i18n.split(`${lang}:`)[1]?.split(/\n  \w+:/)?.[0] || '';
    for (const key of requiredKeys) {
      if (!section.includes(`${key}:`)) {
        console.log(`  ❌ ${lang}.${key} eksik`);
        allPresent = false;
        errors++;
      }
    }
  }
  if (allPresent) check('6 dilde tüm auth key\'leri mevcut', true);
} else {
  check('translations.js bulunamadı', false);
}

console.log('');

// ── Summary ──
console.log('─'.repeat(50));
if (errors === 0 && warnings === 0) {
  console.log('🚀 Her şey hazır! Production build alabilirsin.\n');
} else if (errors === 0) {
  console.log(`⚠️  ${warnings} uyarı var ama build alınabilir.\n`);
} else {
  console.log(`❌ ${errors} hata, ${warnings} uyarı — build öncesi düzelt.\n`);
}

process.exit(errors > 0 ? 1 : 0);
