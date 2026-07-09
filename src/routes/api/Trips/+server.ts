import { removeSensitiveData } from '$lib/server/functions.js';
import { prisma } from '$lib/server/prisma';
import { error, isHttpError, json, redirect } from '@sveltejs/kit';

interface Datapoint {
  id?: string;
  time?: Date;
  tripId: string;
  lat: number;
  long: number;
  speed?: number;
  heading?: number;
  depth?: number;
  h_accuracy?: number;
  v_accuracy?: number;
  propulsion?: number;
}

export async function POST(event) {
  return redirect(301, '/api/Trip');
}

export async function GET(event: {
  url: any;
  locals: { user: { username: any }; role: { canViewAllTrips: boolean } };
}) {
  let deleted = false;
  let username: string | null = null;
  if (event.url.searchParams.get('deleted') == 'true') {
    deleted = true;
  }
  username = event.url.searchParams.get('username');

  // Standard base includes recognized by your schema
  const tripIncludes = {
    crew: true,
    location: true
  };

  try {
    let trips;
    if (event.locals.user) {
      if (username == null) {
        if (event.locals.role?.canViewAllTrips) {
          trips = await prisma.trip.findMany({
            where: { deleted: deleted },
            include: tripIncludes
          });
        } else {
          trips = await prisma.trip.findMany({
            where: {
              deleted: deleted,
              OR: [
                { crew: { some: { username: event.locals.user.username } } },
                { skipper: { username: event.locals.user.username } },
                { visibility: 1 },
                { visibility: 2 }
              ]
            },
            include: tripIncludes
          });
        }
      } else {
        if (event.locals.role?.canViewAllTrips) {
          trips = await prisma.trip.findMany({
            where: {
              deleted: deleted,
              ...(username
                ? {
                    OR: [
                      { crew: { some: { username: username } } },
                      { skipper: { username: username } }
                    ]
                  }
                : {})
            },
            include: tripIncludes
          });
        } else {
          trips = await prisma.trip.findMany({
            where: {
              deleted: deleted,
              OR: [
                {
                  visibility: 1,
                  ...(username
                    ? {
                        OR: [
                          { crew: { some: { username: username } } },
                          { skipper: { username: username } }
                        ]
                      }
                    : {})
                },
                {
                  visibility: 2,
                  ...(username
                    ? {
                        OR: [
                          { crew: { some: { username: username } } },
                          { skipper: { username: username } }
                        ]
                      }
                    : {})
                }
              ]
            },
            include: tripIncludes
          });
        }
      }
    } else {
      trips = await prisma.trip.findMany({
        where: {
          visibility: 2,
          deleted: false
        },
        include: tripIncludes
      });
    }

    // Dynamically append ONLY the first and last datapoints for each trip in parallel
    const formattedData = await Promise.all(
      trips.map(async (trip) => {
        const [startPoint, endPoint] = await Promise.all([
          prisma.datapoint.findFirst({
            where: { tripId: trip.id },
            orderBy: { time: 'asc' }
          }),
          prisma.datapoint.findFirst({
            where: { tripId: trip.id },
            orderBy: { time: 'desc' }
          })
        ]);

        return {
          ...trip,
          startPoint,
          endPoint
        };
      })
    );

    const cleanedData = removeSensitiveData(formattedData);
    return new Response(JSON.stringify(cleanedData));
  } catch (error_message) {
    if (isHttpError(error_message)) {
      return error_message;
    } else if (error_message instanceof Error) {
      console.log(error_message);
      error(404, { message: error_message.message });
    } else {
      error(500, { message: 'ERROR' });
    }
  }
}
