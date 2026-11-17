import { randomUUID } from 'node:crypto';
import { afterAll, expect, test } from 'vitest';
import { Prisma } from '../../prisma/generated/client';
import { db } from '../helpers/database';
import { prisma } from '../../src/lib/server/prisma';
import {
  readMapTripDatapoints,
  readTripDatapoints,
  tripDatapointsQuery
} from '../../src/lib/server/tripDatapoints';

afterAll(async () => {
  await prisma.$disconnect();
  await db.$disconnect();
});

test('map reads use covered status ranges and preserve the Prisma response on a large simplified trip', async () => {
  const trip = await db.trip.create({ data: { name: 'Large map query regression' } });
  const otherTrip = await db.trip.create({ data: { name: 'Unrelated map query regression' } });
  const prefix = randomUUID();
  const start = new Date('2026-01-01T00:00:00Z');
  const end = new Date(start.getTime() + 200000);
  const data = Array.from({ length: 32000 }, (_, i) => ({
    id: `${prefix}-${String(i).padStart(5, '0')}`,
    tripId: trip.id,
    time: new Date(start.getTime() + (i < 20000 ? i : 100000 + Math.floor(i / 3))),
    optimized: i < 20000 ? 1 : i % 2 === 0 ? 0 : 2,
    lat: '43.12345678901234567890123456789',
    long: '-14.98765432109876543210987654321',
    speed: i % 3 === 0 ? null : '2.12345678901234567890',
    heading: 180,
    depth: '12.345',
    h_accuracy: null,
    v_accuracy: '0.5',
    propulsion: i % 4
  }));
  for (let offset = 0; offset < data.length; offset += 1000) {
    await db.datapoint.createMany({ data: data.slice(offset, offset + 1000) });
  }
  await db.datapoint.createMany({
    data: [
      { tripId: otherTrip.id, lat: 0, long: 0, time: start },
      { tripId: trip.id, lat: 0, long: 0, time: new Date(start.getTime() - 1) },
      { tripId: trip.id, lat: 0, long: 0, time: new Date(end.getTime() + 1) }
    ]
  });

  const baselineStart = performance.now();
  const baseline = await prisma.datapoint.findMany({
    where: { tripId: trip.id, optimized: { in: [0, 2] }, time: { gte: start, lte: end } },
    orderBy: [{ time: 'asc' }, { id: 'asc' }],
    take: 5000
  });
  const baselineMs = performance.now() - baselineStart;
  const indexedStart = performance.now();
  const actual = await readTripDatapoints(trip.id, start, end, 5000);
  const indexedMs = performance.now() - indexedStart;
  expect(actual).toHaveLength(5000);
  // Check dates, nullable fields, and full-precision Decimal serialization as well as IDs/order.
  expect(JSON.parse(JSON.stringify(actual))).toEqual(JSON.parse(JSON.stringify(baseline)));
  expect(actual.every((point) => point.tripId === trip.id && point.optimized !== 1)).toBe(true);
  const mapPoints = await readMapTripDatapoints(trip.id, start, end, 5000);
  expect(mapPoints).toEqual(
    baseline.map((point) => ({
      id: point.id,
      time: point.time,
      lat: Number(point.lat),
      long: Number(point.long),
      propulsion: point.propulsion
    }))
  );
  expect(JSON.stringify(mapPoints).length).toBeLessThan(JSON.stringify(actual).length / 2);

  const planRows = await prisma.$queryRaw<{ EXPLAIN: string }[]>(Prisma.sql`
      EXPLAIN FORMAT=JSON ${tripDatapointsQuery(trip.id, start, end, 5000)}
  `);
  const tables: Record<string, any>[] = [];
  function visit(value: any) {
    if (!value || typeof value !== 'object') return;
    if (value.table_name === 'Datapoint') tables.push(value);
    for (const item of Object.values(value)) visit(item);
  }
  visit(JSON.parse(planRows[0].EXPLAIN));
  expect(tables).toHaveLength(2);
  for (const table of tables) {
    expect(table.key).toBe('Datapoint_tripId_optimized_time_id_idx');
    expect(table.used_key_parts).toEqual(expect.arrayContaining(['tripId', 'optimized', 'time']));
    expect(table.using_index).toBe(true);
  }
  console.info('Map query benchmark on 32000 points (ms):', { baselineMs, indexedMs });

  const boundary = actual[1];
  const tied = await readTripDatapoints(trip.id, boundary.time, boundary.time, 10);
  expect(tied.length).toBeGreaterThan(1);
  expect(tied.every((point) => point.time.getTime() === boundary.time.getTime())).toBe(true);
  expect(await readTripDatapoints(trip.id, start, end, 0)).toEqual([]);
  expect(await readMapTripDatapoints(trip.id, start, end, 0)).toEqual([]);
  expect(await readTripDatapoints(trip.id, end, start, 5000)).toEqual([]);
}, 60000);
