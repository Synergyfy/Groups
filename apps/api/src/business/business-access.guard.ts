import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "../auth/jwt-auth.guard.js";
import { BusinessContextService } from "./business-context.service.js";
import { ALLOW_LOCKED_BUSINESS_ACCESS } from "./business-access.decorator.js";
import { isPlanActive } from "./business.rules.js";

/**
 * Enforces the plan gate at the API boundary: every dashboard route requires
 * an active, unexpired plan, an accepted access agreement, and — when the
 * administrator requires it — paid access. Only the plan/purchase endpoints
 * are explicitly exempt so a locked business can buy or renew a plan.
 */
@Injectable()
export class BusinessAccessGuard implements CanActivate {
  constructor(
    private readonly context: BusinessContextService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_LOCKED_BUSINESS_ACCESS,
      [context.getHandler(), context.getClass()],
    );
    if (allowed) return true;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new ForbiddenException("Business account required");
    }

    const ctx = await this.context.resolve(request.user);
    const rules = ctx.config.groupCreationRules;
    const expired = Boolean(
      ctx.plan.accessExpiresAt &&
        ctx.plan.accessExpiresAt.getTime() <= Date.now(),
    );
    const centralSource = ctx.plan.accessSource !== "local";
    const centralDenied =
      centralSource &&
      ctx.centralAccess !== null &&
      ctx.centralAccess !== undefined &&
      !ctx.centralAccess.allowed;
    const upgradeUrl =
      (centralDenied ? ctx.centralAccess?.upgradeUrl : undefined) ?? null;
    const denialReason =
      (centralDenied ? ctx.centralAccess?.reason : undefined) ??
      (expired ? "ACCESS_EXPIRED" : "PLAN_REQUIRED");

    // Every business route except the plan/purchase endpoints requires an
    // active, unexpired plan. This is the central gate for the whole dashboard.
    if (!isPlanActive(ctx.plan)) {
      throw new HttpException(
        {
          code: denialReason,
          reason: denialReason,
          message: centralDenied
            ? messageForCentralReason(denialReason)
            : expired
              ? "Your plan access has expired. Choose a plan to continue."
              : "You need an active plan to use the dashboard. Choose and activate a plan to continue.",
          upgradeUrl,
          redirectTo: upgradeUrl ?? "/business/plan",
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // The local plan agreement covers access bought in this app. A membership,
    // access pass or trial purchased in Central Hub already carries access.
    if (!centralSource && !ctx.plan.agreementAccepted) {
      throw new ForbiddenException({
        code: "AGREEMENT_REQUIRED",
        message:
          "Accept the plan access agreement before using the dashboard.",
        redirectTo: "/business/plan",
      });
    }

    const temporary = (ctx.config.accessRules.temporaryAccess ?? {}) as {
      duration?: string | number;
      requirePaymentForPermanent?: boolean;
    };
    const durationDays = Number(temporary.duration ?? 0);
    const trialEnd =
      ctx.user.trialAccessExpiresAt ??
      (ctx.plan.accessSource === "trial"
        ? ctx.plan.accessExpiresAt
        : null) ??
      (ctx.user.membershipStatus?.trim().toLowerCase() === "trial" &&
      durationDays > 0
        ? new Date(
            ctx.business.joinedAt.getTime() +
              durationDays * 24 * 60 * 60 * 1000,
          )
        : null);
    const trialActive = Boolean(
      (ctx.plan.accessSource === "trial" && isPlanActive(ctx.plan)) ||
        (trialEnd && trialEnd.getTime() > Date.now()),
    );
    const paymentForPermanent =
      temporary.requirePaymentForPermanent !== false;

    if (
      rules.requirePaidAccess &&
      (!ctx.plan.paid || expired) &&
      !trialActive &&
      paymentForPermanent
    ) {
      throw new HttpException(
        {
          code: expired ? "ACCESS_EXPIRED" : "PAYMENT_REQUIRED",
          message: expired
            ? "Your plan access has expired. Renew your plan to continue."
            : trialEnd
              ? "Your temporary access has ended. Pay the plan access fee to continue."
              : "Pay the plan access fee before using the dashboard.",
          redirectTo: "/business/plan",
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}

function messageForCentralReason(reason: string): string {
  switch (reason) {
    case "PLATFORM_NOT_IN_MEMBERSHIP":
      return "Your Central Hub membership does not include Groups & Circles. Add the Groups app to your membership plan to continue.";
    case "TRIAL_NO_TASKS":
      return "Your trial is active, but no programme tasks are configured for Groups & Circles in Central Hub.";
    case "TRIAL_EXPIRED":
      return "Your Central Hub trial has expired. Renew your membership or ask an administrator to extend access.";
    case "UNVERIFIED":
      return "Complete your business verification in Central Hub to access Groups & Circles.";
    case "MEMBERSHIP_EXPIRED":
      return "Your Central Hub membership has expired. Renew it to access Groups & Circles.";
    default:
      return "Central Hub does not currently grant access to Groups & Circles. Manage your membership in Central Hub to continue.";
  }
}
