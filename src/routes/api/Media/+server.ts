import { prisma } from '$lib/server/prisma';
import { error, fail } from '@sveltejs/kit';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
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
	const contentType = event.request.headers.get('content-type') ?? '';
	if (!contentType.includes('image/')) {
		error(400, {
			message: 'Set Header to image/filetype!'
		});
	}
	let unparsedVisibility = event.url.searchParams.get('visibility');
	let alt = event.url.searchParams.get('alt');
	let tripId = event.url.searchParams.get('tripId');
	let latParam = event.url.searchParams.get('lat');
	let longParam = event.url.searchParams.get('long');
	let createdParam = event.url.searchParams.get('created');
	let visibility = 1;
	let hasExplicitVisibility = false;
	let clientExifData: { lat?: number; long?: number; created?: Date } = {};

	if (unparsedVisibility != null) {
		hasExplicitVisibility = true;
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
	if (latParam != null && longParam != null) {
		const latNum = Number(latParam);
		const longNum = Number(longParam);
		if (Number.isFinite(latNum) && Number.isFinite(longNum) && Math.abs(latNum) <= 90 && Math.abs(longNum) <= 180) {
			clientExifData.lat = latNum;
			clientExifData.long = longNum;
		}
	}
	if (createdParam != null && createdParam !== '') {
		const createdDate = new Date(createdParam);
		if (!Number.isNaN(createdDate.getTime())) {
			clientExifData.created = createdDate;
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
		} else if (typeof trip.visibility === 'number') {
			// For trip media, explicit visibility can only be equal/more private than the trip visibility.
			visibility = hasExplicitVisibility ? Math.min(visibility, trip.visibility) : trip.visibility;
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
		const isAvif = contentType.includes('image/avif');

		let exifData: null|Object = null;
		let inputImage: sharp.Sharp | null = null;
		let metadata: sharp.Metadata | null = null;

		const shouldCheckMetadata = buffer.length > 500 * 1024;
		if (shouldCheckMetadata || !isAvif) {
			inputImage = await sharp(buffer);
			metadata = await inputImage.metadata();

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
		}

		const mergedExifData = {
			...clientExifData,
			...(exifData ?? {})
		};
		media = await prisma.media.create({
			data: {
				username: event.locals.user?.username,
				visibility: visibility,
				...(alt && {alt}),
				...(Object.keys(mergedExifData).length > 0 && mergedExifData),
				...(tripId && {tripId: tripId})
			}
		});

		let filePath = path.join('store', media.username);
		if (!existsSync(filePath)) {
			mkdirSync(filePath, {recursive: true});
		}

		filePath = path.join(filePath, media.id + '.avif');
		if (isAvif && (!metadata || metadata.format === 'avif')) {
			// Already AVIF: avoid recompression. If metadata wasn't checked (small file), trust content-type.
			writeFileSync(filePath, buffer);
		} else {
			if (!inputImage) {
				inputImage = await sharp(buffer);
			}
			// Resize before AVIF encode to reduce CPU cost for large uploads.
			inputImage = inputImage.resize({
				width: 2000,
				height: 2000,
				fit: 'inside',
				withoutEnlargement: true
			});
			await inputImage.avif({ lossless: false, quality: 50, effort: 2 }).toFile(filePath);
		}
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
