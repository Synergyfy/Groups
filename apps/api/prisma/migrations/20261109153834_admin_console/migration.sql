-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "access_type" TEXT NOT NULL DEFAULT 'open',
ADD COLUMN     "account_manager_id" TEXT,
ADD COLUMN     "agent_id" TEXT,
ADD COLUMN     "campaign_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "city" TEXT,
ADD COLUMN     "consultant_id" TEXT,
ADD COLUMN     "contribution" DOUBLE PRECISION,
ADD COLUMN     "contribution_frequency" TEXT,
ADD COLUMN     "directory_visibility" TEXT,
ADD COLUMN     "head_start" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interaction_level" TEXT,
ADD COLUMN     "local_area" TEXT,
ADD COLUMN     "member_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "owner_id" TEXT,
ADD COLUMN     "owner_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "pricing" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "programme_id" TEXT,
ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "required_size" INTEGER,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'user-created',
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'B2B';

-- CreateTable
CREATE TABLE "platform_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'consumer',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'invitation-onboarding',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT NOT NULL,
    "local_area" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "tier" TEXT NOT NULL DEFAULT 'Free',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "programme_id" TEXT,
    "account_manager_id" TEXT,
    "agent_id" TEXT,
    "consultant_id" TEXT,
    "is_partner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'Free',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "programme_id" TEXT,
    "fee_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programmes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'Free',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "description" TEXT NOT NULL DEFAULT '',
    "monthly_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "group_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'FundOrDonate',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "group_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budget" DOUBLE PRECISION,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "active_groups" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billing_frequency" TEXT NOT NULL DEFAULT 'Monthly',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "group_quota" INTEGER NOT NULL DEFAULT 0,
    "circle_quota" INTEGER NOT NULL DEFAULT 0,
    "revenue_share_percent" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subscriber_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_deals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "discount_value" TEXT NOT NULL,
    "code" TEXT,
    "target_audience" TEXT NOT NULL,
    "live_on_frontend" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "claims_count" INTEGER NOT NULL DEFAULT 0,
    "max_claims" INTEGER NOT NULL DEFAULT 0,
    "sponsor_business" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "automaticGrouping" JSONB NOT NULL,
    "groupTypes" JSONB NOT NULL,
    "stage_labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "payment_rules" JSONB NOT NULL,
    "group_creation_rules" JSONB NOT NULL,
    "circle_types" JSONB NOT NULL,
    "mandatory_circles" JSONB NOT NULL,
    "mandatory_groups" JSONB NOT NULL,
    "partner_defaults" JSONB NOT NULL,
    "access_rules" JSONB NOT NULL,
    "platform_settings" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "group_id" TEXT,
    "circle_id" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'outgoing',
    "kind" TEXT NOT NULL DEFAULT 'invite',
    "invitee_id" TEXT,
    "invitee_name" TEXT NOT NULL,
    "invitee_email" TEXT,
    "invitee_phone" TEXT,
    "invitee_role" TEXT,
    "claimed_by_account_id" TEXT,
    "invited_by_id" TEXT NOT NULL,
    "invited_by_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_activities" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "actor_name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "member_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "business_name" TEXT,
    "category" TEXT,
    "location" TEXT,
    "geography" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "role" TEXT NOT NULL DEFAULT 'peripheral',
    "tier" TEXT NOT NULL DEFAULT 'Free',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photo_url" TEXT,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_circles" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "member_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_list_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_circles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_areas" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sections" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "published" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'Active',
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_accounts_email_key" ON "platform_accounts"("email");

-- CreateIndex
CREATE INDEX "platform_accounts_role_idx" ON "platform_accounts"("role");

-- CreateIndex
CREATE INDEX "platform_accounts_status_idx" ON "platform_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_email_key" ON "businesses"("email");

-- CreateIndex
CREATE INDEX "businesses_status_idx" ON "businesses"("status");

-- CreateIndex
CREATE INDEX "businesses_tier_idx" ON "businesses"("tier");

-- CreateIndex
CREATE INDEX "businesses_city_idx" ON "businesses"("city");

-- CreateIndex
CREATE INDEX "partners_status_idx" ON "partners"("status");

-- CreateIndex
CREATE INDEX "partners_tier_idx" ON "partners"("tier");

-- CreateIndex
CREATE INDEX "relationships_kind_idx" ON "relationships"("kind");

-- CreateIndex
CREATE INDEX "membership_plans_status_idx" ON "membership_plans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_tier_variant_key" ON "membership_plans"("tier", "variant");

-- CreateIndex
CREATE INDEX "reward_deals_status_idx" ON "reward_deals"("status");

-- CreateIndex
CREATE INDEX "reward_deals_category_idx" ON "reward_deals"("category");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_target_type_idx" ON "audit_log"("target_type");

-- CreateIndex
CREATE INDEX "audit_log_at_idx" ON "audit_log"("at");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- CreateIndex
CREATE INDEX "invitations_group_id_idx" ON "invitations"("group_id");

-- CreateIndex
CREATE INDEX "group_activities_group_id_idx" ON "group_activities"("group_id");

-- CreateIndex
CREATE INDEX "group_members_group_id_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_member_id_key" ON "group_members"("group_id", "member_id");

-- CreateIndex
CREATE INDEX "group_circles_group_id_idx" ON "group_circles"("group_id");

-- CreateIndex
CREATE INDEX "location_areas_city_id_idx" ON "location_areas"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_areas_city_id_name_key" ON "location_areas"("city_id", "name");

-- CreateIndex
CREATE INDEX "groups_type_idx" ON "groups"("type");

-- CreateIndex
CREATE INDEX "groups_status_idx" ON "groups"("status");

-- CreateIndex
CREATE INDEX "groups_city_idx" ON "groups"("city");

-- CreateIndex
CREATE INDEX "groups_owner_id_idx" ON "groups"("owner_id");

-- CreateIndex
CREATE INDEX "groups_programme_id_idx" ON "groups"("programme_id");

-- AddForeignKey
ALTER TABLE "group_activities" ADD CONSTRAINT "group_activities_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_areas" ADD CONSTRAINT "location_areas_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "location_cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
