import { test, expect } from '../helpers/api';
import { db, password, seedSession } from '../helpers/database';

test('cross-origin form submissions are rejected before authentication', async ({
  request,
  actors
}) => {
  const response = await request.post('/sign_in?/login', {
    form: { identifier: actors.owner.username, password },
    headers: { Origin: 'https://untrusted.example' }
  });
  expect(response.status()).toBe(403);
  expect(await db.session.count({ where: { userId: actors.owner.username } })).toBe(0);
});

test('password login rejects bad credentials and protects the session cookie', async ({
  request,
  actors
}) => {
  expect(
    (
      await request.post('/sign_in?/login', {
        form: { identifier: actors.owner.username, password: 'Wrong-Test-2026!' }
      })
    ).status()
  ).toBe(422);
  const response = await request.post('/sign_in?/login', {
    form: { identifier: actors.owner.username, password },
    headers: { Accept: 'text/html' },
    maxRedirects: 0
  });
  expect(response.status()).toBe(302);
  const cookie = response.headers()['set-cookie'];
  expect(cookie).toMatch(/session_token=/);
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toMatch(/Secure/i);
  expect(cookie).toMatch(/SameSite=Lax/i);
});
test('expired and tampered cookies cannot access authenticated pages', async ({
  request,
  actors
}) => {
  const expired = await seedSession(actors.owner.username, new Date(Date.now() - 1000));
  const valid = await seedSession(actors.owner.username);
  for (const token of [expired, `${valid.split('.')[0]}.wrong`, 'malformed']) {
    const response = await request.get('/trips', {
      headers: { Cookie: `session_token=${token}` },
      maxRedirects: 0
    });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe('/');
  }
  expect(await db.session.findUnique({ where: { id: expired.split('.')[0] } })).toBeNull();
});
test('logout deletes the session and prevents cookie replay', async ({ request, actors }) => {
  const token = await seedSession(actors.owner.username);
  expect(
    (await request.get('/trips', { headers: { Cookie: `session_token=${token}` } })).status()
  ).toBe(200);
  expect(
    (await request.get('/sign_out', { headers: { Cookie: `session_token=${token}` } })).ok()
  ).toBe(true);
  expect(await db.session.findUnique({ where: { id: token.split('.')[0] } })).toBeNull();
  expect(
    (
      await request.get('/trips', {
        headers: { Cookie: `session_token=${token}` },
        maxRedirects: 0
      })
    ).status()
  ).toBe(302);
});
