export const planeIcon = L.icon({
    iconUrl: './assets/Plane.png',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
  
export const heliIcon = L.icon({
    iconUrl: './assets/Helicopter.png',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

/**
 * Returns appropriate Leaflet icon based on airport type.
 * @param {string} lufthavntype - The luftavntype or trafikktype property
 * @returns {L.Icon} planeIcon or heliIcon
 */
export function getAirportIcon(type) {
  const t = (type || '').toLowerCase();
  return t.includes('helikopter') ? heliIcon : planeIcon;
}