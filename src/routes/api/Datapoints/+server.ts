import { prisma } from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';

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

export async function POST(event: {
	request: { json: () => any };
	locals: { user: { username: any } };
	url: { searchParams: { get: (arg0: string) => any } };
}) {
	let input;
	try {
		input = await event.request.json();
	} catch (errorMessage: unknown) {
		let result = errorMessage as Error;
		error(400, result.name + ': ' + result.message);
	}

	if (event.locals.user?.username) {
		let username = event.locals.user?.username;
		let activeUser = await prisma.user.findFirstOrThrow({
			where: {
				username: username
			}
		});

		await prisma.user.update({
			where: {
				username: username
			},
			data: {
				lastPing: new Date()
			}
		});

		let datapoints: Datapoint[] = [];
		var results: { [k: string]: any } = {};
		let errorHappened = false;

		for (const k of Object.keys(input)) {
			try {
				input[k].id = k;
				if(k == ""){
					input[k].id = undefined;
				}
				let datapoint = checkDatapoint(input[k]);
				datapoint.tripId = activeUser.activeTripId;
				let existingPoint = null;
				if(datapoint.id){
					existingPoint = await prisma.datapoint.findFirst({
						where: { id: datapoint.id }
					});
				}
				if (existingPoint != null) {
					compareObjects(datapoint, existingPoint);
				}
				datapoints.push(datapoint);
				results[k] = 'OK';
			} catch (errorMessage) {
				if (errorMessage instanceof Error) {
					results[k] = errorMessage.name + ': ' + errorMessage.message;
					errorHappened = true;
				}
			}
		}

		if (errorHappened) {
			return json(results, { status: 400 });
		}

		try {
			await prisma.datapoint.createMany({ data: datapoints });
		} catch (errorMessage) {
			if (errorMessage instanceof Error) {
				return error(400, errorMessage.name + ': ' + errorMessage.message);
			} else {
				return error(400, 'Internal Error!');
			}
		}
		return json(results, { status: 200 });
	} else {
		error(401, 'Not logged in!');
	}
}

function checkDatapoint(rawData: {
	id: any;
	lat: any;
	long: any;
	time: any;
	speed: any;
	heading: any;
	depth: any;
	h_accuracy: any;
	v_accuracy: any;
	propulsion: any;
}) {
	let id = rawData.id;
	let lat = rawData.lat;
	let long = rawData.long;
	let unparesedTime = rawData.time;
	let speed = rawData.speed;
	let heading = rawData.heading;
	let depth = rawData.depth;
	let h_accuracy = rawData.h_accuracy;
	let v_accuracy = rawData.v_accuracy;
	let propulsion = rawData.propulsion;
	let time;

	const gpsRegex =
		/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
	if (lat == null) {
		throw new Error('Latitude required!');
	} else {
		if (gpsRegex.test(lat)) {
			throw new Error('Wrong Latitude format!');
		} else {
			lat = parseFloat(lat);
		}
	}

	if (long == null) {
		throw new Error('Longitude required!');
	} else {
		if (gpsRegex.test(long)) {
			throw new Error('Wrong Longitude format!');
		} else {
			long = parseFloat(long);
		}
	}

	const cuidRegex = /^c[a-z0-9]{24}$/;
	if (id != null) {
		if (!cuidRegex.test(id)) {
			id = null;
		}
	}

	try {
		if (unparesedTime != null) {
			time = new Date(parseInt(unparesedTime));
		} else {
			time = null;
		}
	} catch (error_message) {
		throw new Error('Invalid Timestamp!');
	}

	const decimalRegex = /^\d*\.?\d*$/;
	if (speed != null) {
		if (decimalRegex.test(speed)) {
			speed = parseFloat(speed);
		} else {
			throw new Error('Invalid speed!');
		}
	}
	if (heading != null) {
		if (decimalRegex.test(heading)) {
			heading = parseFloat(heading);
		} else {
			throw new Error('Invalid heading!');
		}
	}

	if (depth != null) {
		if (decimalRegex.test(depth)) {
			depth = parseFloat(depth);
		} else {
			throw new Error('Invalid depth!');
		}
	}

	if (h_accuracy != null) {
		if (decimalRegex.test(h_accuracy)) {
			h_accuracy = parseFloat(h_accuracy);
		} else {
			throw new Error('Invalid h_accuracy!');
		}
	}

	if (v_accuracy != null) {
		if (decimalRegex.test(v_accuracy)) {
			v_accuracy = parseFloat(v_accuracy);
		} else {
			throw new Error('Invalid v_accuracy!');
		}
	}

	if (propulsion != null) {
		switch (propulsion) {
			case 'anchor':
				propulsion = 0;
				break;

			case 'motor':
				propulsion = 1;
				break;

			case 'sailing':
				propulsion = 2;
				break;

			default:
				throw new Error('Invalid propulsion type!');
				break;
		}
	}
	let returnData: Datapoint = {
		...(id && { id }),
		...(time && { time }),
		lat: lat,
		long: long,
		...(speed !== null && speed !== undefined ? { speed } : {}),
		...(heading !== null && heading !== undefined ? { heading } : {}),
		...(depth !== null && depth !== undefined ? { depth } : {}),
		...(h_accuracy && { h_accuracy }),
		...(v_accuracy && { v_accuracy }),
		...(propulsion !== null && propulsion !== undefined ? { propulsion } : {})
	};
	return returnData;
}

