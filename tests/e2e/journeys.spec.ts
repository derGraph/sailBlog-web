import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import {
  db,
  seedActors,
  seedTrip,
  seedMedia,
  seedSession,
  imageBuffer,
  password
} from '../helpers/database';

test.beforeEach(async ({ page }) => {
  // Keep browser tests local; external maps and Google services are outside this suite.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:'
      ? route.continue()
      : route.abort();
  });
});
test.afterAll(async () => {
  await db.$disconnect();
});

test('sign up, sign in, create/edit a trip, upload an image and sign out', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const username = `browser_${randomUUID().slice(0, 8)}`;
  await page.goto('/sign_up');
  await page.getByPlaceholder('Username', { exact: true }).fill(username);
  await page.getByPlaceholder('Email', { exact: true }).fill(`${username}@test.dev`);
  await page.getByPlaceholder('First Name', { exact: true }).fill('Browser');
  await page.getByPlaceholder('Last Name', { exact: true }).fill('Sailor');
  await page.locator('input[name=password]').fill(password);
  await page.locator('input[name=ageConfirmed]').check();
  await page.locator('input[name=legalAccepted]').check();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.waitForURL('/');
  expect(await db.user.findUnique({ where: { username } })).not.toBeNull();
  await page.goto('/sign_out');
  await expect(page.getByRole('heading', { name: 'You have been logged out!' })).toBeVisible();
  await page.goto('/sign_in');
  await page.getByPlaceholder('Username/Email').fill(username);
  await page.locator('input[name=password]').fill(password);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.waitForURL('/');
  await page.goto('/trips');
  await page.getByRole('button', { name: 'add Trip' }).click();
  await page.waitForURL('**/trips/edit/*');
  const tripId = page.url().split('/').at(-1)!;
  await page.getByRole('button', { name: 'Edit trip name', exact: true }).click();
  await page.locator('input[name=tripName]').fill('Browser voyage');
  await page.getByRole('button', { name: 'Save trip name', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Browser voyage' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit description', exact: true }).click();
  await page.locator('.tiptap[contenteditable=true]').fill('Description saved through the browser');
  await page.getByRole('button', { name: 'Save description', exact: true }).click();
  await expect
    .poll(async () => (await db.trip.findUniqueOrThrow({ where: { id: tripId } })).description)
    .toContain('Description saved through the browser');
  await page.reload();
  await expect(
    page.getByText('Description saved through the browser', { exact: true })
  ).toBeVisible();
  await page.goto(`/trips/uploadImages/${tripId}`);
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'sailing.png', mimeType: 'image/png', buffer: await imageBuffer() });
  await expect.poll(() => db.media.count({ where: { tripId } })).toBe(1);
  await page.reload();
  const media = await db.media.findFirstOrThrow({ where: { tripId } });
  await expect(page.locator(`img[src*="${media.id}"]`)).toBeVisible();
  const token = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'session_token'
  )!.value;
  await page.goto('/sign_out');
  await expect.poll(() => db.session.count({ where: { id: token.split('.')[0] } })).toBe(0);
  await page.goto('/trips');
  await page.waitForURL('/');
  expect(errors).toEqual([]);
});

test('navigation and page state work at the configured screen size', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) {
    const menu = page.getByRole('button', { name: 'Open navigation menu' });
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
  }
  await page.locator('a[href="/sign_up"]:visible').first().click();
  await page.waitForURL('/sign_up');
  await expect(page.getByRole('heading', { name: 'Sign up!', exact: true })).toBeVisible();
  if (isMobile)
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
});

test('editor image resizing and saving persist across reloads', async ({
  page,
  context,
  baseURL
}) => {
  const actors = await seedActors();
  const trip = await seedTrip(actors);
  const image = await seedMedia(actors, trip.id, 0);
  await db.trip.update({
    where: { id: trip.id },
    data: {
      description: `<p>Resizable image</p><img src="/api/Media/${image.username}/${image.id}.avif" style="width:120px">`
    }
  });
  await context.addCookies([
    { name: 'session_token', value: await seedSession(actors.owner.username), url: baseURL! }
  ]);
  await page.goto(`/trips/edit/${trip.id}`);
  await page.getByRole('button', { name: 'Edit description', exact: true }).click();
  const handle = page.locator('.tiptap-image-resize-handle').nth(1);
  await handle.scrollIntoViewIfNeeded();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Save description', exact: true }).click();
  await expect
    .poll(async () => (await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).description)
    .toMatch(/width:\s*160px/);
  await page.reload();
  await expect(page.locator(`img[src*="${image.id}"]`)).toHaveCSS('width', '160px');
});
