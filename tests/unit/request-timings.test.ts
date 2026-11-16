import { afterEach, expect, test, vi } from 'vitest';
import { RequestTimings, watchRequest } from '../../src/lib/server/requestTimings';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('a stalled nested query is logged before it finishes, with its Cloudflare correlation ID', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const timings = new RequestTimings();
  const stop = watchRequest(timings, {
    method: 'GET',
    path: '/api/Datapoints',
    rayId: 'a5b8e1fb7dd265c3-FRA'
  });
  const blocked = Promise.withResolvers<void>();
  const operation = timings.measure('total', () =>
    timings.measure('datapoints', () => blocked.promise)
  );

  try {
    await vi.advanceTimersByTimeAsync(10000);
    expect(log).toHaveBeenCalledExactlyOnceWith('Request still running after 10s:', {
      method: 'GET',
      path: '/api/Datapoints',
      rayId: 'a5b8e1fb7dd265c3-FRA',
      elapsedMs: 10000,
      completedMs: {},
      activeMs: { total: 10000, datapoints: 10000 }
    });
  } finally {
    blocked.resolve();
    await operation;
    stop();
  }
  expect(timings.snapshot().activeMs).toEqual({});
});

test('completion clears the watchdog before it can emit a false stall report', async () => {
  vi.useFakeTimers();
  const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const timings = new RequestTimings();
  const stop = watchRequest(timings, { method: 'GET', path: '/api/Datapoints', rayId: null });
  try {
    await timings.measure('datapoints', async () => []);
  } finally {
    stop();
  }
  await vi.advanceTimersByTimeAsync(20000);
  expect(log).not.toHaveBeenCalled();
});

test('a failed stage retains its duration and is no longer reported as active', async () => {
  const timings = new RequestTimings();
  const failure = new Error('pool timeout');
  await expect(
    timings.measure('auth', async () => {
      throw failure;
    })
  ).rejects.toBe(failure);
  expect(timings.snapshot()).toEqual({ completedMs: { auth: expect.any(Number) }, activeMs: {} });
  expect(timings.toHeader()).toMatch(/^auth;dur=\d+\.\d$/);
});
