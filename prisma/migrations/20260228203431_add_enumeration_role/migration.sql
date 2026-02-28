-- AlterTable
ALTER TABLE `Role` ADD COLUMN `canEnumerateAllUsers` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;
