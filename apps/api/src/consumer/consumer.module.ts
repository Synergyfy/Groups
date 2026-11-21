import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ConsumerController } from "./consumer.controller.js";
import { ConsumerRoleGuard } from "./consumer-role.guard.js";
import { ConsumerService } from "./consumer.service.js";
import { PublicInvitationsController } from "./public-invitations.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [ConsumerController, PublicInvitationsController],
  providers: [ConsumerRoleGuard, ConsumerService],
})
export class ConsumerModule {}
