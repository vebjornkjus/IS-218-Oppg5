// frontend/src/maps/BuildingLayerManager.js - FIXED version

import { SUPABASE_CONFIG } from '../config/app.js';

export class BuildingLayerManager {
  constructor(map, stateManager) {
    this.map = map;
    this.stateManager = stateManager;
    
    // Debounce timeout for loading
    this.loadBuildingsTimeout = null;
  }
  
  // Get style for different flood periods
  getStyleForPeriod(periodOrType) {
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
  
  // Fetch buildings from database
  async fetchBuildingsFromDatabase(bbox, floodPeriod) {
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
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Buildings data received:', data);
    return data;
  }
  
  // Generate cache key for buildings
  getCacheKey(bounds, floodPeriod) {
    const precision = 0.01;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const roundedBounds = {
      sw: { 
        lat: Math.round(sw.lat / precision) * precision, 
        lng: Math.round(sw.lng / precision) * precision 
      },
      ne: { 
        lat: Math.round(ne.lat / precision) * precision, 
        lng: Math.round(ne.lng / precision) * precision 
      }
    };
    return `${floodPeriod}_${roundedBounds.sw.lat}_${roundedBounds.sw.lng}_${roundedBounds.ne.lat}_${roundedBounds.ne.lng}`;
  }
  
  // Load buildings for specific flood period
  async loadBuildingsForPeriod(floodPeriod, isAktsomhet = false) {
    const bounds = this.map.getBounds();
    const cache = this.stateManager.getBuildingCache();
    const cacheKey = this.getCacheKey(bounds, floodPeriod);
    
    // Check cache first
    if (cache.has(cacheKey)) {
      console.log(`Using cached buildings for ${floodPeriod}`);
      return cache.get(cacheKey);
    }
    
    try {
      const bbox = [
        bounds.getSouthWest().lng,
        bounds.getSouthWest().lat,
        bounds.getNorthEast().lng,
        bounds.getNorthEast().lat
      ];
      
      console.log(`Loading buildings for ${floodPeriod} from database...`);
      
      const data = await this.fetchBuildingsFromDatabase(bbox, floodPeriod);
      
      if (!data || !data.features) {
        return null;
      }
      
      console.log(`Loaded ${data.features.length} buildings for ${floodPeriod}`);
      
      // Create new layer
      const buildingsLayer = L.geoJSON(data, {
        style: this.getStyleForPeriod(isAktsomhet ? 'aktsomhet' : floodPeriod),
        onEachFeature: (feat, layer) => {
          const popupText = `Bygg OSM-id: ${feat.properties.id || feat.properties.osm_id}<br>
            Type: ${feat.properties.element || 'unknown'}<br>
            ${isAktsomhet ? 'Flomaktsomhetsområde' : `Flomsone: ${floodPeriod}-årsflom`}`;
          layer.bindPopup(popupText);
        }
      });
      
      // Cache the result
      cache.set(cacheKey, buildingsLayer);
      return buildingsLayer;
    } catch (err) {
      console.warn(`Could not load buildings for ${floodPeriod}:`, err);
      return null;
    }
  }
  
  // FIXED: Load flood buildings for current view
  async loadFloodBuildingsInCurrentView() {
    if (this.stateManager.isLoading()) {
      console.log('Already loading buildings, skipping...');
      return;
    }
    
    const zoom = this.map.getZoom();
    const showFloodZones = this.stateManager.getShowFloodZones();
    const currentFloodYear = this.stateManager.getCurrentFloodYear();
    
    console.log('🏗️ LoadFloodBuildings check:', { 
      zoom, 
      showFloodZones, 
      currentFloodYear,
      hasCurrentLayer: !!this.stateManager.getCurrentFloodBuildingsLayer()
    });
    
    // Always remove buildings at low zoom
    if (zoom <= 12) {
      const currentLayer = this.stateManager.getCurrentFloodBuildingsLayer();
      if (currentLayer) {
        console.log('❌ Removing flood buildings due to low zoom');
        this.map.removeLayer(currentLayer);
        this.stateManager.setCurrentFloodBuildingsLayer(null);
      }
      return;
    }
    
    // Don't load if flood zones are hidden
    if (!showFloodZones) {
      const currentLayer = this.stateManager.getCurrentFloodBuildingsLayer();
      if (currentLayer) {
        console.log('❌ Removing flood buildings - flood zones hidden');
        this.map.removeLayer(currentLayer);
        this.stateManager.setCurrentFloodBuildingsLayer(null);
      }
      return;
    }
    
    this.stateManager.setIsLoadingBuildings(true);
    
    try {
      // Always remove current layer before loading new one
      const currentLayer = this.stateManager.getCurrentFloodBuildingsLayer();
      if (currentLayer) {
        console.log('🗑️ Removing existing flood buildings');
        this.map.removeLayer(currentLayer);
        this.stateManager.setCurrentFloodBuildingsLayer(null);
      }
      
      // Load buildings for current flood year
      console.log('📥 Loading buildings for flood year:', currentFloodYear);
      const buildingsLayer = await this.loadBuildingsForPeriod(currentFloodYear, false);
      
      if (buildingsLayer) {
        this.stateManager.setCurrentFloodBuildingsLayer(buildingsLayer);
        buildingsLayer.addTo(this.map);
        console.log('✅ Added flood buildings for year:', currentFloodYear);
      }
      
    } catch (error) {
      console.error('❌ Error loading flood buildings:', error);
    } finally {
      this.stateManager.setIsLoadingBuildings(false);
    }
  }
  
  // FIXED: Check if aktsomhet layer is actually visible  
  isAktsomhetLayerVisible() {
    // We need a way to check if the aktsomhet layer is visible
    // This should be provided by the LayerManager
    // For now, we'll check the checkbox state
    const checkbox = document.getElementById('overlay-flomAktsomhet');
    return checkbox && checkbox.checked;
  }
  
  // FIXED: Handle aktsomhet buildings
  async loadAktsomhetBuildingsInCurrentView() {
    const zoom = this.map.getZoom();
    const isAktsomhetVisible = this.isAktsomhetLayerVisible();
    
    console.log('🎯 LoadAktsomhetBuildings check:', { 
      zoom, 
      isAktsomhetVisible,
      hasCurrentLayer: !!this.stateManager.getCurrentAktsomhetBuildingsLayer()
    });
    
    // Remove aktsomhet buildings at low zoom OR when layer is not visible
    if (zoom <= 12 || !isAktsomhetVisible) {
      const currentLayer = this.stateManager.getCurrentAktsomhetBuildingsLayer();
      if (currentLayer) {
        console.log('❌ Removing aktsomhet buildings -', zoom <= 12 ? 'low zoom' : 'layer not visible');
        this.map.removeLayer(currentLayer);
        this.stateManager.setCurrentAktsomhetBuildingsLayer(null);
      }
      return;
    }
    
    try {
      // Always remove current aktsomhet layer before loading new one
      const currentLayer = this.stateManager.getCurrentAktsomhetBuildingsLayer();
      if (currentLayer) {
        console.log('🗑️ Removing existing aktsomhet buildings');
        this.map.removeLayer(currentLayer);
        this.stateManager.setCurrentAktsomhetBuildingsLayer(null);
      }
      
      // Load aktsomhet buildings
      console.log('📥 Loading aktsomhet buildings');
      const buildingsLayer = await this.loadBuildingsForPeriod(-1, true);
      
      if (buildingsLayer) {
        this.stateManager.setCurrentAktsomhetBuildingsLayer(buildingsLayer);
        buildingsLayer.addTo(this.map);
        console.log('✅ Added aktsomhet buildings');
      }
      
    } catch (error) {
      console.error('❌ Error loading aktsomhet buildings:', error);
    }
  }
  
  // FIXED: Debounced loading that checks conditions properly
  debouncedLoadBuildings() {
    clearTimeout(this.loadBuildingsTimeout);
    this.loadBuildingsTimeout = setTimeout(async () => {
      console.log('⏱️ Debounced building update triggered');
      
      // Only load buildings when appropriate
      const zoom = this.map.getZoom();
      if (zoom <= 12) {
        console.log('🔍 Zoom too low, not loading any buildings');
        return;
      }
      
      // Load flood buildings only if they should be visible
      if (this.stateManager.getShowFloodZones()) {
        await this.loadFloodBuildingsInCurrentView();
      }
      
      // Load aktsomhet buildings only if the layer is visible
      if (this.isAktsomhetLayerVisible()) {
        await this.loadAktsomhetBuildingsInCurrentView();
      }
    }, 200);
  }
  
  // NEW: Force refresh of building visibility
  async refreshBuildingVisibility() {
    console.log('🔄 Force refreshing building visibility');
    
    // Clear any pending updates
    clearTimeout(this.loadBuildingsTimeout);
    
    // Check zoom first
    const zoom = this.map.getZoom();
    if (zoom <= 12) {
      console.log('🔍 Zoom too low, removing all buildings');
      const floodLayer = this.stateManager.getCurrentFloodBuildingsLayer();
      const aktsomhetLayer = this.stateManager.getCurrentAktsomhetBuildingsLayer();
      
      if (floodLayer) {
        this.map.removeLayer(floodLayer);
        this.stateManager.setCurrentFloodBuildingsLayer(null);
      }
      if (aktsomhetLayer) {
        this.map.removeLayer(aktsomhetLayer);
        this.stateManager.setCurrentAktsomhetBuildingsLayer(null);
      }
      return;
    }
    
    // Update flood buildings
    await this.loadFloodBuildingsInCurrentView();
    
    // Update aktsomhet buildings
    await this.loadAktsomhetBuildingsInCurrentView();
  }
}