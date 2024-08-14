import { lucia } from '$lib/server/auth';
import { error } from '@sveltejs/kit';

// This handler will respond to PUT, PATCH, DELETE, etc.
/** @type {import('./$types').RequestHandler} */
export async function fallback({ request }) {
	error(404, {
		message: 'Not found!'
	});
}
