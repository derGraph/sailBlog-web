-- AlterTable
ALTER TABLE `role` ADD COLUMN `canCreateAllTrips` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canCreateOwnTrips` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `session` MODIFY `secret` LONGBLOB NOT NULL;
