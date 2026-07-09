import { calculateUsers } from './calculateUser.js';
import { locateImages } from './locateImages.js';
import { loadGeoJSON, simplify } from './simplifyGps.js';

await loadGeoJSON('store/regionData.geoJson');

while (true) {
  await simplify();
  await calculateUsers();
  await locateImages();
  await new Promise((f) => setTimeout(f, 1000));
}