function compareObjects(
	target: Datapoint,
	obj: {
		id: string;
		tripId?: any;
		time: any;
		lat: any;
		long: any;
		speed: any;
		heading: any;
		depth: any;
		h_accuracy: any;
		v_accuracy: any;
		propulsion: any;
	}
) {
	// Check if all properties match
	if (
		obj.lat == target.lat &&
		obj.long == target.long &&
		obj.time?.valueOf() == target.time?.valueOf() &&
		obj.speed == target.speed &&
		obj.heading == target.heading &&
		obj.depth == target.depth &&
		obj.h_accuracy == target.h_accuracy &&
		obj.v_accuracy == target.v_accuracy &&
		obj.propulsion == target.propulsion
	) {
		throw new Error('This element already exists with the same data!');
	} else {
		throw new Error(
			'This element already exists, with different data! Edit via Datapoint PUT-Request!'
		);
	}
	return;
}

export async function GET(event) {
	locals: { user: { username: String } };

	let requestedTrip = event.url.searchParams.get('tripId');
	let unparsed_start = event.url.searchParams.get('start');
	let unparsed_end = event.url.searchParams.get('end');
	let start = new Date(0);
	let end = new Date(Date.now());

	if (requestedTrip == null || requestedTrip == '') {
		error(400, {
			message: 'No tripId requested!'
		});
	}else{
		const cuidRegex = /^c[a-z0-9]{24}$/;
		if (requestedTrip != null) {
			if (!cuidRegex.test(requestedTrip)) {
				error(400, 'Invalid Id!');
			}
		}	
	}

	try{
		if (unparsed_start != null) {
			start = new Date(parseInt(unparsed_start));
		} else {
			start = new Date(0);
		}
	} catch (error_message) {
		error(400, { message: 'Invalid start Timestamp!' });
	}

	try{
		if (unparsed_end != null) {
			end = new Date(parseInt(unparsed_end));
		} else {
			end = new Date(Date.now());
		}
	} catch (error_message) {
		error(400, { message: 'Invalid end Timestamp!' });
	}
	
	try {
		if(!event.locals.user?.username){
			let tripData = await prisma.trip.findFirstOrThrow({
				where: {
					voyage: {
						public: true,
					}
				}
			});

		}
		let datapoints = await prisma.datapoint.findMany({
			where: {
				tripId: requestedTrip,
				time: {
					lte: end,
					gte: start,
				}
			}
		});
		let responseData: { [k: string]: any } = {};
		datapoints.forEach((datapoint) => {
			responseData[datapoint.id] = { ...datapoint, id: undefined };
		});
		return new Response(JSON.stringify(responseData));
	} catch (error_message) {
		if (error_message instanceof Error) {
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
