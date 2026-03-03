-- CreateEnum
CREATE TYPE "SubcontractorStatus" AS ENUM ('braider_control', 'delegated', 'pending', 'redirected');

-- AlterTable
ALTER TABLE "JobAssignment" ADD COLUMN     "subcontractorStatus" "SubcontractorStatus" NOT NULL DEFAULT 'braider_control';
