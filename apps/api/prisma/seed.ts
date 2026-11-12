import { config } from "dotenv";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserRole,
} from "../src/generated/prisma/client.js";

config({
  path: [
    resolve(import.meta.dirname, "../../../.env"),
    resolve(import.meta.dirname, "../.env"),
  ],
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (adminEmail && adminPassword) {
  const adminName =
    process.env.ADMIN_NAME?.trim() || "Platform Administrator";
  const passwordHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      passwordHash,
      displayName: adminName,
      fullName: adminName,
      profileType: "ADMIN",
      isAffiliate: false,
    },
    create: {
      email: adminEmail,
      role: UserRole.ADMIN,
      passwordHash,
      displayName: adminName,
      fullName: adminName,
      profileType: "ADMIN",
      isAffiliate: false,
    },
  });

  console.log(`Seeded administrator ${adminEmail}`);
} else {
  console.log(
    "Skipped administrator seed: ADMIN_EMAIL and ADMIN_PASSWORD are required",
  );
}

await prisma.$disconnect();
