import { prisma } from '#lib/server/prisma.ts';
import { error } from '@sveltejs/kit';

export async function GET(event) {
  try {
    let responseData = await prisma.location.findMany({
      where: {}
    });
    return new Response(JSON.stringify(responseData));
  } catch (error_message) {
    if (error_message instanceof Error) {
      error(404, error_message.message);
    } else {
      error(500, 'ERROR');
    }
  }
}
