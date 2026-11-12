-- AlterTable
ALTER TABLE "product" ADD COLUMN     "printed_at" TIMESTAMPTZ,
ADD COLUMN     "printed_by_id" TEXT;

-- CreateIndex
CREATE INDEX "product_printed_by_id_idx" ON "product"("printed_by_id");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_printed_by_id_fkey" FOREIGN KEY ("printed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
