/*
  Warnings:

  - You are about to drop the column `crewedLenthUnknown` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `crewedLenthUnknown`,
    ADD COLUMN `crewedLengthUnknown` INTEGER NOT NULL DEFAULT 0;
