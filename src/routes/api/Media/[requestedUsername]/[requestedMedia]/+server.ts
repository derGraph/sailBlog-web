import { prisma } from '$lib/server/prisma';
import { error } from '@sveltejs/kit';
import { existsSync, mkdirSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/** @type {import('./$types').PageServerLoad} */
export async function GET(event) {
	let requestedUsername = event.params.requestedUsername;
	let requestedMedia = event.params.requestedMedia;

	if (requestedUsername == null || requestedUsername == '') {
		error(400, {
			message: 'No username requested!'
		});
	}

	if (requestedMedia == null || requestedMedia == '') {
		error(400, {
			message: 'No Media requested!'
		});
	}
	let requestedName = requestedMedia.split('.')[0];
	let requestedFiletype = requestedMedia.split('.')[1];
	try {
		if (event.locals.user?.username == requestedUsername) {
			await prisma.media.findFirstOrThrow({
				where: {
					username: event.locals.user?.username,
					id: requestedName
				}
			});
		} else if (event.locals.role?.canSeeAllMedia) {
			await prisma.media.findFirstOrThrow({
				where: {
					username: requestedUsername,
					id: requestedName
				}
			});
		} else if (event.locals.user?.username) {
			await prisma.media.findFirstOrThrow({
				where: {
					username: requestedUsername,
					id: requestedName,
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
		} else {
			await prisma.media.findFirstOrThrow({
				where: {
					username: requestedUsername,
					id: requestedName,
					visibility: 2
				}
			});
		}
	} catch (error_message) {
		if (error_message instanceof Error) {
			error(404, {
				message: 'Not Found!'
			});
		} else {
			error(500, {
				message: 'ERROR'
			});
		}
	}

	let filePath = path.join('store', requestedUsername, requestedName + '.avif');
	if (!existsSync(filePath)) {
		error(404, {
			message: 'File not found in server filesystem!'
		});
	}
	try {
		let buffer = null;

		if (requestedFiletype != 'avif') {
			buffer = await sharp(filePath).toFormat(convertFormatVariable(requestedFiletype)).toBuffer();
		} else {
			buffer = await readFile(filePath);
		}

		return new Response(buffer, {
			headers: {
				'Content-Type': 'image/' + requestedFiletype // or other appropriate content type
			}
		});
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
}

function convertFormatVariable(input: string) {
	let output = sharp.format.png;

	switch (input) {
		case 'avif':
			output = sharp.format.avif;
			break;
		case 'dz':
			output = sharp.format.dz;
			break;
		case 'fits':
			output = sharp.format.fits;
			break;
		case 'gif':
			output = sharp.format.gif;
			break;
		case 'heif':
			output = sharp.format.heif;
			break;
		case 'input':
			output = sharp.format.input;
			break;
		case 'jpeg':
		case 'jpg':
			output = sharp.format.jpeg;
			break;
		case 'jp2':
			output = sharp.format.jp2;
			break;
		case 'jxl':
			output = sharp.format.jxl;
			break;
		case 'magick':
			output = sharp.format.magick;
			break;
		case 'openslide':
			output = sharp.format.openslide;
			break;
		case 'pdf':
			output = sharp.format.pdf;
			break;
		case 'png':
			output = sharp.format.png;
			break;
		case 'ppm':
			output = sharp.format.ppm;
			break;
		case 'raw':
			output = sharp.format.raw;
			break;
		case 'svg':
			output = sharp.format.svg;
			break;
		case 'tiff':
		case 'tif':
			output = sharp.format.tiff;
			break;
		case 'v':
			output = sharp.format.v;
			break;
		case 'webp':
			output = sharp.format.webp;
			break;
		default:
			output = sharp.format.png;
	}

	return output;
}
