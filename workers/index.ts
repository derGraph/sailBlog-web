import { calculateUsers } from "./calculateUser";
import { simplify } from "./simplifyGps";

while(true){
    console.log("HI");
    await simplify();
    await calculateUsers();
    await new Promise(f => setTimeout(f, 1000));
}
