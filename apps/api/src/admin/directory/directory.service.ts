import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { SessionUser } from "../../auth/auth.types.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { toMinorPence } from "../../common/money.js";
import { AdminAuditService } from "../../admin/admin-audit.service.js";
import { FREE_PARTNER_PERMISSIONS } from "../../admin/admin-defaults.js";
import {
  mapBusiness,
  mapCampaign,
  mapGroup,
  mapPartner,
  mapProgramme,
  mapRelationship,
} from "../../admin/admin.mappers.js";
import type {
  AdminListQueryDto,
  CreateBusinessDto,
  CreateCampaignDto,
  CreatePartnerDto,
  CreateProgrammeDto,
  CreateRelationshipDto,
  UpdateBusinessDto,
  UpdateCampaignDto,
  UpdatePartnerDto,
  UpdateProgrammeDto,
  UpdateRelationshipDto,
} from "../../admin/dto/admin.dto.js";

@Injectable()
export class AdminDirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Businesses
  // -------------------------------------------------------------------------

  async listBusinesses(query: AdminListQueryDto) {
    const search = query.search?.trim().toLowerCase();
    const businesses = await this.prisma.business.findMany({
      orderBy: { joinedAt: "desc" },
    });

    return businesses
      .filter((business) => {
        if (query.status && query.status !== "all" && business.status !== query.status) {
          return false;
        }
        if (search) {
          const haystack = `${business.name} ${business.contactName} ${business.email} ${business.city}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      })
      .map(mapBusiness);
  }

  async findBusiness(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException(`Business ${id} not found`);

    const groups = await this.prisma.group.findMany({
      where: { ownerId: id },
      include: { members: { select: { memberId: true } } },
    });

    return { ...mapBusiness(business), groups: groups.map(mapGroup) };
  }

  async createBusiness(dto: CreateBusinessDto, actor?: SessionUser) {
    const business = await this.prisma.business.create({
      data: {
        id: randomUUID(),
        name: dto.name,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        city: dto.city,
        localArea: dto.localArea,
        category: dto.category,
        status: dto.status ?? "Active",
        verified: dto.verified ?? false,
        tier: dto.tier ?? "Free",
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : new Date(),
        programmeId: dto.programmeId,
        accountManagerId: dto.accountManagerId,
        agentId: dto.agentId,
        consultantId: dto.consultantId,
        isPartner: dto.isPartner ?? false,
      },
    });

    await this.audit.record(actor, {
      action: "business-updated",
      targetType: "business",
      targetId: business.id,
      targetName: business.name,
      detail: "Business created",
    });

    return mapBusiness(business);
  }

  async updateBusiness(
    id: string,
    dto: UpdateBusinessDto,
    actor?: SessionUser,
  ) {
    await this.ensureBusiness(id);
    const business = await this.prisma.business.update({
      where: { id },
      data: {
        name: dto.name,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        city: dto.city,
        localArea: dto.localArea,
        category: dto.category,
        status: dto.status,
        verified: dto.verified,
        tier: dto.tier,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
        programmeId: dto.programmeId,
        accountManagerId: dto.accountManagerId,
        agentId: dto.agentId,
        consultantId: dto.consultantId,
        isPartner: dto.isPartner,
      },
    });

    await this.audit.record(actor, {
      action: "business-updated",
      targetType: "business",
      targetId: business.id,
      targetName: business.name,
      detail: "Business updated",
    });

    return mapBusiness(business);
  }

  async removeBusiness(id: string, actor?: SessionUser) {
    const business = await this.ensureBusiness(id);
    await this.prisma.$transaction([
      this.prisma.group.updateMany({
        where: { ownerId: id },
        data: { ownerId: null, ownerName: "" },
      }),
      this.prisma.business.updateMany({
        where: { id },
        data: { programmeId: null, accountManagerId: null, agentId: null, consultantId: null },
      }),
      this.prisma.business.delete({ where: { id } }),
    ]);
    await this.audit.record(actor, {
      action: "business-updated",
      targetType: "business",
      targetId: id,
      targetName: business.name,
      detail: "Business deleted",
    });
    return { ok: true };
  }

  private async ensureBusiness(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException(`Business ${id} not found`);
    return business;
  }

  // -------------------------------------------------------------------------
  // Partners
  // -------------------------------------------------------------------------

  async listPartners(query: AdminListQueryDto) {
    const search = query.search?.trim().toLowerCase();
    const partners = await this.prisma.partner.findMany({
      orderBy: { joinedAt: "desc" },
    });

    return partners
      .filter((partner) => {
        if (query.status && query.status !== "all" && partner.status !== query.status) {
          return false;
        }
        if (search) {
          const haystack = `${partner.businessName} ${partner.tier}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      })
      .map(mapPartner);
  }

  async findPartner(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException(`Partner ${id} not found`);
    return mapPartner(partner);
  }

  async createPartner(dto: CreatePartnerDto, actor?: SessionUser) {
    const partner = await this.prisma.partner.create({
      data: {
        id: randomUUID(),
        businessId: dto.businessId,
        businessName: dto.businessName,
        tier: dto.tier ?? "Free",
        status: dto.status ?? "Pending",
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : new Date(),
        programmeId: dto.programmeId,
        feeMonthlyMinor: toMinorPence(dto.feeMonthly),
        permissions: (dto.permissions ??
          FREE_PARTNER_PERMISSIONS) as Prisma.InputJsonValue,
        notes: dto.notes,
      },
    });

    await this.audit.record(actor, {
      action: "partner-updated",
      targetType: "partner",
      targetId: partner.id,
      targetName: partner.businessName,
      detail: "Partner created",
    });

    return mapPartner(partner);
  }

  async updatePartner(id: string, dto: UpdatePartnerDto, actor?: SessionUser) {
    await this.ensurePartner(id);
    const partner = await this.prisma.partner.update({
      where: { id },
      data: {
        businessId: dto.businessId,
        businessName: dto.businessName,
        tier: dto.tier,
        status: dto.status,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
        programmeId: dto.programmeId,
        feeMonthlyMinor:
          dto.feeMonthly !== undefined
            ? toMinorPence(dto.feeMonthly)
            : undefined,
        permissions: dto.permissions as Prisma.InputJsonValue | undefined,
        notes: dto.notes,
      },
    });

    await this.audit.record(actor, {
      action: "partner-updated",
      targetType: "partner",
      targetId: partner.id,
      targetName: partner.businessName,
      detail: "Partner updated",
    });

    return mapPartner(partner);
  }

  async removePartner(id: string, actor?: SessionUser) {
    const partner = await this.ensurePartner(id);
    await this.prisma.partner.delete({ where: { id } });
    await this.audit.record(actor, {
      action: "partner-updated",
      targetType: "partner",
      targetId: id,
      targetName: partner.businessName,
      detail: "Partner deleted",
    });
    return { ok: true };
  }

  private async ensurePartner(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException(`Partner ${id} not found`);
    return partner;
  }

  // -------------------------------------------------------------------------
  // Programmes
  // -------------------------------------------------------------------------

  async listProgrammes() {
    const programmes = await this.prisma.programme.findMany({
      orderBy: { monthlyFeeMinor: "desc" },
    });
    return programmes.map(mapProgramme);
  }

  async createProgramme(dto: CreateProgrammeDto, actor?: SessionUser) {
    const programme = await this.prisma.programme.create({
      data: {
        id: randomUUID(),
        name: dto.name,
        tier: dto.tier ?? "Free",
        status: dto.status ?? "Active",
        description: dto.description ?? "",
        monthlyFeeMinor: toMinorPence(dto.monthlyFee),
        benefits: dto.benefits ?? [],
        groupCount: dto.groupCount ?? 0,
      },
    });
    await this.audit.record(actor, {
      action: "programme-updated",
      targetType: "programme",
      targetId: programme.id,
      targetName: programme.name,
      detail: "Programme created",
    });
    return mapProgramme(programme);
  }

  async updateProgramme(
    id: string,
    dto: UpdateProgrammeDto,
    actor?: SessionUser,
  ) {
    await this.ensureProgramme(id);
    const programme = await this.prisma.programme.update({
      where: { id },
      data: {
        name: dto.name,
        tier: dto.tier,
        status: dto.status,
        description: dto.description,
        monthlyFeeMinor:
          dto.monthlyFee !== undefined
            ? toMinorPence(dto.monthlyFee)
            : undefined,
        benefits: dto.benefits,
        groupCount: dto.groupCount,
      },
    });
    await this.audit.record(actor, {
      action: "programme-updated",
      targetType: "programme",
      targetId: programme.id,
      targetName: programme.name,
      detail: "Programme updated",
    });
    return mapProgramme(programme);
  }

  async removeProgramme(id: string, actor?: SessionUser) {
    const programme = await this.ensureProgramme(id);
    await this.prisma.$transaction([
      this.prisma.group.updateMany({
        where: { programmeId: id },
        data: { programmeId: null },
      }),
      this.prisma.business.updateMany({
        where: { programmeId: id },
        data: { programmeId: null },
      }),
      this.prisma.programme.delete({ where: { id } }),
    ]);
    await this.audit.record(actor, {
      action: "programme-updated",
      targetType: "programme",
      targetId: id,
      targetName: programme.name,
      detail: "Programme deleted",
    });
    return { ok: true };
  }

  private async ensureProgramme(id: string) {
    const programme = await this.prisma.programme.findUnique({ where: { id } });
    if (!programme) throw new NotFoundException(`Programme ${id} not found`);
    return programme;
  }

  // -------------------------------------------------------------------------
  // Campaigns
  // -------------------------------------------------------------------------

  async listCampaigns(query: AdminListQueryDto) {
    const search = query.search?.trim().toLowerCase();
    const campaigns = await this.prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
    });
    return campaigns
      .filter((campaign) => {
        if (query.status && query.status !== "all" && campaign.status !== query.status) {
          return false;
        }
        if (search && !campaign.name.toLowerCase().includes(search)) {
          return false;
        }
        return true;
      })
      .map(mapCampaign);
  }

  async createCampaign(dto: CreateCampaignDto, actor?: SessionUser) {
    const campaign = await this.prisma.campaign.create({
      data: {
        id: randomUUID(),
        name: dto.name,
        platform: dto.platform ?? "FundOrDonate",
        status: dto.status ?? "Draft",
        groupIds: dto.groupIds ?? [],
        budgetMinor:
          dto.budget !== undefined ? toMinorPence(dto.budget) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
    await this.audit.record(actor, {
      action: "campaign-updated",
      targetType: "campaign",
      targetId: campaign.id,
      targetName: campaign.name,
      detail: "Campaign created",
    });
    return mapCampaign(campaign);
  }

  async updateCampaign(
    id: string,
    dto: UpdateCampaignDto,
    actor?: SessionUser,
  ) {
    await this.ensureCampaign(id);
    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        platform: dto.platform,
        status: dto.status,
        groupIds: dto.groupIds,
        budgetMinor:
          dto.budget !== undefined ? toMinorPence(dto.budget) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
    await this.audit.record(actor, {
      action: "campaign-updated",
      targetType: "campaign",
      targetId: campaign.id,
      targetName: campaign.name,
      detail: "Campaign updated",
    });
    return mapCampaign(campaign);
  }

  async removeCampaign(id: string, actor?: SessionUser) {
    const campaign = await this.ensureCampaign(id);
    await this.prisma.campaign.delete({ where: { id } });
    await this.audit.record(actor, {
      action: "campaign-updated",
      targetType: "campaign",
      targetId: id,
      targetName: campaign.name,
      detail: "Campaign deleted",
    });
    return { ok: true };
  }

  private async ensureCampaign(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  // -------------------------------------------------------------------------
  // Relationships
  // -------------------------------------------------------------------------

  async listRelationships(query: AdminListQueryDto) {
    const search = query.search?.trim().toLowerCase();
    const relationships = await this.prisma.relationship.findMany({
      orderBy: { name: "asc" },
    });
    return relationships
      .filter((relationship) => {
        if (query.kind && query.kind !== "all" && relationship.kind !== query.kind) {
          return false;
        }
        if (search) {
          const haystack = `${relationship.name} ${relationship.role} ${relationship.email}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      })
      .map(mapRelationship);
  }

  async createRelationship(
    dto: CreateRelationshipDto,
    actor?: SessionUser,
  ) {
    const relationship = await this.prisma.relationship.create({
      data: {
        id: randomUUID(),
        kind: dto.kind,
        name: dto.name,
        role: dto.role,
        email: dto.email,
        phone: dto.phone,
        activeGroups: dto.activeGroups ?? 0,
      },
    });
    await this.audit.record(actor, {
      action: "relationship-assigned",
      targetType: "config",
      targetId: relationship.id,
      targetName: relationship.name,
      detail: "Relationship created",
    });
    return mapRelationship(relationship);
  }

  async updateRelationship(
    id: string,
    dto: UpdateRelationshipDto,
    actor?: SessionUser,
  ) {
    await this.ensureRelationship(id);
    const relationship = await this.prisma.relationship.update({
      where: { id },
      data: {
        kind: dto.kind,
        name: dto.name,
        role: dto.role,
        email: dto.email,
        phone: dto.phone,
        activeGroups: dto.activeGroups,
      },
    });
    await this.audit.record(actor, {
      action: "relationship-assigned",
      targetType: "config",
      targetId: relationship.id,
      targetName: relationship.name,
      detail: "Relationship updated",
    });
    return mapRelationship(relationship);
  }

  async removeRelationship(id: string, actor?: SessionUser) {
    const relationship = await this.ensureRelationship(id);
    await this.prisma.$transaction([
      this.prisma.group.updateMany({
        where: { accountManagerId: id },
        data: { accountManagerId: null },
      }),
      this.prisma.group.updateMany({
        where: { agentId: id },
        data: { agentId: null },
      }),
      this.prisma.group.updateMany({
        where: { consultantId: id },
        data: { consultantId: null },
      }),
      this.prisma.relationship.delete({ where: { id } }),
    ]);
    await this.audit.record(actor, {
      action: "relationship-assigned",
      targetType: "config",
      targetId: id,
      targetName: relationship.name,
      detail: "Relationship deleted",
    });
    return { ok: true };
  }

  private async ensureRelationship(id: string) {
    const relationship = await this.prisma.relationship.findUnique({
      where: { id },
    });
    if (!relationship) {
      throw new NotFoundException(`Relationship ${id} not found`);
    }
    return relationship;
  }

  // -------------------------------------------------------------------------
  // Partner groups (read-only report)
  // -------------------------------------------------------------------------

  async getPartnerGroups() {
    const [groups, programme, partners] = await Promise.all([
      this.prisma.group.findMany({
        where: { type: "Partner" },
        include: { members: { select: { memberId: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.programme.findFirst({
        where: { name: { contains: "Partner", mode: "insensitive" } },
      }),
      this.prisma.partner.findMany({ where: { status: "Active" } }),
    ]);

    return {
      groups: groups.map(mapGroup),
      partners: partners.map(mapPartner),
      programme: programme ? mapProgramme(programme) : null,
      metrics: {
        partnerGroups: groups.length,
        members: groups.reduce((sum, group) => sum + group.memberCount, 0),
      },
    };
  }
}
