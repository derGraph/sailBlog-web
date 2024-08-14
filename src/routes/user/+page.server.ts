import { lucia } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';

export async function load({ locals }) {
	if (locals.user?.username) {
		redirect(302, '/user/' + locals.user?.username);
	} else {
		redirect(303, '/');
	}
}
