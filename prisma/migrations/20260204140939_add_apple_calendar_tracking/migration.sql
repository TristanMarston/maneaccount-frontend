-- AlterTable
ALTER TABLE "Show" ADD COLUMN     "addedToAppleCalendar" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ShowInvite" ADD COLUMN     "addedToAppleCalendar" BOOLEAN NOT NULL DEFAULT false;
