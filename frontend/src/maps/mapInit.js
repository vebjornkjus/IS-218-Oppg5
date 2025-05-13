// frontend/src/maps/mapInit.js - Simplified version

import { SimplifiedBuildingManager } from './BuildingLayerManager.js';
import { SUPABASE_CONFIG } from '../config/app.js';

export function initMap() {
  // Basic map setup
  const map = L.map("map", {
    zoomControl: false,
    fadeAnimation: false,
    markerZoomAnimation: false
  }).setView([58.14671, 8.01002], 10);
  
  L.control.zoom({ position: "topright" }).addTo(map);
  
  // WMS common options
  const wmsCommonOptions = {
    format: "image/png",
    transparent: true,
    version: "1.3.0"
  };
  
  // Base layer
  const osmBaseLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "© OpenStreetMap contributors" }
  ).addTo(map);
  
  // Overlay layers
  const overlayLayers = {
    hoydekurver: L.tileLayer.wms("https://wms.geonorge.no/skwms1/wms.fkb?", {
      ...wmsCommonOptions,
      layers: "hoydekurver_5m,hoydekurver_1m,hoydepunkt",
      attribution: "© Kartverket / Geonorge"
    }).addTo(map),
    
    flomAktsomhet: L.tileLayer.wms("https://nve.geodataonline.no/arcgis/services/FlomAktsomhet/MapServer/WMSServer", {
      ...wmsCommonOptions,
      layers: "Flom_aktsomhetsomrade",
      attribution: "© NVE"
    }),
    
    dekning: L.tileLayer.wms("https://nve.geodataonline.no/arcgis/services/FlomAktsomhet/MapServer/WMSServer", {
      ...wmsCommonOptions,
      layers: "FlomAktsomhet_Dekning",
      attribution: "© NVE"
    }),
    
    vannstand: L.tileLayer.wms("https://nve.geodataonline.no/arcgis/services/FlomAktsomhet/MapServer/WMSServer", {
      ...wmsCommonOptions,
      layers: "MaksimalVannstandstigning",
      attribution: "© NVE"
    })
  };
  
  // Flood zone layers
  const floodZoneLayerNames = {
    10: "Flomsone_10arsflom",
    20: "Flomsone_20arsflom",
    50: "Flomsone_50arsflom",
    100: "Flomsone_100arsflom",
    200: "Flomsone_200arsflom",
    500: "Flomsone_500arsflom",
    1000: "Flomsone_1000arsflom"
  };
  
  const floodZoneLayers = {};
  Object.entries(floodZoneLayerNames).forEach(([year, layerName]) => {
    floodZoneLayers[year] = L.tileLayer.wms("https://nve.geodataonline.no/arcgis/services/Flomsoner1/MapServer/WMSServer", {
      ...wmsCommonOptions,
      layers: layerName,
      attribution: "© NVE"
    });
  });
  
  // Initialize building manager
  const buildingManager = new SimplifiedBuildingManager(map, SUPABASE_CONFIG);
  
  // Create unified controls
  createUnifiedControls(map, overlayLayers, floodZoneLayers, buildingManager);
  
  return map;
}

function createUnifiedControls(map, overlayLayers, floodZoneLayers, buildingManager) {
  const sidebar = document.getElementById('sidebar');
  
  // Clear sidebar content (keep collapse button)
  const collapseBtn = sidebar.querySelector('#collapse-sidebar');
  sidebar.innerHTML = '';
  if (collapseBtn) {
    sidebar.appendChild(collapseBtn);
  }
  
  // Create controls container
  const controlContainer = document.createElement('div');
  controlContainer.className = 'unified-controls';
  
  // Overlay controls
  const overlaySection = document.createElement('div');
  overlaySection.innerHTML = '<h4>Kartlag</h4>';
  
  Object.entries(overlayLayers).forEach(([key, layer]) => {
    const div = document.createElement('div');
    div.className = 'layer-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `overlay-${key}`;
    checkbox.checked = map.hasLayer(layer);
    
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = {
      hoydekurver: 'Høydekurver',
      flomAktsomhet: 'Flom – Aktsomhetsområder',
      dekning: 'Flom – Dekning',
      vannstand: 'Maksimal vannstandsstigning'
    }[key];
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        map.addLayer(layer);
      } else {
        map.removeLayer(layer);
      }
    });
    
    div.appendChild(checkbox);
    div.appendChild(label);
    overlaySection.appendChild(div);
  });
  
  // Flood zone controls
  const floodSection = document.createElement('div');
  floodSection.innerHTML = '<h4>Flomsoner</h4>';
  
  // Show flood zones checkbox
  const showFloodDiv = document.createElement('div');
  showFloodDiv.className = 'layer-item';
  
  const showFloodCheckbox = document.createElement('input');
  showFloodCheckbox.type = 'checkbox';
  showFloodCheckbox.id = 'show-flood-zones';
  
  const showFloodLabel = document.createElement('label');
  showFloodLabel.htmlFor = 'show-flood-zones';
  showFloodLabel.textContent = 'Vis flomsoner';
  
  showFloodDiv.appendChild(showFloodCheckbox);
  showFloodDiv.appendChild(showFloodLabel);
  floodSection.appendChild(showFloodDiv);
  
  // Flood year slider
  const sliderDiv = document.createElement('div');
  sliderDiv.className = 'slider-container';
  
  const currentYearDiv = document.createElement('div');
  currentYearDiv.className = 'current-year';
  currentYearDiv.textContent = '100-års flomsone';
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '6';
  slider.value = '3';
  slider.className = 'flood-slider';
  
  const valueMap = { '0': 10, '1': 20, '2': 50, '3': 100, '4': 200, '5': 500, '6': 1000 };
  
  // Event handlers
  const updateFloodZones = () => {
    const isChecked = showFloodCheckbox.checked;
    const year = valueMap[slider.value];
    
    currentYearDiv.textContent = `${year}-års flomsone`;
    
    // Remove all flood zones
    Object.values(floodZoneLayers).forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    
    // Add current flood zone if checked
    if (isChecked && floodZoneLayers[year]) {
      map.addLayer(floodZoneLayers[year]);
    }
  };
  
  showFloodCheckbox.addEventListener('change', updateFloodZones);
  slider.addEventListener('input', updateFloodZones);
  
  sliderDiv.appendChild(currentYearDiv);
  sliderDiv.appendChild(slider);
  
  // Slider legend
  const legend = document.createElement('div');
  legend.className = 'slider-legend';
  legend.innerHTML = '<span>10 år</span><span>1000 år</span>';
  sliderDiv.appendChild(legend);
  
  floodSection.appendChild(sliderDiv);
  
  // Add sections to container
  controlContainer.appendChild(overlaySection);
  controlContainer.appendChild(floodSection);
  
  // Add basic CSS
  const style = document.createElement('style');
  style.textContent = `
    .unified-controls { padding: 20px 0; }
    .layer-item { display: flex; align-items: center; margin: 8px 0; }
    .layer-item input { margin-right: 8px; }
    .layer-item label { cursor: pointer; }
    .slider-container { margin-top: 10px; }
    .current-year { font-weight: bold; margin-bottom: 5px; }
    .flood-slider { width: 100%; }
    .slider-legend { display: flex; justify-content: space-between; font-size: 12px; margin-top: 5px; }
  `;
  document.head.appendChild(style);
  
  sidebar.appendChild(controlContainer);
} 