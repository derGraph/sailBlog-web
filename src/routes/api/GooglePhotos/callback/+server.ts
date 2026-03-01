import { prisma } from '$lib/server/prisma';
import { error, redirect } from '@sveltejs/kit';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

type GoogleImportCtx = {
	tripId: string;
	albumId: string;
	visibility: number;
	username: string;
	state: string;
};

function getRedirectUri(event: any) {
	return process.env.GOOGLE_PHOTOS_REDIRECT_URI ?? `${event.url.origin}/api/GooglePhotos/callback`;
}

function pageRedirect(tripId: string, params: Record<string, string | number>) {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		search.set(key, String(value));
	}
	return `/trips/importGooglePhotos/${tripId}?${search.toString()}`;
}

async function getEditableTrip(event: any, tripId: string) {
	if (event.locals.role?.canEditAllTrips) {
		return await prisma.trip.findFirst({
			where: { id: tripId, deleted: false },
			select: { id: true, visibility: true, skipperName: true }
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
			select: { id: true, visibility: true, skipperName: true }
		});
	}
	return null;
}

async function exchangeCodeForToken(event: any, code: string) {
	const clientId = process.env.GOOGLE_PHOTOS_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_PHOTOS_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error('Google Photos OAuth is not configured.');
	}

	const body = new URLSearchParams({
		code,
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uri: getRedirectUri(event),
		grant_type: 'authorization_code'
	});

	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body
	});

	if (!response.ok) {
		throw new Error(`Token exchange failed: ${response.status}`);
	}

	const tokenData = await response.json();
	if (!tokenData.access_token) {
		throw new Error('No access token returned by Google.');
	}
	return tokenData.access_token as string;
}

function normalizeSharedAlbumUrl(input: string) {
	try {
		const parsed = new URL(input);
		parsed.hash = '';
		return parsed.toString().replace(/\/$/, '');
	} catch {
		return input.trim().replace(/\/$/, '');
	}
}

async function resolveAlbumId(accessToken: string, albumInput: string) {
	const trimmed = albumInput.trim();
	if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
		return trimmed;
	}

	const targetUrl = normalizeSharedAlbumUrl(trimmed);
	let nextPageToken: string | undefined = undefined;
	do {
		const response = await fetch(
			`https://photoslibrary.googleapis.com/v1/sharedAlbums?pageSize=50${nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : ''}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		);
		if (!response.ok) {
			throw new Error(`Shared albums request failed: ${response.status}`);
		}
		const payload = await response.json();
		const sharedAlbums = (payload.sharedAlbums ?? []) as any[];
		for (const album of sharedAlbums) {
			const shareableUrl = album?.shareInfo?.shareableUrl;
			if (!shareableUrl || !album?.id) continue;
			const candidateUrl = normalizeSharedAlbumUrl(String(shareableUrl));
			if (candidateUrl === targetUrl) {
				return String(album.id);
			}
		}
		nextPageToken = payload.nextPageToken;
	} while (nextPageToken);

	throw new Error('Shared album URL not found in your Google Photos shared albums.');
}

export async function GET(event) {
	const googleError = event.url.searchParams.get('error');
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');

	const rawCtx = event.cookies.get('google_photos_import_ctx');
	event.cookies.set('google_photos_import_ctx', '', {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 0
	});

	if (!rawCtx) {
		return error(400, { message: 'Missing import context.' });
	}

	let ctx: GoogleImportCtx;
	try {
		ctx = JSON.parse(decodeURIComponent(rawCtx)) as GoogleImportCtx;
	} catch {
		return error(400, { message: 'Invalid import context.' });
	}

	if (googleError) {
		throw redirect(302, pageRedirect(ctx.tripId, { importError: `Google OAuth error: ${googleError}` }));
	}
	if (!event.locals.user?.username || event.locals.user.username !== ctx.username) {
		return error(401, { message: 'Session changed. Please try again.' });
	}
	if (!code || !state || state !== ctx.state) {
		throw redirect(302, pageRedirect(ctx.tripId, { importError: 'Invalid OAuth callback state.' }));
	}
	if (!event.locals.role?.canAddMedia) {
		return error(403, { message: 'You are not allowed to import media!' });
	}

	const trip = await getEditableTrip(event, ctx.tripId);
	if (!trip) {
		throw redirect(302, pageRedirect(ctx.tripId, { importError: 'Trip not found or not editable.' }));
	}
	const visibility = Math.min(ctx.visibility, trip.visibility);

	let imported = 0;
	let duplicates = 0;
	let nonImages = 0;
	let failed = 0;
	let total = 0;

	try {
		const accessToken = await exchangeCodeForToken(event, code);
		const albumId = await resolveAlbumId(accessToken, ctx.albumId);

		const existing = await prisma.media.findMany({
			where: {
				tripId: ctx.tripId,
				alt: {
					not: null
				}
			},
			select: {
				alt: true
			}
		});
		const existingPhotoIds = new Set(existing.map((item) => item.alt).filter(Boolean) as string[]);

		let nextPageToken: string | undefined = undefined;
		do {
			const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					albumId,
					pageSize: 100,
					...(nextPageToken ? { pageToken: nextPageToken } : {})
				})
			});

			if (!response.ok) {
				throw new Error(`Google Photos search failed: ${response.status}`);
			}
			const payload = await response.json();
			const items = (payload.mediaItems ?? []) as any[];
			nextPageToken = payload.nextPageToken;

			for (const item of items) {
				total += 1;
				if (!item?.id || !item?.baseUrl || !item?.mimeType) {
					failed += 1;
					continue;
				}
				if (!String(item.mimeType).startsWith('image/')) {
					nonImages += 1;
					continue;
				}
				if (existingPhotoIds.has(item.id)) {
					duplicates += 1;
					continue;
				}

				let mediaRecord: { id: string; username: string } | null = null;
				try {
					const imageResponse = await fetch(`${item.baseUrl}=d`, {
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
					if (item.mediaMetadata?.creationTime) {
						const parsedDate = new Date(item.mediaMetadata.creationTime);
						if (!Number.isNaN(parsedDate.getTime())) {
							created = parsedDate;
						}
					}

					mediaRecord = await prisma.media.create({
						data: {
							username: event.locals.user.username,
							tripId: ctx.tripId,
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
		} while (nextPageToken);
	} catch (exception: any) {
		throw redirect(302, pageRedirect(ctx.tripId, { importError: exception?.message ?? 'Import failed.' }));
	}

	throw redirect(302, pageRedirect(ctx.tripId, { imported, duplicates, nonImages, failed, total }));
}
