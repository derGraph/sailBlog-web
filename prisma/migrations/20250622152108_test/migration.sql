-- DropIndex
DROP INDEX `User_email_key` ON `User`;

-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;
