/*
  Warnings:

  - You are about to drop the column `scheduledEndTime` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledStartTime` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the `ShowDay` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ShowDay" DROP CONSTRAINT "ShowDay_showId_fkey";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "scheduledEndTime",
DROP COLUMN "scheduledStartTime",
ADD COLUMN     "scheduledDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobAssignment" ADD COLUMN     "completedServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "ShowDay";
