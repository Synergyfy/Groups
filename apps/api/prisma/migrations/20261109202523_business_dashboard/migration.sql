-- CreateTable
CREATE TABLE "business_memberships" (
    "id" UUID NOT NULL,
    "business_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'Bronze',
    "variant" TEXT NOT NULL DEFAULT 'Standard',
    "plan_id" TEXT,
    "plan_name" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "access_days" INTEGER NOT NULL DEFAULT 90,
    "access_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agreement_accepted" BOOLEAN NOT NULL DEFAULT false,
    "agreed_at" TIMESTAMP(3),
    "access_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_lists" (
    "id" UUID NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'B2B',
    "geography" TEXT NOT NULL DEFAULT 'National',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "source" TEXT NOT NULL DEFAULT 'Manual Contacts',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "network_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_contacts" (
    "id" UUID NOT NULL,
    "business_id" TEXT NOT NULL,
    "list_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "category" TEXT,
    "location" TEXT,
    "geography" TEXT,
    "role" TEXT NOT NULL DEFAULT 'peripheral',
    "tier" TEXT NOT NULL DEFAULT 'Bronze',
    "confirmation" TEXT NOT NULL DEFAULT 'pending',
    "intake" TEXT NOT NULL DEFAULT 'manual',
    "consent_at" TIMESTAMP(3),
    "added_by_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "network_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circles" (
    "id" UUID NOT NULL,
    "business_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "member_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_list_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_activities" (
    "id" UUID NOT NULL,
    "circle_id" UUID NOT NULL,
    "member_id" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_memberships_business_id_key" ON "business_memberships"("business_id");

-- CreateIndex
CREATE INDEX "business_memberships_status_idx" ON "business_memberships"("status");

-- CreateIndex
CREATE INDEX "network_lists_business_id_idx" ON "network_lists"("business_id");

-- CreateIndex
CREATE INDEX "network_lists_business_id_type_idx" ON "network_lists"("business_id", "type");

-- CreateIndex
CREATE INDEX "network_contacts_business_id_idx" ON "network_contacts"("business_id");

-- CreateIndex
CREATE INDEX "network_contacts_list_id_idx" ON "network_contacts"("list_id");

-- CreateIndex
CREATE INDEX "network_contacts_email_idx" ON "network_contacts"("email");

-- CreateIndex
CREATE INDEX "circles_business_id_idx" ON "circles"("business_id");

-- CreateIndex
CREATE INDEX "circles_type_idx" ON "circles"("type");

-- CreateIndex
CREATE INDEX "circle_activities_circle_id_idx" ON "circle_activities"("circle_id");

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_lists" ADD CONSTRAINT "network_lists_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_contacts" ADD CONSTRAINT "network_contacts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_contacts" ADD CONSTRAINT "network_contacts_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "network_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circles" ADD CONSTRAINT "circles_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_activities" ADD CONSTRAINT "circle_activities_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
