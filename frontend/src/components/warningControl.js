// NVE Flomvarsling API config
const API_BASE_URL = 'https://api01.nve.no/hydrology/forecast/flood/v1.0.8/api';
const API_LANG     = 1;   // 1 = Norsk
// Region IDs for Agder: current region and historical counties (Aust-Agder, Vest-Agder)
const AGDER_IDS = [42, 9, 10];

// Hjelpefunksjon for datoformat "YYYY-MM-DD"
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export async function initWarningControl(map) {
  // Add warnings control panel
  const warningControl = L.control({ position: 'bottomleft' });
  warningControl.onAdd = () => {
    const div = L.DomUtil.create('div', 'warning-control');
    div.innerHTML = '<h4></h4><ul id="warningList"><li>Laster...</li></ul>';
    return div;
  };
  warningControl.addTo(map);

  // Hent kommune-ID-er for Agder
  let agderMunIds = [];
  try {
    const resMun = await fetch(`${API_BASE_URL}/Region/42`, {
      headers: { 'Accept': 'application/json' }
    });
    if (resMun.ok) {
      const munList = await resMun.json();
      agderMunIds = munList.map(m => parseInt(m.Id, 10));
      console.log('Agder municipalities:', agderMunIds);
    } else {
      console.error('Feilet ved henting av Agder-kommuner:', resMun.status);
    }
  } catch (err) {
    console.error('Error fetching Agder municipalities:', err);
  }

  // Fetch and display Agder warnings
  (async () => {
    // For testing: use fixed historical dates
    const startDate = '2017-12-22';
    const endDate   = '2017-12-24';
    const url       = `${API_BASE_URL}/Warning/${API_LANG}/${startDate}/${endDate}`;

    try {
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const warnings = await response.json();
      console.log('Fetched warnings:', warnings);
      warnings.forEach(w => {
        console.log(
          `Warning ${w.Id}:`,
          'CountyList =', w.CountyList,
          'MunicipalityList =', w.MunicipalityList
        );
      });
      const agderWarnings = warnings.filter(w =>
        // Sjekk fylke først
        (Array.isArray(w.CountyList) &&
          w.CountyList.some(c => AGDER_IDS.includes(c.Id)))
        // Eller sjekk kommune
        || (Array.isArray(w.MunicipalityList) &&
          w.MunicipalityList.some(m => agderMunIds.includes(parseInt(m.Id, 10))))
      );

      const warningList = document.getElementById('warningList');
      warningList.innerHTML = '';
      if (agderWarnings.length === 0) {
        warningList.innerHTML = '<li></li>';
      } else {
        agderWarnings.forEach(w => {
          const li = document.createElement('li');
          li.textContent = `${w.SeverityText}: ${w.HeaderText}`;
          warningList.appendChild(li);
        });
      }
    } catch (error) {
      console.error('Feil ved henting av flomvarsler:', error);
      document.getElementById('warningList').innerHTML = '<li>Feil ved henting av varsler</li>';
    }
  })();
}