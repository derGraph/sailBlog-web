import { prisma } from './prisma.js';
import { calculateUserDistances } from './tripCalculations.js';

export async function calculateUsers() {
  let calculatedUsers = await prisma.user.findMany({
    where: {
      recalculate: true
    },
    select: {
      username: true
    }
  });
  for (let user of calculatedUsers) {
    await calculateUser(user.username);
  }
}

export async function calculateUser(user: string) {
  let userTrips = await prisma.trip.findMany({
    where: {
      deleted: false,
      OR: [
        {
          crew: {
            some: {
              username: user
            }
          }
        },
        {
          skipper: {
            username: user
          }
        }
      ]
    },
    select: {
      id: true,
      skipperName: true,
      length_motor: true,
      length_sail: true,
      length_unknown: true
    }
  });

  await prisma.user.update({
    where: {
      username: user
    },
    data: {
      ...calculateUserDistances(user, userTrips),
      recalculate: false
    }
  });
}
