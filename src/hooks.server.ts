// src/hooks.server.ts
import { lucia } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { error, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}
	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}else{
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
	return resolve(event);
};
