import { afterAll, describe, expect, it } from 'vitest';
import { calculateDistance } from '../../workers/simplifyGps';
import { calculateUser } from '../../workers/calculateUser';
import { locateImages } from '../../workers/locateImages';
import { prisma } from '../../workers/prisma';
import { db, seedActors, seedTrip } from '../helpers/database';

afterAll(async () => {
  await Promise.all([db.$disconnect(), prisma.$disconnect()]);
});
describe('worker database updates', () => {
  it('persists every route segment while ignoring discarded datapoints', async () => {
    const actors = await seedActors();
    const trip = await seedTrip(actors);
    await db.datapoint.createMany({
      data: [
        { tripId: trip.id, lat: 0, long: 0, time: new Date(0), propulsion: 0, optimized: 2 },
        { tripId: trip.id, lat: 10, long: 10, time: new Date(1000), propulsion: 3, optimized: 1 },
        { tripId: trip.id, lat: 0, long: 0.001, time: new Date(2000), propulsion: 1, optimized: 2 },
        { tripId: trip.id, lat: 0, long: 0.002, time: new Date(3000), propulsion: 2, optimized: 0 }
      ]
    });
    await calculateDistance(trip.id);
    const updated = await db.trip.findUniqueOrThrow({ where: { id: trip.id } });
    expect(Number(updated.length_motor)).toBe(111);
    expect(Number(updated.length_sail)).toBe(111);
    expect(Number(updated.length_unknown)).toBe(0);
  });
  it('updates crew/skipper totals and excludes deleted voyages', async () => {
    const actors = await seedActors();
    await db.trip.create({
      data: {
        name: 'Owned voyage',
        skipperName: actors.owner.username,
        length_sail: 100,
        length_motor: 50,
        crew: { connect: { username: actors.owner.username } }
      }
    });
    await db.trip.create({
      data: {
        name: 'Crewed voyage',
        skipperName: actors.crew.username,
        length_sail: 20,
        length_unknown: 30,
        crew: { connect: { username: actors.owner.username } }
      }
    });
    await db.trip.create({
      data: {
        name: 'Deleted voyage',
        deleted: true,
        skipperName: actors.owner.username,
        length_sail: 9999
      }
    });
    await calculateUser(actors.owner.username);
    const updated = await db.user.findUniqueOrThrow({ where: { username: actors.owner.username } });
    expect(updated).toMatchObject({
      crewedLengthSail: 120,
      crewedLengthMotor: 50,
      crewedLengthUnknown: 30,
      skipperedLengthSail: 100,
      skipperedLengthMotor: 50,
      recalculate: false
    });
  });
  it('locates a photograph at the nearest datapoint and leaves undated photos alone', async () => {
    const actors = await seedActors();
    const trip = await seedTrip(actors);
    await db.datapoint.createMany({
      data: [
        { tripId: trip.id, lat: 43, long: 14, time: new Date(0) },
        { tripId: trip.id, lat: 44, long: 15, time: new Date(60000) }
      ]
    });
    const photo = await db.media.create({
      data: { username: actors.owner.username, tripId: trip.id, created: new Date(50000) }
    });
    const undated = await db.media.create({
      data: { username: actors.owner.username, tripId: trip.id }
    });
    await locateImages();
    const updated = await db.media.findUniqueOrThrow({ where: { id: photo.id } });
    expect(Number(updated.lat)).toBe(44);
    expect(Number(updated.long)).toBe(15);
    expect((await db.media.findUniqueOrThrow({ where: { id: undated.id } })).lat).toBeNull();
  });
});
