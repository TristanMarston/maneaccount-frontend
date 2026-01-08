/*
  Warnings:

  - The values [CALENDAR_INVITE,JOB_REQUEST,JOB_STATUS_CHANGE,JOB_COMPLETED,TEAM_INVITE,TEAM_ACCEPTED,NEW_MESSAGE] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('calendar_invite', 'job_request', 'job_status_change', 'job_completed', 'client_invite', 'client_accepted', 'team_invite', 'team_accepted', 'new_message');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;
