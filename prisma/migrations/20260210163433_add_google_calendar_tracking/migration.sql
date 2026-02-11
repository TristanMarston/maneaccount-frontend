-- AlterTable
ALTER TABLE "Show" ADD COLUMN     "addedToGoogleCalendar" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ShowInvite" ADD COLUMN     "addedToGoogleCalendar" BOOLEAN NOT NULL DEFAULT false;
