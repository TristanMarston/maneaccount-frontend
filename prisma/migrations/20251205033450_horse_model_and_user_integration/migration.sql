-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('mare', 'gelding', 'stallion', 'filly', 'colt');

-- CreateTable
CREATE TABLE "Horse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'stallion',
    "color" TEXT,
    "stallNumber" TEXT,
    "profileImage" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Horse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Horse" ADD CONSTRAINT "Horse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
