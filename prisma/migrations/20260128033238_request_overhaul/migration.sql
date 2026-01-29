/*
  Warnings:

  - The values [pending,accepted,denied,canceled,completed] on the enum `JobStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `scheduledDate` on the `Job` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('pending', 'accepted', 'denied', 'canceled', 'completed');

-- AlterEnum
BEGIN;
CREATE TYPE "JobStatus_new" AS ENUM ('editing', 'submitted');
ALTER TABLE "public"."Job" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Job" ALTER COLUMN "status" TYPE "JobStatus_new" USING ("status"::text::"JobStatus_new");
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "public"."JobStatus_old";
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'editing';
COMMIT;

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "scheduledDate",
ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'editing';

-- AlterTable
ALTER TABLE "JobAssignment" ADD COLUMN     "assignmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "AssignmentStatus" NOT NULL DEFAULT 'pending';
