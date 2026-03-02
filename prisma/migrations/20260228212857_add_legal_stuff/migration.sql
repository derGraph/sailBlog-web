-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `ageConfirmedAt` DATETIME(3) NULL,
    ADD COLUMN `legalAcceptedAt` DATETIME(3) NULL,
    ADD COLUMN `privacyVersionAccepted` VARCHAR(191) NULL,
    ADD COLUMN `termsVersionAccepted` VARCHAR(191) NULL;
