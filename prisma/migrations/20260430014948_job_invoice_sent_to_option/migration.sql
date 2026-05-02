-- CreateEnum
CREATE TYPE "InvoiceSentToOption" AS ENUM ('client', 'barn');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "sentTo" "InvoiceSentToOption"[];
