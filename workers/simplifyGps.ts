import { prisma } from '../src/lib/server/prisma';
import type { Decimal } from '@prisma/client/runtime/library';
import { getDistance, getDistanceFromLine } from 'geolib';

export async function simplifyGps(trip: string, amount: number) {
	let totalAmount = 0;
	while(totalAmount < amount){
		let take = amount;

		if(amount>10000){
			take = 10000;
		}

		let inputData = await prisma.datapoint.findMany({
			where: {
				tripId: trip,
				optimized: 0
			},
			take: take
		});
		if(inputData.length <= 2){
			console.log("Finished "+ trip +"!");
			return;
		}

		let lastPoint: Datapoint = inputData[0];
		let deletedPoints: string[] = [];
		let optimizedPoints: string[] = [];

		
		for (let i = 1; i < inputData.length - 1; i++) {
			let crosstrackError = getDistanceFromLine(
				{ lat: Number(inputData[i].lat), lng: Number(inputData[i].long) },
				{ lat: Number(lastPoint.lat), lng: Number(lastPoint.long) },
				{ lat: Number(inputData[i + 1].lat), lng: Number(inputData[i + 1].long) }
			);
	
			let turnRate = 0;
			if ((inputData[i].heading != null, inputData[i - 1].heading != null)) {
				turnRate = Number(inputData[i - 1].heading) - Number(inputData[i].heading);
			}

			let distFromLastPoint = getDistance(
				{ lat: Number(inputData[i].lat), lng: Number(inputData[i].long)} ,
				{ lat: Number(lastPoint.lat), lng: Number(lastPoint.long) }
			);
	
			if (crosstrackError < 10 && Math.abs(turnRate) < 20 && distFromLastPoint < 50) {
				// Delete Datapoint
				deletedPoints.push(inputData[i].id);
			} else {
				// Change Datapoint to optimized
				lastPoint = inputData[i];
				optimizedPoints.push(inputData[i].id);
			}
		}
		await prisma.datapoint.updateMany({
			where:  {
				id: {in: deletedPoints}
			},
			data: {
				optimized: 1
			}
		});
		await prisma.datapoint.updateMany({
			where:  {
				id: {in: optimizedPoints}
			},
			data: {
				optimized: 2
			}
		});
		totalAmount += take;
		console.log("Trip "+ trip +": Simplified " + totalAmount + " of " + amount);
	}
}

export async function simplify(){
	let trips = await prisma.trip.findMany({});
	for (var trip in trips){
		console.log("Optimizing "+ trips[trip].id);
		await simplifyGps(trips[trip].id, 100000);
	}
	return;
}


interface Datapoint {
	id: string;
	tripId: string;
	time: Date;
	lat: Decimal;
	long: Decimal;
	speed: Decimal | null;
	heading: Decimal | null;
	depth: Decimal | null;
	h_accuracy: Decimal | null;
	v_accuracy: Decimal | null;
	propulsion: number | null;
	optimized: number;
}
