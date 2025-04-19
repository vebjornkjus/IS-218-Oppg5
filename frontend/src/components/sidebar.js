// sidebar.js
export function setupSidebar(data, layer, map) {
    document.getElementById('stats-count').textContent = data.length;
    document.getElementById('zoomToAllBtn').addEventListener('click', () => {
      map.fitBounds(layer.getBounds());
    });
  }