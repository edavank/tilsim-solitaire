// Mevsimsel Etkinlikler
const EVENTS = [
  // Ramazan (değişken tarih — 2026 tahmini)
  { id: 'ramazan_2026', name: 'Ramazan Bayramı', startMonth: 2, startDay: 28, endMonth: 3, endDay: 30, 
    icon: '🌙', bonus: 2, specialCategories: ['Türk Mutfağı', 'Tatlılar', 'Çay', 'Baharat'] },
  // Yılbaşı
  { id: 'yilbasi', name: 'Yeni Yıl Kutlaması', startMonth: 11, startDay: 25, endMonth: 0, endDay: 5,
    icon: '🎄', bonus: 2, specialCategories: ['Tatlılar', 'Meşrubat', 'Müzik', 'Pasta'] },
  // 23 Nisan
  { id: 'nisan23', name: '23 Nisan Şenliği', startMonth: 3, startDay: 20, endMonth: 3, endDay: 25,
    icon: '🎈', bonus: 1.5, specialCategories: ['Oyuncaklar', 'Renkler', 'Masal', 'Okul'] },
  // 29 Ekim
  { id: 'ekim29', name: 'Cumhuriyet Bayramı', startMonth: 9, startDay: 27, endMonth: 10, endDay: 1,
    icon: '🇹🇷', bonus: 2, specialCategories: ['Şehirler', 'İstanbul', 'Tarih', 'Türk Mutfağı'] },
  // Yaz
  { id: 'yaz', name: 'Yaz Festivali', startMonth: 5, startDay: 15, endMonth: 8, endDay: 15,
    icon: '☀️', bonus: 1.5, specialCategories: ['Plaj', 'Tatil', 'Dondurma', 'Meşrubat'] },
];

export function getActiveEvent() {
  const now = new Date();
  const m = now.getMonth();
  const d = now.getDate();

  for (const event of EVENTS) {
    let active = false;
    if (event.startMonth <= event.endMonth) {
      // Same year range
      active = (m > event.startMonth || (m === event.startMonth && d >= event.startDay)) &&
               (m < event.endMonth || (m === event.endMonth && d <= event.endDay));
    } else {
      // Cross-year range (e.g., Dec → Jan)
      active = (m > event.startMonth || (m === event.startMonth && d >= event.startDay)) ||
               (m < event.endMonth || (m === event.endMonth && d <= event.endDay));
    }
    if (active) return event;
  }
  return null;
}

export function getEventCoinMultiplier() {
  const event = getActiveEvent();
  return event ? event.bonus : 1;
}
