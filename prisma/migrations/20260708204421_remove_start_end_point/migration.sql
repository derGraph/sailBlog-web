/*
  Warnings:

  - You are about to drop the column `endPointId` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `startPointId` on the `Trip` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Trip` DROP FOREIGN KEY `Trip_endPointId_fkey`;

-- DropForeignKey
ALTER TABLE `Trip` DROP FOREIGN KEY `Trip_startPointId_fkey`;

-- DropIndex
DROP INDEX `Trip_endPointId_key` ON `Trip`;

-- DropIndex
DROP INDEX `Trip_startPointId_key` ON `Trip`;

-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;

-- AlterTable
ALTER TABLE `Trip` DROP COLUMN `endPointId`,
    DROP COLUMN `startPointId`;
