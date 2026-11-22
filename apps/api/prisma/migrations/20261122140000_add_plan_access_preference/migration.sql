-- AlterTable
ALTER TABLE "business_plans" ADD COLUMN     "access_preference" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "local_access" JSONB;
