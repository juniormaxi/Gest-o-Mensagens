ALTER TABLE "contacts"
ADD COLUMN "do_not_message" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "blocked_at" TIMESTAMP(3);

CREATE INDEX "contacts_do_not_message_whatsapp_status_idx"
ON "contacts"("do_not_message", "whatsapp_status");
