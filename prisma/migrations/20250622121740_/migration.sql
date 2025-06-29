-- AlterTable
ALTER TABLE `role` ADD COLUMN `canUseMagicLink` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canViewRoles` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `needsPassword` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `session` MODIFY `secret` LONGBLOB NOT NULL;
