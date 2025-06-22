-- AlterTable
ALTER TABLE `role` ADD COLUMN `canCreateUser` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `session` MODIFY `secret` LONGBLOB NOT NULL;
