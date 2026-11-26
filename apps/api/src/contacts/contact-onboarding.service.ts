import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NetworkContact } from "../generated/prisma/client.js";
import { MailService } from "../mail/mail.service.js";
import { contactInvitationEmail } from "../mail/mail.templates.js";
import { normalizeCircleTypes } from "../business/business.rules.js";
import { PrismaService } from "../prisma/prisma.service.js";

export type ContactAccountType = "business" | "customer";

export interface ContactInvitationResult {
  /** True when the invitation email was accepted by Resend. */
  sent: boolean;
  /** Why the invitation was skipped, or what went wrong. */
  reason?: string;
  /** The address the invitation was addressed to. */
  email?: string;
  /** True when the contact already has an account on the platform. */
  alreadyRegistered: boolean;
}

export interface SignedUpContact {
  /** The local account id created by the sign-in. */
  userId: string;
  email: string;
  fullName?: string | null;
  category?: string | null;
  city?: string | null;
  phone?: string | null;
  /** The immutable Central Hub user id, once the account is known there. */
  mcomUserId?: string | null;
}

export interface ContactReconciliationResult {
  /** Contacts that were reconciled with the signed-up profile. */
  contacts: number;
  /** Circles the contact was added to. */
  circles: number;
  /** Pending invitations claimed for the account. */
  invitations: number;
}

/**
 * Brings a contact into the platform.
 *
 * When a business adds somebody whose email is not on the platform yet, the
 * contact is invited to create a Central Hub account. Once they sign in, the
 * contact record is reconciled with the profile they signed up with, the
 * contact joins the circles built from their network list and their pending
 * invitations are claimed by the new account.
 */
@Injectable()
export class ContactOnboardingService {
  private readonly logger = new Logger(ContactOnboardingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Invite a contact to create an account. Nothing is sent when the address
   * already belongs to an account on the platform.
   */
  async inviteUnknownContact(params: {
    contact: NetworkContact;
    business: {
      id: string;
      name: string;
      contactName: string;
      email?: string | null;
      city?: string | null;
    };
  }): Promise<ContactInvitationResult> {
    const { contact, business } = params;
    const email = contact.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return { sent: false, reason: "no-email", alreadyRegistered: false };
    }

    if (await this.hasAccount(email)) {
      return {
        sent: false,
        reason: "already-registered",
        email,
        alreadyRegistered: true,
      };
    }

    const [list, circles] = await Promise.all([
      this.prisma.networkList.findUnique({
        where: { id: contact.listId },
        select: { name: true },
      }),
      this.prisma.circle.findMany({
        where: {
          businessId: business.id,
          memberIds: { has: contact.id },
        },
        select: { config: true },
      }),
    ]);

    const accountType = this.accountTypeFor(contact);
    const circleNames = circles
      .map((circle) => {
        const config = circle.config as { name?: unknown } | null;
        const name = config && typeof config.name === "string" ? config.name : "";
        return name.trim();
      })
      .filter(Boolean);

    const message = contactInvitationEmail({
      contactName: contact.fullName,
      businessName: business.name,
      businessContactName: business.contactName,
      businessCity: business.city ?? null,
      listName: list?.name ?? null,
      circleNames,
      accountType,
      signupUrl: this.signupUrl({
        email,
        name: contact.fullName,
        accountType,
      }),
      signInUrl: this.signInUrl(),
    });

    const result = await this.mail.send({
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(business.email ? { replyTo: business.email } : {}),
      tags: [{ name: "category", value: "network-contact-invitation" }],
    });

    if (!result.sent) {
      return {
        sent: false,
        reason: result.reason ?? "send-failed",
        email,
        alreadyRegistered: false,
      };
    }

    this.logger.log(
      `Invited ${contact.fullName} (${email}) to create a Central Hub account on behalf of ${business.name}.`,
    );

    return { sent: true, email, alreadyRegistered: false };
  }

