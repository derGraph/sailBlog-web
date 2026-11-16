import { test, expect } from '../helpers/api';
import { db, seedSession, seedTrip } from '../helpers/database';

for (const visibility of [0, 1, 2]) {
  test(`datapoint visibility ${visibility} respects membership and returns chronological points`, async ({
    clients,
    actors
  }) => {
    const trip = await seedTrip(actors, visibility);
    await db.datapoint.createMany({
      data: [
        { tripId: trip.id, time: new Date(3000), lat: 43, long: 14, optimized: 2 },
        { tripId: trip.id, time: new Date(2000), lat: 44, long: 15, optimized: 1 },
        { tripId: trip.id, time: new Date(1000), lat: 45, long: 16, optimized: 0 }
      ]
    });
    for (const actor of ['guest', 'owner', 'crew', 'outsider', 'admin'] as const) {
      const allowed =
        visibility === 2 ||
        (visibility === 1 && actor !== 'guest') ||
        ['owner', 'crew', 'admin'].includes(actor);
      const response = await clients[actor].get(
        `/api/Datapoints?tripId=${trip.id}&start=0&amount=5000`
      );
      expect(response.status(), actor).toBe(allowed ? 200 : 404);
      expect(response.headers()['server-timing']).toMatch(/trip_access;dur=[\d.]+/);
      if (allowed) {
        const points = Object.values(await response.json()) as { time: string }[];
        expect(points.map(({ time }) => new Date(time).getTime())).toEqual([1000, 3000]);
        expect(response.headers()['server-timing']).toMatch(/datapoints;dur=[\d.]+/);
      }
    }
  });
}

test('fresh session and ping timestamps let map reads proceed while their rows are locked', async ({
  request,
  actors
}) => {
  const trip = await seedTrip(actors, 1);
  const token = await seedSession(actors.owner.username);
  const sessionId = token.split('.')[0];
  await db.session.update({ where: { id: sessionId }, data: { last_use: new Date() } });
  const locked = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const transaction = db
    .$transaction(
      async (tx) => {
        await tx.$executeRaw`UPDATE Session SET last_use = last_use WHERE id = ${sessionId}`;
        await tx.$executeRaw`UPDATE User SET lastPing = lastPing WHERE username = ${actors.owner.username}`;
        locked.resolve();
        await release.promise;
      },
      { timeout: 10000 }
    )
    .catch((err) => {
      locked.reject(err);
      throw err;
    });

  try {
    await locked.promise;
    const response = await request.get(`/api/Datapoints?tripId=${trip.id}`, {
      headers: { Cookie: `session_token=${token}` },
      timeout: 2000
    });
    expect(response.status()).toBe(200);
    expect(response.headers()['server-timing']).not.toMatch(/session_touch|user_touch/);
  } finally {
    release.resolve();
    await transaction;
  }
});

test('stale session and ping timestamps are refreshed once, with separate timings', async ({
  request,
  actors
}) => {
  const trip = await seedTrip(actors, 1);
  const token = await seedSession(actors.owner.username);
  const stale = new Date(Date.now() - 120000);
  await db.user.update({ where: { username: actors.owner.username }, data: { lastPing: stale } });
  const headers = { Cookie: `session_token=${token}` };
  const response = await request.get(`/api/Datapoints?tripId=${trip.id}`, { headers });
  expect(response.status()).toBe(200);
  expect(response.headers()['server-timing']).toMatch(/session_touch;dur=[\d.]+/);
  expect(response.headers()['server-timing']).toMatch(/user_touch;dur=[\d.]+/);
  expect(
    (await db.session.findUniqueOrThrow({ where: { id: token.split('.')[0] } })).last_use
  ).not.toBeNull();
  expect(
    (
      await db.user.findUniqueOrThrow({ where: { username: actors.owner.username } })
    ).lastPing.getTime()
  ).toBeGreaterThan(stale.getTime());
  const repeated = await request.get(`/api/Datapoints?tripId=${trip.id}`, { headers });
  expect(repeated.status()).toBe(200);
  expect(repeated.headers()['server-timing']).not.toMatch(/session_touch|user_touch/);
});
