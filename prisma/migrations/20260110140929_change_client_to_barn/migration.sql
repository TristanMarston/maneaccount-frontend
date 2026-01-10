/*
  Warnings:

  - The values [client_invite,client_status_change] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - The values [client] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `clientId` on the `Job` table. All the data in the column will be lost.
  - Added the required column `barnId` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('calendar_invite', 'job_request', 'job_status_change', 'job_completed', 'job_paid', 'barn_invite', 'barn_status_change', 'team_invite', 'team_status_change', 'new_message');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('braider', 'subcontractor', 'barn', 'admin');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'braider';
COMMIT;

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_clientId_fkey";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "clientId",
ADD COLUMN     "barnId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_barnId_fkey" FOREIGN KEY ("barnId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
