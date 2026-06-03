/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const shouldDryRun = process.argv.includes("--dry-run");

function readEnv() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return env;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!/^\s*[^#][^=]+=/.test(line)) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    env[key] = value;
  }

  return env;
}

function expandEnvVariables(value, env) {
  return String(value || "").replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_, key) => {
      if (!env[key]) {
        throw new Error(`${key} must exist to expand the database URL`);
      }

      return encodeURIComponent(env[key]);
    },
  );
}

function normalizeRemoteUrl(url) {
  if (!/[?&]sslmode=/.test(url)) {
    return `${url}${url.includes("?") ? "&" : "?"}sslmode=no-verify`;
  }

  return url.replace(/([?&])sslmode=[^&]*/, "$1sslmode=no-verify");
}

function buildRemoteUrl(env) {
  const url =
    env.SUPABASE_DATABASE_URL ||
    env.DIRECT_URL_PROD ||
    env.DATABASE_URL_PROD ||
    env.DIRECT_URL ||
    env.DATABASE_URL;

  if (!url) {
    throw new Error("Supabase database URL is not configured");
  }

  return normalizeRemoteUrl(expandEnvVariables(url, env));
}

function getLocalMigrations() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const sqlPath = path.join(migrationsDir, entry.name, "migration.sql");
      return {
        name: entry.name,
        sql: fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, "utf8") : "",
      };
    })
    .filter((migration) => migration.sql)
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function withClient(connectionString, callback) {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 30000,
  });
  client.on("error", () => {});

  try {
    await client.connect();
    return await callback(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function getFinishedMigrationNames(client) {
  const result = await client.query(
    'SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL',
  );

  return new Set(result.rows.map((row) => row.migration_name));
}

async function getFailedMigrationNames(client) {
  const result = await client.query(
    'SELECT DISTINCT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL',
  );

  return new Set(result.rows.map((row) => row.migration_name));
}

async function markFailedMigrationRolledBack(client, migrationName) {
  const result = await client.query(
    `
      UPDATE "_prisma_migrations"
      SET
        "rolled_back_at" = now(),
        "logs" = coalesce("logs", '') || E'\\nMarked rolled back by apply-supabase-migrations.js.'
      WHERE "migration_name" = $1
        AND "finished_at" IS NULL
        AND "rolled_back_at" IS NULL
    `,
    [migrationName],
  );

  if (result.rowCount > 0) {
    console.log(`Marked failed ${migrationName} as rolled back`);
  }
}

function getChecksum(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

async function applyMigration(client, migration) {
  const startedAt = new Date();

  await client.query("BEGIN");

  try {
    await client.query(migration.sql);
    await client.query(
      `
        INSERT INTO "_prisma_migrations"
          ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
        VALUES
          ($1, $2, now(), $3, NULL, NULL, $4, 1)
      `,
      [
        crypto.randomUUID(),
        getChecksum(migration.sql),
        migration.name,
        startedAt,
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

async function main() {
  const env = readEnv();
  const remoteUrl = buildRemoteUrl(env);
  const localMigrations = getLocalMigrations();
  const localMigrationNames = new Set(
    localMigrations.map((migration) => migration.name),
  );

  const failed = await withClient(remoteUrl, async (client) => {
    await ensureMigrationsTable(client);

    return Array.from(await getFailedMigrationNames(client)).filter(
      (migrationName) => localMigrationNames.has(migrationName),
    );
  });

  if (failed.length > 0 && shouldDryRun) {
    console.log(`Failed migrations to repair: ${failed.join(", ")}`);
  }

  if (!shouldDryRun && failed.length > 0) {
    await withClient(remoteUrl, async (client) => {
      for (const migrationName of failed) {
        await markFailedMigrationRolledBack(client, migrationName);
      }
    });
  }

  const pending = await withClient(remoteUrl, async (client) => {
    await ensureMigrationsTable(client);
    const finished = await getFinishedMigrationNames(client);
    return localMigrations.filter(
      (migration) => !finished.has(migration.name),
    );
  });

  if (pending.length === 0) {
    console.log("Supabase migrations are already up to date.");
    return;
  }

  if (shouldDryRun) {
    console.log(
      `Pending migrations: ${pending.map((item) => item.name).join(", ")}`,
    );
    return;
  }

  for (const migration of pending) {
    await withClient(remoteUrl, async (client) => {
      await applyMigration(client, migration);
    });
    console.log(`Applied ${migration.name}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
