import { Injectable, NotFoundException } from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import type { Business, PlatformAccount } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { day, iso } from "../../admin/admin.mappers.js";
import { AdminAuditService } from "../../admin/admin-audit.service.js";
import type { AdminListQueryDto, UpdateAdminUserDto } from "../../admin/dto/admin.dto.js";

export interface UnifiedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  verified: boolean;
  registeredAt?: string;
  source: string;
}

function accountToUnified(account: PlatformAccount): UnifiedUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone ?? undefined,
    role: account.role,
    status: account.status,
    verified: account.verified,
    registeredAt: day(account.createdAt),
    source: account.source,
  };
}

function businessToUnified(business: Business): UnifiedUser {
  return {
    id: business.id,
    name: business.name,
    email: business.email,
    phone: business.phone ?? undefined,
    role: "business",
    status: business.status === "Closed" ? "Suspended" : business.status,
    verified: business.verified,
    registeredAt: day(business.joinedAt),
    source: "business-directory",
  };
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(query: AdminListQueryDto) {
    const [accounts, businesses] = await Promise.all([
      this.prisma.platformAccount.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.business.findMany({ orderBy: { joinedAt: "desc" } }),
    ]);

    const businessEmails = new Set(
      businesses.map((business) => business.email.toLowerCase()),
    );

    const items: UnifiedUser[] = [
      ...businesses.map(businessToUnified),
      ...accounts
        .filter((account) => !businessEmails.has(account.email.toLowerCase()))
        .map(accountToUnified),
    ];

    const search = query.search?.trim().toLowerCase();

    return items.filter((user) => {
      if (query.role && query.role !== "all" && user.role !== query.role) {
        return false;
      }
      if (query.status && query.status !== "all" && user.status !== query.status) {
        return false;
      }
      if (search) {
        const haystack = `${user.name} ${user.email} ${user.phone ?? ""}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.platformAccount.findUnique({
      where: { id },
    });
    if (account) return accountToUnified(account);

    const business = await this.prisma.business.findUnique({ where: { id } });
    if (business) return businessToUnified(business);

    throw new NotFoundException(`User ${id} not found`);
  }

  async update(id: string, dto: UpdateAdminUserDto, actor?: SessionUser) {
    const account = await this.prisma.platformAccount.findUnique({
      where: { id },
    });

    if (account) {
      const updated = await this.prisma.platformAccount.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          status: dto.status,
          verified: dto.verified,
          role: dto.role,
        },
      });
      await this.audit.record(actor, {
        action: "business-updated",
        targetType: "business",
        targetId: updated.id,
        targetName: updated.name,
        detail: "Platform account updated",
      });
      return accountToUnified(updated);
    }

    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException(`User ${id} not found`);

    const updated = await this.prisma.business.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        status: dto.status,
        verified: dto.verified,
      },
    });
    await this.audit.record(actor, {
      action: "business-updated",
      targetType: "business",
      targetId: updated.id,
      targetName: updated.name,
      detail: "Business account updated",
    });
    return businessToUnified(updated);
  }

  async setStatus(id: string, status: string, actor?: SessionUser) {
    return this.update(id, { status }, actor);
  }

  async getRegistrations() {
    const [accounts, businesses] = await Promise.all([
      this.prisma.platformAccount.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.business.findMany({ orderBy: { joinedAt: "desc" } }),
    ]);

    const accountEmails = new Set(
      accounts.map((account) => account.email.toLowerCase()),
    );
    const items = [
      ...accounts.map((account) => ({
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        source: account.source,
        registeredAt: iso(account.createdAt),
      })),
      ...businesses
        .filter(
          (business) =>
            !accountEmails.has(business.email.toLowerCase()),
        )
        .map((business) => ({
          id: business.id,
          name: business.name,
          email: business.email,
          role: "business",
          source: "business-directory",
          registeredAt: iso(business.joinedAt),
        })),
    ];

    return items.sort((a, b) =>
      (b.registeredAt ?? "").localeCompare(a.registeredAt ?? ""),
    );
  }
}
