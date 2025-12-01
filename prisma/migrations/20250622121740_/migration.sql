-- AlterTable
ALTER TABLE `Role` ADD COLUMN `canUseMagicLink` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canViewRoles` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `needsPassword` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;
