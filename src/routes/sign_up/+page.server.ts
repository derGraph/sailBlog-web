import { auth } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
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
		const username = formData.get('username');
		const firstName = formData.get('firstName');
		const lastName = formData.get('lastName');
		const password = formData.get('password');
		let email = formData.get('email');

		const usernameRegex = /^[a-zA-Z0-9_-]+$/;
		const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
		const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,255}$/;

		try {
			// username must be between 4 ~ 31 characters, and only consists of lowercase letters, 0-9, -, and _
			// keep in mind some database (e.g. mysql) are case insensitive
			if (
				typeof username !== 'string' ||
				username.length < 3 ||
				username.length > 31 ||
				!usernameRegex.test(username)
			) {
				throw new Error('Invalid Username!');
			}
			if (
				typeof firstName !== 'string' ||
				firstName.length < 1 ||
				firstName.length > 31 ||
				!usernameRegex.test(firstName)
			) {
				throw new Error('Invalid first Name!');
			}
			if (
				typeof lastName !== 'string' ||
				lastName.length < 1 ||
				lastName.length > 31 ||
				!usernameRegex.test(lastName)
			) {
				throw new Error('Invalid last Name!');
			}
			if (typeof email !== 'string' || email.length < 4 || email.length > 31) {
				throw new Error('Email must be between 4 an 31 characters!');
			} else {
				email = email.toLocaleLowerCase();
			}
			if (!emailRegex.test(email)) {
				throw new Error('Invalid email!');
			}
			if (typeof password !== 'string' || password.length < 8 || password.length > 255) {
				throw new Error('Password must be between 8 and 255 characters Password!');
			} else if (!passwordRegex.test(password)) {
				throw new Error(
					'Password must contain 1 Number; 1 lowercase Letter; 1 uppercase Letter 1; special character!'
				);
			}

			const passwordHash = await hash(password, {
				// recommended minimum parameters
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			await prisma.role.upsert({
				create: {
					id: 'user'
				},
				update: {},
				where: {
					id: 'user'
				}
			});

			await prisma.user.create({
				data: {
					username: username,
					email: email,
					firstName: firstName,
					lastName: lastName,
					key: {
						createMany: {
							data: [
								{
									passwordHash: passwordHash,
									type: 'email',
									primary: true
								}
							]
						}
					}
				}
			});
			
		} catch (error) {
			if (error instanceof Error) {
				console.log(error);
				error.message = error.message.replace(/(\r\n|\n|\r)/gm, '');
				error.message = error.message.replace('Invalid `prisma.user.create()` invocation:', '');

				// Email already used
				error.message = error.message.replace(
					'Unique constraint failed on the fields: (`email`)',
					'Email already used!'
				);

				// Username already used
				error.message = error.message.replace(
					'Unique constraint failed on the fields: (`username`)',
					'Username already used!'
				);

				return fail(422, {
					error: error.message
				});
			} else {
				return fail(500, {
					error: 'ERROR'
				});
			}
		}

		const {id, secret} = await auth.createSession(username);
		
		
		event.cookies.set("session_token", id+"."+secret, {
			path: '/',
			httpOnly: true,
			secure: true,
			expires: new Date(Date.now() + 90*1000*60*60*24)
		});
		
		await prisma.session.update({
			where:{
				id: id
			},
			data: {
				last_use: new Date(Date.now()),
				ip: event.getClientAddress(),
				session_created: new Date(Date.now())
			}
		});

		redirect(302, '/');
	}
};
