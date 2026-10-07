ALTER TYPE "CampaignContactStatus" ADD VALUE 'REMOVED';

ALTER TABLE "campaign_contacts" ADD COLUMN "source_import_id" TEXT;

UPDATE "campaign_contacts" AS cc
SET "source_import_id" = COALESCE(
  (
    SELECT ci."import_id"
    FROM "contact_imports" AS ci
    JOIN "imports" AS i ON i."id" = ci."import_id"
    WHERE ci."contact_id" = cc."contact_id"
      AND i."campaign_id" = cc."campaign_id"
    ORDER BY ci."created_at" DESC
    LIMIT 1
  ),
  (
    SELECT ci."import_id"
    FROM "contact_imports" AS ci
    WHERE ci."contact_id" = cc."contact_id"
    ORDER BY ci."created_at" DESC
    LIMIT 1
  )
);

CREATE INDEX "campaign_contacts_source_import_id_contact_id_idx"
ON "campaign_contacts"("source_import_id", "contact_id");

ALTER TABLE "campaign_contacts"
ADD CONSTRAINT "campaign_contacts_source_import_id_fkey"
FOREIGN KEY ("source_import_id") REFERENCES "imports"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
