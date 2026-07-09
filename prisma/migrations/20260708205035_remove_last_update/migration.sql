/*
  Warnings:

  - You are about to drop the column `last_update` on the `Trip` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Session` MODIFY `secret` LONGBLOB NOT NULL;

-- AlterTable
ALTER TABLE `Trip` DROP COLUMN `last_update`;
