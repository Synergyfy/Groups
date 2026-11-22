import { Module } from "@nestjs/common";
import { ProfileSyncModule } from "../profile-sync/profile-sync.module.js";
import { MembershipSyncService } from "./membership-sync.service.js";
import { MembershipWebhookController } from "./membership-webhook.controller.js";

@Module({
  imports: [ProfileSyncModule],
  controllers: [MembershipWebhookController],
  providers: [MembershipSyncService],
})
export class MembershipSyncModule {}
