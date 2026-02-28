import { prisma } from '$lib/server/prisma';
import { error, fail } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import DOMPurify from 'isomorphic-dompurify';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	let requestedUsername = event.url.searchParams.get('username');
	let requestedSearch = event.url.searchParams.get('search');
	const minimumSearchLength = 3;

	if(requestedSearch != null) {
		if (!event.locals.user) {
			throw error(401, {
				message: 'Authentication required.'
			});
		}

		requestedSearch = requestedSearch.trim();
		if (!event.locals.role?.canEnumerateAllUsers && requestedSearch.length < minimumSearchLength) {
			throw error(400, {
				message: `Search query must be at least ${minimumSearchLength} characters.`
			});
		}

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
		if (event.locals.user?.username == requestedUsername || event.locals.role?.canViewAllUserdata) {
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

		if(!event.locals.role?.canEditOwnUser) {
			return error(401, 'You are not allowed to change your own userdata!');
		}

		if(usernameToChange != null){
			if(usernameToChange != username && !event.locals.role?.canEditAllUser){
				return error(401, 'Only changing your own userdata is allowed!');
			}
		} else {
			usernameToChange = username;
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
						OR: [{
								crew: {
								some: {
									username: usernameToChange
								}
							}
						},
							{
								skipperName: usernameToChange
							}
						]
						
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
						username: usernameToChange,
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
						skipperName: usernameToChange
					}
				});
			}
		} catch (error_message) {
			error(400, {message: 'Invalid activeTrip! Only the skipper can choose a trip as active!'});
		}

		await prisma.user.update({
			where: {
				username: usernameToChange
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

export async function POST(event) {
	let firstName = null;
	let lastName = null;
	let unparsedDateOfBirth = null;
	let usernameToCreate = null;
	let dateOfBirth = null;
	let description = null;
	let password = null;
	let role = null;
	let email = null;
	let parsedRole = null;
	let magicLink = null;

	if (event.locals.role?.canCreateUser) {
		const usernameRegex = /^[a-zA-Z0-9_-]+$/;
		const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
		const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,255}$/;
		let requestData: Record<string, unknown> = {};

		const contentType = event.request.headers.get('content-type') ?? '';
		try {
			if (contentType.includes('application/json')) {
				requestData = await event.request.json();
			} else {
				const formData = await event.request.formData();
				requestData = Object.fromEntries(formData.entries());
			}
		} catch {
			return error(400, 'Invalid request body!');
		}

		firstName = typeof requestData.firstName === 'string' ? requestData.firstName : null;
		usernameToCreate = typeof requestData.username === 'string' ? requestData.username : null;
		lastName = typeof requestData.lastName === 'string' ? requestData.lastName : null;
		unparsedDateOfBirth = typeof requestData.dateOfBirth === 'string' ? requestData.dateOfBirth : null;
		role = typeof requestData.role === 'string' ? requestData.role : null;
		description = typeof requestData.description === 'string' ? requestData.description : null;
		email = typeof requestData.email === 'string' ? requestData.email : null;
		password = typeof requestData.password === 'string' ? requestData.password : null;
		magicLink = typeof requestData.magicLink === 'string' ? requestData.magicLink : null;

		if(!event.locals.role?.canCreateUser) {
			return error(401, 'You are not allowed to create users!');
		}

		if(usernameToCreate == null || usernameToCreate == "") {
			return error(400, 'No username given! Please choose a username for the user!');
		} else {
			if(!usernameRegex.test(usernameToCreate)){
				return error(400, 'Invalid username!');
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

		if(role == null || role == "") {
			return error(400, 'No role given! Please choose a role for the user!');
		}

		try{
			parsedRole = await prisma.role.findUniqueOrThrow({
				where: {
					id: role
				}
			});
		} catch (error_message) {
			return error(400, 'Invalid role! Please choose a valid role for the user!');
		}

		if(email != null && email != "") {
			if (typeof email !== 'string' || email.length < 4 || email.length > 31) {
				error(400, 'Email must be between 4 an 31 characters!');
			} else {
				email = email.toLocaleLowerCase();
			}

			if (!emailRegex.test(email)) {
				error(400, 'Invalid email!');
			}
		}

		let passwordHash = null;
		if (password != null && password != "") {
			if (typeof password !== 'string' || password.length < 8 || password.length > 255) {
				error(400, 'Password must be between 8 and 255 characters Password!');
			} else if (!passwordRegex.test(password)) {
				error(400, 'Password must contain 1 Number; 1 lowercase Letter; 1 uppercase Letter 1; special character!');
			}

			passwordHash = await hash(password, {
				// recommended minimum parameters
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});
		}
		if (description != null) {
			try {
				description = DOMPurify.sanitize(description);
			} catch (error_message) {
				return error(400, 'Invalid description!');
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

		let secretString = null;
		let magicId = null;

		if(magicLink != null && magicLink != "") {
			magicId = magicLink.split(".")[0];
			const secret = magicLink.split(".")[1];
			const secretBytes = new TextEncoder().encode(secret);
			const secretHashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
			const hashedSecret = new Uint8Array(secretHashBuffer);
			secretString = Array.from(hashedSecret!).map(byte => byte.toString(16).padStart(2, '0')).join('');
		} else {
			magicLink = null;
		}

		if(!(passwordHash != null || magicLink != null)) {
			error(400, { message: 'User has to use magic Link or Password!' });
		}

		try {
			let keyData = [];
			if (passwordHash) {
				keyData.push({
					passwordHash: passwordHash,
					type: 'email',
					primary: true
				})
			}

			if (magicLink) {
				keyData.push({
					id: magicId!,
					passwordHash: secretString,
					type: 'magicLink',
					primary: passwordHash ? false : true
				});
			}
			
			await prisma.user.create({
				data: {
					username: usernameToCreate,
					...(email && { email: email }),
					...(dateOfBirth && { dateOfBirth }),
					...(firstName && { firstName }),
					...(lastName && { lastName }),
					...(role && { roleId: parsedRole.id}),
					key: {
						createMany: {
							data: keyData
						}
					}
				}
			});
			return new Response('200');
		} catch (tryError) {
			if (tryError instanceof Error) {
				tryError.message = tryError.message.replace(/(\r\n|\n|\r)/gm, '');
				tryError.message = tryError.message.replace('Invalid `prisma.user.create()` invocation:', '');

				// Email already used
				tryError.message = tryError.message.replace(
					'Unique constraint failed on the fields: (`email`)',
					'Email already used!'
				);

				// Username already used
				tryError.message = tryError.message.replace(
					'Unique constraint failed on the constraint: `PRIMARY`',
					'Username already used!'
				);

				error(422, tryError.message);
			} else {
				error(500, 'ERROR');
			}
		}
	} else {
		error(401, 'Not allowed!');
	}
}
