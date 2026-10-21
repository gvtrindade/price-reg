-- Products valued before the external id was required are not printable yet.
-- Mark them as processed so they show up in the pending external ids flow.
UPDATE "product"
SET "status" = 'processed'
WHERE "status" = 'registered'
  AND "external_id" IS NULL;
