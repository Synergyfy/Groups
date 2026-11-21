import { IsEnum } from "class-validator";
import { PaymentMethod } from "../../generated/prisma/client.js";

export class CreateContributionPaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
