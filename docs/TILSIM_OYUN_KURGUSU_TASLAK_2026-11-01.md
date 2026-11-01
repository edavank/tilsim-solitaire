# Tılsım Solitaire oyun kurgusu taslağı

Bu taslak, hatalar kapandıktan sonra uygulanacak oyun kurallarını somutlaştırır. Grafik yönü seçilmiş değildir. Logo, uygulama simgesi, kartlar, kategori simgeleri ve oyun içi görseller daha sonra birlikte yenilenecek. Mevcut oyuncunun coin veya ilerlemesi sıfırlanmayacak.

## İlk ekranda görülecek oyun alanı

İlk bölümde üstte **iki boş kategori alanı** ve altta **üç açık sütun** olacak. Kilitli alan, reklam işareti, mağaza teklifi veya yardımcı tanıtımı açılışı bölmeyecek. Kategori kartı üstteki boş alana, kelime kartı ilgili kategoriye taşınacak.

İlk örnek:

| Öğe | Değer |
|---|---|
| Kategoriler | Meyveler ve Taşıtlar |
| Kelimeler | Elma, Armut, Kiraz; Tren, Araba, Uçak |
| Üstteki boş alan | 2; ikisi de hemen kullanılabilir |
| Alt sütun | 3; başlangıçta her birinde tek açık kart |
| Toplam kart | 8; iki kategori ve altı kelime |
| Deste | 5 kart; en üstte ikinci kategori kartı |
| Hamle bütçesi | İlk deneme için 18 |
| Reklam ve yardımcı gereksinimi | Yok |

Bu belirli dağıtım gerçek oyun işlevleriyle 13 hamlede çözüldü ve beş hamle kaldı. İlk hamlelerde kategori kartını açma ve kelimeyi eşleme öğretiliyor. İlk bölüm rastgele dağıtılmayacak. Öğretici arka arkaya metin pencereleri yerine o an yapılabilecek tek örneği gösterecek.

Bu çözüm, sonraki bütün bölümlerin dengelendiğini göstermez. İlk örneğin verisi `prototypes/opening-level.json`; canlı oyuna bağlanmadı.

## İlk otuz bölümde ilerleme

Sayılar ilk test modelidir. Hamle sınırı her bölümün kayıtlı çözüm uzunluğu ve alternatif çözümleri ölçüldükten sonra kesinleşecek; yalnız kart sayısından tahmin edilmeyecek.

| Bölüm | Kategori ve kelime | Açık kategori alanı | Açık sütun | Öğretilecek şey | İsteğe bağlı yardım |
|---|---|---:|---:|---|---|
| 1 | 2 kategori, üçer kelime | 2 | 3 | Kategoriyi açma ve kelimeyi eşleme | Yok |
| 2 ve 3 | 3 kategori, üçer kelime | 3 | 4 | Deste, yeni kart açma ve açık grubu taşıma | Öğretim sonunda ipucu tanıtımı |
| 4 ile 6 | 3 kategori, dörder kelime | 3 | 4 | Kapalı kartı açma ve alanı düzenleme | Geri Al tanıtımı; reklam teklifi yok |
| 7 ile 10 | 4 kategori, üç veya dörder kelime | 3 | 4 | Bir kategoriyi bitirip alanı yeniden kullanma | İstenirse bir ek kategori alanı |
| 11 ile 15 | 4 kategori, dört veya beşer kelime | 3 | 4 | İki adımlı plan kurma | Joker; ek kategori alanı |
| 16 ile 20 | 5 kategori, dört veya beşer kelime | 4 | 5 | Birden çok hedef arasında seçim | Karıştır; ek kategori alanı |
| 21 ile 30 | 5 kategori, beş veya altışar kelime | 4 | 5 | Daha uzun plan, kontrollü zor bölüm | Aktar; ek kategori alanı |

Her yeni mekanik kendi kolay bölümünde öğretilecek. Yeni mekanik ile dar hamle bütçesi aynı bölümde gelmeyecek. Zorluk sürekli artan bir duvar olmayacak; daha yoğun bölümden sonra daha kısa, rahatlatan bir bölüm gelecek. İlk 30 bölümde oyuncuyu reklam olmadan ilerleyemeyeceği bir düzene sokmayacağız.

## Reklamla ek alan

Ek alan bölümün başında zorunlu bir kilit gibi davranmayacak. Oyuncu kendisi seçerse reklam karşılığında o bölüm için **bir ek kategori alanı** açılacak. Açılacak alanın yeri ve etkisi reklamdan önce belli olacak.

