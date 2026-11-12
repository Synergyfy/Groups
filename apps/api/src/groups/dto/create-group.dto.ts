import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from "class-validator";
import { GroupVisibility } from "../../generated/prisma/client.js";

export class CreateGroupDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug must be lowercase kebab-case",
  })
  @MaxLength(140)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(GroupVisibility)
  visibility?: GroupVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;
}
