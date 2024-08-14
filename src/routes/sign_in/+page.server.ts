import { lucia } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { hash, verify } from '@node-rs/argon2';
import { prisma } from '$lib/server/prisma';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		redirect(302, '/');
	}
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const identifier = formData.get('identifier');
		const password = formData.get('password');

		const usernameRegex = /^[a-zA-Z0-9_-]+$/;
		const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
		const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,255}$/;

		let user;
		try {
			// username must be between 4 ~ 31 characters, and only consists of lowercase letters, 0-9, -, and _
			// keep in mind some database (e.g. mysql) are case insensitive
			if (
				typeof identifier !== 'string' ||
				identifier.length < 3 ||
				identifier.length > 31 ||
				!(usernameRegex.test(identifier) || emailRegex.test(identifier))
			) {
				throw new Error('Invalid Username/Email!');
			}
			if (typeof password !== 'string' || password.length < 8 || password.length > 255) {
				throw new Error('Password must be between 8 and 255 characters!');
			} else if (!passwordRegex.test(password)) {
				throw new Error(
					'Password must contain 1 Number; 1 lowercase Letter; 1 uppercase Letter 1; special character!'
				);
			}

			user = await prisma.user.findFirstOrThrow({
				where: {
					OR: [{ email: identifier.toLocaleLowerCase() }, { username: identifier }]
				},
				include: {
					key: true
				}
			});

			let passwordOk = false;
			for (const key of user.key) {
				if (key.type == 'email' && !passwordOk && key.passwordHash) {
					passwordOk = await verify(key.passwordHash, password, {
						memoryCost: 19456,
						timeCost: 2,
						outputLen: 32,
						parallelism: 1
					});
				}
			}
			if (!passwordOk) {
				throw new Error('Password not correct!');
			}
		} catch (error) {
			if (error instanceof Error) {
				return fail(422, {
					error: error.message
				});
			} else {
				return fail(500, {
					error: 'ERROR'
				});
			}
		}

		const session = await lucia.createSession(user.username, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});

		redirect(302, '/');
	}
};
