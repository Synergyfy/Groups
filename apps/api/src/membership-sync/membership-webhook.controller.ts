import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from "@nestjs/common";
import { MembershipUpdatedWebhookDto } from "./dto/membership-updated.dto.js";
import { MembershipSyncService } from "./membership-sync.service.js";

/**
 * Central Hub membership push endpoint.
 *
 * When a business buys a Central Hub membership that bundles this app, Central
 * provisions the matching platform package and sends a signed
 * `membership.updated` event. The event activates (or revokes) the local
 * `BusinessPlan` that grants access to this app.
 *
 * Authenticity comes only from the HMAC signature over the raw body.
 */
@Controller("webhooks")
export class MembershipWebhookController {
  constructor(private readonly membershipSync: MembershipSyncService) {}

  @Post("membership-updated")
  @HttpCode(200)
  membershipUpdated(
    @Req() request: { rawBody?: Buffer | string },
    @Headers("x-mcom-webhook-signature") signature: string | undefined,
    @Headers("x-mcom-signature") legacySignature: string | undefined,
    @Body() payload: MembershipUpdatedWebhookDto,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException("Missing request body");
    }

    return this.membershipSync.handleMembershipUpdated(
      request.rawBody,
      signature ?? legacySignature,
      payload,
    );
  }
}
