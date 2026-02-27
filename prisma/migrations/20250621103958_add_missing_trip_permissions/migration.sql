-- AlterTable
ALTER TABLE `Role` ADD COLUMN `canCreateAllTrips` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canCreateOwnTrips` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;
