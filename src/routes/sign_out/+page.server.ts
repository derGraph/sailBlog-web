import { lucia } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

const sessionCookie = lucia.createBlankSessionCookie();

export const load = async ({ locals, cookies }) => {
	if (locals.session == null) {
		redirect(302, '/');
	}
	await lucia.invalidateSession(locals.session.id);
	let { session, user } = await lucia.validateSession(locals.session.id);
	cookies.set(sessionCookie.name, sessionCookie.value, { path: '/' });

	if (session == null && user == null) {
		return { confirmed: true };
	} else {
		return { confirmed: false };
	}
};
