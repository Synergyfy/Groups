import { Module } from "@nestjs/common";
import { McomModule } from "../mcom/mcom.module.js";
import { ProfileWebhookController } from "./profile-webhook.controller.js";
import { ProfileSyncService } from "./profile-sync.service.js";

@Module({
  imports: [McomModule],
  controllers: [ProfileWebhookController],
  providers: [ProfileSyncService],
})
export class ProfileSyncModule {}
