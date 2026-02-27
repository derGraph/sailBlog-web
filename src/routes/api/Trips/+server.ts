import { removeSensitiveData } from '$lib/server/functions.js';
import { prisma } from '$lib/server/prisma';
import { error, isHttpError, json, redirect } from '@sveltejs/kit';

interface Datapoint {
	id?: string;
	time?: Date;
	tripId: string;
	lat: number;
	long: number;
	speed?: number;
	heading?: number;
	depth?: number;
	h_accuracy?: number;
	v_accuracy?: number;
	propulsion?: number;
}

export async function POST(event) {
	return redirect(301, "/api/Trip");
}

export async function GET(event: {
	url: any;
    locals: { user: { username: any}, role: {canViewAllTrips:boolean}}
}) {
	let deleted = false;
	let username: string|null = null;
	if(event.url.searchParams.get("deleted")=="true"){
		deleted = true;
	}
	username = event.url.searchParams.get("username");
    try{
		let responseData;
		if(event.locals.user){
			if(username == null){
				if(event.locals.role?.canViewAllTrips) {
					responseData = await prisma.trip.findMany({
						where:{
							deleted: deleted,
						},
						include:{
							crew: true,
							startPoint: true,
							endPoint: true,
							location: true
						}
					});
				} else {
					responseData = await prisma.trip.findMany({
						where:{
							deleted: deleted,
							OR: [{
								crew: {
									some: {
										username: event.locals.user.username
									}
								}
							},
							{
								skipper: {
									username: event.locals.user.username
								}
							},
							{
								visibility: 1
							},
							{
								visibility: 2
							}]
						},
						include:{
							crew: true,
							startPoint: true,
							endPoint: true,
							location: true
						}
					});
				}
			}else{
				if(event.locals.role?.canViewAllTrips) {
					responseData = await prisma.trip.findMany({
						where:{
							deleted: deleted,
							...(username ? {
								OR: [
									{crew: {some: {username: username}}},
									{skipper: {username: username}},
								],
							} : {})
						},
						include:{
							crew: true,
							startPoint: true,
							endPoint: true,
							location: true
						}
					});
				} else {
					responseData = await prisma.trip.findMany({
						where:{
							deleted: deleted,
							OR: [
							{
								visibility: 1,
								...(username ? {
									OR: [
										{crew: {some: {username: username}}},
										{skipper: {username: username}},
									],
								} : {})
							},
							{
								visibility: 2,
								...(username ? {
									OR: [
										{crew: {some: {username: username}}},
										{skipper: {username: username}},
									],
								} : {})
							}]
						},
						include:{
							crew: true,
							startPoint: true,
							endPoint: true,
							location: true
						}
					});
				}
			}
		}else{
			responseData = await prisma.trip.findMany({
				where: {
					visibility: 2,
					deleted: false
				},
				include: {
					crew: true,
					startPoint: true,
					endPoint: true,
					location: true
				}
			});
		}
		responseData = removeSensitiveData(responseData);
		return new Response(JSON.stringify(responseData));
	} catch (error_message) {
		if (isHttpError(error_message)) {
			return error_message;
		} else if (error_message instanceof Error) {
			console.log(error_message)
			error(404, {
				message: error_message.message
			});
		} else {
			error(500, {
				message: 'ERROR'
			});
		}
	}
}
