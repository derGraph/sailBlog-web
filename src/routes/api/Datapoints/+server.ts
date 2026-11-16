import { prisma } from '#lib/server/prisma.ts';
import { error, isHttpError, json, type RequestEvent } from '@sveltejs/kit';
import { isCuid } from '@paralleldrive/cuid2';
import { RequestTimings } from '#lib/server/requestTimings.ts';
import { readTripDatapoints } from '#lib/server/tripDatapoints.ts';

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

export async function POST(event: {
  request: { json: () => any };
  locals: { user: { username: any } };
  url: { searchParams: { get: (arg0: string) => any } };
}) {
  let input;
  try {
    input = await event.request.json();
  } catch (errorMessage: unknown) {
    let result = errorMessage as Error;
    error(400, result.name + ': ' + result.message);
  }

  if (Object.keys(input).length > 500) {
    error(413, 'Payload to large: Maximum of 500 Datapoints per request are allowed!');
  }

  if (event.locals.user?.username) {
    let username = event.locals.user?.username;
    let activeUser = await prisma.user.findFirstOrThrow({
      where: {
        username: username
      },
      include: {
        role: true
      }
    });

    let datapoints: Datapoint[] = [];
    var results: { [k: string]: any } = {};
    let errorHappened = false;

    for (const k of Object.keys(input)) {
      try {
        input[k].id = k;
        if (k == '') {
          input[k].id = undefined;
        }
        let datapoint = checkDatapoint(input[k]);
        if (activeUser.activeTripId == null) {
          error(400, 'User has no active trip, select one or create trip!');
        }
        datapoint.tripId = activeUser.activeTripId;
        let existingPoint = null;
        if (datapoint.id) {
          existingPoint = await prisma.datapoint.findFirst({
            where: { id: datapoint.id }
          });
        }
        if (existingPoint != null) {
          compareObjects(datapoint, existingPoint);
        }
        datapoints.push(datapoint);
        results[k] = 'OK';
      } catch (errorMessage) {
        if (errorMessage instanceof Error) {
          results[k] = errorMessage.name + ': ' + errorMessage.message;
          errorHappened = true;
        }
      }
    }

    if (errorHappened) {
      return json(results, { status: 400 });
    }

    try {
      if (activeUser.activeTripId == null) {
        error(400, 'User has no active trip, select one or create trip!');
      }

      if (!activeUser.role.canAddDatapoint) {
        error(401, 'User not allowed to add Datapoint!');
      }

      await prisma.datapoint.createMany({ data: datapoints });
    } catch (errorMessage) {
      if (errorMessage instanceof Error) {
        return error(
          400,
          errorMessage.name + ': ' + errorMessage.message + ' Datapoints: ' + datapoints
        );
      } else {
        return error(400, 'Internal Error!');
      }
    }
    return json(results, { status: 200 });
  } else {
    error(401, 'Not logged in!');
  }
}

function checkDatapoint(rawData: {
  id: any;
  lat: any;
  long: any;
  time: any;
  speed: any;
  heading: any;
  depth: any;
  h_accuracy: any;
  v_accuracy: any;
  propulsion: any;
}) {
  let id = rawData.id;
  let lat = rawData.lat;
  let long = rawData.long;
  let unparesedTime = rawData.time;
  let speed = rawData.speed;
  let heading = rawData.heading;
  let depth = rawData.depth;
  let h_accuracy = rawData.h_accuracy;
  let v_accuracy = rawData.v_accuracy;
  let propulsion = rawData.propulsion;
  let time;

  if (lat == null) {
    throw new Error('Latitude required!');
  } else {
    const latNum = Number(lat);
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      throw new Error('Wrong Latitude format!');
    } else {
      lat = latNum;
    }
  }

  if (long == null) {
    throw new Error('Longitude required!');
  } else {
    const longNum = Number(long);
    if (!Number.isFinite(longNum) || longNum < -180 || longNum > 180) {
      throw new Error('Wrong Longitude format!');
    } else {
      long = longNum;
    }
  }

  if (id != null) {
    if (!isCuid(id)) {
      id = null;
    }
  }

  if (unparesedTime != null) {
    const parsedTime = Number(unparesedTime);
    if (!Number.isFinite(parsedTime)) {
      throw new Error('Invalid Timestamp!');
    }
    time = new Date(parsedTime);
    if (Number.isNaN(time.getTime())) {
      throw new Error('Invalid Timestamp!');
    }
  } else {
    time = null;
  }

  if (speed != null) {
    const parsed = Number(speed);
    if (!Number.isFinite(parsed)) {
      throw new Error('Invalid speed!');
    }
    speed = parsed;
  }
  if (heading != null) {
    const parsed = Number(heading);
    if (!Number.isFinite(parsed)) {
      throw new Error('Invalid heading!');
    }
    heading = parsed;
  }

  if (depth != null) {
    const parsed = Number(depth);
    if (!Number.isFinite(parsed)) {
      throw new Error('Invalid depth!');
    }
    depth = parsed;
  }

  if (h_accuracy != null) {
    const parsed = Number(h_accuracy);
    if (!Number.isFinite(parsed)) {
      throw new Error('Invalid h_accuracy!');
    }
    h_accuracy = parsed;
  }

  if (v_accuracy != null) {
    const parsed = Number(v_accuracy);
    if (!Number.isFinite(parsed)) {
      throw new Error('Invalid v_accuracy!');
    }
    v_accuracy = parsed;
  }

  if (propulsion != null) {
    switch (propulsion) {
      case 'anchor':
      case 0:
        propulsion = 0;
        break;

      case 'motor':
      case 1:
        propulsion = 1;
        break;

      case 'sailing':
      case 2:
        propulsion = 2;
        break;

      case 'unknown':
      case 3:
        propulsion = 3;
        break;

      default:
        throw new Error('Invalid propulsion type!');
        break;
    }
  }
  let returnData: Datapoint = {
    ...(id && { id }),
    ...(time && { time }),
    lat: lat,
    long: long,
    ...(speed !== null && speed !== undefined ? { speed } : {}),
    ...(heading !== null && heading !== undefined ? { heading } : {}),
    ...(depth !== null && depth !== undefined ? { depth } : {}),
    ...(h_accuracy !== null && h_accuracy !== undefined ? { h_accuracy } : {}),
    ...(v_accuracy !== null && v_accuracy !== undefined ? { v_accuracy } : {}),
    ...(propulsion !== null && propulsion !== undefined ? { propulsion } : {})
  };
  return returnData;
}

