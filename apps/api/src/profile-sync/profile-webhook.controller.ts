import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from "@nestjs/common";
import { ProfileUpdatedWebhookDto } from "./dto/profile-updated.dto.js";
import { ProfileSyncService } from "./profile-sync.service.js";

/**
 * Central Hub profile push endpoint.
 *
 * Central Hub is the source of truth for consumer and business profiles. Rather
 * than pushing the full record it sends a small signed `profile.updated`
 * signal; this handler pulls the canonical profile through the service mesh.
 *
 * Authenticity comes only from the HMAC signature over the raw body — never
 * from a session cookie.
 */
@Controller("webhooks")
export class ProfileWebhookController {
  constructor(private readonly profileSync: ProfileSyncService) {}

  @Post("profile-updated")
  @HttpCode(200)
  profileUpdated(
    @Req() request: { rawBody?: Buffer | string },
    @Headers("x-mcom-webhook-signature") signature: string | undefined,
    @Body() payload: ProfileUpdatedWebhookDto,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException("Missing request body");
    }

    return this.profileSync.handleProfileUpdated(
      request.rawBody,
      signature,
      payload,
    );
  }
}
