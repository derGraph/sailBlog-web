import { prisma } from '$lib/server/prisma';
import { error, fail } from '@sveltejs/kit';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

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
	console.log('HI');
	let unparsedVisibility = event.url.searchParams.get('visibility');
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

	try {
		const arrayBuffer = await event.request.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		let inputImage = await sharp(buffer);
		let metadata = await inputImage.metadata();
		if (metadata.format == 'svg') {
			if (metadata.width == undefined) metadata.width = 0;
			if (metadata.width <= 2000) {
				inputImage = await inputImage.resize(2000);
			}
		}
		let media = await prisma.media.create({
			data: {
				username: event.locals.user?.username,
				visibility: visibility
			}
		});

		let filePath = path.join('store', media.username);
		if (!existsSync(filePath)) {
			mkdirSync(filePath);
		}

		filePath = path.join(filePath, media.id + '.avif');
		inputImage.avif({ lossless: false, quality: 50 }).toFile(filePath);
	} catch (imageError) {
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

	if (requestedUsername == null || requestedUsername == '') {
		error(400, {
			message: 'No username requested!'
		});
	}

	try {
		if (event.locals.user?.username == requestedUsername) {
			let returnMedia = <Media[]>(<unknown>await prisma.media.findMany({
				where: {
					username: event.locals.user?.username
				}
			}));
			var results: { [a: string]: any } = {};
			for (let media of returnMedia) {
				results[media.id] = {
					visibility: media.visibility,
					username: media.username
				};
			}
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
					username: media.username
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
