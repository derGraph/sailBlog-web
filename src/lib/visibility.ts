

export function parseVisibility(visibility:number){
    switch (visibility){
        case 0:
            return "private";
            break;
        case 1:
            return "logged in";
            break;
        case 2:
            return "public";
            break;
        default:
            return null;
    }
}


export function checkVisibility(visibility:number){
    if(parseVisibility(visibility) != null){
        return true;
    }else{
        return false;
    }
}