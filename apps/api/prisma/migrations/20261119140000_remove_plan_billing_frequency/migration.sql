-- Plans are priced per period and their access length is fixed by variant
-- (Standard 90 days, Pro 180 days, Pro+ 1 year), so a separate billing
-- frequency is no longer stored.

ALTER TABLE "plans" DROP COLUMN "billing_frequency";
