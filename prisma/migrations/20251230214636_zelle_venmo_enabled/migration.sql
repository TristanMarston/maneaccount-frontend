-- AlterTable
ALTER TABLE "User" ADD COLUMN     "venmoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zelleEnabled" BOOLEAN NOT NULL DEFAULT false;