function compareObjects(
  target: Datapoint,
  obj: {
    id: string;
    tripId?: any;
    time: any;
    lat: any;
    long: any;
    speed: any;
    heading: any;
    depth: any;
    h_accuracy: any;
    v_accuracy: any;
    propulsion: any;
  }
) {
  // Check if all properties match
  if (
    obj.lat == target.lat &&
    obj.long == target.long &&
    obj.time?.valueOf() == target.time?.valueOf() &&
    obj.speed == target.speed &&
    obj.heading == target.heading &&
    obj.depth == target.depth &&
    obj.h_accuracy == target.h_accuracy &&
    obj.v_accuracy == target.v_accuracy &&
    obj.propulsion == target.propulsion
  ) {
    throw new Error('This element already exists with the same data!');
  } else {
    throw new Error(
      'This element already exists, with different data! Edit via Datapoint PUT-Request!'
    );
  }
  return;
}

export async function GET(event: RequestEvent) {
  const timings = event.locals.requestTimings ?? new RequestTimings();
  let requestedTrip = event.url.searchParams.get('tripId');
  let unparsedStart = event.url.searchParams.get('start');
  let unparsedEnd = event.url.searchParams.get('end');
  let unparsedAmount = event.url.searchParams.get('amount');
  let start = new Date(0);
  let end = new Date(Date.now());
  let maxAmount;

  if (requestedTrip == null || requestedTrip == '') {
    error(400, 'No tripId requested!');
  } else {
    if (requestedTrip != null) {
      if (!isCuid(requestedTrip)) {
        error(400, 'Invalid Id!');
      }
    }
  }

  if (unparsedStart !== null) start = new Date(Number(unparsedStart));
  if (!Number.isFinite(start.getTime())) {
    error(400, 'Invalid start Timestamp!');
  }

  if (unparsedEnd !== null) end = new Date(Number(unparsedEnd));
  if (!Number.isFinite(end.getTime())) {
    error(400, 'Invalid end Timestamp!');
  }

  maxAmount = Number(unparsedAmount ?? 10000);
  if (!Number.isSafeInteger(maxAmount) || maxAmount < 0 || maxAmount > 10000) {
    error(400, 'Invalid max Amount: use an integer from 0 to 10000.');
  }

  try {
    const username = event.locals.user?.username;
    const trip = await timings.measure('trip_access', () =>
      prisma.trip.findFirst({
        where: {
          id: requestedTrip,
          ...(event.locals.role?.canViewAllTrips
            ? {}
            : username
              ? {
                  OR: [
                    { visibility: 1 },
                    { visibility: 2 },
                    { skipperName: username },
                    { crew: { some: { username } } }
                  ]
                }
              : { visibility: 2 })
        },
        select: { id: true }
      })
    );
    if (!trip) error(404, 'Trip not found.');
    const datapoints = await timings.measure('datapoints', () =>
      readTripDatapoints(requestedTrip, start, end, maxAmount)
    );
    return await timings.measure('serialize', async () => {
      let responseData: { [k: string]: any } = {};
      datapoints.forEach((datapoint) => {
        responseData[datapoint.id] = { ...datapoint, id: undefined };
      });
      return new Response(JSON.stringify(responseData));
    });
  } catch (error_message) {
    if (isHttpError(error_message)) throw error_message;
    console.error('Failed to load datapoints:', error_message);
    error(500, 'Unable to load datapoints. Please try again.');
  }
}
