-- Convert every persisted monetary amount from pounds (Float) to integer pence.

ALTER TABLE "plans" ADD COLUMN "price_minor" INTEGER NOT NULL DEFAULT 0;
UPDATE "plans" SET "price_minor" = ROUND("price_monthly" * 100)::integer;
ALTER TABLE "plans" DROP COLUMN "price_monthly";

ALTER TABLE "business_plans" ADD COLUMN "access_fee_minor" INTEGER NOT NULL DEFAULT 0;
UPDATE "business_plans" SET "access_fee_minor" = ROUND("access_fee" * 100)::integer;
ALTER TABLE "business_plans" DROP COLUMN "access_fee";

ALTER TABLE "groups" ADD COLUMN "contribution_minor" INTEGER;
UPDATE "groups" SET "contribution_minor" = ROUND("contribution" * 100)::integer WHERE "contribution" IS NOT NULL;
ALTER TABLE "groups" DROP COLUMN "contribution";

ALTER TABLE "partners" ADD COLUMN "fee_monthly_minor" INTEGER NOT NULL DEFAULT 0;
UPDATE "partners" SET "fee_monthly_minor" = ROUND("fee_monthly" * 100)::integer;
ALTER TABLE "partners" DROP COLUMN "fee_monthly";

ALTER TABLE "programmes" ADD COLUMN "monthly_fee_minor" INTEGER NOT NULL DEFAULT 0;
UPDATE "programmes" SET "monthly_fee_minor" = ROUND("monthly_fee" * 100)::integer;
ALTER TABLE "programmes" DROP COLUMN "monthly_fee";

ALTER TABLE "campaigns" ADD COLUMN "budget_minor" INTEGER;
UPDATE "campaigns" SET "budget_minor" = ROUND("budget" * 100)::integer WHERE "budget" IS NOT NULL;
ALTER TABLE "campaigns" DROP COLUMN "budget";
