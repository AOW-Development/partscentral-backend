-- AlterTable
ALTER TABLE `yardhistory` ADD COLUMN `shipping` VARCHAR(191) NULL,
    ADD COLUMN `yardCost` JSON NULL;
