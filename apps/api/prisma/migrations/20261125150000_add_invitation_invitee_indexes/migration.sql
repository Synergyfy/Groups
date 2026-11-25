-- Invitations are looked up by the invitee while somebody signs in: a contact
-- invited by email finds their pending invitations through the address they
-- signed up with, and the account that claims them is stored on the row.
-- Both lookups scan the whole table without an index, so they are indexed
-- here.

CREATE INDEX IF NOT EXISTS "invitations_invitee_id_idx" ON "invitations"("invitee_id");
CREATE INDEX IF NOT EXISTS "invitations_invitee_email_idx" ON "invitations"("invitee_email");
