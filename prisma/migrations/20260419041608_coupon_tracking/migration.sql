-- CreateTable
CREATE TABLE "_OneOffCoupon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OneOffCoupon_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_OneOffCoupon_B_index" ON "_OneOffCoupon"("B");

-- AddForeignKey
ALTER TABLE "_OneOffCoupon" ADD CONSTRAINT "_OneOffCoupon_A_fkey" FOREIGN KEY ("A") REFERENCES "OneOffCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OneOffCoupon" ADD CONSTRAINT "_OneOffCoupon_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
