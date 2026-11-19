-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "required_plan_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
