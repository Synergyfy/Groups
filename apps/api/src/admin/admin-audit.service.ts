import { Injectable } from "@nestjs/common";
import type { SessionUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";

export interface AuditInput {
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  detail: string;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(actor: SessionUser | undefined, input: AuditInput) {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: actor?.id ?? "system",
        actorName: actor?.name ?? "System",
        targetType: input.targetType,
        targetId: input.targetId,
        targetName: input.targetName,
        detail: input.detail,
      },
    });
  }
}
