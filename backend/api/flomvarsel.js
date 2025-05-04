import { BASE_URL, LANG, AGDER_ID, START_DATE, END_DATE } from '../config.js';

/**
 * Hjelpefunksjon for å formatere en Date til "YYYY-MM-DD"
 */
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Henter flomvarsler for Agder for perioden "i dag" til "i morgen".
 * @returns {Promise<Array>} En Promise som løser til en liste med varsel-objekter.
 */
async function getAgderWarnings() {
  // Bygg URL
  const url = `${BASE_URL}/Warning/${LANG}/${START_DATE}/${END_DATE}`;

  try {
    // Utfør fetch
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    // Sjekk HTTP-status
    if (!response.ok) {
      // Kast en feil som kan fanges av catch
      throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }

    // Parse JSON
    const warnings = await response.json();

    // Filtrer kun de varslene som berører Agder
    const agderWarnings = warnings.filter(w =>
      Array.isArray(w.CountyList) &&
      w.CountyList.some(c => c.Id === AGDER_ID)
    );

    console.log(`Fant ${agderWarnings.length} Agder-varsler fra ${START_DATE} til ${END_DATE}:`, agderWarnings);
    return agderWarnings;

  } catch (error) {
    // Robust logging av både nettverksfeil og HTTP-feil
    console.error('Feil ved henting av flomvarsler for Agder:', error);
    // Du kan velge å kaste feilen videre, eller returnere en tom liste:
    // throw error;
    return [];
  }
}

// Eksempel på hvordan du kaller funksjonen i appen
getAgderWarnings().then(agderWarnings => {
  if (agderWarnings.length === 0) {
    console.log('Ingen aktive flomvarsler for Agder akkurat nå.');
  } else {
    // Her kan du oppdatere UI, sende e-post, etc.
    agderWarnings.forEach(w => {
      // Eksempel: vis tittel og dato
      console.log(`- [${w.SeverityText}] ${w.HeaderText} (Gyldig fra ${w.ValidFrom} til ${w.ValidTo})`);
    });
  }
});