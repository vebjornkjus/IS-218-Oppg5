// frontend/src/state/StateManager.js - Centralized state management

export class StateManager {
  constructor() {
    this.state = {
      currentFloodYear: 100,
      showFloodZones: false,
      isLoadingBuildings: false,
      currentFloodBuildingsLayer: null,
      currentAktsomhetBuildingsLayer: null,
      buildingCache: new Map()
    };
    
    this.listeners = {
      floodYearChange: [],
      floodZonesToggle: [],
      buildingsUpdate: []
    };
  }
  
  // Getters
  getCurrentFloodYear() {
    return this.state.currentFloodYear;
  }
  
  getShowFloodZones() {
    return this.state.showFloodZones;
  }
  
  isLoading() {
    return this.state.isLoadingBuildings;
  }
  
  getCurrentFloodBuildingsLayer() {
    return this.state.currentFloodBuildingsLayer;
  }
  
  getCurrentAktsomhetBuildingsLayer() {
    return this.state.currentAktsomhetBuildingsLayer;
  }
  
  getBuildingCache() {
    return this.state.buildingCache;
  }
  
  // Setters with notifications
  setCurrentFloodYear(year) {
    const oldYear = this.state.currentFloodYear;
    this.state.currentFloodYear = year;
    console.log(`State: flood year changed from ${oldYear} to ${year}`);
    this.emit('floodYearChange', { oldYear, newYear: year });
  }
  
  setShowFloodZones(show) {
    const oldValue = this.state.showFloodZones;
    this.state.showFloodZones = show;
    console.log(`State: show flood zones changed from ${oldValue} to ${show}`);
    this.emit('floodZonesToggle', { oldValue, newValue: show });
  }
  
  setIsLoadingBuildings(loading) {
    this.state.isLoadingBuildings = loading;
  }
  
  setCurrentFloodBuildingsLayer(layer) {
    this.state.currentFloodBuildingsLayer = layer;
    this.emit('buildingsUpdate', { type: 'flood', layer });
  }
  
  setCurrentAktsomhetBuildingsLayer(layer) {
    this.state.currentAktsomhetBuildingsLayer = layer;
    this.emit('buildingsUpdate', { type: 'aktsomhet', layer });
  }
  
  // Event system
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }
  
  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}