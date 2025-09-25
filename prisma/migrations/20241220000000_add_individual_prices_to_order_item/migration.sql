-- Add individual price fields to OrderItem table
ALTER TABLE `OrderItem` ADD COLUMN `taxesPrice` DECIMAL(18,2) NULL;
ALTER TABLE `OrderItem` ADD COLUMN `handlingPrice` DECIMAL(18,2) NULL;
ALTER TABLE `OrderItem` ADD COLUMN `processingPrice` DECIMAL(18,2) NULL;
ALTER TABLE `OrderItem` ADD COLUMN `corePrice` DECIMAL(18,2) NULL;
