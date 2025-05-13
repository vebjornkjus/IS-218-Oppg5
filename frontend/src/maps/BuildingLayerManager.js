// frontend/src/maps/BuildingLayerManager.js

export class SimplifiedBuildingManager {
  constructor(map, supabaseConfig) {
    this.map = map;
    this.supabaseConfig = supabaseConfig;
    
    // Enkel state
    this.floodBuildings = null;
    this.aktsomhetBuildings = null;
    this.currentFloodYear = 100;
    this.showFloodZones = false;
    this.cache = new Map();
    
    // Single update timeout
    this.updateTimeout = null;
    
    this.setupEvents();
  }
  
  // SINGLE update function with adaptive timing
  scheduleUpdate(eventType = 'default') {
    clearTimeout(this.updateTimeout);
    
    // Different delays for different types of events
    let delay = 150;
    if (eventType === 'slider') {
      delay = 100; // Faster for slider input
    } else if (eventType === 'zoom') {
      delay = 50;  // Immediate for zoom
    }
    
    this.updateTimeout = setTimeout(() => {
      this.updateBuildings();
    }, delay);
  }
  
  // Main logic - decide what should be shown
  async updateBuildings() {
    const zoom = this.map.getZoom();
    const showFloodZones = this.getShowFloodZones();
    const showAktsomhet = this.getShowAktsomhet();
    
    console.log('🔄 Update buildings:', { zoom, showFloodZones, showAktsomhet });
    
    // Remove everything if zoom is too low
    if (zoom <= 12) {
      this.clearAllBuildings();
      return;
    }
    
    // Handle flood buildings
    if (showFloodZones) {
      await this.loadFloodBuildings();
    } else {
      this.clearFloodBuildings();
    }
    
    // Handle aktsomhet buildings
    if (showAktsomhet) {
      await this.loadAktsomhetBuildings();
    } else {
      this.clearAktsomhetBuildings();
    }
  }
  
  // Simple state getters
  getShowFloodZones() {
    const checkbox = document.getElementById('show-flood-zones');
    return checkbox && checkbox.checked;
  }
  
  getShowAktsomhet() {
    const checkbox = document.getElementById('overlay-flomAktsomhet');
    return checkbox && checkbox.checked;
  }
  
  getCurrentFloodYear() {
    // Read from slider
    const slider = document.querySelector('.flood-slider');
    if (!slider) return 100;
    
    const valueMap = { '0': 10, '1': 20, '2': 50, '3': 100, '4': 200, '5': 500, '6': 1000 };
    return valueMap[slider.value] || 100;
  }
  
  // Building loading functions
  async loadFloodBuildings() {
    const floodYear = this.getCurrentFloodYear();
    const cacheKey = this.getCacheKey(floodYear);
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      this.setFloodBuildings(this.cache.get(cacheKey));
      return;
    }
    
