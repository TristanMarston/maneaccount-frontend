/*
  Warnings:

  - You are about to drop the column `subcontractorId` on the `Job` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_subcontractorId_fkey";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "subcontractorId";

-- CreateTable
CREATE TABLE "_SubcontractorJobs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubcontractorJobs_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SubcontractorJobs_B_index" ON "_SubcontractorJobs"("B");

-- AddForeignKey
ALTER TABLE "_SubcontractorJobs" ADD CONSTRAINT "_SubcontractorJobs_A_fkey" FOREIGN KEY ("A") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubcontractorJobs" ADD CONSTRAINT "_SubcontractorJobs_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
