/*
  Warnings:

  - You are about to alter the column `alternativePhone` on the `customer` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `phone` on the `customer` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `customer` MODIFY `alternativePhone` INTEGER NULL,
    MODIFY `phone` INTEGER NULL;

-- AlterTable
ALTER TABLE `yardhistory` ADD COLUMN `yardCharge` VARCHAR(191) NULL,
    ADD COLUMN `yardCorePrice` DECIMAL(18, 2) NULL,
    ADD COLUMN `yardHandlingFee` DECIMAL(18, 2) NULL,
    ADD COLUMN `yardProcessingFee` DECIMAL(18, 2) NULL,
    ADD COLUMN `yardTaxesPrice` DECIMAL(18, 2) NULL;

-- AlterTable
ALTER TABLE `yardinfo` ADD COLUMN `yardCorePrice` DECIMAL(18, 2) NULL,
    ADD COLUMN `yardHandlingFee` DECIMAL(18, 2) NULL,
    ADD COLUMN `yardProcessingFee` DECIMAL(18, 2) NULL,
    ADD COLUMN `yardTaxesPrice` DECIMAL(18, 2) NULL;
