// src/hooks.server.ts
import { auth } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { error, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get("session_token");
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const {session, user, role} = await auth.validateSession(sessionId);

	if(session != null && user != null){
		try{
			const now = new Date();
			// Throttle session writes to avoid update conflicts on concurrent requests.
			const minSessionAgeMs = 30_000;
			const sessionCutoff = new Date(now.getTime() - minSessionAgeMs);
			await prisma.session.updateMany({
				where:{
					id: session.id,
					OR: [
						{ last_use: { lt: sessionCutoff } },
						{ last_use: null }
					]
				},
				data: {
					last_use: now,
					ip: event.getClientAddress()
				}
			});
			// Avoid hammering the user row on every request and reduce update conflicts.
			const minPingAgeMs = 60_000;
			const cutoff = new Date(now.getTime() - minPingAgeMs);
			await prisma.user.updateMany({
				where: {
					username: user.username,
					lastPing: { lt: cutoff }
				},
				data: {
					lastPing: now,
				}
			});
		}catch(error_message){
			if (error_message instanceof Error) {
				console.log(error_message)
				if(error_message.name != "PrismaClientUnknownRequestError"){
					error(500, {
						message: 'ERROR'
					});
				}
			} else {
				error(500, {
					message: 'ERROR'
				});
			}
		}
	}



	event.locals.user = user;
	event.locals.session = session;
	event.locals.role = role;
	return resolve(event);
}
