import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function pickFirstNonEmpty(value: string | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

export function resolveDatabaseUrl() {
  return (
    pickFirstNonEmpty(process.env.DATABASE_URL) ||
    pickFirstNonEmpty(process.env.DATABASE_URL_PROD) ||
    pickFirstNonEmpty(process.env.DATABASE_URL_DEV)
  );
}

function ensureDatabaseEnv() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) return "";

  if (!pickFirstNonEmpty(process.env.DATABASE_URL)) {
    process.env.DATABASE_URL = databaseUrl;
  }

  const directUrl =
    pickFirstNonEmpty(process.env.DIRECT_URL) ||
    pickFirstNonEmpty(process.env.DIRECT_URL_PROD) ||
    pickFirstNonEmpty(process.env.DIRECT_URL_DEV);
  if (directUrl && !pickFirstNonEmpty(process.env.DIRECT_URL)) {
    process.env.DIRECT_URL = directUrl;
  }

  return databaseUrl;
}

export function getPrismaClient() {
  const databaseUrl = ensureDatabaseEnv();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const prisma = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}