    // Load from database
    try {
      const buildings = await this.fetchBuildings(floodYear);
      if (buildings) {
        this.cache.set(cacheKey, buildings);
        this.setFloodBuildings(buildings);
      }
    } catch (error) {
      console.error('Error loading flood buildings:', error);
    }
  }
  
  async loadAktsomhetBuildings() {
    const cacheKey = this.getCacheKey(-1);
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      this.setAktsomhetBuildings(this.cache.get(cacheKey));
      return;
    }
    
    // Load from database
    try {
      const buildings = await this.fetchBuildings(-1);
      if (buildings) {
        this.cache.set(cacheKey, buildings);
        this.setAktsomhetBuildings(buildings);
      }
    } catch (error) {
      console.error('Error loading aktsomhet buildings:', error);
    }
  }
  
  // Database fetch
  async fetchBuildings(floodPeriod) {
    const bounds = this.map.getBounds();
    const bbox = [
      bounds.getSouthWest().lng,
      bounds.getSouthWest().lat,
      bounds.getNorthEast().lng,
      bounds.getNorthEast().lat
    ];
    
    const response = await fetch(`${this.supabaseConfig.url}/rest/v1/rpc/get_buildings_in_bbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.supabaseConfig.anonKey,
        'Authorization': `Bearer ${this.supabaseConfig.anonKey}`
      },
      body: JSON.stringify({
        bbox_coords: bbox,
        flood_period: floodPeriod
      })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    if (!data || !data.features) return null;
    
    // Create layer
    return L.geoJSON(data, {
      style: this.getStyle(floodPeriod),
      onEachFeature: (feat, layer) => {
        const isAktsomhet = floodPeriod === -1;
        const popupText = `Bygg: ${feat.properties.id || feat.properties.osm_id}<br>
          ${isAktsomhet ? 'Flomaktsomhetsområde' : `Flomsone: ${floodPeriod}-årsflom`}`;
        layer.bindPopup(popupText);
      }
    });
  }
  
  getStyle(period) {
    const styles = {
      10: { color: '#6ab0ff', weight: 1, fillOpacity: 0.4 },
      20: { color: '#5da1f2', weight: 1, fillOpacity: 0.4 },
      50: { color: '#4a8de0', weight: 1, fillOpacity: 0.4 },
      100: { color: '#3178c6', weight: 1, fillOpacity: 0.3 },
      200: { color: '#a64dff', weight: 1, fillOpacity: 0.3 },
      500: { color: '#c40000', weight: 1, fillOpacity: 0.3 },
      1000: { color: '#8b0000', weight: 1, fillOpacity: 0.3 },
      '-1': { color: '#ff8c00', weight: 1, fillOpacity: 0.3 }
    };
    return styles[period] || styles[100];
  }
  
  getCacheKey(floodPeriod) {
    const bounds = this.map.getBounds();
    const precision = 0.01;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return `${floodPeriod}_${Math.round(sw.lat / precision)}_${Math.round(sw.lng / precision)}_${Math.round(ne.lat / precision)}_${Math.round(ne.lng / precision)}`;
  }
  
  // Layer management
  setFloodBuildings(layer) {
    if (this.floodBuildings) {
      this.map.removeLayer(this.floodBuildings);
    }
    this.floodBuildings = layer;
    if (layer) {
      this.map.addLayer(layer);
    }
  }
  
  setAktsomhetBuildings(layer) {
    if (this.aktsomhetBuildings) {
      this.map.removeLayer(this.aktsomhetBuildings);
    }
    this.aktsomhetBuildings = layer;
    if (layer) {
      this.map.addLayer(layer);
    }
  }
  
  clearFloodBuildings() {
    if (this.floodBuildings) {
      this.map.removeLayer(this.floodBuildings);
      this.floodBuildings = null;
    }
  }
  
  clearAktsomhetBuildings() {
    if (this.aktsomhetBuildings) {
      this.map.removeLayer(this.aktsomhetBuildings);
      this.aktsomhetBuildings = null;
    }
  }
  
  clearAllBuildings() {
    this.clearFloodBuildings();
    this.clearAktsomhetBuildings();
  }
  
  // Event setup - SINGLE point of truth
  setupEvents() {
    // Map events with specific event types
    this.map.on('moveend', () => this.scheduleUpdate('move'));
    this.map.on('zoomend', () => this.scheduleUpdate('zoom'));
    
    // Control events - listen to both 'change' and 'input' events
    document.addEventListener('input', (event) => {
      if (event.target.classList.contains('flood-slider')) {
        this.scheduleUpdate('slider');
      } else if (event.target.id === 'show-flood-zones' || 
                 event.target.id === 'overlay-flomAktsomhet') {
        this.scheduleUpdate('checkbox');
      }
    });
    
    document.addEventListener('change', (event) => {
      if (event.target.id === 'show-flood-zones' || 
          event.target.classList.contains('flood-slider') ||
          event.target.id === 'overlay-flomAktsomhet') {
        this.scheduleUpdate('change');
      }
    });
  }
  
  // Public methods for external use
  setCurrentFloodYear(year) {
    this.currentFloodYear = year;
    this.scheduleUpdate();
  }
  
  setShowFloodZones(show) {
    this.showFloodZones = show;
    this.scheduleUpdate();
  }
}