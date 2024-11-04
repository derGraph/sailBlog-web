import { removeSensitiveData } from '$lib/server/functions';
import { prisma } from '$lib/server/prisma';
import { checkVisibility } from '$lib/visibility.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { error, isHttpError, json } from '@sveltejs/kit';
import DOMPurify from 'dompurify';



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
            if(username != "" && username != null){
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
            }catch (error_message){
                if(error_message instanceof PrismaClientKnownRequestError){
                    return error(403, "Crew: "+error_message.message)
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
        }else{
            visibility = 1;
        }

        let responseData = await prisma.trip.create({
            data: {
                name: name,
                skipperName: skipper,
                ...(visibility && {visibility}),                
                ...(description && {description})
            }
        });
        if(parsedCrew){
            for(var member of parsedCrew){
                if(member != undefined){
                    await prisma.trip.update({
                        where: {
                            id: responseData.id
                        },
                        data: {
                            crew: {
                                connect: {
                                    username: member
                                }
                            }
                        }
                    });
                }
            }
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
    let parsedCrew = null;
	let visibility = null;
    let tripId = null;
    let unparsedVisibility = null;

    if(event.locals.user?.username){
        let username = event.locals.user?.username;
        name = event.url.searchParams.get('name');
        description = event.url.searchParams.get('description');
        skipperName = event.url.searchParams.get('skipper');
        crew = event.url.searchParams.get('crew');
        tripId = event.url.searchParams.get('tripId');
        unparsedVisibility = event.url.searchParams.get('visibility');
        

        if(tripId == null || tripId!.length === 0){
            return error(400, 'tripId is needed!');
        }else{
            try{
                await prisma.trip.findFirstOrThrow({
                    where: {
                        id: tripId,
                        crew: {
                            some: {
                                username: username
                            }
                        }
                    }
                });
            }catch (error_message){
                return error(400, 'Trip not found or not skipper of trip!');
            }
        }

        if (description != null) {
			try {
				description = DOMPurify.sanitize(description);
			} catch (error_message) {
				return error(400, 'Invalid description!');
			}
		}

        if(skipperName != null){
            try{
                await prisma.user.findFirstOrThrow({ where: {username: skipperName} });
            }catch (exception){
                return error(400, 'Invalid skipper!');
            }
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
            }catch (error_message){
                if(error_message instanceof PrismaClientKnownRequestError){
                    return error(400, "Crew: "+error_message.message)
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
                ...(description && {description})
            }
        });
        if(parsedCrew){
            await prisma.trip.update({
                where: {
                    id: responseData.id
                },
                data: {
                    crew: {
                        set: []
                    }
                }
            })
            for(var member of parsedCrew){
                if(member != undefined){
                    await prisma.trip.update({
                        where: {
                            id: responseData.id
                        },
                        data: {
                            crew: {
                                connect: {
                                    username: member
                                }
                            }
                        }
                    });
                }
            }
        }
        return new Response('200');

    }else{
        return error(401, 'Not logged in!');
    }
}