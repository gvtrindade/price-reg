-- CreateTable
CREATE TABLE "print_template" (
    "id" TEXT NOT NULL,
    "blob" BYTEA NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "print_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "print_template_eventId_key" ON "print_template"("eventId");

-- AddForeignKey
ALTER TABLE "print_template" ADD CONSTRAINT "print_template_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
