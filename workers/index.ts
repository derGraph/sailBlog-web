import { calculateUsers } from "./calculateUser";
import { loadGeoJSON, simplify } from "./simplifyGps";

await loadGeoJSON("store/regionData.geoJson");

while(true){
    await simplify();
    await calculateUsers();
    await new Promise(f => setTimeout(f, 1000));
}
