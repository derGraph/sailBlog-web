import { calculateUsers } from "./calculateUser";
import { simplify } from "./simplifyGps";

while(true){
    await simplify();
    await calculateUsers();
    await new Promise(f => setTimeout(f, 1000));
}
