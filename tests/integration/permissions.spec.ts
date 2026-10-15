import sharp from 'sharp';
import { test, expect } from '../helpers/api';
import { db, seedTrip, seedMedia, imageBuffer } from '../helpers/database';

const actors = ['guest', 'owner', 'crew', 'outsider', 'admin'] as const;
for (const visibility of [0, 1, 2]) {
  test(`trip visibility ${visibility} respects every actor`, async ({ clients, actors: users }) => {
    const trip = await seedTrip(users, visibility);
    for (const actor of actors) {
      const allowed =
        visibility === 2 ||
        (visibility === 1 && actor !== 'guest') ||
        ['owner', 'crew', 'admin'].includes(actor);
      const response = await clients[actor].get(`/api/Trip?tripId=${trip.id}`);
      expect(response.status(), actor).toBe(allowed ? 200 : 404);
      const list = await clients[actor].get('/api/Trips');
      expect(list.ok()).toBe(true);
      expect(
        (await list.json()).some((item: { id: string }) => item.id === trip.id),
        actor
      ).toBe(allowed);
      if (allowed) {
        const [result] = await response.json();
        expect(result.skipper.email).toBeNull();
        expect(result.skipper.dateOfBirth).toBeNull();
        expect(result.crew[0].email).toBeNull();
      }
    }
  });
  test(`media visibility ${visibility} prevents unauthorized downloads and listing`, async ({
    clients,
    actors: users
  }) => {
    const trip = await seedTrip(users, 2);
    const media = await seedMedia(users, trip.id, visibility);
    for (const actor of actors) {
      const allowed =
        visibility === 2 ||
        (visibility === 1 && actor !== 'guest') ||
        ['owner', 'admin'].includes(actor);
      const response = await clients[actor].get(`/api/Media/${media.username}/${media.id}.avif`);
      expect(response.status(), actor).toBe(allowed ? 200 : 404);
      const list = await clients[actor].get(`/api/Media?username=${media.username}`);
      const data = await list.json();
      const ids = Array.isArray(data) ? data.map((item) => item.id) : Object.keys(data);
      expect(ids.includes(media.id), actor).toBe(allowed);
    }
  });
}
for (const actor of actors) {
  test(`${actor} editing respects membership and admin permissions`, async ({
    clients,
    actors: users
  }) => {
    const trip = await seedTrip(users);
    const allowed = ['owner', 'crew', 'admin'].includes(actor);
    const response = await clients[actor].put(`/api/Trip?tripId=${trip.id}&name=Edited`);
    expect(response.ok()).toBe(allowed);
    expect((await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).name).toBe(
      allowed ? 'Edited' : trip.name
    );
  });
  test(`${actor} deletion and restoration respect role flags`, async ({
    clients,
    actors: users
  }) => {
    const trip = await seedTrip(users);
    const allowed = ['owner', 'admin'].includes(actor);
    const response = await clients[actor].delete(`/api/Trip?tripId=${trip.id}`);
    expect(response.ok()).toBe(allowed);
    expect((await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).deleted).toBe(allowed);
    if (allowed) {
      const active = await clients[actor].get('/api/Trips');
      expect((await active.json()).some((item: { id: string }) => item.id === trip.id)).toBe(false);
      const restore = await clients[actor].put(
        `/api/Trip?tripId=${trip.id}&restore=true&name=Restored`
      );
      expect(restore.ok()).toBe(true);
      expect((await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).deleted).toBe(false);
    }
  });
}
test('the crew deletion flag permits crew deletion when enabled', async ({
  clients,
  actors: users
}) => {
  const trip = await seedTrip(users);
  await db.role.update({
    where: { id: users.crew.roleId },
    data: { canDeleteOwnTrips: false, canDeleteCrewedTrips: true }
  });
  expect((await clients.crew.delete(`/api/Trip?tripId=${trip.id}`)).ok()).toBe(true);
});
test('own and crew deletion flags combine instead of overriding each other', async ({
  clients,
  actors: users
}) => {
  const trip = await seedTrip(users);
  await db.role.update({
    where: { id: users.crew.roleId },
    data: { canDeleteOwnTrips: true, canDeleteCrewedTrips: true }
  });
  expect((await clients.crew.delete(`/api/Trip?tripId=${trip.id}`)).ok()).toBe(true);
});
test('an owner with both deletion permissions disabled cannot delete a trip', async ({
  clients,
  actors: users
}) => {
  const trip = await seedTrip(users);
  await db.role.update({
    where: { id: users.owner.roleId },
    data: { canDeleteOwnTrips: false, canDeleteCrewedTrips: false }
  });
  expect((await clients.owner.delete(`/api/Trip?tripId=${trip.id}`)).status()).toBe(401);
  expect((await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).deleted).toBe(false);
});
test('creation requires membership and sanitizes descriptions', async ({
  clients,
  actors: users
}) => {
  expect(
    (await clients.outsider.post(`/api/Trip?name=Forbidden&skipper=${users.owner.username}`)).ok()
  ).toBe(false);
  const description = encodeURIComponent(
    '<p>Safe description</p><script>alert(1)</script><img src=x onerror=alert(1)>'
  );
  const response = await clients.owner.post(
    `/api/Trip?name=Created&skipper=${users.owner.username}&visibility=2&description=${description}`
  );
  expect(response.ok()).toBe(true);
  expect((await response.json()).description).toContain('Safe description');
  expect((await response.json()).description).not.toMatch(/<script\b|\bonerror\s*=/);
});
test('image upload is restricted, converted, and capped by trip visibility', async ({
  clients,
  actors: users
}) => {
  const trip = await seedTrip(users, 0);
  const data = await imageBuffer();
  for (const actor of ['guest', 'outsider'] as const) {
    expect(
      (
        await clients[actor].post(`/api/Media?tripId=${trip.id}`, {
          data,
          headers: { 'Content-Type': 'image/png' }
        })
      ).ok()
    ).toBe(false);
    expect(await db.media.count({ where: { tripId: trip.id } })).toBe(0);
  }
  const uploaded = await clients.owner.post(`/api/Media?tripId=${trip.id}&visibility=2&alt=Test`, {
    data,
    headers: { 'Content-Type': 'image/png' }
  });
  expect(uploaded.ok()).toBe(true);
  expect(await uploaded.text()).toBe('OK');
  const media = await db.media.findFirstOrThrow({
    where: { tripId: trip.id, username: users.owner.username }
  });
  expect(media.visibility).toBe(0);
  for (const format of ['avif', 'jpeg', 'png', 'webp']) {
    const response = await clients.owner.get(`/api/Media/${media.username}/${media.id}.${format}`);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toBe(`image/${format}`);
    expect((await sharp(await response.body()).metadata()).width).toBe(120);
  }
  expect((await clients.owner.delete(`/api/Media?mediaId=${media.id}`)).ok()).toBe(true);
  expect((await clients.owner.get(`/api/Media/${media.username}/${media.id}.avif`)).status()).toBe(
    404
  );
});
