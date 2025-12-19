/*
  Warnings:

  - You are about to drop the column `name` on the `Horse` table. All the data in the column will be lost.
  - Added the required column `barnName` to the `Horse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `showName` to the `Horse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Horse" DROP COLUMN "name",
ADD COLUMN     "barnName" TEXT NOT NULL,
ADD COLUMN     "showName" TEXT NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "gender" DROP DEFAULT;
