import { initMap }      from './maps/mapInit.js';
import { addLegend }    from './components/legend.js';
import { setupFilters } from './components/filters.js';
import { setupSearch }  from './components/search.js';
import { setupSidebar } from './components/sidebar.js';
import { planeIcon, heliIcon, getAirportIcon } from './maps/icons.js';

(async () => {
  const map      = initMap();
  const { red, yellow } = addPatterns(map);
  const data     = await fetchZones();

  // Bygg GeoJSON-laget for støysonekategorier
  const features = data.map(r => ({
    type: 'Feature',
    properties: { lokalId: r.lokalId, støysonekategori: r.støysonekategori, beregnetÅr: r.beregnetÅr },
    geometry: r.geom
  }));
  const geojsonLayer = L.geoJSON({ type:'FeatureCollection', features }, {
    style: f => ({
      color:'#333', weight:1,
      fillPattern: f.properties.støysonekategori==='R'?red:yellow
    }),
    onEachFeature: (f, layer) => {
      layer.bindPopup(`<strong>ID:</strong>${f.properties.lokalId}<br><strong>År:</strong>${f.properties.beregnetÅr}`);
      const el = layer.getElement?.()??layer._path;
      if(el) el.setAttribute('tabindex','0');
    }
  }).addTo(map);

  // Legg til flyplasser med spesifikke ikoner
  const airports = await fetchAirports();

  // Konverter til GeoJSON
  const airportGeoJson = {
    type: 'FeatureCollection',
    features: airports.map(a => ({
      type: 'Feature',
      properties: {
        id: a.id,
        navn: a.navn,
        iata: a.iataKode,
        lufthavntype: a.lufthavntype,
        trafikktype: a.trafikktype
      },
      geometry: a.geom
    }))
  };

  L.geoJSON(airportGeoJson, {
    pointToLayer: (feature, latlng) => {
      const icon = getAirportIcon(feature.properties.lufthavntype);
      return L.marker(latlng, { icon });
    },
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`
        <strong>${feature.properties.navn}</strong><br>
        IATA: ${feature.properties.iata}<br>
        Type: ${feature.properties.lufthavntype}<br>
        Trafikktype: ${feature.properties.trafikktype}
      `);
    }
  }).addTo(map);

  // UI‑bygging
  addLegend(map);
  setupFilters(geojsonLayer);
  setupSearch(map, geojsonLayer);
  setupSidebar(data, geojsonLayer, map);
})();