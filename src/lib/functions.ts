import type { User } from "@prisma/client";


export function parseRadioButton(tripId:string, user: User){
    if(tripId==user?.activeTripId){
        //ACTIVE
        return 'radio_button_checked';
    }else{
        //NOT ACTIVE
        return 'radio_button_unchecked';
    }
}

export function parseDate(unparsedDate:any){
    if(unparsedDate == null){
        return;
    }else if(unparsedDate.time == null){
        return;
    }
    let parsedDate = new Date(unparsedDate.time);
    return parsedDate.getDate()+"."+(parsedDate.getMonth()+1)+"."+parsedDate.getFullYear();
}


export function getProfilePicture(user:{
    description: string | null;
    username: string;
    firstName: string | null;
    lastName: string | null;
    profilePictureId: string | null;
    dateOfBirth: Date | null;
    roleId: string;
    activeTripId: string | null;
    lastPing: Date;
}){
    if(user?.username && user?.profilePictureId){
        return "/api/Media/"+user.username+"/"+user.profilePictureId+".avif"
    }else{
        return ""
    }
}