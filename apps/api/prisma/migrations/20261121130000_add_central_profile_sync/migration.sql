-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "mcom_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "businesses_mcom_user_id_key" ON "businesses"("mcom_user_id");

-- CreateTable
CREATE TABLE "mcom_profile_events" (
    "event_id" TEXT NOT NULL,
    "platform" TEXT,
    "event_type" TEXT NOT NULL,
    "user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "mcom_profile_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "mcom_profile_events_status_idx" ON "mcom_profile_events"("status");

-- CreateIndex
CREATE INDEX "mcom_profile_events_received_at_idx" ON "mcom_profile_events"("received_at");
