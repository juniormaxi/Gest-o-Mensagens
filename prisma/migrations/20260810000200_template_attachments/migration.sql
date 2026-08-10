ALTER TABLE "message_templates"
ADD COLUMN "default_url" TEXT,
ADD COLUMN "attachment_name" TEXT,
ADD COLUMN "attachment_mime" TEXT,
ADD COLUMN "attachment_data" BYTEA;

ALTER TABLE "campaigns"
ADD COLUMN "attachment_name" TEXT,
ADD COLUMN "attachment_mime" TEXT,
ADD COLUMN "attachment_data" BYTEA;
