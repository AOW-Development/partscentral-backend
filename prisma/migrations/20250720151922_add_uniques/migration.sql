/*
  Warnings:

  - A unique constraint covering the columns `[name,makeId]` on the table `Model` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,partTypeId]` on the table `SubPart` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[value]` on the table `Year` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Model_name_makeId_key` ON `Model`(`name`, `makeId`);

-- CreateIndex
CREATE UNIQUE INDEX `SubPart_name_partTypeId_key` ON `SubPart`(`name`, `partTypeId`);

-- CreateIndex
CREATE UNIQUE INDEX `Year_value_key` ON `Year`(`value`);
