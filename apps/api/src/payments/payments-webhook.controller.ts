import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from "@nestjs/common";
import { PaymentsService } from "./payments.service.js";

/**
 * Public MCOM Pay webhook. Authenticity comes from the HMAC signature over the
 * raw request body, never from a session cookie.
 */
@Controller("payments/webhook")
export class PaymentsWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("mcom")
  @HttpCode(200)
  async mcom(
    @Req() request: { rawBody?: Buffer | string },
    @Headers("x-mcom-webhook-signature") signature?: string,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException("Missing request body");
    }
    return this.payments.handleWebhook(request.rawBody, signature);
  }
}
