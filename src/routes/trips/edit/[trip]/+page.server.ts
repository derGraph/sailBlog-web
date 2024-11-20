import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let trip = event.params.trip;
	return {
		requestedTrip: trip,
		session: null
	};
};
