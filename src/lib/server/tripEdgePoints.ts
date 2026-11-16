import { Prisma, type Datapoint } from '../../../prisma/generated/client';
import { prisma } from './prisma';

type EdgeIds = {
  tripId: string;
  startPointId: string | null;
  endPointId: string | null;
};

export async function appendTripEdgePoints<T extends { id: string }>(trips: T[]) {
  const result: (T & { startPoint: Datapoint | null; endPoint: Datapoint | null })[] = [];

  // Two queries per batch, issued sequentially, instead of two concurrent queries per trip.
  for (let offset = 0; offset < trips.length; offset += 200) {
    const batch = trips.slice(offset, offset + 200);
    const edges = await prisma.$queryRaw<EdgeIds[]>(Prisma.sql`
      SELECT t.id AS tripId,
        (SELECT d.id FROM Datapoint d WHERE d.tripId = t.id
         ORDER BY d.time ASC, d.id ASC LIMIT 1) AS startPointId,
        (SELECT d.id FROM Datapoint d WHERE d.tripId = t.id
         ORDER BY d.time DESC, d.id DESC LIMIT 1) AS endPointId
      FROM Trip t WHERE t.id IN (${Prisma.join(batch.map((trip) => trip.id))})
    `);
    const pointIds = [
      ...new Set(edges.flatMap((edge) => [edge.startPointId, edge.endPointId]))
    ].filter((id): id is string => id !== null);
    const points = pointIds.length
      ? await prisma.datapoint.findMany({ where: { id: { in: pointIds } } })
      : [];
    const pointsById = new Map(points.map((point) => [point.id, point]));
    const edgesByTrip = new Map(edges.map((edge) => [edge.tripId, edge]));

    for (const trip of batch) {
      const edge = edgesByTrip.get(trip.id);
      result.push({
        ...trip,
        startPoint: pointsById.get(edge?.startPointId ?? '') ?? null,
        endPoint: pointsById.get(edge?.endPointId ?? '') ?? null
      });
    }
  }

  return result;
}
