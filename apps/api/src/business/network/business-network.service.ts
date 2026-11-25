import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  NetworkContact,
  NetworkList,
} from "../../generated/prisma/client.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { ContactOnboardingService } from "../../contacts/contact-onboarding.service.js";
import { BusinessContextService } from "../business-context.service.js";
import type { BusinessContext } from "../business.types.js";
import {
  mapNetworkContact,
  mapNetworkList,
} from "../business.mappers.js";
import { centralHubPhotos } from "../business.photos.js";
import { BusinessMediaService } from "../business.media.js";
import type {
  BusinessNetworkContactQueryDto,
  ConfirmNetworkContactDto,
  CreateNetworkContactDto,
  CreateNetworkListDto,
  UpdateNetworkListDto,
} from "../dto/business.dto.js";
import {
  normaliseEmail,
  pageParams,
  pageResult,
} from "../business.utils.js";

type NetworkListWithContacts = NetworkList & { contacts?: NetworkContact[] };

@Injectable()
export class BusinessNetworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: BusinessContextService,
    private readonly media: BusinessMediaService,
    private readonly onboarding: ContactOnboardingService,
  ) {}

  async listLists(ctx: BusinessContext) {
    const lists = await this.prisma.networkList.findMany({
      where: { businessId: ctx.business.id },
      include: { contacts: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });

    return {
      items: lists.map((list) => ({
        ...mapNetworkList(list),
        contactCount: list.contacts?.length ?? 0,
        pendingCount:
          list.contacts?.filter((contact) => contact.confirmation === "pending")
            .length ?? 0,
        confirmedCount:
          list.contacts?.filter((contact) => contact.confirmation === "confirmed")
            .length ?? 0,
      })),
      stats: this.statsFor(lists),
      total: lists.length,
    };
  }

  async getList(ctx: BusinessContext, listId: string) {
    const list = await this.findList(ctx, listId);
    return {
      ...mapNetworkList(list),
      contactCount: list.contacts?.length ?? 0,
      stats: {
        pending:
          list.contacts?.filter((contact) => contact.confirmation === "pending")
            .length ?? 0,
        confirmed:
          list.contacts?.filter(
            (contact) => contact.confirmation === "confirmed",
          ).length ?? 0,
      },
    };
  }

  async createList(ctx: BusinessContext, dto: CreateNetworkListDto) {
    const list = await this.prisma.networkList.create({
      data: {
        businessId: ctx.business.id,
        name: dto.name.trim(),
        type: dto.type,
        geography: dto.geography ?? this.listGeography(ctx),
        status: dto.status ?? "Active",
        source: dto.source ?? "Manual Contacts",
      },
      include: { contacts: true },
    });

    await this.audit(ctx, "network-list-created", list.id, list.name);
    return mapNetworkList(list);
  }

  /**
   * A list inherits its reach from the business's Central Hub location: a
   * mall or high street is hyperlocal, a borough is nearby, anything wider is
   * national.
   */
  private listGeography(ctx: BusinessContext): string {
    if (ctx.business.localMallName || ctx.business.highStreet) return "Hyperlocal";
    if (ctx.business.localArea) return "Nearby";
    return "National";
  }

  async updateList(
    ctx: BusinessContext,
    listId: string,
    dto: UpdateNetworkListDto,
  ) {
    await this.ensureList(ctx, listId);
    const list = await this.prisma.networkList.update({
      where: { id: listId },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        geography: dto.geography,
        status: dto.status,
        source: dto.source,
      },
      include: { contacts: true },
    });

    await this.audit(ctx, "network-list-updated", list.id, list.name);
    return mapNetworkList(list);
  }

  async removeList(ctx: BusinessContext, listId: string) {
    const list = await this.ensureList(ctx, listId);
    await this.prisma.$transaction(async (tx) => {
      await tx.networkList.delete({ where: { id: listId } });
      // Circles are built from lists. Removing a list must not leave dangling
      // source ids behind on the circles that referenced it.
      const circles = await tx.circle.findMany({
        where: {
          businessId: ctx.business.id,
          sourceListIds: { has: listId },
        },
        select: { id: true, sourceListIds: true },
      });
      for (const circle of circles) {
        await tx.circle.update({
          where: { id: circle.id },
          data: {
            sourceListIds: circle.sourceListIds.filter((id) => id !== listId),
          },
        });
      }
    });
    await this.audit(ctx, "network-list-deleted", listId, list.name);
    return { ok: true };
  }

  async listContacts(
    ctx: BusinessContext,
    query: BusinessNetworkContactQueryDto,
  ) {
    const params = pageParams(query.page, query.limit, 25);
    const search = query.search?.trim();
    const where: Prisma.NetworkContactWhereInput = {
      businessId: ctx.business.id,
      ...(query.listId ? { listId: query.listId } : {}),
      ...(query.confirmation
        ? { confirmation: query.confirmation }
        : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { category: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, contacts] = await Promise.all([
      this.prisma.networkContact.count({ where }),
      this.prisma.networkContact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.limit,
      }),
    ]);

    // Central Hub owns the contact avatars, so Groups mirrors them when the
    // contact maps to a Central Hub user.
    const photos = await centralHubPhotos(this.prisma, this.media, contacts, []);

    return pageResult(
      contacts.map((contact) => ({
        ...mapNetworkContact(contact),
        photoUrl: photos.byContactId.get(contact.id) ?? null,
      })),
      total,
      params,
    );
  }

  async createContact(ctx: BusinessContext, dto: CreateNetworkContactDto) {
    const list = await this.prisma.networkList.findFirst({
      where: { id: dto.listId, businessId: ctx.business.id },
    });
    if (!list) {
      throw new NotFoundException(`Network list ${dto.listId} not found`);
    }

    const email = dto.email ? normaliseEmail(dto.email) : null;
    if (email) {
      const duplicate = await this.prisma.networkContact.findFirst({
        where: { businessId: ctx.business.id, email },
      });
      if (duplicate) {
        throw new ConflictException(
          `${dto.fullName} is already on your network with ${email}.`,
        );
      }
    }

    const contact = await this.prisma.networkContact.create({
      data: {
        businessId: ctx.business.id,
        listId: dto.listId,
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone ?? null,
        category: dto.category ?? null,
        location: dto.location ?? null,
        geography: dto.geography ?? list.geography,
        role: dto.role ?? "peripheral",
        tier: dto.tier ?? "Bronze",
        confirmation: "pending",
        intake: dto.intake ?? "manual",
        consentAt: dto.consent ? new Date() : null,
        addedByName: ctx.business.contactName,
      },
    });

    await this.audit(ctx, "network-contact-added", contact.id, contact.fullName);

    // A contact without an account gets an invitation to create one, so their
    // pending invitations and circles are waiting when they sign in.
    const invitation = await this.onboarding.inviteUnknownContact({
      contact,
      business: {
        id: ctx.business.id,
        name: ctx.business.name,
        contactName: ctx.business.contactName,
        email: ctx.business.email,
        city: ctx.business.city,
      },
    });

    return {
      ...(await this.contactView(contact)),
      invitation: {
        sent: invitation.sent,
        reason: invitation.reason,
        email: invitation.email,
        alreadyRegistered: invitation.alreadyRegistered,
      },
    };
  }

  async getContact(ctx: BusinessContext, contactId: string) {
    const contact = await this.ensureContact(ctx, contactId);
    return this.contactView(contact);
  }

  async confirmContact(
    ctx: BusinessContext,
    contactId: string,
    dto: ConfirmNetworkContactDto,
  ) {
    const contact = await this.ensureContact(ctx, contactId);
    if (contact.confirmation === "confirmed") {
      return this.contactView(contact);
    }

    const updated = await this.prisma.networkContact.update({
      where: { id: contactId },
      data: {
        confirmation: "confirmed",
        consentAt: dto.consent === false ? contact.consentAt : new Date(),
      },
    });

    await this.audit(ctx, "network-contact-confirmed", updated.id, updated.fullName);
    return this.contactView(updated);
  }

  /** A contact with the Central Hub avatar of the user behind its email. */
  private async contactView(contact: NetworkContact) {
    const photos = await centralHubPhotos(this.prisma, this.media, [contact], []);
    return {
      ...mapNetworkContact(contact),
      photoUrl: photos.byContactId.get(contact.id) ?? null,
    };
  }

  async removeContact(ctx: BusinessContext, contactId: string) {
    const contact = await this.ensureContact(ctx, contactId);
    await this.prisma.$transaction(async (tx) => {
      await tx.networkContact.delete({ where: { id: contactId } });
      const circles = await tx.circle.findMany({
        where: {
          businessId: ctx.business.id,
          memberIds: { has: contactId },
        },
        select: { id: true, memberIds: true },
      });
      for (const circle of circles) {
        await tx.circle.update({
          where: { id: circle.id },
          data: {
            memberIds: circle.memberIds.filter((id) => id !== contactId),
          },
        });
      }
    });

    await this.audit(ctx, "network-contact-deleted", contactId, contact.fullName);
    return { ok: true };
  }

  async stats(ctx: BusinessContext) {
    const lists = await this.prisma.networkList.findMany({
      where: { businessId: ctx.business.id },
      include: { contacts: true },
    });
    return this.statsFor(lists);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async findList(
    ctx: BusinessContext,
    listId: string,
  ): Promise<NetworkListWithContacts> {
    const list = await this.prisma.networkList.findFirst({
      where: { id: listId, businessId: ctx.business.id },
      include: { contacts: { orderBy: { createdAt: "desc" } } },
    });
    if (!list) throw new NotFoundException(`Network list ${listId} not found`);
    return list;
  }

  private async ensureList(ctx: BusinessContext, listId: string) {
    const list = await this.prisma.networkList.findFirst({
      where: { id: listId, businessId: ctx.business.id },
    });
    if (!list) throw new NotFoundException(`Network list ${listId} not found`);
    return list;
  }

  private async ensureContact(ctx: BusinessContext, contactId: string) {
    const contact = await this.prisma.networkContact.findFirst({
      where: { id: contactId, businessId: ctx.business.id },
    });
    if (!contact) {
      throw new NotFoundException(`Network contact ${contactId} not found`);
    }
    return contact;
  }

  private statsFor(lists: NetworkListWithContacts[]) {
    const contacts = lists.flatMap((list) => list.contacts ?? []);
    return {
      lists: lists.length,
      activeLists: lists.filter((list) => list.status === "Active").length,
      contacts: contacts.length,
      b2bLists: lists.filter((list) => list.type === "B2B").length,
      b2cLists: lists.filter((list) => list.type === "B2C").length,
      pending: contacts.filter((contact) => contact.confirmation === "pending")
        .length,
      confirmed: contacts.filter(
        (contact) => contact.confirmation === "confirmed",
      ).length,
      sources: [...new Set(lists.map((list) => list.source))],
    };
  }

  private async audit(
    ctx: BusinessContext,
    action: string,
    targetId: string,
    targetName: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        actorId: ctx.user.id,
        actorName: ctx.business.name,
        targetType: "business",
        targetId,
        targetName,
        detail: "Network change from the business dashboard",
      },
    });
  }
}
