import { supabaseClient } from '../../../backend/config.js';

/**
 * Returns a color for an elvbekk segment based on its recurrence interval.
 * @param {number} interval - The recurrence interval in years.
 * @returns {string} A hex color string.
 */
function getElvbekkColor(interval) {
  if (interval >= 200) return '#00008B'; // Dark blue
  if (interval >= 100) return '#0000CD'; // Medium blue
  if (interval >= 50)  return '#0000FF'; // Blue
  if (interval >= 20)  return '#1E90FF'; // Dodger blue
  if (interval >= 10)  return '#4169E1'; // Royal blue
  if (interval >= 5)   return '#87CEEB'; // Sky blue
  if (interval >= 2)   return '#ADD8E6'; // Light blue
  return '#F0F8FF';                      // Alice blue
}

export async function getElvbekkLayer(map) {
  // Show loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-indicator';
  loadingDiv.textContent = 'Laster elvbekk-data...';
  document.body.appendChild(loadingDiv);

  const layerGroup = L.featureGroup();

  try {
    // Pull back the pre‑projected column
    const { data, error } = await supabaseClient
      .from('elvbekk')
      .select(`
        gjentaksintervall,
        lokalid,
        lavpunkt,
        symbolflom,
        geom_4326
      `);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Ingen elvbekk-data tilgjengelig');
    }

    // Render each segment as a styled polyline
    data.forEach(row => {
      const feature = {
        type: 'Feature',
        geometry: row.geom_4326,
        properties: {
          gjentaksintervall: row.gjentaksintervall,
          lokalid:           row.lokalid,
          lavpunkt:          row.lavpunkt,
          symbolflom:        row.symbolflom
        }
      };
      const recInterval = row.gjentaksintervall;
      const line = L.geoJSON(feature, {
        style: {
          weight: 2,
          opacity: 1,
          color: getElvbekkColor(recInterval)
        },
        onEachFeature: (feat, layer) => {
          layer.bindPopup(`
            <h4>Elvbekk segment</h4>
            <strong>Lokal ID:</strong> ${feat.properties.lokalid || '–'}<br/>
            <strong>Gjentaksintervall:</strong> ${recInterval || '–'} år<br/>
            <strong>Lavpunkt (m):</strong> ${feat.properties.lavpunkt || '–'}<br/>
            <strong>Symbolflom:</strong> ${feat.properties.symbolflom || '–'}
          `);
        }
      });
      layerGroup.addLayer(line);
    });

    // Zoom the map to fit all segments
    if (layerGroup.getLayers().length > 0) {
      map.fitBounds(layerGroup.getBounds());
    }

  } catch (e) {
    console.error('Feil ved lasting av elvbekk-data:', e);
    alert(`Kunne ikke laste elvbekk-data: ${e.message}`);
  } finally {
    loadingDiv.remove();
  }

  return layerGroup;
}