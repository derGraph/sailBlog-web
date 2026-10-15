import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { db, seedActors, seedSession, type Actors } from './database';

type Fixtures = {
  actors: Actors;
  clients: Record<keyof Actors | 'guest', APIRequestContext>;
};
export const test = base.extend<Fixtures>({
  actors: async ({}, use) => {
    await use(await seedActors());
  },
  clients: async ({ actors, playwright, baseURL }, use) => {
    const clients = {} as Fixtures['clients'];
    for (const actor of ['owner', 'crew', 'outsider', 'admin', 'guest'] as const) {
      const token = actor === 'guest' ? undefined : await seedSession(actors[actor].username);
      clients[actor] = await playwright.request.newContext({
        baseURL,
        extraHTTPHeaders: {
          Origin: baseURL!,
          ...(token ? { Cookie: `session_token=${token}` } : {})
        }
      });
    }
    try {
      await use(clients);
    } finally {
      await Promise.all(Object.values(clients).map((client) => client.dispose()));
    }
  }
});
test.afterAll(async () => {
  await db.$disconnect();
});
export { expect };
