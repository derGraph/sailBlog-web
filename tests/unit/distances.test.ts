import { describe, expect, it } from 'vitest';
import { calculateTripDistances, calculateUserDistances } from '../../workers/tripCalculations';

const point = (long: number, propulsion: number) => ({ lat: 0, long, propulsion });
describe('voyage distances', () => {
  it('counts the only segment of a two-point route', () => {
    expect(calculateTripDistances([point(0, 0), point(0.001, 1)])).toEqual({
      length_motor: 111,
      length_sail: 0,
      length_unknown: 0
    });
  });
  it('counts the final segment and assigns each segment by its destination propulsion', () => {
    expect(
      calculateTripDistances([point(0, 0), point(0.001, 1), point(0.002, 2), point(0.003, 3)])
    ).toEqual({
      length_motor: 111,
      length_sail: 111,
      length_unknown: 111
    });
  });
  it('handles empty, single-point, stationary, and anchored routes', () => {
    for (const points of [
      [],
      [point(0, 1)],
      [point(0, 1), point(0, 1)],
      [point(0, 1), point(0.001, 0)]
    ]) {
      expect(calculateTripDistances(points)).toEqual({
        length_motor: 0,
        length_sail: 0,
        length_unknown: 0
      });
    }
  });
  it('separates skipper totals from crew totals and accepts database decimal values', () => {
    expect(
      calculateUserDistances('owner', [
        { skipperName: 'owner', length_sail: '100', length_motor: 50, length_unknown: null },
        { skipperName: 'other', length_sail: 20, length_motor: null, length_unknown: '30' }
      ])
    ).toEqual({
      crewedLengthSail: 120,
      crewedLengthMotor: 50,
      crewedLengthUnknown: 30,
      skipperedLengthSail: 100,
      skipperedLengthMotor: 50,
      skipperedLengthUnknown: 0
    });
  });
});
