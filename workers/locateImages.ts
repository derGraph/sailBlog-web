import { Media } from "@prisma-custom/client";
import { prisma } from "./prisma.js";

export async function locateImages() {
    let images = await prisma.media.findMany({
        where: { 
            lat: null,
            tripId: { not: null }
        },
        take: 1000
    });

    let returnImages = [];
    
    for (const image in images) {
        if(images[image].created == null) {
            continue;
        }


        let [earlierDatapoint, laterDatapoint] = await Promise.all([prisma.datapoint.findFirst({
            where: {
                tripId: images[image].tripId!,
                time: {lte: images[image].created}
            },
            orderBy: {
                time: "desc"
            }
        }),
        prisma.datapoint.findFirst({
            where: {
                tripId: images[image].tripId!,
                time: {gte: images[image].created}
            },
            orderBy: {
                time: "asc"
            }
        })]);

        let closest = null;

        if (earlierDatapoint && laterDatapoint) {
            const diffBefore = Math.abs(images[image].created!.getTime() - earlierDatapoint.time.getTime());
            const diffAfter = Math.abs(images[image].created!.getTime() - laterDatapoint.time.getTime());
            
            closest = diffBefore < diffAfter ? earlierDatapoint : laterDatapoint;
        } else {
            closest = earlierDatapoint || laterDatapoint;
        }

        if(closest == null) continue;

        images[image].lat = closest!.lat;
        images[image].long = closest!.long;

        returnImages.push(images[image]);
    }

    const updatePromises = returnImages.map((media) =>
        prisma.media.update({
            where: { id: media.id },
            data: {
                lat: media.lat,
                long: media.long
            },
        })
    );

    const updatedMediaResults:Media[] = await prisma.$transaction(updatePromises);

    updatedMediaResults.forEach(image => {
        console.log("Updated image: " + image.id);
    });
}
