import { IsBoolean, IsEnum, IsIn, IsString, MaxLength } from "class-validator";
import { PaymentMethod } from "../../generated/prisma/client.js";

export class CreatePlanPaymentDto {
  @IsString()
  @MaxLength(191)
  planId!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsBoolean()
  @IsIn([true], {
    message: "The plan access agreement must be accepted before payment.",
  })
  agreementAccepted!: boolean;
}
