import { describe, expect, it } from 'vitest';
import { removeSensitiveData } from '../../src/lib/server/functions';

describe('public trip data', () => {
  it('redacts all private user fields, including Date-valued birth dates', () => {
    const user = {
      username: 'skipper',
      email: 'private@example.com',
      roleId: 'admin',
      activeTripId: 'private-trip',
      dateOfBirth: new Date('1990-01-02'),
      lastPing: new Date(),
      firstName: 'Public',
      lastName: 'Name'
    };
    expect(removeSensitiveData(user)).toEqual({
      username: 'skipper',
      email: null,
      roleId: null,
      activeTripId: null,
      dateOfBirth: null,
      lastPing: null,
      firstName: 'Public',
      lastName: 'Name'
    });
  });
  it('cleans nested crew arrays and skipper records while preserving trip dates', () => {
    const time = new Date('2026-10-14T12:00:00Z');
    const trip = {
      crew: [{ username: 'crew', email: 'secret', dateOfBirth: time }],
      skipper: { roleId: 'admin' },
      startPoint: { time },
      description: null
    };
    const result = removeSensitiveData(trip);
    expect(result.crew[0]).toEqual({ username: 'crew', email: null, dateOfBirth: null });
    expect(result.skipper.roleId).toBeNull();
    expect(result.startPoint.time).toBe(time);
    expect(result.description).toBeNull();
  });
  it('handles nulls, primitives, and empty collections', () => {
    expect(removeSensitiveData(null)).toBeNull();
    expect(removeSensitiveData([])).toEqual([]);
    expect(removeSensitiveData({})).toEqual({});
    expect(removeSensitiveData([null, 0, 'public', { email: 'secret' }])).toEqual([
      null,
      0,
      'public',
      { email: null }
    ]);
  });
});
