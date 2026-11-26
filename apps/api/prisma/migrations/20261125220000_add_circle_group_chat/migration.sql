-- A circle can have a Central Hub group conversation. The business that owns
-- the circle is the group owner and admin; the circle members join as group
-- members. The conversation id is remembered on the circle so the group chat
-- is opened again instead of being duplicated.

ALTER TABLE "circles"
  ADD COLUMN IF NOT EXISTS "chat_conversation_id" TEXT;

CREATE INDEX IF NOT EXISTS "circles_chat_conversation_id_idx"
  ON "circles"("chat_conversation_id");
