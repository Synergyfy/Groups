import { IsBoolean, IsOptional } from "class-validator";

/**
 * Local-only communication preferences. Identity data (name, address, phone)
 * is owned by Central Hub and cannot be edited here.
 */
export class UpdateConsumerPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  localDiscovery?: boolean;

  @IsOptional()
  @IsBoolean()
  profileVisible?: boolean;
}
