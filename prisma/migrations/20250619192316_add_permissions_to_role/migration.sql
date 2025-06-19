-- AlterTable
ALTER TABLE `role` ADD COLUMN `canAddDatapoint` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canAddMedia` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canDeleteAllTrips` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canDeleteCrewedTrips` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canDeleteOwnTrips` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canEditAllTrips` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canEditAllUser` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canEditOwnTrips` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canEditOwnUser` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canSeeAllMedia` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canViewAllTrips` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canViewAllUserdata` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `session` MODIFY `secret` LONGBLOB NOT NULL;
