import { auth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';


export const load = async ({ locals, cookies }) => {
	if (locals.session == null) {
		redirect(302, '/');
	}
	await auth.invalidateSession(locals.session.id);
	let { session, user } = await auth.validateSession(locals.session.id);

	cookies.set("auth_session", "", { path: '/' });

	if (session == null && user == null) {
		return { confirmed: true };
	} else {
		return { confirmed: false };
	}
};
