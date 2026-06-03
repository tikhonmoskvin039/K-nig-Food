import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDatabaseUrl?: string;
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

function expandEnvReference(value: string | undefined) {
  const trimmed = pickFirstNonEmpty(value);
  const match = trimmed.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/);

  return match ? pickFirstNonEmpty(process.env[match[1]]) : trimmed;
}

function pickConnectionUrl(primaryKey: string, devKey: string, prodKey: string) {
  const primaryUrl = expandEnvReference(process.env[primaryKey]);
  const devUrl = expandEnvReference(process.env[devKey]);
  const prodUrl = expandEnvReference(process.env[prodKey]);

  if (process.env.NODE_ENV === "development") {
    return devUrl || primaryUrl || prodUrl;
  }

  return primaryUrl || prodUrl || devUrl;
}

export function resolveDatabaseUrl() {
  return pickConnectionUrl(
    "DATABASE_URL",
    "DATABASE_URL_DEV",
    "DATABASE_URL_PROD",
  );
}

function ensureDatabaseEnv() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) return "";

  process.env.DATABASE_URL = databaseUrl;

  const directUrl = pickConnectionUrl(
    "DIRECT_URL",
    "DIRECT_URL_DEV",
    "DIRECT_URL_PROD",
  );
  if (directUrl) {
    process.env.DIRECT_URL = directUrl;
  }

  return databaseUrl;
}

export function getPrismaClient() {
  const databaseUrl = ensureDatabaseEnv();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaDatabaseUrl === databaseUrl
  ) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => undefined);
  }

  const prisma = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
    globalForPrisma.prismaDatabaseUrl = databaseUrl;
  }

  return prisma;
}
