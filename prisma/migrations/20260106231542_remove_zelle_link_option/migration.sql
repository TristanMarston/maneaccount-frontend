/*
  Warnings:

  - The values [link] on the enum `ZelleOption` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ZelleOption_new" AS ENUM ('email', 'phone', 'disabled');
ALTER TABLE "public"."User" ALTER COLUMN "zelleEnabled" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "zelleEnabled" TYPE "ZelleOption_new" USING ("zelleEnabled"::text::"ZelleOption_new");
ALTER TYPE "ZelleOption" RENAME TO "ZelleOption_old";
ALTER TYPE "ZelleOption_new" RENAME TO "ZelleOption";
DROP TYPE "public"."ZelleOption_old";
ALTER TABLE "User" ALTER COLUMN "zelleEnabled" SET DEFAULT 'disabled';
COMMIT;
