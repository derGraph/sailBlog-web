import { prisma } from '$lib/server/prisma';
import { error, redirect } from '@sveltejs/kit';

function getRedirectUri(event: any) {
	return process.env.GOOGLE_PHOTOS_REDIRECT_URI ?? `${event.url.origin}/api/GooglePhotos/callback`;
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

export async function GET(event) {
	const clientId = process.env.GOOGLE_PHOTOS_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_PHOTOS_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		return error(500, { message: 'Google Photos OAuth is not configured.' });
	}

	if (!event.locals.user?.username) {
		return error(401, { message: 'Log in first!' });
	}
	if (!event.locals.role?.canAddMedia) {
		return error(403, { message: 'You are not allowed to import media!' });
	}

	const tripId = event.url.searchParams.get('tripId');
	const requestedVisibility = Number.parseInt(event.url.searchParams.get('visibility') ?? '1', 10);
	const requestedMaxItemCount = Number.parseInt(event.url.searchParams.get('maxItemCount') ?? '200', 10);

	if (!tripId) {
		return error(400, { message: 'tripId is required.' });
	}

	const trip = await getEditableTrip(event, tripId);
	if (!trip) {
		return error(403, { message: 'Trip not found or not editable.' });
	}

	let visibility = Number.isNaN(requestedVisibility) ? 1 : requestedVisibility;
	if (visibility < 0 || visibility > 2) visibility = 1;
	visibility = Math.min(visibility, trip.visibility);
	let maxItemCount = Number.isNaN(requestedMaxItemCount) ? 200 : requestedMaxItemCount;
	if (maxItemCount < 1) maxItemCount = 1;
	if (maxItemCount > 2000) maxItemCount = 2000;

	const state = crypto.randomUUID();
	const ctx = {
		tripId: trip.id,
		visibility,
		maxItemCount,
		username: event.locals.user.username,
		state
	};
	event.cookies.set('google_photos_picker_ctx', encodeURIComponent(JSON.stringify(ctx)), {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 10
	});

	const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('redirect_uri', getRedirectUri(event));
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly');
	authUrl.searchParams.set('include_granted_scopes', 'true');
	authUrl.searchParams.set('access_type', 'online');
	authUrl.searchParams.set('prompt', 'consent');
	authUrl.searchParams.set('state', state);

	throw redirect(302, authUrl.toString());
}
