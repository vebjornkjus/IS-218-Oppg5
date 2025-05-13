// frontend/src/maps/mapInit.js - Simplified to only handle basic map initialization

import { SUPABASE_CONFIG } from '../config/app.js';
import { LayerManager } from './LayerManager.js';
import { BuildingLayerManager } from './BuildingLayerManager.js';
import { CustomControls } from '../components/CustomControls.js';
import { EventManager } from './EventManager.js';
import { StateManager } from '../state/StateManager.js';

export function initMap() {
  // Basic map setup
  const map = L.map("map", {
    zoomControl: false,
    fadeAnimation: false,
    markerZoomAnimation: false
  }).setView([58.14671, 8.01002], 10);
  
  // Add zoom control to top right
  L.control.zoom({ position: "topright" }).addTo(map);
  
  // Initialize managers
  const stateManager = new StateManager();
  const layerManager = new LayerManager(map, stateManager);
  const buildingManager = new BuildingLayerManager(map, stateManager);
  const controlsManager = new CustomControls(map, layerManager, buildingManager, stateManager);
  const eventManager = new EventManager(map, layerManager, buildingManager, stateManager);
  
  // Set up initial layers
  layerManager.initBaseLayers();
  layerManager.initOverlayLayers();
  layerManager.initFloodLayers();
  
  // Set up controls
  controlsManager.createLayerControls();
  
  // Set up event handlers
  eventManager.setupMapEvents();
  eventManager.setupLayerEvents();
  
  // Set up overlay event handlers (must be done after controls are created)
  controlsManager.createLayerControls();
  eventManager.setupOverlayEvents();
  
  return map;
}