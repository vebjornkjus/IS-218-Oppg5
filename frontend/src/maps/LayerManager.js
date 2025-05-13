// frontend/src/maps/LayerManager.js - Manage all map layers

import { WMS_URLS, WMS_COMMON_OPTIONS, FLOOD_YEARS } from '../config/app.js';

export class LayerManager {
  constructor(map, stateManager) {
    this.map = map;
    this.stateManager = stateManager;
    this.layers = {
      base: {},
      overlay: {},
      flood: {},
      buildings: {}
    };
  }
  
  initBaseLayers() {
    // OpenStreetMap base layer
    this.layers.base.osm = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "© OpenStreetMap contributors" }
    ).addTo(this.map);
  }
  
  initOverlayLayers() {
    // Kartverket - elevation contours
    this.layers.overlay.hoydekurver = L.tileLayer.wms(WMS_URLS.KARTVERKET, {
      ...WMS_COMMON_OPTIONS,
      layers: "hoydekurver_5m,hoydekurver_1m,hoydepunkt",
      attribution: "© Kartverket / Geonorge"
    }).addTo(this.map);
    
    // NVE - Flood susceptibility layers
    this.layers.overlay.flomAktsomhet = L.tileLayer.wms(WMS_URLS.NVE_AKTSOMHET, {
      ...WMS_COMMON_OPTIONS,
      layers: "Flom_aktsomhetsomrade",
      attribution: "© NVE"
    });
    
    this.layers.overlay.dekning = L.tileLayer.wms(WMS_URLS.NVE_AKTSOMHET, {
      ...WMS_COMMON_OPTIONS,
      layers: "FlomAktsomhet_Dekning",
      attribution: "© NVE"
    });
    
    this.layers.overlay.vannstand = L.tileLayer.wms(WMS_URLS.NVE_AKTSOMHET, {
      ...WMS_COMMON_OPTIONS,
      layers: "MaksimalVannstandstigning",
      attribution: "© NVE"
    });
  }
  
  initFloodLayers() {
    const floodLayerNames = {
      10: "Flomsone_10arsflom",
      20: "Flomsone_20arsflom",
      50: "Flomsone_50arsflom",
      100: "Flomsone_100arsflom",
      200: "Flomsone_200arsflom",
      500: "Flomsone_500arsflom",
      1000: "Flomsone_1000arsflom"
    };
    
    FLOOD_YEARS.forEach((year, index) => {
      this.layers.flood[year] = L.tileLayer.wms(WMS_URLS.NVE_FLOMSONER, {
        ...WMS_COMMON_OPTIONS,
        layers: floodLayerNames[year],
        attribution: "© NVE",
        zIndex: 12 - index // Higher z-index for lower return periods
      });
    });
  }
  
  getLayer(type, name) {
    return this.layers[type] && this.layers[type][name];
  }
  
  getAllLayers(type) {
    return this.layers[type] || {};
  }
  
  addLayerToMap(type, name) {
    const layer = this.getLayer(type, name);
    if (layer && !this.map.hasLayer(layer)) {
      layer.addTo(this.map);
      return true;
    }
    return false;
  }
  
  removeLayerFromMap(type, name) {
    const layer = this.getLayer(type, name);
    if (layer && this.map.hasLayer(layer)) {
      this.map.removeLayer(layer);
      return true;
    }
    return false;
  }
  
  isLayerVisible(type, name) {
    const layer = this.getLayer(type, name);
    return layer && this.map.hasLayer(layer);
  }
  
  // Flood zone specific methods
  showFloodZone(year) {
    console.log(`LayerManager: Adding flood zone ${year}`);
    return this.addLayerToMap('flood', year);
  }
  
  hideFloodZone(year) {
    console.log(`LayerManager: Removing flood zone ${year}`);
    return this.removeLayerFromMap('flood', year);
  }
  
  hideAllFloodZones() {
    console.log('LayerManager: Hiding all flood zones');
    FLOOD_YEARS.forEach(year => {
      this.hideFloodZone(year);
    });
  }
  
  switchFloodZone(fromYear, toYear) {
    console.log(`LayerManager: Switching from ${fromYear} to ${toYear}`);
    this.hideFloodZone(fromYear);
    this.showFloodZone(toYear);
  }
}