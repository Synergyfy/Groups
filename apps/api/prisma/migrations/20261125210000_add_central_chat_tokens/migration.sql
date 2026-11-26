-- Central Hub chat is the single messaging backbone for the whole ecosystem.
-- To talk to it this app needs the user's Central Hub SSO token, which is
-- issued during the SSO code exchange and can be renewed with the refresh
-- token. Both are stored encrypted at rest on the user row; they never reach
-- the browser.
--
-- A network contact only becomes a chat participant once they have a Central
-- Hub account, so the immutable Central Hub user id is mirrored on the
-- contact row next to the email address it is resolved from.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mcom_access_token" TEXT,
  ADD COLUMN IF NOT EXISTS "mcom_refresh_token" TEXT,
  ADD COLUMN IF NOT EXISTS "mcom_token_expires_at" TIMESTAMP(3);

ALTER TABLE "network_contacts"
  ADD COLUMN IF NOT EXISTS "mcom_user_id" TEXT;

CREATE INDEX IF NOT EXISTS "network_contacts_mcom_user_id_idx"
  ON "network_contacts"("mcom_user_id");
