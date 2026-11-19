-- Rename the subscription tables so the platform consistently talks about
-- plans rather than memberships (group membership remains a separate concept).

ALTER TABLE "business_memberships" RENAME TO "business_plans";
ALTER INDEX "business_memberships_pkey" RENAME TO "business_plans_pkey";
ALTER INDEX "business_memberships_business_id_key" RENAME TO "business_plans_business_id_key";
ALTER INDEX "business_memberships_status_idx" RENAME TO "business_plans_status_idx";
ALTER TABLE "business_plans" RENAME CONSTRAINT "business_memberships_business_id_fkey" TO "business_plans_business_id_fkey";

ALTER TABLE "membership_plans" RENAME TO "plans";
ALTER INDEX "membership_plans_pkey" RENAME TO "plans_pkey";
ALTER INDEX "membership_plans_tier_variant_key" RENAME TO "plans_tier_variant_key";
ALTER INDEX "membership_plans_status_idx" RENAME TO "plans_status_idx";