- Ana çözüm ek alan olmadan tamamlanabilir olmalı.
- Ödül yalnız reklamın kazanıldı bildirimiyle verilmeli; yükleme hatasında hak veya coin eksilmemeli.
- Açılan alan arka plana geçişte, kayıt yüklemede ve Geri Al'da kapanmamalı.
- Yeniden oynama yeni denemedir; ek alanın o denemeye ait olduğu açık olmalı. Aynı denemenin yeniden açılması yeni reklam istememeli.
- Reklam izlemek istemeyen oyuncu başka bir normal çözüm deneyebilmeli. İlk öğretim bölümleri reklamla bölünmemeli.

Bir ek sütun veya tek kartlık bekleme alanı daha sonra araştırılabilir. Küçük telefonlarda kartları okunamayacak kadar daraltan altıncı sütun kendiliğinden eklenmeyecek.

## Hamle ve başarısızlık kuralları

Geçerli bir kart eylemi bir hamle tüketecek. Aynı eylem dokunma ve sürüklemede aynı sonuç vermeli. Geçersiz hedefe bırakma kartı eski yerine döndürmeli; görünmeyen bir hedefe otomatik taşımamalı.

Geri Al kart hamlesini geri alırken satın alınmış ek alanı veya ek hamleyi yok etmemeli. Joker başka kategorinin gereken kelimesini tüketip bölümü imkânsızlaştırmamalı. Aktar bir kelimeyi gerekli hedefe yerleştirmeli; gerekli kartı silmemeli.

Hamle bittiyse oyuncuya neden bittiği ve hangi seçeneğin ne verdiği açıkça gösterilmeli. Süreli modda hamle satılmayacak. Süre uzatma istenecekse saniye miktarı, kullanım sınırı ve ödül hesabına etkisi ayrıca tanımlanacak. Reklam ve öğretici sırasında oyun süresi harcanmamalı; normal arka plana geçiş politikası da tek kurala bağlanmalı.

## Coin ve ödül modeli

İlk tercih, sonucu kolay hesaplanan bir ekonomi: yeni normal bölümün ilk tamamlanmasında görünür ve sabit temel coin ödülü; yıldız ve ustalık puanı ayrı. İlk deneme değeri **50 coin**. Gizli hız/hamle coinleriyle bakiyeyi açıklanamaz hâle getirmeyeceğiz.

500 coinle başlayan yeni bir oyuncu 13 yeni bölüm bitirdiyse, başka ödül veya harcama yokken bakiye 1.150 olmalı. Günlük giriş, başarım, reklam ve alışveriş varsa her biri Coin hareketleri'nde ayrı görünmeli. Mevcut 2.353 gibi devralınmış bakiyeler geriye dönük tahminle düşürülmeyecek.

Tekrar oynanan bölüm, ilk kez tamamlanan bölümle aynı sınırsız coin kaynağı olmamalı. Tekrar ödülü ve günlük sınırı, benzer oyun araştırması ve ekonomi simülasyonuyla kesinleştirilecek. Mevcut fiyatlar bu taslakla değiştirilmedi. Yardım fiyatları; normal ilerleme, ücretsiz tanıtım hakları ve günlük kazanımla birlikte test edilecek.

Günlük bulmacada aynı günün ödülü bir kez verilecek. Geçmiş bulmacaların alıştırma mı yoksa ayrı ödül kaynağı mı olduğu açıkça belirlenecek. Turnuva ödülü ancak gerçek sezon ve dağıtım sistemi varsa gösterilecek.

## Kategori ve kart içeriği

Her kategori, kelime ve anlamın kalıcı kimliği olacak. Dil listelerindeki sıra numaraları kimlik yerine kullanılmayacak. Aynı bölümde aynı yazılan kelimenin iki kategoride bulunması engellenecek; anlamca iki doğru cevabı olan eşleşmeler de içerik kontrolünden geçecek.

İlk bölümlerde kısa ve yaygın Türkçe kelimeler, kolay ayrılan kategoriler ve anlaşılır simgeler kullanılacak. Emoji yalnız süs olmayacak; kelimeyi destekleyecek. İlerleyen bölümlerde sözcük sayısı ve anlam yakınlığı ölçülerek artırılacak. Türkçe İ, ı, ş, ğ ve uzun kelimeler küçük Android'de ayrıca kontrol edilecek.

## Uygulamadan önce geçilecek koşullar

Önce hak ve tahta işlemleri, gerçek hesap silme, sunucu sahipliği ve kayıt güvenliği kapanacak. Ardından ilk 30 bölüm için sabit dağıtım, kayıtlı çözüm, yardım gerektirmeyen bitiş ve gerçek oyuncu testleri hazırlanacak. Benzer oyun araştırmasıyla günlük hedefler, koleksiyon, ustalık görevleri ve farklı oyun biçimleri karşılaştırılacak. Tasarım yönü seçildikten sonra logo ve bütün görseller bu kurguya göre üretilecek.

Bu taslak mağazalara gönderilmedi ve canlı seviyelerin yerine geçirilmedi.
