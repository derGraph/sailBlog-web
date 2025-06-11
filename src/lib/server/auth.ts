import type { Session, User } from "@prisma/client";
import { prisma } from "./prisma";

class Authenticator {
	
	async validateSession(sessionId: string): Promise<{session:Session|null, user:User|null}> {
		const id = sessionId.split(".")[0];
		const secret = sessionId.split(".")[1];

		const session = await prisma.session.findFirst({
			where: {
				id: id
			},
			include: {
				user: true
			}
		});

		if(session == undefined){
			return {session:null, user:null};
		}

		const hashedSecret = await hashSecret(secret);

		if(!constantTimeEqual(hashedSecret, session?.secret)){
			return {session:null, user:null};
		}

		return {session, user:session.user};
	}

	async createSession(username: string): Promise<{id:string, secret:string}> {
		const id = generateSecureRandomString();
		const secret = generateSecureRandomString();
		const secretHash = await hashSecret(secret);

		await prisma.user.update({
			where: {username: username},
			data: {
				sessions: {
					create: {
						id: id,
						expiresAt: new Date(Date.now() + 90*1000*60*60*24),
						secret: secretHash
					}
				}
			}
		});
	
		return {id, secret};
	}

	async invalidateSession(sessionId: string): Promise<void> {
		await prisma.session.delete({
			where: {
				id: sessionId
			}
		});
		return;
	}

}

export let auth = new Authenticator;

function generateSecureRandomString(): string {
	const alphabet = "abcdefghijklmnpqrstuvwxyz23456789";
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	let returnString = "";
	for (let i = 0; i < bytes.length; i++) {
		// >> 3 s"removes" the right-most 3 bits of the byte
		returnString += alphabet[bytes[i] >> 3];
	}
	return returnString;
}

async function hashSecret(secret: string): Promise<Uint8Array> {
	const secretBytes = new TextEncoder().encode(secret);
	const secretHashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
	return new Uint8Array(secretHashBuffer);
}

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

interface DatabaseUserAttributes {
	username: string;
}
