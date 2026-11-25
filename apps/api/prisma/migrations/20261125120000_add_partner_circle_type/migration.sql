-- The Partner group type now has a matching circle type, so a business can
-- build a partner circle from its network contacts and an administrator can
-- mark it as required on the admin groups page. The circle catalogue is stored
-- as JSON on admin_config, so the new default is appended to the existing rows
-- instead of replacing the catalogue.

UPDATE "admin_config"
SET "circle_types" = "circle_types" || jsonb_build_array(
  jsonb_build_object(
    'id', 'ct-partner',
    'type', 'Partner Circle',
    'shortLabel', 'Partner',
    'description', 'Bring your business partners together in a circle built from your network contacts.',
    'accent', '#38bdf8',
    'accentSoft', 'rgba(56, 189, 248, 0.14)',
    'enabled', true,
    'mandatory', false,
    'minMembers', 1,
    'maxMembers', NULL,
    'requiresBanker', false,
    'allowedDurations', jsonb_build_array(90, 180, 270, 360)
  )
)
WHERE jsonb_typeof("circle_types") = 'array'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements("circle_types") AS entry
    WHERE entry ->> 'type' = 'Partner Circle'
  );
