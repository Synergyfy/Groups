-- Link groups and businesses to the Central Hub geography hierarchy.
-- The hierarchy itself is owned by Central Hub and fetched over the service
-- mesh, so Groups only stores the resolved ids plus display-name snapshots.

-- AlterTable: groups
ALTER TABLE "groups"
    ADD COLUMN "high_street" TEXT,
    ADD COLUMN "local_mall_name" TEXT,
    ADD COLUMN "city_id" TEXT,
    ADD COLUMN "borough_id" TEXT,
    ADD COLUMN "high_street_id" TEXT,
    ADD COLUMN "local_mall_id" TEXT;

CREATE INDEX "groups_city_id_idx" ON "groups"("city_id");
CREATE INDEX "groups_borough_id_idx" ON "groups"("borough_id");
CREATE INDEX "groups_high_street_id_idx" ON "groups"("high_street_id");
CREATE INDEX "groups_local_mall_id_idx" ON "groups"("local_mall_id");

-- AlterTable: businesses
ALTER TABLE "businesses"
    ADD COLUMN "high_street" TEXT,
    ADD COLUMN "local_mall_name" TEXT,
    ADD COLUMN "postcode" TEXT,
    ADD COLUMN "city_id" TEXT,
    ADD COLUMN "borough_id" TEXT,
    ADD COLUMN "high_street_id" TEXT,
    ADD COLUMN "local_mall_id" TEXT;

CREATE INDEX "businesses_city_id_idx" ON "businesses"("city_id");
CREATE INDEX "businesses_borough_id_idx" ON "businesses"("borough_id");
CREATE INDEX "businesses_high_street_id_idx" ON "businesses"("high_street_id");
CREATE INDEX "businesses_local_mall_id_idx" ON "businesses"("local_mall_id");

-- The legacy `location_cities` / `location_areas` tables are intentionally left
-- in place. Central Hub owns the hierarchy now; the old rows are kept so an
-- existing install does not lose data. They can be dropped once the Central Hub
-- hierarchy has been synced and verified.
