// legend.js
export function addLegend(map) {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      div.innerHTML = `
        <h4>Flomsoner og vannforekomster</h4>
        <i style="background:#3388ff"></i> Flomsoner<br>
        <i style="background:#4d94ff"></i> Elv/Bekk<br>
        <i style="background:#1e5799"></i> Innsjø<br>
      `;
      return div;
    };
    legend.addTo(map);
  }