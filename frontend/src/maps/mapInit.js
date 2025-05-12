// Legg til øverst i filen - ENDRE DIN API-NØKKEL HER
const SUPABASE_CONFIG = {
  url: 'https://emefguxbwcvfxaiywmri.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZWZndXhid2N2ZnhhaXl3bXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTgxODksImV4cCI6MjA2MDQ3NDE4OX0.j5kJxREpP5kuB3XIHN382B11hVCYnpxfQaF2o4kiVRg' // ERSTATT MED DIN FAKTISKE API-NØKKEL
};

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
  
  // Remove automatic addition of 100-year flood zone
  // Let the controls handle all flood zone visibility
  // floodZoneLayers[100].addTo(map); // REMOVED - causes sync issues

  // --------------------------------------------------
  // Database-baserte bygnings-lag - TARGETED FIXES
  // --------------------------------------------------
  
  // Store for different types of building layers
  const buildingLayers = {};
  
  // Cache for loaded areas
  const buildingCache = new Map();
  
  // Track current visible buildings - SEPARATE FOR DIFFERENT TYPES
  let currentFloodBuildingsLayer = null;  // For flomsone-bygninger
  let currentAktsomhetBuildingsLayer = null;  // For aktsomhet-bygninger
  let currentFloodYear = 100;
  let isLoadingBuildings = false;
  let showFloodZones = false;  // Start with flood zones hidden
  
  // Funksjon for å gi forskjellige stiler basert på flomperiode/type
  function getStyleForPeriodOrType(periodOrType) {
    const styles = {
      10: { color: '#6ab0ff', weight: 1, fillOpacity: 0.4 },
      20: { color: '#5da1f2', weight: 1, fillOpacity: 0.4 },
      50: { color: '#4a8de0', weight: 1, fillOpacity: 0.4 },
      100: { color: '#3178c6', weight: 1, fillOpacity: 0.3 },
      200: { color: '#a64dff', weight: 1, fillOpacity: 0.3 },
      500: { color: '#c40000', weight: 1, fillOpacity: 0.3 },
      1000: { color: '#8b0000', weight: 1, fillOpacity: 0.3 },
      aktsomhet: { color: '#ff8c00', weight: 1, fillOpacity: 0.3 },
      '-1': { color: '#ff8c00', weight: 1, fillOpacity: 0.3 }
    };
    return styles[periodOrType] || styles[100];
  }
  
  // Database API call function
  async function fetchBuildingsFromDatabase(bbox, floodPeriod) {
    console.log('🔍 Fetching buildings:', { bbox, floodPeriod });
    
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/get_buildings_in_bbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
      },
      body: JSON.stringify({
        bbox_coords: bbox,
        flood_period: floodPeriod
      })
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Data received:', data);
    console.log('🏗️ Buildings count:', data?.features?.length || 0);
    
    return data;
  }
  
  // Generate cache key for areas
  function getCacheKey(bounds, floodPeriod) {
    const precision = 0.01;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const roundedBounds = {
      sw: { lat: Math.round(sw.lat / precision) * precision, lng: Math.round(sw.lng / precision) * precision },
      ne: { lat: Math.round(ne.lat / precision) * precision, lng: Math.round(ne.lng / precision) * precision }
    };
    return `${floodPeriod}_${roundedBounds.sw.lat}_${roundedBounds.sw.lng}_${roundedBounds.ne.lat}_${roundedBounds.ne.lng}`;
  }
  
  // Load buildings for specific flood period
  async function loadBuildingsForPeriod(floodPeriod, isAktsomhet = false) {
    const bounds = map.getBounds();
    const cacheKey = getCacheKey(bounds, floodPeriod);
    
    // Check cache first
    if (buildingCache.has(cacheKey)) {
      console.log(`Using cached buildings for ${floodPeriod}`);
      return buildingCache.get(cacheKey);
    }
    
    try {
      const bbox = [
        bounds.getSouthWest().lng,
        bounds.getSouthWest().lat,
        bounds.getNorthEast().lng,
        bounds.getNorthEast().lat
      ];
      
      console.log(`Loading buildings for ${floodPeriod} from database...`);
      
      const data = await fetchBuildingsFromDatabase(bbox, floodPeriod);
      
      if (!data || !data.features) {
        return null;
      }
      
      console.log(`Loaded ${data.features.length} buildings for ${floodPeriod}`);
      
      // Create new layer
      const buildingsLayer = L.geoJSON(data, {
        style: getStyleForPeriodOrType(isAktsomhet ? 'aktsomhet' : floodPeriod),
        onEachFeature: (feat, layer) => {
          const popupText = `Bygg OSM-id: ${feat.properties.id || feat.properties.osm_id}<br>
            Type: ${feat.properties.element || 'unknown'}<br>
            ${isAktsomhet ? 'Flomaktsomhetsområde' : `Flomsone: ${floodPeriod}-årsflom`}`;
          layer.bindPopup(popupText);
        }
      });
      
      // Cache the result
      buildingCache.set(cacheKey, buildingsLayer);
      return buildingsLayer;
    } catch (err) {
      console.warn(`Kunne ikke laste bygninger for ${floodPeriod}:`, err);
      return null;
    }
  }
  
  // FIXED: Load flood buildings for current view
  async function loadFloodBuildingsInCurrentView() {
    if (isLoadingBuildings) {
      console.log('Already loading buildings, skipping...');
      return;
    }
    
    const zoom = map.getZoom();
    console.log('Loading flood buildings, zoom:', zoom, 'showFloodZones:', showFloodZones, 'currentFloodYear:', currentFloodYear);
    
    // Always remove buildings at low zoom
    if (zoom <= 12) {
      if (currentFloodBuildingsLayer) {
        console.log('Removing flood buildings due to low zoom');
        map.removeLayer(currentFloodBuildingsLayer);
        currentFloodBuildingsLayer = null;
      }
      return;
    }
    
    // Don't load if flood zones are hidden
    if (!showFloodZones) {
      if (currentFloodBuildingsLayer) {
        console.log('Removing flood buildings - flood zones hidden');
        map.removeLayer(currentFloodBuildingsLayer);
        currentFloodBuildingsLayer = null;
      }
      return;
    }
    
    // Don't load if the current flood zone layer is not visible
    if (!map.hasLayer(floodZoneLayers[currentFloodYear])) {
      if (currentFloodBuildingsLayer) {
        console.log('Removing flood buildings - zone layer not visible');
        map.removeLayer(currentFloodBuildingsLayer);
        currentFloodBuildingsLayer = null;
      }
      return;
    }
    
    isLoadingBuildings = true;
    
    try {
      // Always remove current layer before loading new one
      if (currentFloodBuildingsLayer) {
        console.log('Removing existing flood buildings');
        map.removeLayer(currentFloodBuildingsLayer);
        currentFloodBuildingsLayer = null;
      }
      
      // Load buildings for current flood year
      console.log('Loading buildings for flood year:', currentFloodYear);
      const buildingsLayer = await loadBuildingsForPeriod(currentFloodYear, false);
      
      if (buildingsLayer) {
        currentFloodBuildingsLayer = buildingsLayer;
        buildingsLayer.addTo(map);
        console.log('Added flood buildings for year:', currentFloodYear);
      }
      
    } catch (error) {
      console.error('Error loading flood buildings:', error);
    } finally {
      isLoadingBuildings = false;
    }
  }
  
  // FIXED: Handle aktsomhet buildings
  async function loadAktsomhetBuildingsInCurrentView() {
    const zoom = map.getZoom();
    console.log('Loading aktsomhet buildings, zoom:', zoom, 'hasLayer:', map.hasLayer(flomAktsomhetLayer));
    
    // Remove aktsomhet buildings at low zoom
    if (zoom <= 12) {
      if (currentAktsomhetBuildingsLayer) {
        console.log('Removing aktsomhet buildings due to low zoom');
        map.removeLayer(currentAktsomhetBuildingsLayer);
        currentAktsomhetBuildingsLayer = null;
      }
      return;
    }
    
    // Don't load if aktsomhet layer is not visible
    if (!map.hasLayer(flomAktsomhetLayer)) {
      if (currentAktsomhetBuildingsLayer) {
        console.log('Removing aktsomhet buildings - layer not visible');
        map.removeLayer(currentAktsomhetBuildingsLayer);
        currentAktsomhetBuildingsLayer = null;
      }
      return;
    }
    
    try {
      // Always remove current aktsomhet layer before loading new one
      if (currentAktsomhetBuildingsLayer) {
        console.log('Removing existing aktsomhet buildings');
        map.removeLayer(currentAktsomhetBuildingsLayer);
        currentAktsomhetBuildingsLayer = null;
      }
      
      // Load aktsomhet buildings
      console.log('Loading aktsomhet buildings');
      const buildingsLayer = await loadBuildingsForPeriod(-1, true);
      
      if (buildingsLayer) {
        currentAktsomhetBuildingsLayer = buildingsLayer;
        buildingsLayer.addTo(map);
        console.log('Added aktsomhet buildings');
      }
      
    } catch (error) {
      console.error('Error loading aktsomhet buildings:', error);
    }
  }
  
  // FIXED: Debounced loading for both types
  let loadBuildingsTimeout;
  function debouncedLoadBuildings() {
    clearTimeout(loadBuildingsTimeout);
    loadBuildingsTimeout = setTimeout(async () => {
      console.log('Debounced building update triggered');
      // Load flood buildings
      await loadFloodBuildingsInCurrentView();
      // Load aktsomhet buildings
      await loadAktsomhetBuildingsInCurrentView();
    }, 200); // Slightly longer delay for stability
  }
  
  // Add event listeners for map movement
  map.on('moveend', debouncedLoadBuildings);
  map.on('zoomend', debouncedLoadBuildings);
  
  // Set up aktsomhet layer events
  flomAktsomhetLayer.on('add', async () => {
    console.log('Aktsomhet layer added via event');
    if (map.getZoom() > 12) {
      await loadAktsomhetBuildingsInCurrentView();
    }
  });
  
  flomAktsomhetLayer.on('remove', () => {
    console.log('Aktsomhet layer removed via event');
    if (currentAktsomhetBuildingsLayer) {
      map.removeLayer(currentAktsomhetBuildingsLayer);
      currentAktsomhetBuildingsLayer = null;
    }
  });
  
  // Create overlay maps
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
    map,
    showFloodZones,
    setShowFloodZones: (value) => { 
      showFloodZones = value;
      console.log('showFloodZones set to:', value);
      // Immediately trigger building update
      debouncedLoadBuildings();
    },
    currentFloodYear,
    setCurrentFloodYear: (year) => { 
      currentFloodYear = year;
      console.log('State updated: currentFloodYear set to:', year);
      // FIXED: Always trigger building update when state changes
      debouncedLoadBuildings();
    },
    loadFloodBuildingsInCurrentView,
    currentFloodBuildingsLayer,
    setCurrentFloodBuildingsLayer: (layer) => { currentFloodBuildingsLayer = layer; }
  });
  
  // Initial load if zoom is high enough
  if (map.getZoom() > 12) {
    debouncedLoadBuildings();
  }
  
  return map;
}

