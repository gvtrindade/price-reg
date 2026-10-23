-- AlterTable
ALTER TABLE "product" ADD COLUMN     "added_by_id" TEXT;

-- CreateIndex
CREATE INDEX "product_added_by_id_idx" ON "product"("added_by_id");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
