/*
  Warnings:

  - Made the column `milesPromised` on table `orderitem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `orderitem` MODIFY `milesPromised` VARCHAR(191) NOT NULL;
