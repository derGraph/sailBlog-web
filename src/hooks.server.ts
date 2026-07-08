// src/hooks.server.ts
import { auth } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { error, type Handle } from '@sveltejs/kit';

const API_CACHE_CONTROL = 'private, no-store, max-age=0, must-revalidate';

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session_token');

  event.locals.user = null;
  event.locals.session = null;
  event.locals.role = null;

  if (sessionId) {
    const { session, user, role } = await auth.validateSession(sessionId);

    if (!session || !user) {
      event.cookies.set('session_token', '', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        expires: new Date(0)
      });
    } else {
      try {
        const now = new Date();
        // Throttle session writes to avoid update conflicts on concurrent requests.
        const minSessionAgeMs = 30_000;
        const sessionCutoff = new Date(now.getTime() - minSessionAgeMs);
        await prisma.session.updateMany({
          where: {
            id: session.id,
            OR: [{ last_use: { lt: sessionCutoff } }, { last_use: null }]
          },
          data: {
            last_use: now,
            ip: event.getClientAddress()
          }
        });
        // Avoid hammering the user row on every request and reduce update conflicts.
        const minPingAgeMs = 60_000;
        const cutoff = new Date(now.getTime() - minPingAgeMs);
        await prisma.user.updateMany({
          where: {
            username: user.username,
            lastPing: { lt: cutoff }
          },
          data: {
            lastPing: now
          }
        });
      } catch (error_message: any) {
        // Check if the error is due to a concurrency / locking conflict
        const isLockConflict =
          error_message?.message?.includes('Record has changed') || error_message?.code === 'P2034';

        if (isLockConflict) {
          // Safe to ignore! Another concurrent request successfully updated the ping/session for us.
          console.log(
            `[Hooks] Safely bypassed concurrent update conflict for user: ${user.username}`
          );
        } else {
          // It's a genuine database failure (e.g. database connection lost), throw a 500
          console.error('Critical Database Error in hooks:', error_message);
          error(500, { message: 'Internal Server Error' });
        }
      }

      event.locals.user = user;
      event.locals.session = session;
      event.locals.role = role;
    }
  }

  const response = await resolve(event);

  if (event.url.pathname.startsWith('/api')) {
    response.headers.set('cache-control', API_CACHE_CONTROL);
  }

  return response;
};
