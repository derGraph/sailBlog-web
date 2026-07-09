-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;

-- AlterTable
ALTER TABLE `Trip` ADD COLUMN `length_unknown` DECIMAL(65, 30) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `crewedLenthUnknown` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `skipperedLengthUnknown` INTEGER NOT NULL DEFAULT 0;
