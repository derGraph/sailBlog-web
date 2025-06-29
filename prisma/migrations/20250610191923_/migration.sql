-- CreateTable
CREATE TABLE `User` (
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `profilePictureId` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `roleId` VARCHAR(191) NOT NULL DEFAULT 'user',
    `activeTripId` VARCHAR(191) NULL,
    `crewedLengthSail` INTEGER NOT NULL DEFAULT 0,
    `crewedLengthMotor` INTEGER NOT NULL DEFAULT 0,
    `skipperedLengthSail` INTEGER NOT NULL DEFAULT 0,
    `skipperedLengthMotor` INTEGER NOT NULL DEFAULT 0,
    `recalculate` BOOLEAN NOT NULL DEFAULT true,
    `lastPing` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_profilePictureId_key`(`profilePictureId`),
    PRIMARY KEY (`username`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `ip` VARCHAR(191) NULL,
    `session_created` DATETIME(3) NULL,
    `last_use` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Key` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `primary` BOOLEAN NOT NULL,

    UNIQUE INDEX `Key_id_key`(`id`),
    INDEX `Key_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trip` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `startPointId` VARCHAR(191) NULL,
    `endPointId` VARCHAR(191) NULL,
    `last_update` DATETIME(3) NOT NULL,
    `length_sail` DECIMAL(65, 30) NULL,
    `length_motor` DECIMAL(65, 30) NULL,
    `skipperName` VARCHAR(191) NULL,
    `visibility` INTEGER NOT NULL DEFAULT 1,
    `recalculate` BOOLEAN NOT NULL DEFAULT true,
    `deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Trip_startPointId_key`(`startPointId`),
    UNIQUE INDEX `Trip_endPointId_key`(`endPointId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Datapoint` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lat` DECIMAL(65, 30) NOT NULL,
    `long` DECIMAL(65, 30) NOT NULL,
    `speed` DECIMAL(65, 30) NULL,
    `heading` DECIMAL(65, 30) NULL,
    `depth` DECIMAL(65, 30) NULL,
    `h_accuracy` DECIMAL(65, 30) NULL,
    `v_accuracy` DECIMAL(65, 30) NULL,
    `propulsion` INTEGER NULL,
    `optimized` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Location` (
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Media` (
    `id` VARCHAR(191) NOT NULL,
    `visibility` INTEGER NOT NULL DEFAULT 1,
    `username` VARCHAR(191) NOT NULL,
    `alt` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_crew` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_crew_AB_unique`(`A`, `B`),
    INDEX `_crew_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_LocationToTrip` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_LocationToTrip_AB_unique`(`A`, `B`),
    INDEX `_LocationToTrip_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_profilePictureId_fkey` FOREIGN KEY (`profilePictureId`) REFERENCES `Media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_activeTripId_fkey` FOREIGN KEY (`activeTripId`) REFERENCES `Trip`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`username`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Key` ADD CONSTRAINT `Key_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`username`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trip` ADD CONSTRAINT `Trip_startPointId_fkey` FOREIGN KEY (`startPointId`) REFERENCES `Datapoint`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trip` ADD CONSTRAINT `Trip_endPointId_fkey` FOREIGN KEY (`endPointId`) REFERENCES `Datapoint`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trip` ADD CONSTRAINT `Trip_skipperName_fkey` FOREIGN KEY (`skipperName`) REFERENCES `User`(`username`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Datapoint` ADD CONSTRAINT `Datapoint_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_username_fkey` FOREIGN KEY (`username`) REFERENCES `User`(`username`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_crew` ADD CONSTRAINT `_crew_A_fkey` FOREIGN KEY (`A`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_crew` ADD CONSTRAINT `_crew_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`username`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LocationToTrip` ADD CONSTRAINT `_LocationToTrip_A_fkey` FOREIGN KEY (`A`) REFERENCES `Location`(`name`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LocationToTrip` ADD CONSTRAINT `_LocationToTrip_B_fkey` FOREIGN KEY (`B`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
