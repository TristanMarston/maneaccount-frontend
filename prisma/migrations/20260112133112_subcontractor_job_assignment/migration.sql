-- AlterTable
ALTER TABLE "JobAssignment" ADD COLUMN     "canceledServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subcontractorId" TEXT;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
