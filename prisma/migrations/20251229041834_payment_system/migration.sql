-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentPlatform" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "venmo" TEXT,
ADD COLUMN     "zelle" TEXT;
