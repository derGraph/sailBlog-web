import { auth } from '$lib/server/auth';
import { error, fail, redirect } from '@sveltejs/kit';
import { verify } from '@node-rs/argon2';
import { prisma } from '$lib/server/prisma';
import type { Actions, PageServerLoad } from './$types';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user && !event.url.searchParams.has("magicLink")) {
		redirect(302, '/');
	}
	if (event.url.searchParams.has("magicLink")) {
		let magicLink = event.url.searchParams.get("magicLink");
		const linkId = magicLink!.split(".")[0];
		const linkSecret = magicLink!.split(".")[1];
		const hashedSecret = await hashSecret(linkSecret);

		let key;
		try {
			
			key = await prisma.key.findFirstOrThrow({
				where: {
					id: linkId
				}
			});
		} catch (dbException) {
			if (dbException instanceof Error) {
				if(dbException.name == "PrismaClientKnownRequestError") {
					const prismaError = dbException as PrismaClientKnownRequestError;
					if(prismaError.code == 'P2025') {
						return error(400, 'Wrong magic link!');
					}
				}
			} else {
				return dbException;
			}
		}
		if (constantTimeEqual(hexStringToUint8Array(key!.passwordHash!), hashedSecret)) {
			await loginUser(event, key!.userId);
			return redirect(302, '/');
		} else {
			return error(400, 'Wrong magic link!');
		}
	}
};

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.byteLength !== b.byteLength) {
		return false;
	}
	let c = 0;
	for (let i = 0; i < a.byteLength; i++) {
		c |= a[i] ^ b[i];
	}
	return c === 0;
}

async function hashSecret(secret: string): Promise<Uint8Array> {
	const secretBytes = new TextEncoder().encode(secret);
	const secretHashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
	return new Uint8Array(secretHashBuffer);
}

function hexStringToUint8Array(hexString: string) {
  if (hexString.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters.");
  }
  const uint8Array = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    uint8Array[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return uint8Array;
}

async function loginUser(event: any, user:string) {
	const {id, secret} = await auth.createSession(user);

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
}

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

		await loginUser(event, user.username);
		redirect(302, '/');
	}
};
