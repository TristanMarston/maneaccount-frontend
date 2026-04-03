-- CreateEnum
CREATE TYPE "SendInvoiceOption" AS ENUM ('client', 'barn', 'both');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoSendInvoiceTo" "SendInvoiceOption" NOT NULL DEFAULT 'both';
