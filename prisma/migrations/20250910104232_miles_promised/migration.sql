/*
  Warnings:

  - You are about to alter the column `milesPromised` on the `orderitem` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(18,2)`.

*/
-- AlterTable
ALTER TABLE `orderitem` MODIFY `milesPromised` DECIMAL(18, 2) NULL;
