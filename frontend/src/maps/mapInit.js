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
  ).addTo(map);
  
  // --------------------------------------------------
  // NVE - Flood susceptibility layers
  // --------------------------------------------------
  const aktsomhetUrl = "https://nve.geodataonline.no/arcgis/services/FlomAktsomhet/MapServer/WMSServer";
  
  const flomAktsomhetLayer = L.tileLayer.wms(aktsomhetUrl, {
    ...wmsCommonOptions,
    layers: "Flom_aktsomhetsomrade",
    attribution: "© NVE"
  });
  
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
  
  // Define all flood zone layers
  const floodZoneLayers = {
    10: L.tileLayer.wms(flomsonerUrl, {
      ...flomsonerOptions,
      layers: "Flomsone_10arsflom",
      zIndex: 12
    }),
    20: L.tileLayer.wms(flomsonerUrl, {
      ...flomsonerOptions,
      layers: "Flomsone_20arsflom",
      zIndex: 11
    }),
    50: L.tileLayer.wms(flomsonerUrl, {
      ...flomsonerOptions,
      layers: "Flomsone_50arsflom",
      zIndex: 10.5
    }),
    100: L.tileLayer.wms(flomsonerUrl, {
      ...flomsonerOptions,
      layers: "Flomsone_100arsflom",
      zIndex: 10
    }),
    200: L.tileLayer.wms(flomsonerUrl, {
      ...flomsonerOptions,
      layers: "Flomsone_200arsflom",
      zIndex: 9
    }),
    500: L.tileLayer.wms(flomsonerUrl, {
      ...flomsonerOptions,
      layers: "Flomsone_500arsflom",
      zIndex: 7
    }),
    1000: L.tileLayer.wms(flomsonerUrl, {
      ...flomsonerOptions,
      layers: "Flomsone_1000arsflom",
      zIndex: 6
    })
  };
  
  // Add 100-year flood zone as default
  floodZoneLayers[100].addTo(map);

  // --------------------------------------------------
  // GeoJSON flood building layers
  // --------------------------------------------------
  // Hash for bbox - må matche det som brukes i Python-skriptet
  const bboxHash = "fdd7a59a"; // Update to match your Norway hash
  
  // URLs for de forskjellige flomperiodene
  const floodUrls = {
    10: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_10yr_${bboxHash}.geojson`,
    20: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_20yr_${bboxHash}.geojson`,
    50: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_50yr_${bboxHash}.geojson`,
    100: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_100yr_${bboxHash}.geojson`,
    200: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_200yr_${bboxHash}.geojson`,
    500: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_500yr_${bboxHash}.geojson`,
    1000: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_1000yr_${bboxHash}.geojson`,
    // Note: aktsomhet is handled separately since it's split into 4 files
  };
  
  // URLs for the 4 split aktsomhet files
  const aktsomhetUrls = [
    `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_aktsomhetyr_${bboxHash}_part1of4.geojson`,
    `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_aktsomhetyr_${bboxHash}_part2of4.geojson`,
    `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_aktsomhetyr_${bboxHash}_part3of4.geojson`,
    `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/flombyggninger/osm_buildings_flood_aktsomhetyr_${bboxHash}_part4of4.geojson`
  ];
  
  // Store for building layers
  const buildingLayers = {};
  
  // Funksjon for å gi forskjellige stiler basert på flomperiode/type
  function getStyleForPeriodOrType(periodOrType) {
    const styles = {
      10: { color: '#6ab0ff', weight: 1, fillOpacity: 0.4 },      // Lysere blå
      20: { color: '#5da1f2', weight: 1, fillOpacity: 0.4 },      // Blå
      50: { color: '#4a8de0', weight: 1, fillOpacity: 0.4 },      // Mørkere blå
      100: { color: '#3178c6', weight: 1, fillOpacity: 0.3 },     // Original blå
      200: { color: '#a64dff', weight: 1, fillOpacity: 0.3 },     // Lilla
      500: { color: '#c40000', weight: 1, fillOpacity: 0.3 },     // Rød
      1000: { color: '#8b0000', weight: 1, fillOpacity: 0.3 },    // Mørkerød
      aktsomhet: { color: '#ff8c00', weight: 1, fillOpacity: 0.3 } // Oransje
    };
    return styles[periodOrType] || styles[100]; // Default til 100-års stil
  }
  
  // Function to load regular building layers
  function loadBuildingsLayer(url, periodOrType) {
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Opprett GeoJSON-lag med stil som varierer litt med periode/type
        const buildingsLayer = L.geoJSON(data, {
          style: getStyleForPeriodOrType(periodOrType),
          onEachFeature: (feat, layer) => {
            // Format popup basert på om det er en flomperiode eller aktsomhetsområde
            const popupText = `Bygg OSM-id: ${feat.properties.osm_id}<br>Flomsone: ${periodOrType}-årsflom`;
            layer.bindPopup(popupText);
          }
        });
        
        return { periodOrType, layer: buildingsLayer };
      })
      .catch(err => {
        console.warn(`Kunne ikke laste bygninger for ${periodOrType}:`, err);
        return { periodOrType, layer: null };
      });
  }
  
  // Function to load and combine all 4 aktsomhet files
  async function loadAktsomhetLayers() {
    console.log('Loading 4 split aktsomhet files...');
    
    try {
      // Load all 4 files in parallel
      const promises = aktsomhetUrls.map((url, index) => {
        console.log(`Loading aktsomhet part ${index + 1}/4...`);
        return fetch(url)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP error ${res.status} for part ${index + 1}`);
            return res.json();
          })
          .catch(err => {
            console.warn(`Failed to load aktsomhet part ${index + 1}:`, err);
            return null;
          });
      });
      
      // Wait for all files to load
      const results = await Promise.all(promises);
      
      // Combine all features from successful loads
      const allFeatures = [];
      results.forEach((data, index) => {
        if (data && data.features) {
          console.log(`Aktsomhet part ${index + 1} loaded: ${data.features.length} features`);
          allFeatures.push(...data.features);
        }
      });
      
      console.log(`Total aktsomhet features loaded: ${allFeatures.length}`);
      
      // Create combined GeoJSON
      const combinedData = {
        type: "FeatureCollection",
        features: allFeatures
      };
      
      // Create the layer with combined data
      const buildingsLayer = L.geoJSON(combinedData, {
        style: getStyleForPeriodOrType('aktsomhet'),
        onEachFeature: (feat, layer) => {
          const popupText = `Bygg OSM-id: ${feat.properties.osm_id}<br>Flomaktsomhetsområde`;
          layer.bindPopup(popupText);
        }
      });
      
      return { periodOrType: 'aktsomhet', layer: buildingsLayer };
      
    } catch (err) {
      console.error('Error loading aktsomhet layers:', err);
      return { periodOrType: 'aktsomhet', layer: null };
    }
  }
  
  // Load all building layers
  async function loadAllBuildingLayers() {
    const promises = [];
    
    // Load regular flood zones
    for (const [periodOrType, url] of Object.entries(floodUrls)) {
      promises.push(loadBuildingsLayer(url, parseInt(periodOrType)));
    }
    
    // Load and combine aktsomhet files
    promises.push(loadAktsomhetLayers());
    
    return Promise.all(promises);
  }
  
  // Load all building layers and set up the map
  loadAllBuildingLayers()
    .then(results => {
      console.log('All building layers loaded');
      
      // Store all building layers
      results.forEach(result => {
        if (!result.layer) return; // Skip failed layers
        
        const { periodOrType, layer } = result;
        buildingLayers[periodOrType] = layer;
        
        // Log the number of features in each layer
        if (layer && layer.getLayers) {
          console.log(`${periodOrType}: ${layer.getLayers().length} features`);
        }
      });
      
      // Add 100-year building layer as default
      if (buildingLayers[100]) {
        map.addLayer(buildingLayers[100]);
      }
      
      // Set up aktsomhet layer events
      if (buildingLayers['aktsomhet']) {
        flomAktsomhetLayer.on('add', () => {
          map.addLayer(buildingLayers['aktsomhet']);
          console.log('Aktsomhet layer added to map');
        });
        flomAktsomhetLayer.on('remove', () => {
          map.removeLayer(buildingLayers['aktsomhet']);
          console.log('Aktsomhet layer removed from map');
        });
      }
      
      // Create overlay maps for other non-sliding layers
      const overlayMaps = {
        'Høydekurver (Kartverket)': hoydekurveLayer,
        'Flom – Aktsomhetsområder': flomAktsomhetLayer,
        'Flom – Dekning': dekningsLayer,
        'Maksimal vannstandsstigning': vannstandLayer
      };
      
      // Create custom controls with slider
      createCustomLayerControls({
        baseMaps: { 'OpenStreetMap': osmBaseLayer },
        overlayMaps,
        floodZoneLayers,
        buildingLayers,
        map
      });
    })
    .catch(err => console.error('Feil ved lasting av bygninger:', err));
  
  return map;
}

