import { IsOptional, IsString, MaxLength } from "class-validator";

export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentIntentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  orderId?: string;
}
