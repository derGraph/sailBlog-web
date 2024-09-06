import { simplify } from "./simplifyGps";

while(true){
    await simplify();
    await new Promise(f => setTimeout(f, 1000));
}
