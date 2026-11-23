import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { AdminConfig } from "../../generated/prisma/client.js";
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
import { isUuid } from "../../business/business.utils.js";
import { syncAllGroupActivations } from "../../business/group-activation.js";

type Json = Record<string, unknown>;

const asObject = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

/**
 * The admin UI is not the only possible caller of PATCH /admin/config, so the
 * mandatory rules are validated here before they can reach the group-creation
 * gate.
 */
function assertMandatoryGroups(value: unknown): void {
  for (const entry of asArray(value)) {
    const rule = asObject(entry);
    if (typeof rule.type !== "string" || !rule.type.trim()) {
      throw new BadRequestException(
        "Each mandatory group rule needs a non-empty type",
      );
    }
    if (typeof rule.required !== "boolean") {
      throw new BadRequestException(
        `Mandatory group "${rule.type}" needs a boolean required flag`,
      );
    }
    if (rule.pricing !== "owner-choice" && rule.pricing !== "paid") {
      throw new BadRequestException(
        `Mandatory group "${rule.type}" has an invalid pricing mode`,
      );
    }
  }
}

function assertMandatoryCircles(value: unknown): void {
  for (const entry of asArray(value)) {
    const rule = asObject(entry);
    if (
      typeof rule.circleType !== "string" ||
      !rule.circleType.trim()
    ) {
      throw new BadRequestException(
        "Each mandatory circle rule needs a non-empty circleType",
      );
    }
    if (typeof rule.required !== "boolean") {
      throw new BadRequestException(
        `Mandatory circle "${rule.circleType}" needs a boolean required flag`,
      );
    }
    if (
      rule.appliesToTier !== "All" &&
      rule.appliesToTier !== "Free" &&
      rule.appliesToTier !== "Paid"
    ) {
      throw new BadRequestException(
        `Mandatory circle "${rule.circleType}" has an invalid appliesToTier`,
      );
    }
    if (
      typeof rule.minMemberCount !== "number" ||
      !Number.isInteger(rule.minMemberCount) ||
      rule.minMemberCount < 0
    ) {
      throw new BadRequestException(
        `Mandatory circle "${rule.circleType}" needs a non-negative integer minMemberCount`,
      );
    }
    if (typeof rule.autoEnforce !== "boolean") {
      throw new BadRequestException(
        `Mandatory circle "${rule.circleType}" needs a boolean autoEnforce flag`,
      );
    }
  }
}

@Injectable()
export class AdminConfigService {
  private readonly logger = new Logger(AdminConfigService.name);

