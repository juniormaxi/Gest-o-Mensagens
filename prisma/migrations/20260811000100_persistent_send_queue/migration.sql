ALTER TABLE "campaigns"
ADD COLUMN "queue_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "queue_min_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "queue_max_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "queue_started_at" TIMESTAMP(3);

CREATE INDEX "campaigns_queue_active_queue_started_at_idx"
ON "campaigns"("queue_active", "queue_started_at");
