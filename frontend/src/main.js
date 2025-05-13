// frontend/src/main.js - Updated to use new modular structure

import { initMap } from './maps/mapInit.js';
import { CompassControl } from './components/kompass.js';
import { getElvbekkLayer } from './layers/elvbekk.js';
import { initWarningControl } from './components/warningControl.js';
import { addScaleControl } from './components/scaleControl.js'; 

(async () => {
  try {
    // Initialize the map with all modular components
    const map = initMap();
    
    // Add compass control
    map.addControl(new CompassControl());
    
    // Add geocoder control
    L.Control.geocoder({
      defaultMarkGeocode: true
    }).addTo(map);
    
    // Add scale control
    addScaleControl(map);
    
    // Create a Layer Control for additional layers
    const layerControl = L.control.layers(null, null).addTo(map);
    
    // Add loading indicator
    const loadingIndicator = L.control({ position: 'topright' });
    loadingIndicator.onAdd = () => {
      const div = L.DomUtil.create('div', 'loading-indicator');
      div.innerHTML = 'Laster flomsoner...';
      div.style.background = 'white';
      div.style.padding = '5px';
      div.style.borderRadius = '3px';
      return div;
    };
    loadingIndicator.addTo(map);
    
    // Load additional layers (elvbekk)
    try {
      const elvbekkLayer = await getElvbekkLayer(map);
      console.log('Elvbekk layer loaded:', elvbekkLayer);
      layerControl.addOverlay(elvbekkLayer, 'Elvbekk');
      elvbekkLayer.addTo(map);
      
      // Initialize warning control
      await initWarningControl(map);
    } catch (error) {
      console.error('Error loading Elvbekk layer:', error);
    }
  } catch (error) {
    console.error('Error initializing application:', error);
  }
})();