export function initMap() {
  // --------------------------------------------------
  // Map setup - basic configuration
  // --------------------------------------------------
  const map = L.map("map", {
    zoomControl: false,
    fadeAnimation: false,
    markerZoomAnimation: false
  }).setView([58.14671, 8.01002], 10);
  
  L.control.zoom({ position: "topright" }).addTo(map);
  
  // --------------------------------------------------
  // Base maps
  // --------------------------------------------------
  const osmBaseLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "© OpenStreetMap contributors" }
  ).addTo(map);
  
  // --------------------------------------------------
  // WMS common options
  // --------------------------------------------------
  const wmsCommonOptions = {
    format: "image/png",
    transparent: true,
    version: "1.3.0"
  };
  
  // --------------------------------------------------
  // Kartverket - elevation contours
  // --------------------------------------------------
  const hoydekurveLayer = L.tileLayer.wms(
    "https://wms.geonorge.no/skwms1/wms.fkb?",
    {
      ...wmsCommonOptions,
      layers: "hoydekurver_5m,hoydekurver_1m,hoydepunkt",
      attribution: "© Kartverket / Geonorge"
    }
  ).addTo(map);
  
  // --------------------------------------------------
  // NVE - Flood susceptibility layers
  // --------------------------------------------------
  const aktsomhetUrl = "https://nve.geodataonline.no/arcgis/services/FlomAktsomhet/MapServer/WMSServer";
  
  const flomAktsomhetLayer = L.tileLayer.wms(aktsomhetUrl, {
    ...wmsCommonOptions,
    layers: "Flom_aktsomhetsomrade",
    attribution: "© NVE"
  }).addTo(map);
  
  const dekningsLayer = L.tileLayer.wms(aktsomhetUrl, {
    ...wmsCommonOptions,
    layers: "FlomAktsomhet_Dekning",
    attribution: "© NVE"
  });
  
  const vannstandLayer = L.tileLayer.wms(aktsomhetUrl, {
    ...wmsCommonOptions,
    layers: "MaksimalVannstandstigning",
    attribution: "© NVE"
  });
  
  // --------------------------------------------------
  // NVE - Flood zone layers
  // --------------------------------------------------
  const flomsonerUrl = "https://nve.geodataonline.no/arcgis/services/Flomsoner1/MapServer/WMSServer";
  
  const flomsonerOptions = {
    ...wmsCommonOptions,
    attribution: "© NVE"
  };
  
  // 10-års flomsone
  const flomsone10 = L.tileLayer.wms(flomsonerUrl, {
    ...flomsonerOptions,
    layers: "Flomsone_10arsflom",
    zIndex: 12
  });
  
  // 100-års flomsone
  const flomsone100 = L.tileLayer.wms(flomsonerUrl, {
    ...flomsonerOptions,
    layers: "Flomsone_100arsflom",
    zIndex: 10
  }).addTo(map);
  
  // 200-års flomsone
  const flomsone200 = L.tileLayer.wms(flomsonerUrl, {
    ...flomsonerOptions,
    layers: "Flomsone_200arsflom"
  });
  
  // 200-års flomsone med klimapåslag
  const flomsone200K = L.tileLayer.wms(flomsonerUrl, {
    ...flomsonerOptions,
    layers: "Flomsone_200arsflom_klima"
  });
  
  // 500-års flomsone
  const flomsone500 = L.tileLayer.wms(flomsonerUrl, {
    ...flomsonerOptions,
    layers: "Flomsone_500arsflom"
  });

  // --------------------------------------------------
  // GeoJSON flood building layers
  // --------------------------------------------------
  // Hash for bbox - må matche det som brukes i Python-skriptet
  const bboxHash = "6ed2263c"; // Dette må du tilpasse til din faktiske hash
  
  // URLs for de forskjellige flomperiodene
  const floodUrls = {
    10: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/agdertest/osm_buildings_flood_10yr_${bboxHash}.geojson`,
    100: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/agdertest/osm_buildings_flood_100yr_${bboxHash}.geojson`,
    200: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/agdertest/osm_buildings_flood_200yr_${bboxHash}.geojson`,
    500: `https://emefguxbwcvfxaiywmri.supabase.co/storage/v1/object/public/agdertest/osm_buildings_flood_500yr_${bboxHash}.geojson`
  };
  
  // Tomme placeholders for GeoJSON-lag, disse blir fylt senere
  let buildings10Layer, buildings100Layer, buildings200Layer, buildings500Layer;
  
  // Last inn alle bygningslag asynkront
  const promises = [];
  
  // Funksjon for å laste inn et GeoJSON-lag
  function loadBuildingsLayer(url, period) {
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Opprett GeoJSON-lag med stil som varierer litt med periode
        const buildingsLayer = L.geoJSON(data, {
          style: getStyleForPeriod(period),
          onEachFeature: (feat, layer) => {
            layer.bindPopup(`Bygg OSM-id: ${feat.properties.osm_id}<br>Flomsone: ${period}-årsflom`);
          }
        });
        
        // Knytt lag sammen: Når flomsonen skrus av/på, følger bygningene etter
        return { period, layer: buildingsLayer };
      })
      .catch(err => {
        console.warn(`Kunne ikke laste bygninger for ${period}-årsflom:`, err);
        return { period, layer: null };
      });
  }
  
  // Funksjon for å gi forskjellige stiler basert på flomperiode
  function getStyleForPeriod(period) {
    const styles = {
      10: { color: '#6ab0ff', weight: 1, fillOpacity: 0.4 },   // Lysere blå
      100: { color: '#3178c6', weight: 1, fillOpacity: 0.3 },  // Original blå
      200: { color: '#a64dff', weight: 1, fillOpacity: 0.3 },  // Lilla
      500: { color: '#c40000', weight: 1, fillOpacity: 0.3 }   // Rød
    };
    return styles[period] || styles[100]; // Default til 100-års stil
  }
  
  // Last inn alle lag og håndter dem når de er klare
  for (const [period, url] of Object.entries(floodUrls)) {
    promises.push(loadBuildingsLayer(url, parseInt(period)));
  }
  
  Promise.all(promises)
    .then(results => {
      // Oppsett for hvert lag
      results.forEach(result => {
        if (!result.layer) return; // Hopp over lag som feilet
        
        const { period, layer } = result;
        
        // Lagre lagene i de rette variablene
        switch (period) {
          case 10: buildings10Layer = layer; 
                  // Knytt til flomsone10 - når flomsonen vises/skjules, gjør det samme med bygningene
                  flomsone10.on('add', () => map.addLayer(layer));
                  flomsone10.on('remove', () => map.removeLayer(layer));
                  break;
          case 100: buildings100Layer = layer; 
                   // Knytt til flomsone100
                   flomsone100.on('add', () => map.addLayer(layer));
                   flomsone100.on('remove', () => map.removeLayer(layer));
                   // Siden flomsone100 er synlig ved start, legg til bygningslaget også
                   if (map.hasLayer(flomsone100)) map.addLayer(layer);
                   break;
          case 200: buildings200Layer = layer; 
                   // Knytt til flomsone200
                   flomsone200.on('add', () => map.addLayer(layer));
                   flomsone200.on('remove', () => map.removeLayer(layer));
                   break;
          case 500: buildings500Layer = layer; 
                   // Knytt til flomsone500
                   flomsone500.on('add', () => map.addLayer(layer));
                   flomsone500.on('remove', () => map.removeLayer(layer));
                   break;
        }
      });
      
      // Opprett overlay-kart for sidebar
      const overlayMaps = {
        'Høydekurver (Kartverket)': hoydekurveLayer,
        'Flom – Aktsomhetsområder': flomAktsomhetLayer,
        'Flom – Dekning': dekningsLayer,
        'Maksimal vannstandsstigning': vannstandLayer,
        'Flomsone 10-års': flomsone10,
        'Flomsone 100-års': flomsone100,
        'Flomsone 200-års': flomsone200,
        'Flomsone 200-års + klima': flomsone200K,
        'Flomsone 500-års': flomsone500
        // Merk: Vi inkluderer ikke bygningslagene direkte i kontrollene 
        // fordi de håndteres via event listeners på flomsonene
      };
      
      // Opprett sidebar-kontroller
      createCustomLayerControls({
        baseMaps: { 'OpenStreetMap': osmBaseLayer },
        overlayMaps,
        map
      });
    })
    .catch(err => console.error('Feil ved lasting av bygninger:', err));
  
  return map;
}

