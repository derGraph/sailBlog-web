import { prisma } from '$lib/server/prisma';
import { error, fail } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */

export async function POST(event) {
	let id = null;
	let lat = null;
	let long = null;
	let time = null;
	let unparesedTime = null;
	let speed = null;
	let heading = null;
	let depth = null;
	let h_accuracy = null;
	let v_accuracy = null;
	let propulsion = null;

	if (event.locals.user?.username) {
		let username = event.locals.user?.username;
		id = event.url.searchParams.get('id');
		lat = event.url.searchParams.get('lat');
		long = event.url.searchParams.get('long');
		unparesedTime = event.url.searchParams.get('time');
		speed = event.url.searchParams.get('speed');
		heading = event.url.searchParams.get('heading');
		depth = event.url.searchParams.get('depth');
		h_accuracy = event.url.searchParams.get('h_accuracy');
		v_accuracy = event.url.searchParams.get('v_accuracy');
		propulsion = event.url.searchParams.get('propulsion');

		const gpsRegex =
			/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
		if (lat == null) {
			error(400, 'Latitude required!');
		} else {
			if (gpsRegex.test(lat)) {
				error(400, 'Wrong Latitude format!');
			} else {
				lat = parseFloat(lat);
			}
		}

		if (long == null) {
			error(400, 'Longitude required!');
		} else {
			if (gpsRegex.test(long)) {
				error(400, 'Wrong Longitude format!');
			} else {
				long = parseFloat(long);
			}
		}

		const cuidRegex = /^c[a-z0-9]{24}$/;
		if (id != null) {
			if (!cuidRegex.test(id)) {
				error(400, 'Invalid Id!');
			}
		}

		try {
			if (unparesedTime != null) {
				time = new Date(parseInt(unparesedTime));
			} else {
				time = null;
			}
		} catch (error_message) {
			error(400, { message: 'Invalid Timestamp!' });
		}

		const decimalRegex = /^\d*\.?\d*$/;
		if (speed != null) {
			if (decimalRegex.test(speed)) {
				speed = parseFloat(speed);
			} else {
				error(400, { message: 'Invalid speed!' });
			}
		}

		if (heading != null) {
			if (decimalRegex.test(heading)) {
				heading = parseFloat(heading);
			} else {
				error(400, { message: 'Invalid heading!' });
			}
		}

		if (depth != null) {
			if (decimalRegex.test(depth)) {
				depth = parseFloat(depth);
			} else {
				error(400, { message: 'Invalid depth!' });
			}
		}

		if (h_accuracy != null) {
			if (decimalRegex.test(h_accuracy)) {
				h_accuracy = parseFloat(h_accuracy);
			} else {
				error(400, { message: 'Invalid h_accuracy!' });
			}
		}

		if (v_accuracy != null) {
			if (decimalRegex.test(v_accuracy)) {
				v_accuracy = parseFloat(v_accuracy);
			} else {
				error(400, { message: 'Invalid v_accuracy!' });
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
					error(400, { message: 'Invalid propulsion type!' });
					break;
			}
		}

		let activeUser = await prisma.user.findFirstOrThrow({
			where: {
				username: username
			}
		});

		if(activeUser.activeTripId == null){
			error(400, { message: 'User has no active trip, select one or create trip!' });
		}


		await prisma.datapoint.create({
			data: {
				lat: lat,
				long: long,
				tripId: activeUser.activeTripId,
				...(id && { id }),
				...(time && { time }),
				...(speed && { speed }),
				...(heading && { heading }),
				...(depth && { depth }),
				...(h_accuracy && { h_accuracy }),
				...(v_accuracy && { v_accuracy }),
				...(propulsion && { propulsion })
			}
		});
		return new Response('200');
	} else {
		error(401, 'Not logged in!');
	}
}
