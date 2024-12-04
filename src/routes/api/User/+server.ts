import { prisma } from '$lib/server/prisma';
import { error, fail } from '@sveltejs/kit';
import DOMPurify from 'isomorphic-dompurify';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	let requestedUsername = event.url.searchParams.get('username');
	let requestedSearch = event.url.searchParams.get('search');

	if(requestedSearch != null) {
		let userlist = await prisma.user.findMany({
			where: {
				username: {
					contains: requestedSearch
				}
			},
			take: 10,
			select: {
				username: true
			}
		});
		return new Response(JSON.stringify(userlist.map((user)=>{
			return user.username
		})));
	}

	if (requestedUsername == null || requestedUsername == '') {
		error(400, {
			message: 'No username requested!'
		});
	}

	try {
		if (event.locals.user?.username == requestedUsername) {
			let userdata = await prisma.user.findFirstOrThrow({
				where: {
					username: event.locals.user?.username
				},
				include: {
					uploadedMedia: true,
					profilePicture: true,
					skipperedTrips: true,
					crewedTrips: true,
					key: true
				}
			});
			const { username, ...results } = userdata;
			return new Response(JSON.stringify({ [userdata.username]: results }));
		} else if (event.locals.user) {
			let userdata = await prisma.user.findFirstOrThrow({
				where: {
					username: requestedUsername
				},
				select: {
					username: true,
					firstName: true,
					lastName: true,
					description: true,
					profilePicture: true,
					profilePictureId: true,
					crewedLengthMotor: true,
					crewedLengthSail: true,
					skipperedLengthMotor: true,
					skipperedLengthSail: true,
					skipperedTrips: {
						where: {
							OR: [
								{visibility: 1},
								{visibility: 2}
							]
						}
					},
					crewedTrips: {
						where: {
							OR: [
								{visibility: 1},
								{visibility: 2}
							]
						}
					}
				}
			});

			const { username, ...results } = userdata;
			return new Response(JSON.stringify({ [userdata.username]: results }));
		} else {
			let userdata = await prisma.user.findFirstOrThrow({
				where: {
					username: requestedUsername
				},
				select: {
					username: true,
					profilePicture: true,
					description: true,
					crewedLengthMotor: true,
					crewedLengthSail: true,
					skipperedLengthMotor: true,
					skipperedLengthSail: true,
					skipperedTrips: {
						where: {
							visibility: 2
						}
					},
					crewedTrips: {
						where: {
							visibility: 2
						}
					}
				}
			});
			const { username, ...results } = userdata;
			return new Response(JSON.stringify({ [userdata.username]: results }));
		}
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

export async function PUT(event) {
	let firstName = null;
	let lastName = null;
	let unparsedDateOfBirth = null;
	let usernameToChange = null;
	let dateOfBirth = null;
	let description = null;
	let activeTripId = null;
	let activeTrip = null;
	let profilePictureId = null;

	if (event.locals.user?.username) {
		let username = event.locals.user?.username;
		const usernameRegex = /^[a-zA-Z0-9_-]+$/;
		const mardownRegex =
			/(((\|)([a-zA-Z\d+\s#!@'"():;\\\/.\[\]\^<={$}>?(?!-))]+))+(\|))(?:\n)?((\|)(-+))+(\|)(\n)((\|)(\W+|\w+|\S+))+(\|$)/;
		firstName = event.url.searchParams.get('firstName');
		usernameToChange = event.url.searchParams.get("username");
		lastName = event.url.searchParams.get('lastName');
		unparsedDateOfBirth = event.url.searchParams.get('dateOfBirth');
		description = event.url.searchParams.get('description');
		activeTripId = event.url.searchParams.get('activeTrip');
		profilePictureId = event.url.searchParams.get('picture');

		if(usernameToChange != null){
			if(usernameToChange != username){
				return error(400, 'Only changing your own userdata is allowed!');
			}
		}

		if (
			firstName != null &&
			(typeof firstName !== 'string' ||
				firstName.length < 3 ||
				firstName.length > 31 ||
				!usernameRegex.test(firstName))
		) {
			return error(400, 'Invalid first Name!');
		}
		if (
			lastName != null &&
			(typeof lastName !== 'string' ||
				lastName.length < 3 ||
				lastName.length > 31 ||
				!usernameRegex.test(lastName))
		) {
			return error(400, 'Invalid last Name!');
		}
		if (description != null) {
			try {
				description = DOMPurify.sanitize(description);
			} catch (error_message) {
				return error(400, 'Invalid description!');
			}
		}

		if(activeTripId != null) {
			try {
				await prisma.trip.findFirstOrThrow({
					where: {
						id: activeTripId,
						crew: {
							some: {
								username: username
							}
						}
					}
				});
			} catch (error_message) {
				return error(400, 'Invalid trip!');
			}
		}

		try {
			if (unparsedDateOfBirth != null) {
				dateOfBirth = new Date(parseInt(unparsedDateOfBirth));
			} else {
				dateOfBirth = null;
			}
		} catch (error_message) {
			error(400, { message: 'Invalid Date of Birth!' });
		}

		try {
			if(profilePictureId != null){
				await prisma.media.findFirstOrThrow({
					where: {
						username: username,
						id: profilePictureId
					}
				});
			}
		} catch (error_message) {
			profilePictureId = null;
			error(400, { message: 'Invalid Picture: ' + error_message });
		}

		try {
			if(activeTrip){
				await prisma.trip.findFirstOrThrow({
					where: {
						id: activeTrip,
						skipperName: username
					}
				});
			}
		} catch (error_message) {
			error(400, {message: 'Invalid activeTrip! Only the skipper can choose a trip as active!'});
		}

		await prisma.user.update({
			where: {
				username: username
			},
			data: {
				...(dateOfBirth && { dateOfBirth }),
				...(firstName && { firstName }),
				...(lastName && { lastName }),
				...(description && { description }),
				...(activeTripId && {activeTripId}),
				...(profilePictureId && {profilePictureId})
			}
		});
		return new Response('200');
	} else {
		error(401, 'Not logged in!');
	}
}
