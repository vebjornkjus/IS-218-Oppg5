const map = L.map('map').setView([58.14671, 7.9956], 12); // Kristiansand

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Her kan dere etter hvert legge til Turf-analyse, GeoJSON-data osv.