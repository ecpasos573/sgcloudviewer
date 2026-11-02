import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/database/generated/client";
import { databaseUrl } from "@/app/database/connection";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl() }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
