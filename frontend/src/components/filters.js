// filters.js
export function setupFilters(layer) {
    document.getElementById('filterR').addEventListener('change', e => {
      layer.eachLayer(l => {
        const c = l.feature.properties.støysonekategori;
        l.setStyle({opacity: e.target.checked || c!=='R'?1:0});
      });
    });
    document.getElementById('filterG').addEventListener('change', e => {
      layer.eachLayer(l => {
        const c = l.feature.properties.støysonekategori;
        l.setStyle({opacity: e.target.checked || c!=='G'?1:0});
      });
    });
  }