-- AlterTable
ALTER TABLE `Media` ADD COLUMN `deleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;
