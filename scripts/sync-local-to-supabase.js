/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const TABLES = [
  "uploaded_images",
  "admin_users",
  "homepage_settings",
  "checkout_settings",
  "products",
];

const shouldApply = process.argv.includes("--apply");

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

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
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

async function getRows(connectionString, table) {
  return withClient(connectionString, async (client) => {
    const result = await client.query(
      `SELECT * FROM ${quoteIdentifier(table)} ORDER BY 1`,
    );
    return result.rows;
  });
}

function buildInsert(table, columns, rows) {
  const values = [];
  const groups = rows.map((row, rowIndex) => {
    const placeholders = columns.map((column, columnIndex) => {
      values.push(row[column]);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });
    return `(${placeholders.join(", ")})`;
  });

  const sql = [
    `INSERT INTO ${quoteIdentifier(table)}`,
    `(${columns.map(quoteIdentifier).join(", ")})`,
    `VALUES ${groups.join(", ")}`,
    "ON CONFLICT DO NOTHING",
  ].join(" ");

  return { sql, values };
}

async function insertRows(connectionString, table, rows, dryRun = false) {
  if (rows.length === 0) return 0;

  const columns = Object.keys(rows[0]);
  let inserted = 0;

  for (let start = 0; start < rows.length; start += 10) {
    const chunk = rows.slice(start, start + 10);
    const { sql, values } = buildInsert(table, columns, chunk);

    inserted += await withClient(connectionString, async (client) => {
      if (dryRun) await client.query("BEGIN");

      try {
        const result = await client.query(sql, values);
        if (dryRun) await client.query("ROLLBACK");
        return result.rowCount;
      } catch (error) {
        if (dryRun) await client.query("ROLLBACK").catch(() => {});
        throw error;
      }
    });
  }

  return inserted;
}

async function getFinishedRemoteMigrations(connectionString) {
  return withClient(connectionString, async (client) => {
    const table = await client.query(
      "SELECT to_regclass('public._prisma_migrations') AS table_name",
    );

    if (!table.rows[0].table_name) return new Set();

    const result = await client.query(
      "SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL",
    );

    return new Set(result.rows.map((row) => row.migration_name));
  });
}

function getLocalMigrations() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) =>
      fs.existsSync(path.join(migrationsDir, name, "migration.sql")),
    )
    .sort();
}

async function ensureRemoteSchemaIsCurrent(remoteUrl) {
  const localMigrations = getLocalMigrations();
  const remoteMigrations = await getFinishedRemoteMigrations(remoteUrl);
  const missing = localMigrations.filter((name) => !remoteMigrations.has(name));

  if (missing.length > 0) {
    throw new Error(
      `Supabase schema is missing migrations: ${missing.join(", ")}. Run pnpm run db:migrate:supabase first.`,
    );
  }
}

async function main() {
  const env = readEnvFile();
  const localUrl = env.DATABASE_URL_DEV;
  const remoteUrl = buildRemoteUrl(env);

  if (!localUrl) throw new Error("DATABASE_URL_DEV must exist in .env");

  await ensureRemoteSchemaIsCurrent(remoteUrl);

  for (const table of TABLES) {
    const rows = await getRows(localUrl, table);

    const inserted = await insertRows(remoteUrl, table, rows, !shouldApply);

    if (shouldApply) {
      console.log(`${table}: inserted ${inserted}, kept remote conflicts`);
    } else {
      console.log(`${table}: would insert ${inserted}`);
    }
  }

  if (!shouldApply) {
    console.log("Dry run only. Add -- --apply to copy missing rows.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
