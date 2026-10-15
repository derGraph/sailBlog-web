import { getDistance } from 'geolib';

interface RoutePoint {
  lat: unknown;
  long: unknown;
  propulsion: number | null;
}

interface TripDistances {
  skipperName: string | null;
  length_sail: unknown;
  length_motor: unknown;
  length_unknown: unknown;
}

export function calculateTripDistances(points: RoutePoint[]) {
  const totals = { length_sail: 0, length_motor: 0, length_unknown: 0 };
  for (let i = 0; i < points.length - 1; i++) {
    const distance = getDistance(
      { latitude: Number(points[i].lat), longitude: Number(points[i].long) },
      { latitude: Number(points[i + 1].lat), longitude: Number(points[i + 1].long) }
    );
    switch (points[i + 1].propulsion) {
      case 1:
        totals.length_motor += distance;
        break;
      case 2:
        totals.length_sail += distance;
        break;
      case 3:
        totals.length_unknown += distance;
        break;
    }
  }
  return totals;
}

export function calculateUserDistances(username: string, trips: TripDistances[]) {
  const totals = {
    crewedLengthSail: 0,
    crewedLengthMotor: 0,
    crewedLengthUnknown: 0,
    skipperedLengthSail: 0,
    skipperedLengthMotor: 0,
    skipperedLengthUnknown: 0
  };
  for (const trip of trips) {
    totals.crewedLengthSail += Number(trip.length_sail);
    totals.crewedLengthMotor += Number(trip.length_motor);
    totals.crewedLengthUnknown += Number(trip.length_unknown);
    if (trip.skipperName === username) {
      totals.skipperedLengthSail += Number(trip.length_sail);
      totals.skipperedLengthMotor += Number(trip.length_motor);
      totals.skipperedLengthUnknown += Number(trip.length_unknown);
    }
  }
  return totals;
}
