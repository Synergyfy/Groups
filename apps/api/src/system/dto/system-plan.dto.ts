import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * A variant inside an external plan. Mirrors the shape MCOM Central sends for
 * apps that expose Standard / Pro / Pro+ plan families.
 */
export class ExternalPlanVariantDto {
  @IsOptional() @IsString() @MaxLength(191) id?: string;
  @IsString() @MaxLength(40) tier!: string;
  @IsOptional() @IsObject() tierLevel?: Record<string, unknown>;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsObject() configuration?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() stripePriceId?: string;
  @IsOptional() @IsString() paypalPlanId?: string;
}

/**
 * Shared fields for creating and updating a plan via the MCOM billing API.
 * Central sends the 3-variant matrix, while older clients may only send the
 * flat monthly/annual price fields.
 */
class ExternalPlanFields {
  @IsOptional() @IsString() @MaxLength(191) planId?: string;
  @IsOptional() @IsString() @MaxLength(191) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsNumber() @Min(0) monthlyPrice?: number;
  @IsOptional() @IsNumber() @Min(0) quarterlyPrice?: number;
  @IsOptional() @IsNumber() @Min(0) annualPrice?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsObject() quotas?: Record<string, unknown>;
  @IsOptional() @IsObject() configuration?: Record<string, unknown>;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalPlanVariantDto)
  variants?: ExternalPlanVariantDto[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsString() @MaxLength(60) type?: string;
  @IsOptional() @IsInt() @Min(0) trialDuration?: number;
  @IsOptional() @IsString() seasonId?: string;
  @IsOptional() @IsString() stripeMonthlyPriceId?: string;
  @IsOptional() @IsString() stripeQuarterlyPriceId?: string;
  @IsOptional() @IsString() stripeAnnualPriceId?: string;
  @IsOptional() @IsString() paypalMonthlyPlanId?: string;
  @IsOptional() @IsString() paypalQuarterlyPlanId?: string;
  @IsOptional() @IsString() paypalAnnualPlanId?: string;
  @IsOptional() @IsString() platform?: string;
}

export class CreateSystemPlanDto extends ExternalPlanFields {
  @IsString() @MaxLength(120) name!: string;
}

export class UpdateSystemPlanDto extends ExternalPlanFields {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
}