// FIXED: Custom layer controls with proper state management
function createCustomLayerControls(options) {
  const sidebar = document.getElementById('sidebar');
  
  // Add collapse functionality
  const collapseBtn = document.getElementById('collapse-sidebar');
  collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
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
        console.log('Overlay', name, 'changed to:', input.checked);
        if (input.checked) {
          options.map.addLayer(layer);
        } else {
          options.map.removeLayer(layer);
        }
        // Buildings will update automatically via event handlers
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
  // FIXED: Start unchecked since no flood zones are visible initially
  showFloodZoneCheckbox.checked = false;
  
  const showFloodZoneLabel = document.createElement('label');
  showFloodZoneLabel.htmlFor = 'show-flood-zones';
  showFloodZoneLabel.textContent = 'Vis flomsoner';
  
  showFloodZoneDiv.appendChild(showFloodZoneCheckbox);
  showFloodZoneDiv.appendChild(showFloodZoneLabel);
  floodSection.appendChild(showFloodZoneDiv);
  
  // Create slider container
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'slider-container';
  
  // Current year display - FIXED: Start with correct value
  const currentYearDiv = document.createElement('div');
  currentYearDiv.className = 'current-year';
  // Don't set text here - will be set after slider is created
  sliderContainer.appendChild(currentYearDiv);
  
  // Create slider
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '6';
  slider.className = 'flood-slider';
  
  // VERIFIED: Correct mapping of slider values to flood years
  const sliderValueMap = {
    '0': 10,
    '1': 20,
    '2': 50,    // Position 2 = 50 år
    '3': 100,   // Position 3 = 100 år  
    '4': 200,
    '5': 500,
    '6': 1000
  };
  
  // VERIFIED: Reverse mapping for setting initial slider position
  const reverseSliderMap = {
    10: '0',
    20: '1',
    50: '2',    // 50 år = Position 2
    100: '3',   // 100 år = Position 3
    200: '4',
    500: '5',
    1000: '6'
  };
  
  // Set slider to match current flood year
  const initialSliderValue = reverseSliderMap[options.currentFloodYear] || '3';
  slider.value = initialSliderValue;
  
  // FIXED: Set display to match actual state (not slider position)
  const initialFloodYear = options.currentFloodYear;
  currentYearDiv.textContent = `${initialFloodYear}-års flomsone`;
  
  console.log('=== CRITICAL INIT DEBUG ===');
  console.log('options.currentFloodYear (THE TRUTH):', options.currentFloodYear);
  console.log('initialSliderValue calculated:', initialSliderValue);
  console.log('slider.value (DOM after set):', slider.value);
  console.log('sliderValueMap mapping check:', sliderValueMap[slider.value]);
  console.log('currentYearDiv text set to:', currentYearDiv.textContent);
  console.log('showFloodZoneCheckbox.checked:', showFloodZoneCheckbox.checked);
  console.log('===========================');
  
  // Add a verification function
  window.verifySync = () => {
    console.log('=== VERIFICATION ===');
    console.log('State:', options.currentFloodYear);
    console.log('DOM slider:', slider.value, '→', sliderValueMap[slider.value]);
    console.log('Display:', currentYearDiv.textContent);
    console.log('WMS layers on map:', Object.entries(options.floodZoneLayers).filter(([year, layer]) => options.map.hasLayer(layer)).map(([year]) => year));
    console.log('==================');
  };
  
  // FIXED: Update flood zones with forced refresh when needed
  function updateFloodZones() {
    // Read slider value fresh each time
    const sliderValue = slider.value;
    const newFloodYear = sliderValueMap[sliderValue];
    const currentFloodYear = options.currentFloodYear;
    
    console.log('=== SLIDER UPDATE ===');
    console.log('DOM slider value:', sliderValue);
    console.log('Mapped flood year:', newFloodYear);
    console.log('Current flood year state:', currentFloodYear);
    console.log('Display shows:', currentYearDiv.textContent);
    console.log('Checkbox checked:', showFloodZoneCheckbox.checked);
    console.log('===================');
    
    // Extract just the number from display text for comparison
    const displayYear = parseInt(currentYearDiv.textContent.match(/\d+/)[0]);
    
    console.log('Display year extracted:', displayYear);
    
    // Check if display is wrong even if state is "correct"
    const displayWrong = displayYear !== currentFloodYear;
    const stateWrong = newFloodYear !== currentFloodYear;
    
    if (!stateWrong && !displayWrong) {
      console.log('Everything is actually in sync, skipping...');
      return;
    }
    
    if (displayWrong) {
      console.log('DISPLAY IS WRONG! Fixing...');
    }
    
    if (showFloodZoneCheckbox.checked) {
      // Always clean up first
      Object.entries(options.floodZoneLayers).forEach(([year, layer]) => {
        if (options.map.hasLayer(layer)) {
          console.log('Removing existing flood zone layer:', year);
          options.map.removeLayer(layer);
        }
      });
      
      // Add new flood zone
      if (options.floodZoneLayers[newFloodYear]) {
        console.log('Adding NEW flood zone layer for', newFloodYear);
        options.floodZoneLayers[newFloodYear].addTo(options.map);
      } else {
        console.error('ERROR: Flood zone layer not found for year:', newFloodYear);
        console.log('Available layers:', Object.keys(options.floodZoneLayers));
      }
    }
    
    // Always update state and display
    console.log('Setting current flood year from', currentFloodYear, 'to', newFloodYear);
    options.setCurrentFloodYear(newFloodYear);
    
    const newDisplayText = `${newFloodYear}-års flomsone`;
    console.log('Updating display to:', newDisplayText);
    currentYearDiv.textContent = newDisplayText;
  }
  
  // SIMPLIFIED: Toggle flood zones
  function toggleFloodZones() {
    const isChecked = showFloodZoneCheckbox.checked;
    
    console.log('=== SIMPLE TOGGLE ===');
    console.log('Checked:', isChecked);
    console.log('Current flood year:', options.currentFloodYear);
    console.log('====================');
    
    // Always remove all flood zones first
    Object.entries(options.floodZoneLayers).forEach(([year, layer]) => {
      if (options.map.hasLayer(layer)) {
        console.log('Removing existing flood zone:', year);
        options.map.removeLayer(layer);
      }
    });
    
    if (isChecked) {
      // Add the current flood zone
      const year = options.currentFloodYear;
      if (options.floodZoneLayers[year]) {
        console.log('Adding flood zone:', year);
        options.floodZoneLayers[year].addTo(options.map);
      }
      
      // Enable slider
      slider.disabled = false;
      
      // Update state
      options.setShowFloodZones(true);
    } else {
      // Disable slider
      slider.disabled = true;
      
      // Update state
      options.setShowFloodZones(false);
    }
  }
  
  // Add event listeners with debugging
  slider.addEventListener('input', () => {
    console.log('SLIDER EVENT FIRED:', {
      sliderValue: slider.value,
      mappedYear: sliderValueMap[slider.value],
      currentDisplay: currentYearDiv.textContent
    });
    updateFloodZones();
  });
  
  // Debug function to check slider state
  window.debugSlider = () => {
    console.log('=== SLIDER DEBUG ===');
    console.log('DOM slider value:', slider.value);
    console.log('Mapped flood year:', sliderValueMap[slider.value]);
    console.log('Current display:', currentYearDiv.textContent);
    console.log('Current state:', options.currentFloodYear);
    console.log('Available layers:', Object.keys(options.floodZoneLayers));
    console.log('===================');
  };
  
  console.log('Use debugSlider() in console to check current state');
  showFloodZoneCheckbox.addEventListener('change', toggleFloodZones);
  
  // Add slider to container
  sliderContainer.appendChild(slider);
  
  // Create legend
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
  
  controlContainer.appendChild(floodSection);
  sidebar.appendChild(controlContainer);
  
  // Add CSS styles
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