// Function to create custom layer controls in the sidebar with slider
function createCustomLayerControls(options) {
  const sidebar = document.getElementById('sidebar');
  
  // Add collapse functionality
  const collapseBtn = document.getElementById('collapse-sidebar');
  collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    // Oppdater kartet for å reflektere endringen
    options.map.invalidateSize();
  });

  // Create container for the controls
  const controlContainer = document.createElement('div');
  controlContainer.className = 'custom-layer-control';
  
  // Non-sliding overlay maps section
  if (Object.keys(options.overlayMaps).length > 0) {
    const overlaySection = document.createElement('div');
    overlaySection.className = 'layer-group';
    
    const overlayTitle = document.createElement('h4');
    overlayTitle.textContent = 'Kartlag';
    overlaySection.appendChild(overlayTitle);
    
    // Create checkboxes for overlay maps
    Object.entries(options.overlayMaps).forEach(([name, layer]) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'layer-item';
      
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `overlay-${name.replace(/\s+/g, '-').toLowerCase()}`;
      input.checked = options.map.hasLayer(layer);
      
      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = name;
      
      input.addEventListener('change', () => {
        if (input.checked) {
          options.map.addLayer(layer);
        } else {
          options.map.removeLayer(layer);
        }
      });
      
      itemDiv.appendChild(input);
      itemDiv.appendChild(label);
      overlaySection.appendChild(itemDiv);
    });
    
    controlContainer.appendChild(overlaySection);
  }
  
  // Flood zone slider section
  const floodSection = document.createElement('div');
  floodSection.className = 'layer-group flood-slider-group';
  
  const floodTitle = document.createElement('h4');
  floodTitle.textContent = 'Flomsoner';
  floodSection.appendChild(floodTitle);
  
  // Checkbox to toggle flood zones visibility
  const showFloodZoneDiv = document.createElement('div');
  showFloodZoneDiv.className = 'layer-item';
  
  const showFloodZoneCheckbox = document.createElement('input');
  showFloodZoneCheckbox.type = 'checkbox';
  showFloodZoneCheckbox.id = 'show-flood-zones';
  showFloodZoneCheckbox.checked = true; // Initially checked as 100-year is shown by default
  
  const showFloodZoneLabel = document.createElement('label');
  showFloodZoneLabel.htmlFor = 'show-flood-zones';
  showFloodZoneLabel.textContent = 'Vis flomsoner';
  
  showFloodZoneDiv.appendChild(showFloodZoneCheckbox);
  showFloodZoneDiv.appendChild(showFloodZoneLabel);
  floodSection.appendChild(showFloodZoneDiv);
  
  // Create slider container
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'slider-container';
  
  // Current year display
  const currentYearDiv = document.createElement('div');
  currentYearDiv.className = 'current-year';
  currentYearDiv.textContent = '100-års flomsone';
  sliderContainer.appendChild(currentYearDiv);
  
  // Create slider
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '6';
  slider.value = '3'; // Default to 100-year (index 3)
  slider.className = 'flood-slider';
  
  // Map slider values to flood years
  const sliderValueMap = {
    '0': 10,
    '1': 20,
    '2': 50,
    '3': 100,
    '4': 200,
    '5': 500,
    '6': 1000
  };
  
  // Current active flood zone and building layer
  let currentFloodYear = 100;
  
  // Function to update layers based on slider
  function updateFloodZones() {
    // Get the selected flood year from the slider value
    const newFloodYear = sliderValueMap[slider.value];
    
    // If flood zones should be shown
    if (showFloodZoneCheckbox.checked) {
      // Remove the current flood zone and building layer
      if (options.floodZoneLayers[currentFloodYear]) {
        options.map.removeLayer(options.floodZoneLayers[currentFloodYear]);
      }
      if (options.buildingLayers[currentFloodYear]) {
        options.map.removeLayer(options.buildingLayers[currentFloodYear]);
      }
      
      // Add the new flood zone and building layer
      if (options.floodZoneLayers[newFloodYear]) {
        options.map.addLayer(options.floodZoneLayers[newFloodYear]);
      }
      if (options.buildingLayers[newFloodYear]) {
        options.map.addLayer(options.buildingLayers[newFloodYear]);
      }
    }
    
    // Update current flood year
    currentFloodYear = newFloodYear;
    
    // Update the display text
    currentYearDiv.textContent = `${newFloodYear}-års flomsone`;
  }
  
  // Function to toggle flood zone visibility
  function toggleFloodZones() {
    if (showFloodZoneCheckbox.checked) {
      // Show the current flood zone and building layer
      if (options.floodZoneLayers[currentFloodYear]) {
        options.map.addLayer(options.floodZoneLayers[currentFloodYear]);
      }
      if (options.buildingLayers[currentFloodYear]) {
        options.map.addLayer(options.buildingLayers[currentFloodYear]);
      }
      // Enable the slider
      slider.disabled = false;
    } else {
      // Hide the current flood zone and building layer
      if (options.floodZoneLayers[currentFloodYear]) {
        options.map.removeLayer(options.floodZoneLayers[currentFloodYear]);
      }
      if (options.buildingLayers[currentFloodYear]) {
        options.map.removeLayer(options.buildingLayers[currentFloodYear]);
      }
      // Disable the slider
      slider.disabled = true;
    }
  }
  
  // Add event listeners
  slider.addEventListener('input', updateFloodZones);
  showFloodZoneCheckbox.addEventListener('change', toggleFloodZones);
  
  // Add slider to container
  sliderContainer.appendChild(slider);
  
  // Create a legend for the flood years
  const sliderLegend = document.createElement('div');
  sliderLegend.className = 'slider-legend';
  
  const minYear = document.createElement('span');
  minYear.className = 'slider-min';
  minYear.textContent = '10 år';
  
  const maxYear = document.createElement('span');
  maxYear.className = 'slider-max';
  maxYear.textContent = '1000 år';
  
  sliderLegend.appendChild(minYear);
  sliderLegend.appendChild(maxYear);
  
  sliderContainer.appendChild(sliderLegend);
  floodSection.appendChild(sliderContainer);
  
  // Add the flood section to the control container
  controlContainer.appendChild(floodSection);
  
  // Add the control container to the sidebar
  sidebar.appendChild(controlContainer);
  
  // Add CSS styles for the slider
  const style = document.createElement('style');
  style.textContent = `
    .flood-slider-group { margin-top: 20px; }
    .slider-container { margin-top: 10px; padding: 0 5px; }
    .current-year { font-weight: bold; margin-bottom: 5px; font-size: 14px; }
    .flood-slider { width: 100%; }
    .slider-legend { display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px; }
    .slider-min, .slider-max { color: #666; }
    #sidebar.collapsed { width: 50px; }
    #sidebar.collapsed .custom-layer-control { display: none; }
    .collapse-btn { position: absolute; top: 10px; right: 10px; z-index: 1001; 
                   background: #fff; border: 2px solid rgba(0,0,0,0.2); border-radius: 4px; 
                   width: 40px !important; height: 40px; font-size: 18px; line-height: 1; 
                   padding: 0; cursor: pointer; text-align: center; }
  `;
  document.head.appendChild(style);
}