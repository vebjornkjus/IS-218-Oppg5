// legend.js
export function addLegend(map) {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      div.innerHTML = `
        <h4>Støysonekategori</h4>
        <i style="background:red"></i> Høy sonesone<br>
        <i style="background:yellow"></i> Moderat sonesone<br>
      `;
      return div;
    };
    legend.addTo(map);
  }