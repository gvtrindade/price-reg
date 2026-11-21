-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('BOOK', 'CD', 'DVD');

-- AlterTable
ALTER TABLE "product" ADD COLUMN "type" "product_type" NOT NULL DEFAULT 'BOOK';
