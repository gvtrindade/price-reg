-- Rename the "book" table to "product" and its "isbn" column to "code"
ALTER TABLE "book" RENAME TO "product";
ALTER TABLE "product" RENAME COLUMN "isbn" TO "code";
ALTER TABLE "product" RENAME CONSTRAINT "book_pkey" TO "product_pkey";
ALTER TABLE "product" RENAME CONSTRAINT "book_eventId_fkey" TO "product_eventId_fkey";
