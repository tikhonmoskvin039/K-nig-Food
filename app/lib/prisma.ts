import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const SUPABASE_TRANSACTION_POOLER_PATTERN =
  /\.pooler\.supabase\.com(?::6543)?(?:\/|$)/i;

function createPrismaClient(databaseUrl?: string) {
  return new PrismaClient({
    ...(databaseUrl
      ? {
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        }
      : {}),
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

export function resolveDirectUrl() {
  return (
    pickFirstNonEmpty(process.env.DIRECT_URL) ||
    pickFirstNonEmpty(process.env.DIRECT_URL_PROD) ||
    pickFirstNonEmpty(process.env.DIRECT_URL_DEV)
  );
}

function inferSupabaseDirectUrl(databaseUrl: string) {
  if (!databaseUrl || !SUPABASE_TRANSACTION_POOLER_PATTERN.test(databaseUrl)) {
    return "";
  }

  try {
    const parsed = new URL(databaseUrl);
    const projectRefMatch = parsed.username.match(/^postgres\.([a-z0-9]+)/i);
    if (!projectRefMatch?.[1]) {
      return "";
    }

    const direct = new URL(databaseUrl);
    direct.hostname = `db.${projectRefMatch[1]}.supabase.co`;
    direct.port = "5432";
    direct.username = "postgres";
    direct.searchParams.delete("pgbouncer");
    direct.searchParams.delete("connection_limit");
    if (!direct.searchParams.get("sslmode")) {
      direct.searchParams.set("sslmode", "require");
    }

    return direct.toString();
  } catch {
    return "";
  }
}

function resolveRuntimeDatabaseUrl() {
  const runtimeOverride = pickFirstNonEmpty(process.env.DATABASE_URL_RUNTIME);
  if (runtimeOverride) {
    return runtimeOverride;
  }

  const databaseUrl = resolveDatabaseUrl();
  const directUrl = resolveDirectUrl() || inferSupabaseDirectUrl(databaseUrl);
  const isProduction = process.env.NODE_ENV === "production";
  const isSupabaseTransactionPooler =
    SUPABASE_TRANSACTION_POOLER_PATTERN.test(databaseUrl);

  if (
    isProduction &&
    directUrl &&
    databaseUrl &&
    isSupabaseTransactionPooler
  ) {
    return directUrl;
  }

  return databaseUrl || directUrl;
}

function ensureDatabaseEnv() {
  const runtimeDatabaseUrl = resolveRuntimeDatabaseUrl();
  if (!runtimeDatabaseUrl) return "";

  if (!pickFirstNonEmpty(process.env.DATABASE_URL_RUNTIME)) {
    process.env.DATABASE_URL_RUNTIME = runtimeDatabaseUrl;
  }

  const directUrl = resolveDirectUrl();
  if (directUrl && !pickFirstNonEmpty(process.env.DIRECT_URL)) {
    process.env.DIRECT_URL = directUrl;
  }

  return runtimeDatabaseUrl;
}

export function getPrismaClient() {
  const runtimeDatabaseUrl = ensureDatabaseEnv();
  if (!runtimeDatabaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const prisma = createPrismaClient(runtimeDatabaseUrl);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}
