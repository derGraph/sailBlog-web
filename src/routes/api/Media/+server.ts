import { prisma } from '$lib/server/prisma';
import { error, fail } from '@sveltejs/kit';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import exif from 'exif-reader';

interface Media {
	id: string;
	visibility: number;
	username: string;
}

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	if (!event.request.headers.get('content-type')?.includes('image/')) {
		error(400, {
			message: 'Set Header to image/filetype!'
		});
	}
	let unparsedVisibility = event.url.searchParams.get('visibility');
	let alt = event.url.searchParams.get('alt');
	let tripId = event.url.searchParams.get('tripId');
	let visibility = 1;

	if (unparsedVisibility != null) {
		switch (unparsedVisibility) {
			case '0':
				visibility = 0;
				break;

			case '1':
				visibility = 1;
				break;

			case '2':
				visibility = 2;
				break;

			default:
				visibility = 1;
				break;
		}
	}

	if (!event.locals.user?.username) {
		console.log('NOT LOGGED IN!');
		return error(401, {
			message: 'Log in first!'
		});
	}

	if (!event.locals.role?.canAddMedia) {
		return error(401, {
			message: 'You are not allowed to upload Media!'
		});
	}

	if (tripId != null && tripId != '') {
		let trip = null;
		try {
			if (event.locals.role?.canEditAllTrips) {
				trip = await prisma.trip.findFirst({
					where: {
						id: tripId
					}
				});
			} else if (event.locals.role?.canEditOwnTrips) {
				trip = await prisma.trip.findFirst({
					where: {
						id: tripId,
						OR: [{
							crew: {
								some: {
									username: event.locals.user.username
								}
							}
						},{
							skipperName: event.locals.user.username
						}]
					}
				});
			} else {
				return error(401, { message: 'You are not allowed to attach media to trips!' });
			}
		} catch (exception: any) {
			error(500, {message: exception.toString()})
		}
		if (trip == undefined) {
			tripId = null;
			error(400, {message: "Trip not found or not allowed!"});
		}
	} else {
		tripId = null;
	}

	let media:Media = {
		id: '',
		visibility: 0,
		username: ''
	};

	try {
		const arrayBuffer = await event.request.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		let inputImage = await sharp(buffer);
		let metadata = await inputImage.metadata();

		let exifData: null|Object = null;

		if (metadata.exif) {
			let exifReader = exif(metadata.exif);
			let lat = null;
			let long = null;
			let timestamp = null;

			if (exifReader.GPSInfo) {
				lat = exifReader.GPSInfo.GPSLatitude![0] + exifReader.GPSInfo.GPSLatitude![1]/60 + exifReader.GPSInfo.GPSLatitude![2]/3600;
				if(exifReader.GPSInfo.GPSLatitudeRef === "S") {
					lat = -lat;
				}

				long = exifReader.GPSInfo.GPSLongitude![0] + exifReader.GPSInfo.GPSLongitude![1]/60 + exifReader.GPSInfo.GPSLongitude![2]/3600;
				if(exifReader.GPSInfo.GPSLongitudeRef === "W") {
					long = -long;
				}

				if(exifReader.GPSInfo.GPSDateStamp) {
					timestamp = new Date(Date.parse(exifReader.GPSInfo.GPSDateStamp.replaceAll(":", "-") + "T" +
											String(exifReader.GPSInfo.GPSTimeStamp![0]).padStart(2, '0') + ":" +
											String(exifReader.GPSInfo.GPSTimeStamp![1]).padStart(2, '0') + ":" +
											String(exifReader.GPSInfo.GPSTimeStamp![2]).padStart(2, '0') + "Z"));
				}
			}

			exifData = {
				...(exifReader.GPSInfo && {
					lat: lat,
					long: long,
					...(exifReader.GPSInfo.GPSTimeStamp && {
						created: timestamp
					})
				}),
				...(exifReader.Photo?.DateTimeOriginal && {
					created: exifReader.Photo.DateTimeOriginal
				})
			};
		}

		if (metadata.format == 'svg') {
			if (metadata.width == undefined) metadata.width = 0;
			if (metadata.width <= 2000) {
				inputImage = await inputImage.resize(2000);
			}
		}

		media = await prisma.media.create({
			data: {
				username: event.locals.user?.username,
				visibility: visibility,
				...(alt && {alt}),
				...(exifData && exifData),
				...(tripId && {tripId: tripId})
			}
		});

		let filePath = path.join('store', media.username);
		if (!existsSync(filePath)) {
			mkdirSync(filePath, {recursive: true});
		}

		filePath = path.join(filePath, media.id + '.avif');
		await inputImage.avif({ lossless: false, quality: 50 }).toFile(filePath);
	} catch (imageError) {
		if(media.id != ''){
			await prisma.media.delete({
				where: {
					id: media.id
				}
			});
		}
		if (imageError == 'Error: Input buffer contains unsupported image format') {
			error(415, {
				message: 'Only JPEG, PNG, WebP, GIF, AVIF, TIFF and SVG allowed!'
			});
		} else {
			if (imageError instanceof Object) {
				error(400, {
					message: imageError.toString()
				});
			} else {
				console.log(imageError);
			}
		}
	}

	return new Response('OK');
}

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	let requestedUsername = event.url.searchParams.get('username');
	let requestedTrip = event.url.searchParams.get('tripId');

	if ((requestedUsername == null || requestedUsername == '') && (requestedTrip == null || requestedTrip == null)) {
		error(400, {
			message: 'No username/trip requested!'
		});
	}

	try {
		if (requestedUsername != null && requestedUsername != "") {
			if (event.locals.user?.username == requestedUsername) {
				let results = <Media[]>(<unknown>await prisma.media.findMany({
					where: {
						username: event.locals.user?.username
					}
				}));
				return new Response(JSON.stringify(results));
			} else if (event.locals.role?.canSeeAllMedia) {
				let results = <Media[]>(<unknown>await prisma.media.findMany({
					where: {
						username: requestedUsername
					}
				}));
				return new Response(JSON.stringify(results));
			} else if (event.locals.user) {
				let returnMedia = await prisma.media.findMany({
					where: {
						username: requestedUsername,
						OR: [
							{
								visibility: 1
							},
							{
								visibility: 2
							}
						]
					}
				});
				var results: { [a: string]: any } = {};
				for (let media of returnMedia) {
					results[media.id] = {
						visibility: media.visibility,
						username: media.username,
						lat: media.lat,
						long: media.long,
						time: media.created,
						tripId: media.tripId
					};
				}
				return new Response(JSON.stringify(results));
			} else {
				let returnMedia = await prisma.media.findMany({
					where: {
						username: requestedUsername,
						visibility: 2
					}
				});
				var results: { [a: string]: any } = {};
				for (let media of returnMedia) {
					results[media.id] = {
						visibility: media.visibility,
						username: media.username
					};
				}
				return new Response(JSON.stringify(results));
			}
		} else if (requestedTrip != null && requestedTrip != "") {
			if (event.locals.role?.canSeeAllMedia) {
				let results = <Media[]>(<unknown>await prisma.media.findMany({
					where: {
						tripId: requestedTrip
					}
				}));
				return new Response(JSON.stringify(results));
			} else if (event.locals.user) {
				let returnMedia = await prisma.media.findMany({
					where: {
						tripId: requestedTrip,
						OR: [
							{
								visibility: 1
							},
							{
								visibility: 2
							}
						]
					}
				});
				var results: { [a: string]: any } = {};
				for (let media of returnMedia) {
					results[media.id] = {
						visibility: media.visibility,
						username: media.username,
						lat: media.lat,
						long: media.long,
						time: media.created,
						tripId: media.tripId
					};
				}
				return new Response(JSON.stringify(results));
			} else {
				let returnMedia = await prisma.media.findMany({
					where: {
						tripId: requestedTrip,
						visibility: 2
					}
				});
				var results: { [a: string]: any } = {};
				for (let media of returnMedia) {
					results[media.id] = {
						visibility: media.visibility,
						username: media.username,
						lat: media.lat,
						long: media.long,
						time: media.created,
						tripId: media.tripId
					};
				}
				return new Response(JSON.stringify(results));
			}
		}
		
	} catch (error_message) {
		if (error_message instanceof Error) {
			console.log(error_message);
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
