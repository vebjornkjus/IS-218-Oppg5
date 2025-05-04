export function initMap() {
  const map = L.map("map", {
    zoomControl: false,
    fadeAnimation: false,
    markerZoomAnimation: false
  }).setView([58.14671, 8.01002], 10);

  L.control.zoom({ position: "topright" }).addTo(map);

  const osmBaseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const hoydekurveLayer = L.tileLayer.wms("https://wms.geonorge.no/skwms1/wms.fkb?", {
    layers: "hoydekurver_5m,hoydekurver_1m,hoydepunkt",
    format: "image/png",
    transparent: true,
    attribution: "© Kartverket / Geonorge",
    version: "1.3.0"
  }).addTo(map);  

  // Lagkontroll for visning/avvisning
  L.control.layers({
    "OpenStreetMap": osmBaseLayer
  }, {
    "Høydekurver (Kartverket)": hoydekurveLayer
  }).addTo(map);

  return map;
}
