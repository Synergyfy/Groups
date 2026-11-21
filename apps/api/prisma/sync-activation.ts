import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { syncAllGroupActivations } from "../src/business/group-activation.js";

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

try {
  await syncAllGroupActivations(prisma);
  console.log("Group activation statuses synchronised.");
} finally {
  await prisma.$disconnect();
}
