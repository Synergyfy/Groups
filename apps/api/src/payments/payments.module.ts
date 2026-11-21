import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { BusinessModule } from "../business/business.module.js";
import { McomPayClient } from "./mcom-pay.client.js";
import { PaymentSettlementService } from "./payment-settlement.service.js";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsWebhookController } from "./payments-webhook.controller.js";

@Module({
  imports: [AuthModule, BusinessModule],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [McomPayClient, PaymentSettlementService, PaymentsService],
  exports: [PaymentsService, McomPayClient],
})
export class PaymentsModule {}
