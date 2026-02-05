/*
  Warnings:

  - The values [job_paid] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('calendar_invite', 'job_request', 'job_status_change', 'job_completed', 'barn_invite', 'barn_status_change', 'team_invite', 'team_status_change', 'new_message', 'limit_approaching', 'limit_exceeded');
ALTER TABLE "public"."User" ALTER COLUMN "allowedNotifications" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "allowedNotifications" TYPE "NotificationType_new"[] USING ("allowedNotifications"::text::"NotificationType_new"[]);
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
ALTER TABLE "User" ALTER COLUMN "allowedNotifications" SET DEFAULT ARRAY[]::"NotificationType"[];
COMMIT;