  private cached: {
    row: AdminConfig;
    expiresAt: number;
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  private async loadConfigRow() {
    return this.prisma.adminConfig.upsert({
      where: { id: "default" },
      update: {},
      create: {
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

  async ensureConfig() {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      return this.cached.row;
    }
    const row = await this.loadConfigRow();
    this.cached = { row, expiresAt: Date.now() + 30_000 };
    return row;
  }

  async getConfig() {
    const config = await this.ensureConfig();

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
      auditLog: [],
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
      await this.validateGroupCreationRules(body.groupCreationRules);
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
      if (
        !Array.isArray(body.stageLabels) ||
        !body.stageLabels.every((value) => typeof value === "string")
      ) {
        throw new BadRequestException("stageLabels must be an array of strings");
      }
      data.stageLabels = body.stageLabels;
    }
    if (body.circleTypes !== undefined) {
      data.circleTypes = asArray(body.circleTypes) as Prisma.InputJsonValue;
    }
    if (body.mandatoryCircles !== undefined) {
      assertMandatoryCircles(body.mandatoryCircles);
      data.mandatoryCircles = asArray(
        body.mandatoryCircles,
      ) as Prisma.InputJsonValue;
    }
    if (body.mandatoryGroups !== undefined) {
      assertMandatoryGroups(body.mandatoryGroups);
      data.mandatoryGroups = asArray(
        body.mandatoryGroups,
      ) as Prisma.InputJsonValue;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No supported configuration fields supplied");
    }

    await this.prisma.adminConfig.update({ where: { id: config.id }, data });
    this.cached = null;

    // Activation status is derived from the rules, so refresh it whenever the
    // administrator changes the recruitment matrix or the activation toggle.
    // The configuration itself is already saved; a sync failure must not make
    // the save look unsuccessful.
    if (data.groupCreationRules !== undefined) {
      try {
        await syncAllGroupActivations(this.prisma);
      } catch (error) {
        this.logger.error(
          "Failed to synchronise group activation statuses",
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: config.id,
      targetName: "Platform configuration",
      detail: "Admin configuration updated",
    });

    return this.getConfig();
  }

  private async validateGroupCreationRules(value: unknown): Promise<void> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException("groupCreationRules must be an object.");
    }
    const rules = value as Record<string, unknown>;

    if ("allowedPlans" in rules) {
      if (
        !Array.isArray(rules.allowedPlans) ||
        !rules.allowedPlans.every(
          (entry) => typeof entry === "string" && entry.trim().length > 0,
        )
      ) {
        throw new BadRequestException(
          "allowedPlans must be an array of plan names.",
        );
      }
    }

    if ("allowedVariants" in rules) {
      if (
        !Array.isArray(rules.allowedVariants) ||
        !rules.allowedVariants.every((entry) =>
          ["Standard", "Pro", "Pro+"].includes(String(entry)),
        )
      ) {
        throw new BadRequestException(
          "allowedVariants must contain Standard, Pro and/or Pro+.",
        );
      }
    }

    if ("planCreationRights" in rules) {
      const rights = rules.planCreationRights;
      if (!rights || typeof rights !== "object" || Array.isArray(rights)) {
        throw new BadRequestException(
          "planCreationRights must be keyed by plan name.",
        );
      }
      for (const [planName, entry] of Object.entries(
        rights as Record<string, unknown>,
      )) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          throw new BadRequestException(
            `planCreationRights.${planName} must be an object.`,
          );
        }
        for (const [variant, raw] of Object.entries(
          entry as Record<string, unknown>,
        )) {
          if (!["Standard", "Pro", "Pro+"].includes(variant)) {
            throw new BadRequestException(
              `Unknown plan variant "${variant}" in planCreationRights.${planName}.`,
            );
          }
          if (typeof raw !== "boolean") {
            throw new BadRequestException(
              `planCreationRights.${planName}.${variant} must be true or false.`,
            );
          }
        }
      }
    }

    if ("recruitmentTargets" in rules) {
      const targets = rules.recruitmentTargets;
      if (!targets || typeof targets !== "object" || Array.isArray(targets)) {
        throw new BadRequestException(
          "recruitmentTargets must be keyed by plan name.",
        );
      }
      for (const [planName, entry] of Object.entries(
        targets as Record<string, unknown>,
      )) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          throw new BadRequestException(
            `recruitmentTargets.${planName} must be an object.`,
          );
        }
        for (const [variant, raw] of Object.entries(
          entry as Record<string, unknown>,
        )) {
          if (!["Standard", "Pro", "Pro+"].includes(variant)) {
            throw new BadRequestException(
              `Unknown plan variant "${variant}" in recruitmentTargets.${planName}.`,
            );
          }
          const numeric = Number(raw);
          if (!Number.isFinite(numeric) || numeric < 0 || numeric > 50) {
            throw new BadRequestException(
              `recruitmentTargets.${planName}.${variant} must be between 0 and 50.`,
            );
          }
        }
      }
    }

    if ("platformGroupId" in rules) {
      const id = rules.platformGroupId;
      if (id !== null && id !== undefined) {
        if (typeof id !== "string" || !isUuid(id)) {
          throw new BadRequestException(
            "platformGroupId must be a group ID or null.",
          );
        }
        const group = await this.prisma.group.findUnique({
          where: { id },
          select: { id: true, pricing: true, status: true },
        });
        if (!group) {
          throw new BadRequestException(
            "The selected platform group does not exist.",
          );
        }
        if (group.pricing === "paid") {
          throw new BadRequestException(
            "The platform group must be a free group so businesses can be placed into it automatically.",
          );
        }
        if (group.status === "Closed" || group.status === "Suspended") {
          throw new BadRequestException(
            `The platform group is ${group.status.toLowerCase()} and cannot accept members.`,
          );
        }
      }
    }

    for (const key of [
      "activationEnabled",
      "requirePaidAccess",
      "restrictToPlatformGroup",
    ] as const) {
      if (key in rules && typeof rules[key] !== "boolean") {
        throw new BadRequestException(`${key} must be true or false.`);
      }
    }

    if ("entryAccessFee" in rules) {
      const fee = Number(rules.entryAccessFee);
      if (!Number.isFinite(fee) || fee < 0) {
        throw new BadRequestException("entryAccessFee must be zero or more.");
      }
    }

    if ("entryAccessDays" in rules) {
      const days = Number(rules.entryAccessDays);
      if (![90, 180, 365].includes(days)) {
        throw new BadRequestException("entryAccessDays must be 90, 180 or 365.");
      }
    }
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

  async getSettings() {
    const config = await this.getConfig();
    return config.platformSettings;
  }
}
