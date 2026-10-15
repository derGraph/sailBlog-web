import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { hash } from '@node-rs/argon2';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import sharp from 'sharp';
import { PrismaClient } from '../../prisma/generated/client';
import { assertTestEnvironment } from '../../scripts/test-environment.mjs';

assertTestEnvironment();
export const db = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5
  })
});
export const password = 'Sailing-Test-2026!';
let passwordHash: Promise<string> | undefined;
export const imageBuffer = () =>
  sharp({ create: { width: 120, height: 80, channels: 3, background: '#96ded6' } })
    .png()
    .toBuffer();

export async function seedActors() {
  const prefix = `t${randomUUID().slice(0, 8)}`;
  passwordHash ??= hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const users = {} as Record<
    'owner' | 'crew' | 'outsider' | 'admin',
    Awaited<ReturnType<typeof db.user.create>>
  >;
  for (const actor of ['owner', 'crew', 'outsider', 'admin'] as const) {
    const role = await db.role.create({
      data: {
        id: `${prefix}_${actor}`,
        canDeleteOwnTrips: true,
        canDeleteCrewedTrips: false,
        ...(actor === 'admin'
          ? {
              canViewAllTrips: true,
              canCreateAllTrips: true,
              canEditAllTrips: true,
              canDeleteAllTrips: true,
              canSeeAllMedia: true,
              canViewAllUserdata: true
            }
          : {})
      }
    });
    users[actor] = await db.user.create({
      data: {
        username: `${prefix}_${actor}`,
        roleId: role.id,
        firstName: 'Test',
        lastName: actor,
        email: `${prefix}_${actor}@test.dev`,
        dateOfBirth: new Date('1990-01-02'),
        ageConfirmedAt: new Date(),
        legalAcceptedAt: new Date(),
        key: { create: { type: 'email', primary: true, passwordHash: await passwordHash } }
      }
    });
  }
  return users;
}
export type Actors = Awaited<ReturnType<typeof seedActors>>;

export async function seedTrip(users: Actors, visibility = 0) {
  return db.trip.create({
    data: {
      name: `Voyage ${users.owner.username}`,
      skipperName: users.owner.username,
      crew: { connect: { username: users.crew.username } },
      visibility,
      description: '<p>A test voyage</p>'
    }
  });
}
export async function seedSession(username: string, expiresAt = new Date(Date.now() + 3600000)) {
  const id = randomUUID();
  const secret = randomUUID();
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  );
  await db.session.create({ data: { id, userId: username, expiresAt, secret: digest } });
  return `${id}.${secret}`;
}
export async function seedMedia(users: Actors, tripId: string, visibility: number) {
  const media = await db.media.create({
    data: {
      username: users.owner.username,
      tripId,
      visibility,
      alt: 'Test sailing photograph',
      lat: 0,
      long: 0
    }
  });
  const directory = join(process.env.SAILBLOG_TEST_STORAGE!, 'store', media.username);
  await mkdir(directory, { recursive: true });
  await sharp(await imageBuffer())
    .avif({ effort: 0 })
    .toFile(join(directory, `${media.id}.avif`));
  return media;
}
