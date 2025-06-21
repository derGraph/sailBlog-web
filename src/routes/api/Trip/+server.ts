import { removeSensitiveData } from '$lib/server/functions';
import { prisma } from '$lib/server/prisma';
import { checkVisibility } from '$lib/visibility.js';
import { Decimal, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { error, isHttpError, json } from '@sveltejs/kit';
import DOMPurify from 'isomorphic-dompurify';



export async function GET(event) {
    let tripId = null;

    tripId = event.url.searchParams.get("tripId");
    let username = null;
    username = event.locals.user?.username;
    if(username == undefined){
        username = "";
    }
    try{
        if(tripId == null){
            error(400, { message: 'tripId missing!' });
        }else{
            let responseData;
            if(event.locals.role?.canViewAllTrips) {
                responseData = await prisma.trip.findMany({
                    where:{
                        id: tripId
                    },
                    include:{
                        crew: true,
                        skipper: true,
                        startPoint: true,
                        endPoint: true
                    }
                });
            } else if(username != "" && username != null){
                responseData = await prisma.trip.findMany({
                    where:{
                        id: tripId,
                        OR: [
                            {   visibility: 1 },
                            {   visibility: 2 },
                            {
                                visibility: 0,
                                crew: {
                                    some: {
                                        username: username
                                    }
                                }
                            },
                            {                            
                                visibility: 0,
                                skipperName: username
                            }
                        ]
                    },
                    include:{
                        crew: true,
                        skipper: true,
                        startPoint: true,
                        endPoint: true
                    }
                });
            }else{
                responseData = await prisma.trip.findMany({
                    where:{
                        id: tripId,
                        visibility: 2,
                    },
                    include:{
                        crew: true,
                        skipper: true,
                        startPoint: true,
                        endPoint: true
                    }
                });
            }
            if(responseData.length == 0){
                return error(404, {
                    message: "Not Found!"
                });
            }
            responseData = removeSensitiveData(responseData);
            return new Response(JSON.stringify(responseData));
        }

	} catch (error_message) {
		if (error_message instanceof Error) {
			error(404, {
				message: error_message.message
			});
		} else if(isHttpError(error_message)){
			error(error_message.status, error_message.body);
		} else {
			error(500, {
				message: 'ERROR'
			});
		}
	}
}

export async function POST(event) {
	let name = null;
	let description = null;
	let skipper = null;
	let crew = null;
    let parsedCrew = null;
	let visibility = null;
    let unparsedVisibility = null;

    if(event.locals.user?.username){
        let username = event.locals.user?.username;
        name = event.url.searchParams.get('name');
        description = event.url.searchParams.get('description');
        skipper = event.url.searchParams.get('skipper');
        crew = event.url.searchParams.get('crew');
        unparsedVisibility = event.url.searchParams.get('visibility');

        if(name == null){
            return error(403, "Name is required!");
        }

        if (description != null) {
			try {
				description = DOMPurify.sanitize(description);
			} catch (error_message) {
				return error(400, 'Invalid description!');
			}
		}

        if(skipper != null){
            try{
                await prisma.user.findFirstOrThrow({ where: {username: skipper} });
            }catch (exception){
                return error(400, 'Invalid skipper!');
            }
        }else{
            return error(400, 'Skipper must be provided!');
        }

        if(crew != null){
            try{
                parsedCrew = crew.split(",");
                for(let member of parsedCrew){
                    if(member != ""){
                        await prisma.user.findFirstOrThrow({
                            where: {username: member.replaceAll(",", "").replaceAll(" ", "")}
                        });
                        parsedCrew[parsedCrew.indexOf(member)] = member.replaceAll(",", "").replaceAll(" ", "");
                    }else{
                        delete parsedCrew[parsedCrew.indexOf(member)];
                    }
                }
                parsedCrew = parsedCrew.flat();
            }catch (error_message){
                if(error_message?.constructor.name == "PrismaClientKnownRequestError"){
                    return error(400, "Crew: "+error_message?.meta.cause);
                }else{
                    return error(500, "ERROR")
                }
            }
        }

        if(!event.locals.role?.canCreateOwnTrips) {
            return error(401, "You are not allowed to create Trips!");
        }

        if(!parsedCrew?.includes(username) && skipper!=username && !event.locals.role?.canCreateAllTrips) {
            return error(400, "Trip must inlude yourself!");
        }

        if(unparsedVisibility != null){
            try{
                visibility = parseInt(unparsedVisibility);
                if(!checkVisibility(visibility)){
                    return error(403, "This value is not allowed for visibilty!");
                }
            }catch (error_message){
                if(isHttpError(error_message)){
                    return error(error_message.status, error_message.body);
                }
            }
        }else{
            visibility = 1;
        }

        let responseData = await prisma.trip.create({
            data: {
                name: name,
                deleted: false,
                skipperName: skipper,
                ...(visibility && {visibility}),                
                ...(description && {description})
            }
        });
        
        if(parsedCrew){
            await prisma.user.updateMany({
                where: {
                    username: {
                        in: parsedCrew
                    }
                },
                data: {
                    recalculate: true
                }
            });
            await prisma.trip.update({
                where: {
                    id: responseData.id
                },
                data: {
                    crew: {
                        connect: parsedCrew.map((member)=>{return {"username":member}})
                    }
                }
            });
        }
        let returnData = await prisma.trip.findFirst({where:{id:responseData.id}, include:{crew:true, startPoint:true, endPoint: true}});
        return new Response(JSON.stringify(returnData));

    }else{
        return error(401, 'Not logged in!');
    }
}

export async function PUT(event) {
	let name = null;
	let description = null;
	let skipperName = null;
	let crew = null;
    let parsedCrew: string[] | null = null;
	let visibility = null;
    let tripId = null;
    let unparsedVisibility = null;
    let restore = false;
    let oldData: ({ crew: { username: string; description: string | null; recalculate: boolean; email: string; firstName: string | null; lastName: string | null; profilePictureId: string | null; dateOfBirth: Date | null; roleId: string; activeTripId: string | null; crewedLengthSail: number; crewedLengthMotor: number; skipperedLengthSail: number; skipperedLengthMotor: number; lastPing: Date; }[]; } & { id: string; name: string; description: string | null; startPointId: string | null; endPointId: string | null; last_update: Date; length_sail: Decimal | null; length_motor: Decimal | null; skipperName: string | null; visibility: number; recalculate: boolean; }) | null = null;

    if(event.locals.user?.username){
        let username = event.locals.user?.username;
        name = event.url.searchParams.get('name');
        description = event.url.searchParams.get('description');
        skipperName = event.url.searchParams.get('skipper');
        crew = event.url.searchParams.get('crew');
        tripId = event.url.searchParams.get('tripId');
        unparsedVisibility = event.url.searchParams.get('visibility');
        if(event.url.searchParams.get("restore")=="true"){
            restore = true;
        }

        if(tripId == null || tripId!.length === 0){
            return error(400, 'tripId is needed!');
        }else if (event.locals.role?.canEditAllTrips) {
            try{
                oldData = await prisma.trip.findFirstOrThrow({
                    where: {
                        id: tripId,
                        ...(restore ? { deleted: true } : { deleted: false })
                    },
                    include: {
                        crew: true
                    }
                });
            }catch (error_message){
                return error(400, 'Trip not found or not skipper/crew of trip!');
            }
        } else if (event.locals.role?.canEditOwnTrips) {
            try{
                oldData = await prisma.trip.findFirstOrThrow({
                    where: {
                        id: tripId,
                        ...(restore ? { deleted: true } : { deleted: false }),
                        OR: [{
                            crew: {
                                    some: {
                                        username: username
                                    }
                                }
                        },{
                            skipperName: username
                        }],
                        
                    },
                    include: {
                        crew: true
                    }
                });
            }catch (error_message){
                return error(400, 'Trip not found or not skipper/crew of trip!');
            }
        } else {
            return error(401, 'You are not allowed to edit this trip!');
        }

        if (description != null) {
			try {
				description = DOMPurify.sanitize(description);
			} catch (error_message) {
                console.log(error_message);
				return error(400, 'Invalid description!');
			}
		}

        if(skipperName != null){
            try{
                skipperName = (await prisma.user.findFirstOrThrow({ where: {username: skipperName} })).username;
            }catch (exception){
                return error(400, 'Invalid skipper!');
            }
        }

        if(crew != null){
            try{
                parsedCrew = crew.split(",");
                for(let member of parsedCrew){
                    if(member != ""){
                        parsedCrew[parsedCrew.indexOf(member)] = (await prisma.user.findFirstOrThrow({
                            where: {username: member.replaceAll(",", "").replaceAll(" ", "")}
                        })).username;
                    }else{
                        delete parsedCrew[parsedCrew.indexOf(member)];
                    }
                }
                parsedCrew = parsedCrew.flat();
            }catch (error_message){
                if(error_message?.constructor.name == "PrismaClientKnownRequestError"){
                    return error(400, "Crew: "+error_message?.meta.cause);
                }else{
                    return error(500, "ERROR")
                }
            }
        }

        if(unparsedVisibility != null){
            try{
                visibility = parseInt(unparsedVisibility);
                if(!checkVisibility(visibility)){
                    return error(403, "This value is not allowed for visibilty!");
                }
            }catch (error_message){
                if(isHttpError(error_message)){
                    return error(error_message.status, error_message.body);
                }
            }
        }

        let responseData = await prisma.trip.update({
            where: {
                id: tripId
            },
            data: {
                ...(name && {name}),
                ...(skipperName && {skipperName}),
                ...(visibility && {visibility}),                
                ...(description && {description}),
                ...(restore ? { deleted: false } : {}),
            }
        });
        if(skipperName != null){
            await prisma.user.updateMany({
                where: {
                    OR: [{
                        username: skipperName
                    },
                        ...(oldData.skipperName ? [{ username: oldData.skipperName }] : [])
                    ]
                },
                data: {
                    recalculate: true,
                }
            });
            await prisma.user.update({
                where: {
                    username: skipperName
                },
                data: {
                    crewedTrips: {
                        connect: {
                            id: responseData.id
                        }
                    }
                }
            });
        }
        if(parsedCrew){
            let oldCrewMembers = oldData?.crew.map((member)=>{return member.username});
            let addedUsers = parsedCrew.filter((newMember)=>{
                return !oldCrewMembers?.includes(newMember)
            });
            let removedUsers = oldCrewMembers.filter((newMember)=>{
                return !parsedCrew!.includes(newMember)
            });

            await prisma.trip.update({
                where: {
                    id: responseData.id
                },
                data: {
                    crew: {
                        disconnect: removedUsers.map((member)=>{
                                return {'username':member}
                            })
                    }
                }
            });

            await prisma.trip.update({
                where: {
                    id: responseData.id
                },
                data: {
                    crew: {
                        connect: addedUsers.map((member)=>{
                                return {'username':member}
                            })
                    }
                }
            });
            await prisma.user.updateMany({
                where: {
                    OR:[{
                        AND:[{
                            username: {in: parsedCrew}
                        },{
                            username: {
                                notIn: oldData.crew.map((member)=>{return member.username})
                            }
                        }]
                    },{
                        AND:[{
                            username: {
                                in: oldData.crew.map((member)=>{return member.username})
                            }
                        },{
                            username: {
                                notIn: parsedCrew
                            }
                        }]
                    }]
                },
                data: {
                    recalculate: true
                }
            });
        }
        return new Response('200');

    }else{
        return error(401, 'Not logged in!');
    }
}

export async function DELETE(event) {
    let tripId = null;

    if(event.locals.user?.username){
        tripId = event.url.searchParams.get('tripId');
        if(tripId){
            try{
                if(event.locals.role?.canDeleteAllTrips) {
                    await prisma.trip.update({
                        where: {
                            id: tripId,
                            deleted: false
                        },
                        data: {
                            deleted: true,
                            name: "deletedTrip "+(new Date(Date.now())).toISOString(),
                            description: null,
                            visibility: 0,
                            recalculate: true,
                        }
                    });
                    return new Response('200');
                } else if(event.locals.role?.canDeleteOwnedTrips) {
                    await prisma.trip.update({
                        where: {
                            id: tripId,
                            deleted: false,
                            crew: {
                                some:{
                                    username: event.locals.user?.username
                                }
                            }
                        },
                        data: {
                            deleted: true,
                            name: "deletedTrip "+(new Date(Date.now())).toISOString(),
                            description: null,
                            visibility: 0,
                            recalculate: true,
                        }
                    });
                    return new Response('200');
                } else if(event.locals.role?.canDeleteCrewedTrips) {
                    await prisma.trip.update({
                        where: {
                            id: tripId,
                            deleted: false,
                            OR: [{
                                crew: {
                                    some:{
                                        username: event.locals.user?.username
                                    }
                                }
                            },{
                                skipper: {
                                    username: event.locals.user?.username
                                }
                            }]
                        },
                        data: {
                            deleted: true,
                            name: "deletedTrip "+(new Date(Date.now())).toISOString(),
                            description: null,
                            visibility: 0,
                            recalculate: true,
                        }
                    });
                    return new Response('200');
                }
            }catch(error_message){
                if(error_message?.constructor.name == "PrismaClientKnownRequestError"){
                    return error(400, "Update: "+error_message?.meta.cause);
                }else{
                    return error(500, "ERROR")
                }
            }
        }

    }
}
