export function initMap() {
  // --------------------------------------------------
  // Map setup - basic configuration
  // --------------------------------------------------
  const map = L.map("map", {
    zoomControl: false,
    fadeAnimation: false,
    markerZoomAnimation: false
  }).setView([58.14671, 8.01002], 10);
  
  L.control.zoom({ position: "topright" }).addTo(map);
  
  // --------------------------------------------------
  // Base maps
  // --------------------------------------------------
  const osmBaseLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "© OpenStreetMap contributors" }
  ).addTo(map);
  
  // --------------------------------------------------
  // WMS common options
  // --------------------------------------------------
  const wmsCommonOptions = {
    format: "image/png",
    transparent: true,
    version: "1.3.0"
  };
  
  // --------------------------------------------------
  // Kartverket - elevation contours
  // --------------------------------------------------
  const hoydekurveLayer = L.tileLayer.wms(
    "https://wms.geonorge.no/skwms1/wms.fkb?",
    {
      ...wmsCommonOptions,
      layers: "hoydekurver_5m,hoydekurver_1m,hoydepunkt",
      attribution: "© Kartverket / Geonorge"
    }
  );
  
  // --------------------------------------------------
  // NVE - Flood susceptibility layers
  // --------------------------------------------------
  const aktsomhetUrl = "https://nve.geodataonline.no/arcgis/services/FlomAktsomhet/MapServer/WMSServer";
  
  const flomAktsomhetLayer = L.tileLayer.wms(aktsomhetUrl, {
    ...wmsCommonOptions,
    layers: "Flom_aktsomhetsomrade",
    attribution: "© NVE"
  }).addTo(map);
  
  const dekningsLayer = L.tileLayer.wms(aktsomhetUrl, {
    ...wmsCommonOptions,
    layers: "FlomAktsomhet_Dekning",
    attribution: "© NVE"
  });
  
  const vannstandLayer = L.tileLayer.wms(aktsomhetUrl, {
    ...wmsCommonOptions,
    layers: "MaksimalVannstandstigning",
    attribution: "© NVE"
  });
  
  // --------------------------------------------------
  // NVE - Flood zone layers
  // --------------------------------------------------
  const flomsonerUrl = "https://nve.geodataonline.no/arcgis/services/Flomsoner1/MapServer/WMSServer";
  
  const flomsonerOptions = {
    ...wmsCommonOptions,
    attribution: "© NVE"
  };
  
  const flomsone100 = L.tileLayer.wms(flomsonerUrl, {
    ...flomsonerOptions,
    layers: "Flomsone_100arsflom",
    zIndex: 10
  }).addTo(map);
  
  const flomsone200 = L.tileLayer.wms(flomsonerUrl, {
    ...flomsonerOptions,
    layers: "Flomsone_200arsflom"
  });
  
  const flomsone200K = L.tileLayer.wms(flomsonerUrl, {
    ...flomsonerOptions,
    layers: "Flomsone_200arsflom_klima"
  });
  
  const flomsone500 = L.tileLayer.wms(flomsonerUrl, {
    ...flomsonerOptions,
    layers: "Flomsone_500arsflom"
  });
  
  // --------------------------------------------------
  // Layer control - organized in a single control panel
  // --------------------------------------------------
  L.control.layers(
    { 
      "OpenStreetMap": osmBaseLayer 
    },
    {
      "Høydekurver (Kartverket)": hoydekurveLayer,
      "Flom – Aktsomhetsområder": flomAktsomhetLayer,
      "Flom – Dekning": dekningsLayer,
      "Maksimal vannstandsstigning": vannstandLayer,
      "Flomsone 100‑års": flomsone100,
      "Flomsone 200‑års": flomsone200,
      "Flomsone 200‑års + klima": flomsone200K,
      "Flomsone 500‑års": flomsone500
    },
    { collapsed: false }
  ).addTo(map);
  
  return map;
}