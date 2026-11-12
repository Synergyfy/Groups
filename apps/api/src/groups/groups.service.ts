import { Injectable, NotFoundException } from "@nestjs/common";
import { GroupVisibility } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateGroupDto } from "./dto/create-group.dto.js";
import { UpdateGroupDto } from "./dto/update-group.dto.js";

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(visibility?: GroupVisibility) {
    return this.prisma.group.findMany({
      where: visibility ? { visibility } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({ where: { id } });

    if (!group) {
      throw new NotFoundException(`Group ${id} not found`);
    }

    return group;
  }

  create(dto: CreateGroupDto) {
    return this.prisma.group.create({ data: dto });
  }

  async update(id: string, dto: UpdateGroupDto) {
    await this.findOne(id);
    return this.prisma.group.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.group.delete({ where: { id } });
  }
}
