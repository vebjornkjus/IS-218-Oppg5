export function addScaleControl(map) {
    L.control.scale({
      position: 'bottomright', // Plassering av målestokken
      imperial: false,        // Kun metrisk system
      maxWidth: 200           // Maks bredde på målestokken
    }).addTo(map);
  }