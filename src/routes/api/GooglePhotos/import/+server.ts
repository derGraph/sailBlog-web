import { prisma } from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

type PickerRuntimeCtx = {
	tripId: string;
	visibility: number;
	username: string;
	sessionId: string;
	accessToken: string;
};

async function getEditableTrip(event: any, tripId: string) {
	if (event.locals.role?.canEditAllTrips) {
		return await prisma.trip.findFirst({
			where: { id: tripId, deleted: false },
			select: { id: true, visibility: true }
		});
	}
	if (event.locals.role?.canEditOwnTrips && event.locals.user?.username) {
		return await prisma.trip.findFirst({
			where: {
				id: tripId,
				deleted: false,
				OR: [
					{
						crew: {
							some: {
								username: event.locals.user.username
							}
						}
					},
					{
						skipperName: event.locals.user.username
					}
				]
			},
			select: { id: true, visibility: true }
		});
	}
	return null;
}

async function getPickerSession(accessToken: string, sessionId: string) {
	const response = await fetch(`https://photospicker.googleapis.com/v1/${sessionId}`, {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});
	if (!response.ok) {
		throw new Error(`Failed to read picker session: ${response.status}`);
	}
	return await response.json();
}

async function listPickedItems(accessToken: string, sessionId: string) {
	const items: any[] = [];
	let pageToken: string | undefined = undefined;
	do {
		const endpoint = new URL(`https://photospicker.googleapis.com/v1/mediaItems`);
		endpoint.searchParams.set('sessionId', sessionId);
		if (pageToken) {
			endpoint.searchParams.set('pageToken', pageToken);
		}
		const response = await fetch(endpoint.toString(), {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});
		if (!response.ok) {
			throw new Error(`Failed to list picked items: ${response.status}`);
		}
		const payload = await response.json();
		items.push(...(payload.mediaItems ?? []));
		pageToken = payload.nextPageToken;
	} while (pageToken);

	return items;
}

async function closeSession(accessToken: string, sessionId: string) {
	await fetch(`https://photospicker.googleapis.com/v1/${sessionId}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});
}

export async function POST(event) {
	const pickerSessionId = event.url.searchParams.get('pickerSessionId');

	if (!event.locals.user?.username) {
		return error(401, { message: 'Log in first!' });
	}
	if (!event.locals.role?.canAddMedia) {
		return error(403, { message: 'You are not allowed to import media!' });
	}
	if (!pickerSessionId) {
		return error(400, { message: 'pickerSessionId is required.' });
	}

	const runtimeRaw = event.cookies.get('google_photos_picker_runtime');
	if (!runtimeRaw) {
		return error(400, { message: 'Missing picker runtime context. Start import again.' });
	}

	let runtime: PickerRuntimeCtx;
	try {
		runtime = JSON.parse(decodeURIComponent(runtimeRaw)) as PickerRuntimeCtx;
	} catch {
		return error(400, { message: 'Invalid picker runtime context.' });
	}

	if (runtime.sessionId !== pickerSessionId) {
		return error(400, { message: 'Session mismatch. Start import again.' });
	}
	if (runtime.username !== event.locals.user.username) {
		return error(401, { message: 'Session changed. Start import again.' });
	}

	const trip = await getEditableTrip(event, runtime.tripId);
	if (!trip) {
		return error(403, { message: 'Trip not found or not editable.' });
	}

	const visibility = Math.min(runtime.visibility, trip.visibility);
	const accessToken = runtime.accessToken;

	let session: any;
	try {
		session = await getPickerSession(accessToken, runtime.sessionId);
	} catch (exception: any) {
		return error(502, { message: exception?.message ?? 'Unable to read picker session.' });
	}

	if (!session?.mediaItemsSet) {
		return json(
			{
				ready: false,
				message: 'Picker selection is not complete yet. Please finish selection in Google Photos.'
			},
			{ status: 409 }
		);
	}

	let imported = 0;
	let duplicates = 0;
	let nonImages = 0;
	let failed = 0;
	let total = 0;

	try {
		const existing = await prisma.media.findMany({
			where: {
				tripId: runtime.tripId,
				alt: {
					not: null
				}
			},
			select: {
				alt: true
			}
		});
		const existingPhotoIds = new Set(existing.map((item) => item.alt).filter(Boolean) as string[]);
		const items = await listPickedItems(accessToken, runtime.sessionId);

		for (const item of items) {
			total += 1;
			if (!item?.id || !item?.mediaFile?.baseUrl || !item?.mediaFile?.mimeType) {
				failed += 1;
				continue;
			}
			if (!String(item.mediaFile.mimeType).startsWith('image/')) {
				nonImages += 1;
				continue;
			}
			if (existingPhotoIds.has(item.id)) {
				duplicates += 1;
				continue;
			}

			let mediaRecord: { id: string; username: string } | null = null;
			try {
				const imageResponse = await fetch(`${item.mediaFile.baseUrl}=d`, {
					headers: {
						Authorization: `Bearer ${accessToken}`
					}
				});
				if (!imageResponse.ok) {
					failed += 1;
					continue;
				}
				const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

				let created: Date | undefined = undefined;
				if (item.createTime) {
					const parsedDate = new Date(item.createTime);
					if (!Number.isNaN(parsedDate.getTime())) {
						created = parsedDate;
					}
				}

				mediaRecord = await prisma.media.create({
					data: {
						username: event.locals.user.username,
						tripId: runtime.tripId,
						visibility,
						alt: item.id,
						...(created ? { created } : {})
					},
					select: {
						id: true,
						username: true
					}
				});

				const userDir = path.join('store', mediaRecord.username);
				if (!existsSync(userDir)) {
					mkdirSync(userDir, { recursive: true });
				}
				const targetPath = path.join(userDir, `${mediaRecord.id}.avif`);
				await sharp(imageBuffer)
					.resize({
						width: 2000,
						height: 2000,
						fit: 'inside',
						withoutEnlargement: true
					})
					.avif({ lossless: false, quality: 50, effort: 2 })
					.toFile(targetPath);

				existingPhotoIds.add(item.id);
				imported += 1;
			} catch {
				if (mediaRecord?.id) {
					await prisma.media.delete({
						where: { id: mediaRecord.id }
					});
				}
				failed += 1;
			}
		}

		await closeSession(accessToken, runtime.sessionId);
		event.cookies.set('google_photos_picker_runtime', '', {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 0
		});

		return json({
			ready: true,
			imported,
			duplicates,
			nonImages,
			failed,
			total
		});
	} catch (exception: any) {
		return error(500, { message: exception?.message ?? 'Import failed.' });
	}
}
