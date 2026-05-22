/*
  Warnings:

  - You are about to drop the column `hasUsedPromoOne` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `hasUsedPromoThree` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `hasUsedPromoTwo` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "hasUsedPromoOne",
DROP COLUMN "hasUsedPromoThree",
DROP COLUMN "hasUsedPromoTwo";
