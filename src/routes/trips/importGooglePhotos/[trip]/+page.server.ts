import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	return {
		requestedTrip: event.params.trip,
		googlePhotosConfigured: Boolean(
			process.env.GOOGLE_PHOTOS_CLIENT_ID &&
			process.env.GOOGLE_PHOTOS_CLIENT_SECRET
		)
	};
};

