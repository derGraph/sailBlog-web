import { Prisma, type Datapoint } from '../../../prisma/generated/client';
import { prisma } from './prisma';

// Each branch walks one ordered index range. Only the first `amount` candidates
// from each status can contribute to the first `amount` points overall.
export function tripDatapointsQuery(
  tripId: string,
  start: Date,
  end: Date,
  amount: number,
  mapOnly = false
) {
  // Leaflet uses double precision already. Return numeric coordinates directly so
  // map reads avoid transferring and constructing high-precision Decimal fields.
  const columns = mapOnly
    ? Prisma.sql`d.id, d.time, d.lat * 1e0 AS lat, d.\`long\` * 1e0 AS \`long\`, d.propulsion`
    : Prisma.sql`d.*`;
  return Prisma.sql`
    SELECT ${columns} FROM Datapoint d
    INNER JOIN (
      SELECT candidates.id, candidates.time FROM (
        (SELECT id, time FROM Datapoint
         WHERE tripId = ${tripId} AND optimized = 0 AND time >= ${start} AND time <= ${end}
         ORDER BY time ASC, id ASC LIMIT ${amount})
        UNION ALL
        (SELECT id, time FROM Datapoint
         WHERE tripId = ${tripId} AND optimized = 2 AND time >= ${start} AND time <= ${end}
         ORDER BY time ASC, id ASC LIMIT ${amount})
      ) candidates
      ORDER BY candidates.time ASC, candidates.id ASC LIMIT ${amount}
    ) page ON d.id = page.id
    ORDER BY page.time ASC, page.id ASC
  `;
}

export async function readTripDatapoints(tripId: string, start: Date, end: Date, amount: number) {
  if (amount === 0) return [];
  return prisma.$queryRaw<Datapoint[]>(tripDatapointsQuery(tripId, start, end, amount));
}

export type MapDatapoint = Pick<Datapoint, 'id' | 'time' | 'propulsion'> & {
  lat: number;
  long: number;
};

export async function readMapTripDatapoints(
  tripId: string,
  start: Date,
  end: Date,
  amount: number
) {
  if (amount === 0) return [];
  return prisma.$queryRaw<MapDatapoint[]>(tripDatapointsQuery(tripId, start, end, amount, true));
}