// Function to create custom layer controls in the sidebar
function createCustomLayerControls(options) {
  const sidebar = document.getElementById('sidebar');
  
  // Add collapse functionality
  const collapseBtn = document.getElementById('collapse-sidebar');
  collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    // Oppdater kartet for å reflektere endringen
    options.map.invalidateSize();
  });

  // Create container for the controls
  const controlContainer = document.createElement('div');
  controlContainer.className = 'custom-layer-control';
  
  // Overlay maps section
  if (Object.keys(options.overlayMaps).length > 0) {
    const overlaySection = document.createElement('div');
    overlaySection.className = 'layer-group';
    
    const overlayTitle = document.createElement('h4');
    overlayTitle.textContent = 'Kartlag';
    overlaySection.appendChild(overlayTitle);
    
    // Create checkboxes for overlay maps
    Object.entries(options.overlayMaps).forEach(([name, layer]) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'layer-item';
      
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `overlay-${name.replace(/\s+/g, '-').toLowerCase()}`;
      input.checked = options.map.hasLayer(layer);
      
      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = name;
      
      input.addEventListener('change', () => {
        if (input.checked) {
          options.map.addLayer(layer);
        } else {
          options.map.removeLayer(layer);
        }
      });
      
      itemDiv.appendChild(input);
      itemDiv.appendChild(label);
      overlaySection.appendChild(itemDiv);
    });
    
    controlContainer.appendChild(overlaySection);
  }
  
  // Add the control container to the sidebar
  sidebar.appendChild(controlContainer);
}