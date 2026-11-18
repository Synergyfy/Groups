-- AlterTable
ALTER TABLE "group_members" ADD COLUMN     "contribution_paid_at" TIMESTAMP(3),
ADD COLUMN     "contribution_status" TEXT NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "audit_log_target_type_action_at_idx" ON "audit_log"("target_type", "action", "at");

-- CreateIndex
CREATE INDEX "audit_log_target_type_target_id_idx" ON "audit_log"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "businesses_joined_at_idx" ON "businesses"("joined_at");

-- CreateIndex
CREATE INDEX "campaigns_created_at_idx" ON "campaigns"("created_at");

-- CreateIndex
CREATE INDEX "group_activities_group_id_at_idx" ON "group_activities"("group_id", "at");

-- CreateIndex
CREATE INDEX "group_members_group_id_role_joined_at_idx" ON "group_members"("group_id", "role", "joined_at");

-- CreateIndex
CREATE INDEX "groups_type_created_at_idx" ON "groups"("type", "created_at");

-- CreateIndex
CREATE INDEX "groups_status_created_at_idx" ON "groups"("status", "created_at");

-- CreateIndex
CREATE INDEX "groups_created_at_idx" ON "groups"("created_at");

-- CreateIndex
CREATE INDEX "invitations_created_at_idx" ON "invitations"("created_at");

-- CreateIndex
CREATE INDEX "invitations_group_id_created_at_idx" ON "invitations"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "partners_joined_at_idx" ON "partners"("joined_at");

-- CreateIndex
CREATE INDEX "platform_accounts_created_at_idx" ON "platform_accounts"("created_at");

-- CreateIndex
CREATE INDEX "report_schedules_created_at_idx" ON "report_schedules"("created_at");

-- CreateIndex
CREATE INDEX "reward_deals_created_at_idx" ON "reward_deals"("created_at");
