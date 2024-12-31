import { prisma } from '../src/lib/server/prisma';
import type { Decimal } from '@prisma/client/runtime/library';
import { getDistance, getDistanceFromLine } from 'geolib';
import {statSync, createReadStream} from 'fs';
import {point, booleanPointInPolygon} from '@turf/turf';
import { Feature, FeatureCollection, GeoJsonProperties, Geometry, MultiPolygon, Polygon } from "geojson";

let regionData: null|FeatureCollection = null;

export async function simplifyGps(trip: string, amount: number) {
	let totalAmount = 0;
	let regions:String[] = [];
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
			return;
		}
		console.log("Optimizing "+ trip);

		let lastPoint: Datapoint = inputData[0];
		let deletedPoints: string[] = [];
		let optimizedPoints: string[] = [];

		
		for (let i = 1; i < inputData.length - 1; i++) {
			if(i%1000 == 0 || i == 0){
				let pointRegion:string = await findRegionForPoint(inputData[i]);
				if(!regions.includes(pointRegion) && pointRegion != null) regions.push(pointRegion);
			}
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
	
			if (crosstrackError < 10 && Math.abs(turnRate) < 7 && distFromLastPoint < 100) {
				// Delete Datapoint
				deletedPoints.push(inputData[i].id);
			} else {
				// Change Datapoint to optimized
				lastPoint = inputData[i];
				optimizedPoints.push(inputData[i].id);
			}
		}
		for(let region of regions){
			await prisma.trip.update({
				where: {
					id: trip
				},
				data: {
					location: {
						connectOrCreate: {
							where: {
								name: region.toString()
							},
							create: {
								name: region.toString()
							}
						}
					}
				}
			});
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
		let unoptimizedCount = await prisma.datapoint.count({
			where: {
				tripId: trip,
				optimized: 0
			}
		});
		if(unoptimizedCount = 2){
			await prisma.trip.update({
				where: {
					id: trip
				},
				data:{
					recalculate: true
				}
			});
		}
		totalAmount += take;
		console.log("Trip "+ trip +": Simplified " + totalAmount + " of " + amount);
	}
}

export async function calculateDistance(trip: string){
	let newDistanceSail: number = 0;
	let newDistanceMotor: number = 0;

	let inputTrips = await prisma.datapoint.findMany({
		where: {
			tripId: trip,
			OR: [
				{optimized: 0},
				{optimized: 2}
			]
		}
	});

	for (let i = 0; i < inputTrips.length - 2; i++) {
		let distance = getDistance(
			{lat: Number(inputTrips[i].lat), lon: Number(inputTrips[i].long)},
			{lat: Number(inputTrips[i+1].lat), lon: Number(inputTrips[i+1].long)},
		);
		// Add the Miles of this datapoint to the overall miles
		if (inputTrips[i+1].propulsion == 1){
			// length under motor
			newDistanceMotor += distance;
		}else if (inputTrips[i+1].propulsion == 2){
			// length under sail
			newDistanceSail += distance;
		}
	}

	await prisma.trip.update({
		where: {
			id: trip
		},
		data: {
			length_sail: newDistanceSail,
			length_motor: newDistanceMotor
		}
	});
	await prisma.trip.update({
		where: {
			id: trip
		},
		data: {
			endPointId: (await prisma.datapoint.findFirst({where: {tripId: trip}, orderBy:{time: 'desc'}}))?.id,
			startPointId: (await prisma.datapoint.findFirst({where: {tripId: trip}, orderBy:{time: 'asc'}}))?.id
		}
	});
}

export async function simplify(){
	let trips = await prisma.trip.findMany({});
	for (var trip in trips){
		await simplifyGps(trips[trip].id, 100000);
		if(trips[trip].recalculate){
			console.log("calculating "+trips[trip].id);
			await prisma.trip.update({
				where: {
					id: trips[trip].id
				},
				data: {
					length_motor: 0,
					length_sail: 0,
					recalculate: false,
				}
			});
			await calculateDistance(trips[trip].id);
			await prisma.user.updateMany({
				where: {
					OR: [
						{
							skipperedTrips: {
								some: {
									id: trips[trip].id
								}	
							}
						},
						{
							crewedTrips: {
								some: {
									id: trips[trip].id
								}	
							}
						},
					]
				},
				data: {
					recalculate: true
				}
			});
			console.log("FINISHED");
		}
	}
	return;
}

export async function loadGeoJSON(filePath: any) {
    return new Promise(async (resolve, reject) => {
        const fileSize = statSync(filePath).size;

        let bytesRead = 0;
        const stream = createReadStream(filePath, { encoding: 'utf8' });
        let data = '';
		let lastPrintedProgress = 0;

		process.stdout.write('Loading File: ');

        stream.on('data', (chunk: string | any[]) => {
            data += chunk;
            bytesRead += chunk.length;
            const progress = Math.floor((bytesRead / fileSize) * 100);

            if (progress >= lastPrintedProgress + 5) {
                process.stdout.write('#');
                lastPrintedProgress += 5;
            }
        });

        stream.on('end', () => {
			
			console.log(' Finished!');

			process.stdout.write("Parsing JSON data:");
            try {
                const geoJSON = JSON.parse(data) as FeatureCollection<Geometry, GeoJsonProperties>;;
				regionData = geoJSON;
                resolve(geoJSON);
            } catch (error) {
                reject(new Error('Failed to parse GeoJSON.')); // Handle JSON parse errors
            }
			console.log(" Finished!")
        });

        stream.on('error', (error: any) => {
            reject(error);
        });
    });
}

export async function findRegionForPoint( inputPoint: {lat: Decimal; long: Decimal}) {
	if(regionData == null){
		console.log("Region Data was not loaded, load it before using it!")
		return;
	}
    const pointGeometry = point([Number(inputPoint.long), Number(inputPoint.lat)]);
 
    for (const feature of regionData.features) {
		// Ensure feature geometry is a Polygon or MultiPolygon
		if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
			if (booleanPointInPolygon(pointGeometry, feature as Feature<Polygon | MultiPolygon>)) {
				return feature.properties?.NAME;
			}
		}
	}

    return null; // No region found
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
