import { initMap } from './maps/mapInit.js';
import { CompassControl } from './components/kompass.js';
import {  getElvbekkLayer } from './layers/elvbekk.js';
import { initWarningControl } from './components/warningControl.js';

(async () => {
  try {
    const map = initMap();
    map.addControl(new CompassControl());

    // Legg til målestokk
    L.control.scale({
      position: 'bottomleft', // Plassering av målestokken
      imperial: false,        // Kun metrisk system
      maxWidth: 200           // Maks bredde på målestokken
    }).addTo(map);

    // Opprett en Layer Control for å kunne skru av/på lag
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

    // Load flood zones
    try {
      const elvbekkLayer = await getElvbekkLayer(map);
      console.log('Elvbekk layer loaded:', elvbekkLayer);
      layerControl.addOverlay(elvbekkLayer, 'Elvbekk');
      elvbekkLayer.addTo(map);
      await initWarningControl(map);
    } catch (error) {
      console.error('Error loading Elvbekk layer:', error);
    }
  } catch (error) {
    console.error('Error initializing map:', error);
  }
})();