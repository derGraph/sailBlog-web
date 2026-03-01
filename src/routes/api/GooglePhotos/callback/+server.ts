import { prisma } from '$lib/server/prisma';
import { error, redirect } from '@sveltejs/kit';

type PickerCtx = {
	tripId: string;
	visibility: number;
	maxItemCount: number;
	username: string;
	state: string;
};

type PickerRuntimeCtx = {
	tripId: string;
	visibility: number;
	username: string;
	sessionId: string;
	accessToken: string;
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

async function createPickerSession(accessToken: string, maxItemCount: number) {
	const response = await fetch('https://photospicker.googleapis.com/v1/sessions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			pickingConfig: {
				maxItemCount: String(maxItemCount)
			}
		})
	});
	if (!response.ok) {
		const details = await response.text();
		throw new Error(`Failed to create picker session: ${response.status} ${details}`);
	}
	return await response.json();
}

export async function GET(event) {
	const googleError = event.url.searchParams.get('error');
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');

	const rawCtx = event.cookies.get('google_photos_picker_ctx');
	event.cookies.set('google_photos_picker_ctx', '', {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 0
	});

	if (!rawCtx) {
		return error(400, { message: 'Missing import context.' });
	}

	let ctx: PickerCtx;
	try {
		ctx = JSON.parse(decodeURIComponent(rawCtx)) as PickerCtx;
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

	try {
		const accessToken = await exchangeCodeForToken(event, code);
		const pickerSession = await createPickerSession(accessToken, ctx.maxItemCount);

		if (!pickerSession?.id || !pickerSession?.pickerUri) {
			throw new Error('Picker session response missing id or pickerUri.');
		}

		const runtime: PickerRuntimeCtx = {
			tripId: ctx.tripId,
			visibility: Math.min(ctx.visibility, trip.visibility),
			username: event.locals.user.username,
			sessionId: pickerSession.id,
			accessToken
		};

		event.cookies.set('google_photos_picker_runtime', encodeURIComponent(JSON.stringify(runtime)), {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 20
		});

		throw redirect(
			302,
			pageRedirect(ctx.tripId, {
				pickerSessionId: pickerSession.id,
				pickerUri: pickerSession.pickerUri
			})
		);
	} catch (exception: any) {
		if (exception?.status && exception?.location) {
			throw exception;
		}
		throw redirect(302, pageRedirect(ctx.tripId, { importError: exception?.message ?? 'Picker setup failed.' }));
	}
}
