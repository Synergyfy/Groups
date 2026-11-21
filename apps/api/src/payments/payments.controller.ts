import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { SessionUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto.js";
import { CreateContributionPaymentDto } from "./dto/create-contribution-payment.dto.js";
import { CreatePlanPaymentDto } from "./dto/create-plan-payment.dto.js";
import { PaymentsService } from "./payments.service.js";

@Controller("payments")
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get("wallet/balance")
  walletBalance(@CurrentUser() user: SessionUser) {
    return this.payments.walletBalance(user);
  }

  @Post("plan")
  createPlanPayment(
    @Body() dto: CreatePlanPaymentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.payments.createPlanPayment(user, dto);
  }

  @Post("group/:groupId")
  createContributionPayment(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() dto: CreateContributionPaymentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.payments.createContributionPayment(user, groupId, dto);
  }

  @Get(":id")
  getPayment(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.payments.getPayment(user, id);
  }

  @Post(":id/confirm")
  confirmPayment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.payments.confirmPayment(user, id, dto);
  }

  @Post(":id/resume")
  resumePayment(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.payments.resumePayment(user, id);
  }
}
