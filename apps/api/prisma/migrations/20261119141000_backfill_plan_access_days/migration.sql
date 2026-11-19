-- Align existing plan records with the variant access lengths: Standard 90
-- days, Pro 180 days and Pro+ one year.

UPDATE "business_plans"
SET
  "access_days" = CASE
    WHEN "variant" = 'Pro+' THEN 365
    WHEN "variant" = 'Pro' THEN 180
    ELSE 90
  END,
  "access_expires_at" = CASE
    WHEN "agreed_at" IS NOT NULL THEN
      "agreed_at" + make_interval(
        days => CASE
          WHEN "variant" = 'Pro+' THEN 365
          WHEN "variant" = 'Pro' THEN 180
          ELSE 90
        END
      )
    ELSE "access_expires_at"
  END;
