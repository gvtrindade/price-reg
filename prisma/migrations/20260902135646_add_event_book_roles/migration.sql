/*
  Warnings:

  - The `roles` column on the `user` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "role" AS ENUM ('VOLUNTEER', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "user" DROP COLUMN "roles",
ADD COLUMN     "roles" "role"[] DEFAULT ARRAY['VOLUNTEER']::"role"[];

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "event_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_user" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "event_user_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isbn" TEXT,
    "conservation_state" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "priced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "book_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "event_user" ADD CONSTRAINT "event_user_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_user" ADD CONSTRAINT "event_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book" ADD CONSTRAINT "book_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
