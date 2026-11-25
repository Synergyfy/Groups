/**
 * Contact onboarding smoke test.
 *
 * A business adds a contact whose email is not on the platform yet, the
 * contact signs up on Central Hub and comes back. The contact record must be
 * reconciled with the profile they signed up with, they must join the circles
 * built from their network list and their pending invitations must be claimed
 * by the new account.
 *
 * Run with the API database available:
 *
 *   pnpm --filter @247gbs/api exec tsx scripts/contact-onboarding-smoke.ts
 */

import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient, UserRole } from "../src/generated/prisma/client.js";
import { ContactOnboardingService } from "../src/contacts/contact-onboarding.service.js";
import type { MailService } from "../src/mail/mail.service.js";

loadEnv({
  path: new URL("../../../.env", import.meta.url).pathname,
});
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is missing from the environment");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** The onboarding service without a mail transport — nothing is sent here. */
const service = new ContactOnboardingService(
  { get: () => undefined } as never,
  prisma as never,
  { send: async () => ({ sent: false, reason: "not-used" }) } as unknown as MailService,
);

async function main() {
  const run = randomUUID().slice(0, 8);
  const businessId = randomUUID();
  const email = `onboarding-${run}@example.test`;

  const business = await prisma.business.create({
    data: {
      id: businessId,
      name: "Onboarding Smoke Ltd",
      contactName: "Rita Smoke",
      email: `onboarding-${run}-business@example.test`,
      status: "Active",
      postcode: "B1 1BB",
      city: "Birmingham",
      localArea: "City Centre",
      category: "Professional Services",
    },
  });

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: business.email,
      role: UserRole.BUSINESS,
      fullName: "Rita Smoke",
      displayName: "Rita Smoke",
      businessName: business.name,
      businessId,
      postcode: "B1 1BB",
      businessProfile: { city: "Birmingham" },
    },
  });

  const list = await prisma.networkList.create({
    data: {
      id: randomUUID(),
      businessId,
      name: "Smoke list",
      type: "B2B",
      geography: "Birmingham",
      status: "Active",
    },
  });

  const contact = await prisma.networkContact.create({
    data: {
      id: randomUUID(),
      businessId,
      listId: list.id,
      fullName: "Jordan Blake",
      email,
      phone: "07700900000",
      category: "Retail",
      location: "Birmingham",
      geography: "Birmingham",
      role: "peripheral",
      tier: "Bronze",
      confirmation: "pending",
      addedByName: "Rita Smoke",
    },
  });

  // A circle built from the list while the contact was still pending.
  const circle = await prisma.circle.create({
    data: {
      id: randomUUID(),
      businessId,
      type: "Partner Circle",
      config: { name: "Partner Circle" },
      memberIds: [],
      sourceListIds: [list.id],
      status: "Active",
    },
  });

  // A group invitation addressed to the contact's email.
  const group = await prisma.group.create({
    data: {
      id: randomUUID(),
      name: "Smoke group",
      slug: `onboarding-smoke-${run}`,
      type: "B2B",
      source: "user-created",
      purpose: "Smoke test group",
      ownerId: businessId,
      ownerName: business.name,
      status: "Active",
      accessType: "open",
    },
  });

  const invitation = await prisma.invitation.create({
    data: {
      id: randomUUID(),
      groupId: group.id,
      direction: "outgoing",
      kind: "invite",
      inviteeName: "Jordan Blake",
      inviteeEmail: email,
      invitedById: businessId,
      invitedByName: business.name,
      status: "pending",
    },
  });

  try {
    const result = await service.reconcileSignedUpContact({
      userId: user.id,
      email,
      fullName: "Jordan A. Blake",
      category: "Fashion Retail",
      city: "Birmingham",
      phone: "07700900111",
    });

    const updatedContact = await prisma.networkContact.findUnique({
      where: { id: contact.id },
    });
    const updatedCircle = await prisma.circle.findUnique({
      where: { id: circle.id },
    });
    const updatedInvitation = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });

    check("the contact is reconciled", result.contacts === 1, String(result.contacts));
    check(
      "the contact takes the name from the sign-up",
      updatedContact?.fullName === "Jordan A. Blake",
      updatedContact?.fullName,
    );
    check(
      "the contact takes the category from the sign-up",
      updatedContact?.category === "Fashion Retail",
      updatedContact?.category,
    );
    check(
      "the contact keeps its phone",
      updatedContact?.phone === "07700900111",
      updatedContact?.phone,
    );
    check(
      "the contact is confirmed by signing up",
      updatedContact?.confirmation === "confirmed",
      updatedContact?.confirmation,
    );
    check(
      "the contact joins the circle built from their list",
      updatedCircle?.memberIds.includes(contact.id) ?? false,
      updatedCircle?.memberIds.join(", "),
    );
    check(
      "the pending invitation is claimed by the account",
      updatedInvitation?.claimedByAccountId === user.id,
      updatedInvitation?.claimedByAccountId,
    );
    check(
      "the invitation keeps its pending status until it is answered",
      updatedInvitation?.status === "pending",
      updatedInvitation?.status,
    );

    // Signing in again must not duplicate the circle membership.
    const second = await service.reconcileSignedUpContact({
      userId: user.id,
      email,
      fullName: "Jordan A. Blake",
    });
    const circleAfter = await prisma.circle.findUnique({
      where: { id: circle.id },
    });
    check(
      "signing in again does not add the contact twice",
      circleAfter?.memberIds.filter((id) => id === contact.id).length === 1,
      circleAfter?.memberIds.join(", "),
    );
    check("the second sign-in is a no-op", second.circles === 0, String(second.circles));
  } finally {
    await prisma.invitation.deleteMany({ where: { id: invitation.id } });
    await prisma.group.deleteMany({ where: { id: group.id } });
    await prisma.circle.deleteMany({ where: { id: circle.id } });
    await prisma.networkContact.deleteMany({ where: { id: contact.id } });
    await prisma.networkList.deleteMany({ where: { id: list.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.business.deleteMany({ where: { id: businessId } });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
