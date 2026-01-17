-- AlterTable
ALTER TABLE "User" ADD COLUMN "allowedNotifications" "NotificationType"[] DEFAULT ARRAY[]::"NotificationType"[];
