import { prisma } from '$lib/server/prisma';

export async function load({ locals }) {
	if (locals.user != null) {
		let user = await prisma.user.findFirst({
			where: {
				username: locals.user.username
			},
			include: {
				role: true
			}
		});
		return {
			user: user,
			role: user?.role,
			session: locals.session
		};
	} else {
		return {
			user: null,
			session: null
		};
	}
}