  /**
   * Reconcile a signed-up account with the contacts that were waiting for it.
   * The profile the person signed up with wins over the details the business
   * typed in, the contact becomes confirmed and joins the circles built from
   * their list. Their pending invitations are claimed by the new account.
   */
  async reconcileSignedUpContact(
    signedUp: SignedUpContact,
  ): Promise<ContactReconciliationResult> {
    const email = signedUp.email.trim().toLowerCase();
    if (!email) {
      return { contacts: 0, circles: 0, invitations: 0 };
    }

    const contacts = await this.prisma.networkContact.findMany({
      where: { email },
    });
    if (contacts.length === 0) {
      return { contacts: 0, circles: 0, invitations: 0 };
    }

    const fullName = signedUp.fullName?.trim() || null;
    let circles = 0;

    for (const contact of contacts) {
      const updated = await this.prisma.networkContact.update({
        where: { id: contact.id },
        data: {
          ...(fullName ? { fullName } : {}),
          ...(signedUp.category ? { category: signedUp.category } : {}),
          ...(signedUp.city ? { location: signedUp.city } : {}),
          ...(signedUp.phone ? { phone: signedUp.phone } : {}),
          // The contact is a real Central Hub user from now on, which is what
          // makes them chat-able inside a circle.
          ...(signedUp.mcomUserId ? { mcomUserId: signedUp.mcomUserId } : {}),
          confirmation: "confirmed",
          consentAt: contact.consentAt ?? new Date(),
        },
      });

      circles += await this.addToSourceCircles(updated);
    }

    // Pending invitations sent to this address now belong to the account.
    const claimed = await this.prisma.invitation.updateMany({
      where: { inviteeEmail: email, status: "pending" },
      data: {
        claimedByAccountId: signedUp.userId,
        ...(fullName ? { inviteeName: fullName } : {}),
      },
    });

    this.logger.log(
      `Reconciled ${contacts.length} contact${contacts.length === 1 ? "" : "s"} for ${email}: ${circles} circle${circles === 1 ? "" : "s"}, ${claimed.count} invitation${claimed.count === 1 ? "" : "s"}.`,
    );

    return {
      contacts: contacts.length,
      circles,
      invitations: claimed.count,
    };
  }

  /** Whether an account already exists for this email address. */
  private async hasAccount(email: string): Promise<boolean> {
    const [user, business, platformAccount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
      this.prisma.business.findUnique({
        where: { email },
        select: { id: true },
      }),
      this.prisma.platformAccount.findUnique({
        where: { email },
        select: { id: true },
      }),
    ]);

    return Boolean(user ?? business ?? platformAccount);
  }

  /**
   * Bankers and partners lead circles as businesses, everybody else joins as
   * a consumer account.
   */
  private accountTypeFor(contact: NetworkContact): ContactAccountType {
    return contact.role === "banker" || contact.role === "partner"
      ? "business"
      : "customer";
  }

  /**
   * Add the contact to every circle of their business that is built from the
   * list they are on. Circles with a member cap are left alone once full.
   */
  private async addToSourceCircles(contact: NetworkContact): Promise<number> {
    const circles = await this.prisma.circle.findMany({
      where: {
        businessId: contact.businessId,
        sourceListIds: { has: contact.listId },
      },
      select: { id: true, memberIds: true, type: true },
    });

    const pending = circles.filter(
      (circle) => !circle.memberIds.includes(contact.id),
    );
    if (pending.length === 0) return 0;

    const limits = await this.circleMemberLimits();
    let added = 0;

    for (const circle of pending) {
      const max = limits.get(circle.type);
      if (max !== undefined && max !== null && circle.memberIds.length >= max) {
        continue;
      }

      await this.prisma.circle.update({
        where: { id: circle.id },
        data: { memberIds: [...circle.memberIds, contact.id] },
      });
      added += 1;
    }

    return added;
  }

  /** The configured member cap per circle type. */
  private async circleMemberLimits(): Promise<Map<string, number | null>> {
    const config = await this.prisma.adminConfig.findFirst({
      select: { circleTypes: true },
    });
    const limits = new Map<string, number | null>();
    for (const entry of normalizeCircleTypes(config?.circleTypes)) {
      limits.set(entry.type, entry.maxMembers);
    }
    return limits;
  }

  /** The Central Hub registration link, pre-filled with what we know. */
  private signupUrl(input: {
    email: string;
    name: string;
    accountType: ContactAccountType;
  }): string {
    const params = new URLSearchParams({
      type: input.accountType,
      next: "/consumer/invitations",
      email: input.email,
      name: input.name,
    });
    return `${this.apiPublicUrl()}/auth/mcom/register?${params.toString()}`;
  }

  /** The sign-in link for somebody who already has an account. */
  private signInUrl(): string {
    const base = this.webPublicUrl();
    return `${base}/login?next=${encodeURIComponent("/consumer/invitations")}`;
  }

  private webPublicUrl(): string {
    return this.config
      .get<string>("WEB_PUBLIC_URL", "http://localhost:4088")
      .replace(/\/+$/, "");
  }

  /** The API is served under /api on the same origin as the web app. */
  private apiPublicUrl(): string {
    const configured = this.config.get<string>("API_PUBLIC_URL")?.trim();
    if (configured) return configured.replace(/\/+$/, "");
    return `${this.webPublicUrl()}/api`;
  }
}
