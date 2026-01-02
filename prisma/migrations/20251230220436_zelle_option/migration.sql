/*
  Warnings:

  - The `zelleEnabled` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ZelleOption" AS ENUM ('email', 'phone', 'link', 'disabled');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "zelleEnabled",
ADD COLUMN     "zelleEnabled" "ZelleOption" NOT NULL DEFAULT 'disabled';
