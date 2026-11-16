import { Prisma, type Datapoint } from '../../../prisma/generated/client';
import { prisma } from './prisma';

// Each branch walks one ordered index range. Only the first `amount` candidates
// from each status can contribute to the first `amount` points overall.
export function tripDatapointsQuery(tripId: string, start: Date, end: Date, amount: number) {
  return Prisma.sql`
    SELECT d.* FROM Datapoint d
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
