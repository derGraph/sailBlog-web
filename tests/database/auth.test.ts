import { afterAll, describe, expect, it } from 'vitest';
import { auth } from '../../src/lib/server/auth';
import { prisma } from '../../src/lib/server/prisma';
import { db, seedActors } from '../helpers/database';

afterAll(async () => {
  await Promise.all([db.$disconnect(), prisma.$disconnect()]);
});
describe('database-backed sessions', () => {
  it('creates a session, stores only its secret hash, and resolves user and role', async () => {
    const actors = await seedActors();
    const token = await auth.createSession(actors.owner.username);
    const stored = await db.session.findUniqueOrThrow({ where: { id: token.id } });
    expect(stored.secret.byteLength).toBe(32);
    expect(Buffer.from(stored.secret).toString()).not.toBe(token.secret);
    const valid = await auth.validateSession(`${token.id}.${token.secret}`);
    expect(valid.user?.username).toBe(actors.owner.username);
    expect(valid.role?.id).toBe(actors.owner.roleId);
    expect(valid.session?.id).toBe(token.id);
    expect(await auth.validateSession(`${token.id}.wrong-secret`)).toEqual({
      session: null,
      user: null,
      role: null
    });
  });
  it('rejects malformed and unknown session tokens', async () => {
    for (const token of ['', 'missing-secret', 'unknown.secret']) {
      expect(await auth.validateSession(token)).toEqual({ session: null, user: null, role: null });
    }
  });
  it('expires and removes an old session', async () => {
    const actors = await seedActors();
    const token = await auth.createSession(actors.owner.username);
    await db.session.update({
      where: { id: token.id },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });
    expect((await auth.validateSession(`${token.id}.${token.secret}`)).user).toBeNull();
    expect(await db.session.findUnique({ where: { id: token.id } })).toBeNull();
  });
  it('makes an invalidated token unusable', async () => {
    const actors = await seedActors();
    const token = await auth.createSession(actors.owner.username);
    await auth.invalidateSession(token.id);
    expect((await auth.validateSession(`${token.id}.${token.secret}`)).session).toBeNull();
  });
});
