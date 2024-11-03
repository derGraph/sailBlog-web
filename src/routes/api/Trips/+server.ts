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
    locals: { user: { username: any}}
}) {

    try{
		let responseData;
		if(event.locals.user){
			responseData = await prisma.trip.findMany({
				where:{
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
					endPoint: true
				}
			});
		}else{
			responseData = await prisma.trip.findMany({
				where: {
					visibility: 2
				},
				include: {
					crew: true,
					startPoint: true,
					endPoint: true
				}
			});
		}
		responseData = removeSensitiveData(responseData);
		return new Response(JSON.stringify(responseData));
	} catch (error_message) {
		if (error_message instanceof Error) {
			error(404, {
				message: error_message.message
			});
		} else if(isHttpError(error_message)){
			return error_message;
		} else {
			error(500, {
				message: 'ERROR'
			});
		}
	}
}
