export function initMap() {
    // Deaktivér standardzoom og sett visning
    const map = L.map('map', { zoomControl: false })
      .setView([61.14671, 9.9956], 6);
    // Flytt zoom‑kontroller
    L.control.zoom({ position: 'topright' }).addTo(map);
    // Legg til bakgrunnskart
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    return map;
  }