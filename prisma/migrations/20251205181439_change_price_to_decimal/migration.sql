/*
  Warnings:

  - You are about to alter the column `priceUSD` on the `Service` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "priceUSD" SET DATA TYPE DECIMAL(10,2);
