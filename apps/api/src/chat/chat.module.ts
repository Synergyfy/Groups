import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CentralChatClient } from "./central-chat.client.js";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, CentralChatClient],
  exports: [ChatService],
})
export class ChatModule {}
