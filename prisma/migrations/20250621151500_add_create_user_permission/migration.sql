-- AlterTable
ALTER TABLE `Role` ADD COLUMN `canCreateUser` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;
