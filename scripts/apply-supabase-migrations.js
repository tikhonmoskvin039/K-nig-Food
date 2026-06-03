/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const shouldDryRun = process.argv.includes("--dry-run");

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  const env = {};

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!/^\s*[^#][^=]+=/.test(line)) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    env[key] = value;
  }

  return env;
}

function buildRemoteUrl(env) {
  if (!env.DATABASE_URL_PROD || !env.CLOUD_DB_PASS) {
    throw new Error("DATABASE_URL_PROD and CLOUD_DB_PASS must exist in .env");
  }

  const password = encodeURIComponent(env.CLOUD_DB_PASS);
  return env.DATABASE_URL_PROD.replace("${CLOUD_DB_PASS}", password).replace(
    /([?&])sslmode=[^&]*/,
    "$1sslmode=no-verify",
  );
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
  const client = new Client({ connectionString });
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
  const env = readEnvFile();
  const remoteUrl = buildRemoteUrl(env);
  const localMigrations = getLocalMigrations();

  await withClient(remoteUrl, async (client) => {
    await ensureMigrationsTable(client);

    const finished = await getFinishedMigrationNames(client);
    const pending = localMigrations.filter(
      (migration) => !finished.has(migration.name),
    );

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
      await applyMigration(client, migration);
      console.log(`Applied ${migration.name}`);
    }
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
