import { prisma } from '$lib/server/prisma';
import type { Decimal } from '@prisma/client/runtime/library';
import { getDistance, getDistanceFromLine } from 'geolib';

export async function simplifyGps(trip: string, amount: number) {
	let totalAmount = 0;
	while(totalAmount < amount){
		let take = amount;

		if(amount>500){
			take = 500;
		}

		let inputData = await prisma.datapoint.findMany({
			where: {
				tripId: trip,
				optimized: 0
			},
			take: take
		});
		if(inputData.length <= 2){
			return;
		}

		let lastPoint: Datapoint = inputData[0];
	
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
	
			if (crosstrackError < 8 && Math.abs(turnRate) < 20 && distFromLastPoint < 50) {
				// Delete Datapoint
				await prisma.datapoint.update({
					where: { id: inputData[i].id },
					data: {
						optimized: 1
					}
				});
			} else {
				// Change Datapoint to optimized
				lastPoint = inputData[i];
				await prisma.datapoint.update({
					where: { id: inputData[i].id },
					data: {
						optimized: 2
					}
				});
			}
		}
		totalAmount += take;
	}
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
