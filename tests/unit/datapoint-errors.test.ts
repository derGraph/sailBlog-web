import { beforeEach, expect, test, vi } from 'vitest';

const database = vi.hoisted(() => ({
  trip: { findFirst: vi.fn() },
  datapoint: { findMany: vi.fn() }
}));
vi.mock('#lib/server/prisma.ts', () => ({ prisma: database }));

import { GET } from '../../src/routes/api/Datapoints/+server';
import { RequestTimings } from '../../src/lib/server/requestTimings';

beforeEach(() => {
  vi.resetAllMocks();
  database.trip.findFirst.mockResolvedValue({ id: 'cvjptf7ng5x1g8b3kmmburp4' });
});

function request() {
  return GET({
    url: new URL('http://localhost/api/Datapoints?tripId=cvjptf7ng5x1g8b3kmmburp4'),
    locals: { user: null, role: null, session: null, requestTimings: new RequestTimings() }
  } as unknown as Parameters<typeof GET>[0]);
}

test.each(['access', 'points'])('a pool timeout during %s returns a generic 500', async (stage) => {
  const failure = new Error('pool timeout: failed to retrieve a connection');
  if (stage === 'access') database.trip.findFirst.mockRejectedValue(failure);
  else database.datapoint.findMany.mockRejectedValue(failure);
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await expect(request()).rejects.toMatchObject({
      status: 500,
      body: { message: 'Unable to load datapoints. Please try again.' }
    });
    expect(log).toHaveBeenCalledWith('Failed to load datapoints:', failure);
  } finally {
    log.mockRestore();
  }
});

test('a missing or inaccessible trip stays a 404 and does not read its points', async () => {
  database.trip.findFirst.mockResolvedValue(null);
  await expect(request()).rejects.toMatchObject({
    status: 404,
    body: { message: 'Trip not found.' }
  });
  expect(database.datapoint.findMany).not.toHaveBeenCalled();
});
