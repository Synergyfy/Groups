import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ConsumerService } from "./consumer.service.js";

/**
 * Public invitation preview. This route intentionally has no auth guard so an
 * invitee can see what they are being invited to before signing in.
 */
@Controller("invitations")
export class PublicInvitationsController {
  constructor(private readonly consumer: ConsumerService) {}

  @Get("public/:id")
  publicInvitation(@Param("id", ParseUUIDPipe) id: string) {
    return this.consumer.publicInvitation(id);
  }
}
