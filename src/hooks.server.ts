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
			await prisma.session.update({
				where:{
					id: session.id
				},
				data: {
					last_use: new Date(Date.now()),
					ip: event.getClientAddress()
				}
			});
			await prisma.user.update({
				where: {
					username: user.username
				},
				data: {
					lastPing: new Date(Date.now()),
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
