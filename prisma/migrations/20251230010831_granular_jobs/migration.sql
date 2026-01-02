/*
  Warnings:

  - You are about to drop the `_HorseToJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_JobToService` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_HorseToJob" DROP CONSTRAINT "_HorseToJob_A_fkey";

-- DropForeignKey
ALTER TABLE "_HorseToJob" DROP CONSTRAINT "_HorseToJob_B_fkey";

-- DropForeignKey
ALTER TABLE "_JobToService" DROP CONSTRAINT "_JobToService_A_fkey";

-- DropForeignKey
ALTER TABLE "_JobToService" DROP CONSTRAINT "_JobToService_B_fkey";

-- DropTable
DROP TABLE "_HorseToJob";

-- DropTable
DROP TABLE "_JobToService";

-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "horseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_JobAssignmentToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JobAssignmentToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_JobAssignmentToService_B_index" ON "_JobAssignmentToService"("B");

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobAssignmentToService" ADD CONSTRAINT "_JobAssignmentToService_A_fkey" FOREIGN KEY ("A") REFERENCES "JobAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobAssignmentToService" ADD CONSTRAINT "_JobAssignmentToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
