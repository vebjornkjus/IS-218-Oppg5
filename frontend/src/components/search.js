// frontend/src/components/search.js

/**
 * Set up the search UI to find a polygon by its lokalId.
 * @param {L.Map} map Leaflet map instance
 * @param {L.GeoJSON} layer GeoJSON layer containing features
 */
export function setupSearch(map, layer) {
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');

  // Handle search button click
  searchBtn.addEventListener('click', () => {
    const id = searchInput.value.trim();
    // Find matching feature
    const matchLayer = layer.getLayers().find(l => l.feature.properties.lokalId === id);
    if (matchLayer) {
      // Zoom to feature and open popup
      map.fitBounds(matchLayer.getBounds());
      matchLayer.openPopup();
    } else {
      alert(`Fant ingen sone med ID ${id}`);
    }
  });
}