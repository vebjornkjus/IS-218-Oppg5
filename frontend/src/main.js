import { initMap }      from './maps/mapInit.js';
import { addLegend }    from './components/legend.js';
import { setupFilters } from './components/filters.js';
import { setupSearch }  from './components/search.js';
import { setupSidebar } from './components/sidebar.js';
import { fetchZones } from './services/dataService.js';

(async () => {
  const map = initMap();
  const data = await fetchZones();

  // Build GeoJSON layer for flood zones
  const features = data.map(r => ({
    type: 'Feature',
    properties: { lokalId: r.lokalId, flomtype: r.flomtype, år: r.år },
    geometry: r.geom
  }));
  
  const geojsonLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
    style: f => ({
      color: '#3388ff', 
      weight: 2,
      fillColor: '#3388ff',
      fillOpacity: 0.4,
      opacity: 0.8
    }),
    onEachFeature: (f, layer) => {
      layer.bindPopup(`
        <strong>ID:</strong> ${f.properties.lokalId}<br>
        <strong>Type:</strong> ${f.properties.flomtype}<br>
        <strong>År:</strong> ${f.properties.år}
      `);
      const el = layer.getElement?.() ?? layer._path;
      if(el) el.setAttribute('tabindex', '0');
    }
  }).addTo(map);

  // UI setup
  addLegend(map);
  setupFilters(geojsonLayer);
  setupSearch(map, geojsonLayer);
  setupSidebar(data, geojsonLayer, map);
})();