CREATE TABLE "LinkedAccountGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkedAccountGroup_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User"
ADD COLUMN "linkedAccountGroupId" TEXT;

DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_publicID_key";

CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_publicID_idx" ON "User"("publicID");
CREATE INDEX "User_linkedAccountGroupId_idx" ON "User"("linkedAccountGroupId");

ALTER TABLE "User"
ADD CONSTRAINT "User_linkedAccountGroupId_fkey"
FOREIGN KEY ("linkedAccountGroupId") REFERENCES "LinkedAccountGroup"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
