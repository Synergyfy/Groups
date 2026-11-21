-- AlterTable
ALTER TABLE "business_plans" ADD COLUMN     "access_reason" TEXT,
ADD COLUMN     "access_source" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "central_quotas" JSONB,
ADD COLUMN     "external_plan_id" TEXT,
ADD COLUMN     "membership_name" TEXT,
ADD COLUMN     "programme_tasks" JSONB,
ADD COLUMN     "upgrade_url" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "entitlement_checked_at" TIMESTAMP(3);
