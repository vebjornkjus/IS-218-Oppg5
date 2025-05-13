// frontend/src/maps/EventManager.js - FIXED version

export class EventManager {
  constructor(map, layerManager, buildingManager, stateManager) {
    this.map = map;
    this.layerManager = layerManager;
    this.buildingManager = buildingManager;
    this.stateManager = stateManager;
  }
  
  setupMapEvents() {
    // Handle map movement and zoom
    this.map.on('moveend', () => {
      console.log('🗺️ Map moveend event');
      this.buildingManager.debouncedLoadBuildings();
    });
    
    // Handle zoom with immediate action for low zoom levels
    this.map.on('zoomend', () => {
      const zoom = this.map.getZoom();
      console.log('🔍 Map zoomend event, zoom:', zoom);
      
      // If zoom is too low, immediately remove buildings without debounce
      if (zoom <= 12) {
        console.log('🚫 Low zoom detected, removing buildings immediately');
        this.buildingManager.removeAllBuildings();
      } else {
        // For higher zoom levels, use debounced loading
        this.buildingManager.debouncedLoadBuildings();
      }
    });
    
    // Also listen to zoom events for immediate feedback
    this.map.on('zoom', () => {
      const zoom = this.map.getZoom();
      // During zoom animation, if going below threshold, start removing buildings
      if (zoom <= 12) {
        this.buildingManager.removeAllBuildings();
      }
    });
    
    // Initial building load if zoom is high enough
    if (this.map.getZoom() > 12) {
      this.buildingManager.debouncedLoadBuildings();
    }
  }
  
  setupLayerEvents() {
    // REMOVED: Direct layer events since we handle them through checkbox events
    // This prevents unwanted automatic loading of aktsomhet buildings
    
    // Listen to state changes
    this.stateManager.on('floodYearChange', (data) => {
      console.log('📊 State: Flood year changed:', data);
      // Trigger building update when flood year changes
      this.buildingManager.debouncedLoadBuildings();
    });
    
    this.stateManager.on('floodZonesToggle', (data) => {
      console.log('📊 State: Flood zones toggled:', data);
      // Trigger building update when flood zones are toggled
      this.buildingManager.debouncedLoadBuildings();
    });
  }
  
  // NEW: Setup overlay checkbox events properly
  setupOverlayEvents() {
    // Set up event listeners for overlay checkboxes
    const setupOverlayCheckbox = (checkboxId, layerKey) => {
      const checkbox = document.getElementById(checkboxId);
      if (!checkbox) return;
      
      checkbox.addEventListener('change', async () => {
        console.log(`📋 Overlay ${layerKey} changed to:`, checkbox.checked);
        
        const layer = this.layerManager.getLayer('overlay', layerKey);
        if (!layer) return;
        
        if (checkbox.checked) {
          this.map.addLayer(layer);
          
          // If it's the aktsomhet layer and zoom is high enough, load buildings
          if (layerKey === 'flomAktsomhet' && this.map.getZoom() > 12) {
            console.log('🎯 Aktsomhet layer enabled - loading buildings');
            await this.buildingManager.loadAktsomhetBuildingsInCurrentView();
          }
        } else {
          this.map.removeLayer(layer);
          
          // If it's the aktsomhet layer, remove buildings
          if (layerKey === 'flomAktsomhet') {
            console.log('🎯 Aktsomhet layer disabled - removing buildings');
            const currentLayer = this.stateManager.getCurrentAktsomhetBuildingsLayer();
            if (currentLayer) {
              this.map.removeLayer(currentLayer);
              this.stateManager.setCurrentAktsomhetBuildingsLayer(null);
            }
          }
        }
      });
    };
    
    // Set up checkboxes for all overlays
    setupOverlayCheckbox('overlay-flomAktsomhet', 'flomAktsomhet');
    setupOverlayCheckbox('overlay-dekning', 'dekning');
    setupOverlayCheckbox('overlay-vannstand', 'vannstand');
    setupOverlayCheckbox('overlay-hoydekurver', 'hoydekurver');
  }
}