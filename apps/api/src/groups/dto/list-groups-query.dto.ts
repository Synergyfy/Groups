import { IsEnum, IsOptional } from "class-validator";
import { GroupVisibility } from "../../generated/prisma/client.js";

export class ListGroupsQueryDto {
  @IsOptional()
  @IsEnum(GroupVisibility)
  visibility?: GroupVisibility;
}
