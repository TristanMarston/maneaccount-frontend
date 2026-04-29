/*
  Warnings:

  - Added the required column `userId` to the `CalendarNote` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CalendarNote_date_key";

-- AlterTable
ALTER TABLE "CalendarNote" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "CalendarNote" ADD CONSTRAINT "CalendarNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
