import { randomUUID } from 'node:crypto';
import { afterAll, expect, test } from 'vitest';
import { db } from '../helpers/database';
import { prisma } from '../../src/lib/server/prisma';
import { appendTripEdgePoints } from '../../src/lib/server/tripEdgePoints';

afterAll(async () => {
  await prisma.$disconnect();
  await db.$disconnect();
});

test('batched edges preserve order, empty trips, single points and tied timestamps', async () => {
  const trips = Array.from({ length: 205 }, (_, i) => ({
    id: randomUUID(),
    name: `Edge test ${i}`
  }));
  await db.trip.createMany({ data: trips });
  const prefix = randomUUID();
  const first = { id: `${prefix}-a`, tripId: trips[0].id, time: new Date(1000), lat: 43, long: 14 };
  const tied = { ...first, id: `${prefix}-b` };
  const last = { ...first, id: `${prefix}-c`, time: new Date(2000) };
  const single = { ...first, id: `${prefix}-single`, tripId: trips[204].id };
  // Deliberately insert out of chronological order.
  await db.datapoint.createMany({ data: [last, tied, single, first] });

  const result = await appendTripEdgePoints(trips);
  expect(result.map(({ id }) => id)).toEqual(trips.map(({ id }) => id));
  expect(result[0]).toMatchObject({
    ...trips[0],
    startPoint: { id: first.id },
    endPoint: { id: last.id }
  });
  expect(result[1]).toEqual({ ...trips[1], startPoint: null, endPoint: null });
  expect(result[204]).toMatchObject({ startPoint: { id: single.id }, endPoint: { id: single.id } });

  await db.datapoint.delete({ where: { id: last.id } });
  const [tiedResult] = await appendTripEdgePoints([trips[0]]);
  expect(tiedResult.startPoint?.id).toBe(first.id);
  expect(tiedResult.endPoint?.id).toBe(tied.id);
  expect(await appendTripEdgePoints([])).toEqual([]);
});
