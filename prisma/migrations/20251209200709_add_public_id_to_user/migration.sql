/*
  Warnings:

  - A unique constraint covering the columns `[publicID]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "publicID" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_publicID_key" ON "User"("publicID");
