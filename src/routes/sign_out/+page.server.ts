import { auth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';


export const load = async ({ locals, cookies }) => {
	if (locals.session == null) {
		redirect(302, '/');
	}
	await auth.invalidateSession(locals.session.id);
	let { session, user, role} = await auth.validateSession(locals.session.id);

	cookies.set("session_token", "", {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		expires: new Date(0)
	});

	if (session == null && user == null && role == null) {
		return { confirmed: true };
	} else {
		return { confirmed: false };
	}
};
