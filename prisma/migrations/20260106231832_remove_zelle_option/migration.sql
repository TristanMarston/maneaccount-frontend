/*
  Warnings:

  - You are about to drop the column `zelleEnabled` on the `User` table. All the data in the column will be lost.
  - The `zelle` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "zelleEnabled",
DROP COLUMN "zelle",
ADD COLUMN     "zelle" "ZelleOption" NOT NULL DEFAULT 'disabled';
