-- DropForeignKey
ALTER TABLE "CalendarNote" DROP CONSTRAINT "CalendarNote_userId_fkey";

-- AddForeignKey
ALTER TABLE "CalendarNote" ADD CONSTRAINT "CalendarNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
