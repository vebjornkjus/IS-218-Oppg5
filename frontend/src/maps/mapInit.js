export function initMap() {
    // Sett Kristiansand som startposisjon
    const map = L.map('map', { zoomControl: false })
      .setView([58.14671, 8.01002], 12);
    // Flytt zoom‑kontroller
    L.control.zoom({ position: 'topright' }).addTo(map);
    // Legg til bakgrunnskart
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    return map;
  }