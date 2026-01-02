-- CreateTable
CREATE TABLE "_HorseToJob" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_HorseToJob_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_HorseToJob_B_index" ON "_HorseToJob"("B");

-- AddForeignKey
ALTER TABLE "_HorseToJob" ADD CONSTRAINT "_HorseToJob_A_fkey" FOREIGN KEY ("A") REFERENCES "Horse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HorseToJob" ADD CONSTRAINT "_HorseToJob_B_fkey" FOREIGN KEY ("B") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
