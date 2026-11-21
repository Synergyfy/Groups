-- Plans are now grouped by their name: every plan has a name and publishes
-- Standard, Pro and Pro+ variants. The Bronze/Silver/Gold/Platinum tiers are
-- migrated to plan names so existing data keeps its meaning.

UPDATE "plans" SET "name" = "tier";

DROP INDEX IF EXISTS "plans_tier_variant_key";
ALTER TABLE "plans" DROP COLUMN "tier";
CREATE UNIQUE INDEX "plans_name_variant_key" ON "plans"("name", "variant");

-- A business plan stores the plan name instead of a tier.
UPDATE "business_plans" SET "plan_name" = "tier";
ALTER TABLE "business_plans" DROP COLUMN "tier";

-- Group creation rules select plans by name instead of by tier.
UPDATE "admin_config"
SET "group_creation_rules" = ("group_creation_rules" - 'allowedTiers') ||
  jsonb_build_object(
    'allowedPlans',
    COALESCE("group_creation_rules" -> 'allowedTiers', '[]'::jsonb)
  )
WHERE "group_creation_rules" ? 'allowedTiers';
