# Tılsım S2 — iPhone kontrolü

Bu sürüm test içindir. Ayarlar'ın altında **S2 TEST** yazmalıdır. Güncelleme kanalı `preview`; canlı `production` kanalına bu paket gönderilmez. TestFlight kurulumu yeni bir test yapımı gerektirir; sonradan uyumlu düzeltmeler mevcut canlı sürüme Expo Update ile dağıtılabilir.

## Telefonda

1. Test davetini iPhone'da aç ve TestFlight'ta kabul et. Tılsım görünür olduğunda test yapımını yükle. Oyunu veya uygulama verilerini silme.
2. İlk açılışta bölümünü ve mevcut coinini not et. Önceki sürümden devralınan bakiyeyi değiştirmiyoruz; geçmişteki kazançların ayrıntılarını yeniden oluşturamıyoruz.
3. Ayarlar → Coin hareketleri'ni aç. Devralınan bakiye ilk satırdır. Yeni kazançlar ve harcamalar bu cihazda ayrı satırlarla kaydedilir; son 200 hareket tutulur.
4. Bir bölüm bitir. Sonuçta gösterilen ödül kadar bakiye artmalı. Bölümün temel ödülü ve varsa hamle/hız bonusu ayrı gösterilir; ödül sabit 50 varsayılmaz. “Ödül kaydedildi” yazısını gör.
5. Sonuçta Tekrar oyna'yı seç: ilk kazanım kaybolmamalı. Aynı sonuç ekranından Ana sayfa/Sonraki veya uygulamayı yeniden açma, aynı denemeyi ikinci kez ödememeli. Yeni ve gerçekten tamamlanan normal deneme mevcut oyunun tekrar oynama ödülünü alabilir; yeni ekonomi tasarımı henüz uygulanmadı.
6. Günlük bulmacayı tekrar oyna: aynı günün ödülü ikinci kez verilmemeli. Günlük girişte hızlı tekrar basmak da bir kez ödeme yapmalı.
7. Bir yardımcı satın al; azalan bakiyeyi not et. Ayarlar → Bulut kaydı → Şimdi eşitle. Eski yüksek bakiye geri gelmemeli. Eşitlemenin tamamlandığını görmeden çıkış yapma testi yapma.
8. Aynı hesabı başka cihazda açabiliyorsan bölüm, bakiye, yıldız, XP ve yardımcı haklarını kontrol et. İki cihazdaki bağımsız harcamalar birleşmeli; aynı kayıtlı ödül yeniden ödenmemeli.
9. İnterneti kapatıp bir bölüm tamamla; sonuç ve ödül bu cihazda korunmalı. İnterneti açıp eşitle; ödül tekrar eklenmemeli.
10. İlerleyen oyunda birkaç hamle yap, ana sayfaya dön, oyunu yeniden aç. Son durum korunmalı. Süreli oyunda kaydedilmiş kalan süre ve sonuç yıldızı ayrıca kontrol edilmeli.

İlk v2 eşitlemede eski yerel ve bulut kayıtları farklıysa otomatik olarak yüksek para seçilmez. İki kopyanın bölüm ve bakiyesi gösterilir; kullanıcı seçim yapar. Seçilmeyen başlangıç kopyası cihazda kurtarma için korunur. Kararsızsan seçim yapmadan iki değeri bildir.

## Geliştirici doğrulaması

- `node --test scripts/test-critical.cjs`: 26 test geçti.
- `node scripts/verify-screen.cjs`: ilk JavaScript çizimi, yerel bileşenler taklit edilerek geçti. Bu fiziksel cihaz testi değildir.
- Sunucuda migration uygulandı: `state_v2`, `revision`, kullanıcıya özel eşitleme makbuzları ve `sync_progress_v2`.
- Gerçek PostgreSQL üzerinde geri alınan işlemle test edildi: aynı makbuzun tekrarı, sürüm çakışması, harcama, eski yüksek-bakiye yazımının engellenmesi ve kullanıcıya özel RLS. Sonuç PASS; geçici test kullanıcısı ve tüm test değişiklikleri ROLLBACK ile geri alındı. Oyuncu bakiyeleri değiştirilmedi.
- Yeni protokole geçen hesapta eski istemcinin max-bakiye eşitlemesi reddedilir; diğer hesaplar v2'ye geçene kadar eski yolunu kullanır. Karışık eski/yeni istemcilerde bütün cihazların güncellenmesi gerekir.
- v2 mevcut ilerleme nesnesini, yıldızları, XP'yi, yardımcı haklarını ve ödeme makbuzlarını korur. Eski sunucuda bulunmayan tarihsel ayrıntılar sonradan icat edilmez. Coin hareketleri cihazda tutulur; global bankacılık defteri veya hile önleme sistemi olduğu iddia edilmez.
- Mevcut kategori/silme/joker güvenliği, başarım ödeme makbuzu ve kayıt düzeltmeleri bu test yapımına dahildir. Reddedilen tasarımlar ve yeni ekonomi uygulanmadı.

## Yayın öncesi

TestFlight erişimi, telefon kontrolü ve eşitleme sonucu doğrulanmadan production kanalına yayın yapılmaz. Beta test yayını, App Store'daki canlı sürümün yayınlanması değildir. Apple dış test grubu için beta incelemesi isteyebilir; bunun sonucu ayrıca doğrulanmalıdır.
