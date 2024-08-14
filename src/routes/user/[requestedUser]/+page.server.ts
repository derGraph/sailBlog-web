import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	let requestedUser = params.requestedUser;
	return {
		requestedUser: requestedUser,
		session: null
	};
}
