import { prisma } from '../src/lib/server/prisma';

export async function calculateUsers() {
    let calculatedUsers = await prisma.user.findMany({
        where:{
            recalculate: true
        },
        select: {
            username: true,
        }
    });
    for (let user of calculatedUsers){
        await calculateUser(user.username);
    }
}

export async function calculateUser(user: string) {
    let userTrips = await prisma.trip.findMany({
        where: {
            OR: [{
                crew: {
                    some: {
                        username: user
                    }
                }
            },{
                skipper: {
                    username: user
                }
            }]
        },
        select: {
            id: true,
            skipperName: true,
            length_motor: true,
            length_sail: true
        }
    });

    let crewedLengthSail:number = 0;
    let crewedLengthMotor:number = 0;
    let skipperedLengthSail:number = 0;
    let skipperedLengthMotor:number = 0;
    console.log("calculating " + user + " total length!");
    for(let trip of userTrips){
        if(trip.skipperName == user){
            skipperedLengthMotor += Number(trip.length_motor);
            skipperedLengthSail += Number(trip.length_sail);
        }
        crewedLengthSail += Number(trip.length_sail);
        crewedLengthMotor += Number(trip.length_motor);
    }
    
    await prisma.user.update({
        where: {
            username: user
        },
        data:{
            crewedLengthSail: crewedLengthSail,
            crewedLengthMotor: crewedLengthMotor,
            skipperedLengthSail: skipperedLengthSail,
            skipperedLengthMotor: skipperedLengthMotor,
            recalculate: false
        }
    });
    console.log("FINISHED");
}