import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { CurrentUser } from "../../auth/current-user.decorator.js";
import { AdminOnly } from "../admin-only.decorator.js";
import {
  AdminPaymentQueryDto,
  AdminRefundPaymentDto,
} from "../dto/admin.dto.js";
import { AdminPaymentsService } from "./admin-payments.service.js";

@Controller("admin/payments")
@AdminOnly()
export class AdminPaymentsController {
  constructor(private readonly payments: AdminPaymentsService) {}

  @Get("overview")
  overview() {
    return this.payments.overview();
  }

  @Get("charges")
  list(@Query() query: AdminPaymentQueryDto) {
    return this.payments.list(query);
  }

  @Get("charges/:id/splits")
  splits(@Param("id") id: string) {
    return this.payments.splits(id);
  }

  @Post("charges/:id/refund")
  refund(
    @Param("id") id: string,
    @Body() dto: AdminRefundPaymentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.payments.refund(id, dto, user);
  }
}
