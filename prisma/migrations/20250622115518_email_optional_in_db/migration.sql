-- AlterTable
ALTER TABLE `session` MODIFY `secret` LONGBLOB NOT NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `email` VARCHAR(191) NULL;
