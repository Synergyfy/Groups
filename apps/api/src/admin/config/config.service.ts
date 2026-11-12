import { Injectable } from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AdminAuditService } from "../../admin/admin-audit.service.js";
import {
  DEFAULT_ACCESS_RULES,
  DEFAULT_AUTOMATIC_GROUPING,
  DEFAULT_CIRCLE_TYPES,
  DEFAULT_GROUP_CREATION_RULES,
  DEFAULT_GROUP_TYPES,
  DEFAULT_MANDATORY_CIRCLES,
  DEFAULT_MANDATORY_GROUPS,
  DEFAULT_PAYMENT_RULES,
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_STAGE_LABELS,
  FREE_PARTNER_PERMISSIONS,
} from "../../admin/admin-defaults.js";
import { mapAuditLog } from "../../admin/admin.mappers.js";

type Json = Record<string, unknown>;

const asObject = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

@Injectable()
export class AdminConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async ensureConfig() {
    const existing = await this.prisma.adminConfig.findUnique({
      where: { id: "default" },
    });
    if (existing) return existing;

    return this.prisma.adminConfig.create({
      data: {
        id: "default",
        automaticGrouping: DEFAULT_AUTOMATIC_GROUPING,
        groupTypes: DEFAULT_GROUP_TYPES,
        stageLabels: DEFAULT_STAGE_LABELS,
        paymentRules: DEFAULT_PAYMENT_RULES,
        groupCreationRules: DEFAULT_GROUP_CREATION_RULES,
        circleTypes: DEFAULT_CIRCLE_TYPES,
        mandatoryCircles: DEFAULT_MANDATORY_CIRCLES,
        mandatoryGroups: DEFAULT_MANDATORY_GROUPS,
        partnerDefaults: FREE_PARTNER_PERMISSIONS,
        accessRules: DEFAULT_ACCESS_RULES,
        platformSettings: DEFAULT_PLATFORM_SETTINGS,
      },
    });
  }

  async getConfig() {
    const config = await this.ensureConfig();
    const audit = await this.prisma.auditLog.findMany({
      orderBy: { at: "desc" },
      take: 50,
    });

    return {
      id: config.id,
      automaticGrouping: asObject(config.automaticGrouping),
      groupTypes: asArray(config.groupTypes),
      stageLabels: config.stageLabels,
      paymentRules: asObject(config.paymentRules),
      groupCreationRules: asObject(config.groupCreationRules),
      circleTypes: asArray(config.circleTypes),
      mandatoryCircles: asArray(config.mandatoryCircles),
      mandatoryGroups: asArray(config.mandatoryGroups),
      partnerDefaults: asObject(config.partnerDefaults),
      accessRules: asObject(config.accessRules),
      platformSettings: asObject(config.platformSettings),
      auditLog: audit.map(mapAuditLog),
    };
  }

  async patchConfig(body: Json, actor?: SessionUser) {
    const config = await this.ensureConfig();
    const data: Prisma.AdminConfigUpdateInput = {};

    if (body.automaticGrouping) {
      data.automaticGrouping = {
        ...asObject(config.automaticGrouping),
        ...asObject(body.automaticGrouping),
      } as Prisma.InputJsonValue;
    }
    if (body.paymentRules) {
      data.paymentRules = {
        ...asObject(config.paymentRules),
        ...asObject(body.paymentRules),
      } as Prisma.InputJsonValue;
    }
    if (body.groupCreationRules) {
      data.groupCreationRules = {
        ...asObject(config.groupCreationRules),
        ...asObject(body.groupCreationRules),
      } as Prisma.InputJsonValue;
    }
    if (body.partnerDefaults) {
      data.partnerDefaults = {
        ...asObject(config.partnerDefaults),
        ...asObject(body.partnerDefaults),
      } as Prisma.InputJsonValue;
    }
    if (body.accessRules) {
      data.accessRules = {
        ...asObject(config.accessRules),
        ...asObject(body.accessRules),
      } as Prisma.InputJsonValue;
    }
    if (body.platformSettings) {
      data.platformSettings = {
        ...asObject(config.platformSettings),
        ...asObject(body.platformSettings),
      } as Prisma.InputJsonValue;
    }
    if (body.groupTypes !== undefined) {
      data.groupTypes = asArray(body.groupTypes) as Prisma.InputJsonValue;
    }
    if (body.stageLabels !== undefined) {
      data.stageLabels = (body.stageLabels as string[]) ?? [];
    }
    if (body.circleTypes !== undefined) {
      data.circleTypes = asArray(body.circleTypes) as Prisma.InputJsonValue;
    }
    if (body.mandatoryCircles !== undefined) {
      data.mandatoryCircles = asArray(
        body.mandatoryCircles,
      ) as Prisma.InputJsonValue;
    }
    if (body.mandatoryGroups !== undefined) {
      data.mandatoryGroups = asArray(
        body.mandatoryGroups,
      ) as Prisma.InputJsonValue;
    }

    await this.prisma.adminConfig.update({ where: { id: config.id }, data });
    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: config.id,
      targetName: "Platform configuration",
      detail: "Admin configuration updated",
    });

    return this.getConfig();
  }

  async getField(field: string) {
    const config = await this.getConfig();
    return (config as unknown as Record<string, unknown>)[field];
  }

  async setField(field: string, value: unknown, actor?: SessionUser) {
    const payload: Json = {};
    const arrayFields = [
      "groupTypes",
      "stageLabels",
      "circleTypes",
      "mandatoryCircles",
      "mandatoryGroups",
    ];
    const objectFields = [
      "automaticGrouping",
      "paymentRules",
      "groupCreationRules",
      "partnerDefaults",
      "accessRules",
      "platformSettings",
    ];

    if (arrayFields.includes(field)) {
      payload[field] = value;
    } else if (objectFields.includes(field)) {
      payload[field] = value;
    }

    return this.patchConfig(payload, actor);
  }

  async getPermissions() {
    const config = await this.getConfig();
    return {
      partnerDefaults: config.partnerDefaults,
      groups: {
        groupManagement: [
          "canCreateGroups",
          "canInviteMembers",
          "canRemoveMembers",
          "maxGroups",
        ],
        circleManagement: ["canCreateCircles", "maxCircles"],
        financial: [
          "canRunPaidGroups",
          "canRunFreeGroups",
          "canSetContributionAmounts",
          "revenueSharePercent",
        ],
        reporting: [
          "canAccessCampaigns",
          "canAccessReports",
          "canSeeFinancials",
        ],
      },
    };
  }

  async getAccessRules() {
    const config = await this.getConfig();
    return config.accessRules;
  }

  async getSettings() {
    const config = await this.getConfig();
    return config.platformSettings;
  }
}
