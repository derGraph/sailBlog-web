import { prisma } from '#lib/server/prisma.ts';
import { error } from '@sveltejs/kit';

export async function GET(event) {
  if (!event.locals.user) {
    error(401, 'You are not logged in!');
  }

  if (event.locals.role?.canViewRoles) {
    try {
      let result = await prisma.role.findMany();
      return new Response(JSON.stringify(result));
    } catch (error_message) {
      if (error_message instanceof Error) {
        console.log(error_message);
        error(404, error_message.message);
      } else {
        error(500, 'ERROR');
      }
    }
  } else {
    error(401, 'You are not allowed to view roles!');
  }
}
