-- DropIndex
DROP INDEX `User_email_key` ON `user`;

-- AlterTable
ALTER TABLE `session` MODIFY `secret` LONGBLOB NOT NULL;
