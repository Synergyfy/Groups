-- CreateTable
CREATE TABLE "mcom_membership_events" (
    "event_id" TEXT NOT NULL,
    "platform" TEXT,
    "event_type" TEXT NOT NULL,
    "user_id" TEXT,
    "business_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "mcom_membership_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "mcom_membership_events_status_idx" ON "mcom_membership_events"("status");

-- CreateIndex
CREATE INDEX "mcom_membership_events_received_at_idx" ON "mcom_membership_events"("received_at");

-- CreateIndex
CREATE INDEX "mcom_membership_events_user_id_idx" ON "mcom_membership_events"("user_id");
