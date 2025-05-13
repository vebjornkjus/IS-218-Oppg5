// frontend/src/components/CustomControls.js - FIXED version

import { SLIDER_VALUE_MAP, REVERSE_SLIDER_MAP, FLOOD_YEARS } from '../config/app.js';

export class CustomControls {
  constructor(map, layerManager, buildingManager, stateManager) {
    this.map = map;
    this.layerManager = layerManager;
    this.buildingManager = buildingManager;
    this.stateManager = stateManager;
    
    this.sidebar = document.getElementById('sidebar');
    this.setupCollapseButton();
  }
  
  setupCollapseButton() {
    const collapseBtn = document.getElementById('collapse-sidebar');
    collapseBtn.addEventListener('click', () => {
      this.sidebar.classList.toggle('collapsed');
      this.map.invalidateSize();
    });
  }
  
  createLayerControls() {
    // Create container for the controls
    const controlContainer = document.createElement('div');
    controlContainer.className = 'custom-layer-control';
    
    // Add overlay maps section
    this.addOverlaySection(controlContainer);
    
    // Add flood zone section
    this.addFloodSection(controlContainer);
    
    // Add to sidebar
    this.sidebar.appendChild(controlContainer);
    
    // Add required CSS
    this.addControlStyles();
  }
  
  addOverlaySection(container) {
    const overlayMaps = this.layerManager.getAllLayers('overlay');
    
    if (Object.keys(overlayMaps).length === 0) return;
    
    const overlaySection = document.createElement('div');
    overlaySection.className = 'layer-group';
    
    const overlayTitle = document.createElement('h4');
    overlayTitle.textContent = 'Kartlag';
    overlaySection.appendChild(overlayTitle);
    
    // Define overlay map names
    const overlayNames = {
      hoydekurver: 'Høydekurver (Kartverket)',
      flomAktsomhet: 'Flom – Aktsomhetsområder',
      dekning: 'Flom – Dekning',
      vannstand: 'Maksimal vannstandsstigning'
    };
    
    // Create checkboxes for overlay maps (WITHOUT event listeners)
    // Event listeners will be added by EventManager.setupOverlayEvents()
    Object.entries(overlayNames).forEach(([key, name]) => {
      const layer = overlayMaps[key];
      if (!layer) return;
      
      const itemDiv = document.createElement('div');
      itemDiv.className = 'layer-item';
      
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `overlay-${key}`;
      input.checked = this.map.hasLayer(layer);
      
      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = name;
      
      // DON'T add event listeners here - they will be added by EventManager
      
      itemDiv.appendChild(input);
      itemDiv.appendChild(label);
      overlaySection.appendChild(itemDiv);
    });
    
    container.appendChild(overlaySection);
  }
  
  addFloodSection(container) {
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
    showFloodZoneCheckbox.checked = this.stateManager.getShowFloodZones();
    
    const showFloodZoneLabel = document.createElement('label');
    showFloodZoneLabel.htmlFor = 'show-flood-zones';
    showFloodZoneLabel.textContent = 'Vis flomsoner';
    
    showFloodZoneDiv.appendChild(showFloodZoneCheckbox);
    showFloodZoneDiv.appendChild(showFloodZoneLabel);
    floodSection.appendChild(showFloodZoneDiv);
    
    // Create slider section
    const sliderContainer = this.createSliderControls(showFloodZoneCheckbox);
    floodSection.appendChild(sliderContainer);
    
    container.appendChild(floodSection);
  }
  
  createSliderControls(checkbox) {
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    
    // Current year display
    const currentYearDiv = document.createElement('div');
    currentYearDiv.className = 'current-year';
    const currentYear = this.stateManager.getCurrentFloodYear();
    currentYearDiv.textContent = `${currentYear}-års flomsone`;
    sliderContainer.appendChild(currentYearDiv);
    
    // Create slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '6';
    slider.className = 'flood-slider';
    
    // Set slider to match current flood year
    const initialSliderValue = REVERSE_SLIDER_MAP[currentYear] || '3';
    slider.value = initialSliderValue;
    
    console.log('📊 Initial flood control state:', {
      currentYear,
      initialSliderValue,
      sliderValue: slider.value
    });
    
    // Event handlers
    const toggleFloodZones = () => {
      const isChecked = checkbox.checked;
      console.log('🌊 Toggle flood zones:', isChecked);
      
      // Always remove all flood zones first
      this.layerManager.hideAllFloodZones();
      
      if (isChecked) {
        // Add the current flood zone
        const year = this.stateManager.getCurrentFloodYear();
        this.layerManager.showFloodZone(year);
        
        // Enable slider
        slider.disabled = false;
        
        // Update state
        this.stateManager.setShowFloodZones(true);
      } else {
        // Disable slider
        slider.disabled = true;
        
        // Update state
        this.stateManager.setShowFloodZones(false);
      }
      
      // Force refresh building visibility
      this.buildingManager.refreshBuildingVisibility();
    };
    
    const updateFloodZones = () => {
      const sliderValue = slider.value;
      const newFloodYear = SLIDER_VALUE_MAP[sliderValue];
      const currentFloodYear = this.stateManager.getCurrentFloodYear();
      
      console.log('🎚️ Update flood zones via slider:', {
        sliderValue,
        newFloodYear,
        currentFloodYear,
        isChecked: checkbox.checked
      });
      
      // Update display
      currentYearDiv.textContent = `${newFloodYear}-års flomsone`;
      
      if (checkbox.checked) {
        // Switch flood zones
        this.layerManager.switchFloodZone(currentFloodYear, newFloodYear);
      }
      
      // Update state
      this.stateManager.setCurrentFloodYear(newFloodYear);
    };
    
    checkbox.addEventListener('change', toggleFloodZones);
    slider.addEventListener('input', updateFloodZones);
    
    // Add slider to container
    sliderContainer.appendChild(slider);
    
    // Create legend
    const sliderLegend = document.createElement('div');
    sliderLegend.className = 'slider-legend';
    
    const minYear = document.createElement('span');
    minYear.className = 'slider-min';
    minYear.textContent = '10 år';
    
    const maxYear = document.createElement('span');
    minYear.className = 'slider-max';
    maxYear.textContent = '1000 år';
    
    sliderLegend.appendChild(minYear);
    sliderLegend.appendChild(maxYear);
    sliderContainer.appendChild(sliderLegend);
    
    return sliderContainer;
  }
  
  addControlStyles() {
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
}