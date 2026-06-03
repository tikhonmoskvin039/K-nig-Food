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
const DEFAULT_INSERT_BATCH_SIZE = 10;
const INSERT_BATCH_SIZE_BY_TABLE = {
  uploaded_images: 1,
};

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

function canExpandEnvVariables(value, env) {
  const references = String(value || "").matchAll(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,
  );

  for (const reference of references) {
    if (!env[reference[1]]) {
      return false;
    }
  }

  return true;
}

function normalizeRemoteUrl(url) {
  if (!/[?&]sslmode=/.test(url)) {
    return `${url}${url.includes("?") ? "&" : "?"}sslmode=no-verify`;
  }

  return url.replace(/([?&])sslmode=[^&]*/, "$1sslmode=no-verify");
}

function isLocalDatabaseUrl(url) {
  return /@(localhost|127\.0\.0\.1)(:|\/)/i.test(url);
}

function buildRemoteUrl(env) {
  const candidates = [
    env.SUPABASE_DATABASE_URL,
    env.DIRECT_URL_PROD,
    env.DATABASE_URL_PROD,
    env.DIRECT_URL,
    env.DATABASE_URL,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!canExpandEnvVariables(candidate, env)) continue;

    const url = expandEnvVariables(candidate, env);
    if (!isLocalDatabaseUrl(url)) {
      return normalizeRemoteUrl(url);
    }
  }

  throw new Error("Supabase database URL is not configured");
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function withClient(connectionString, callback) {
  const transientMessages = [
    "Connection terminated unexpectedly",
    "Connection terminated",
    "Query read timeout",
    "read ECONNRESET",
  ];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 30000,
    });
    client.on("error", () => {});

    try {
      await client.connect();
      return await callback(client);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTransient = transientMessages.some((item) =>
        message.includes(item),
      );

      if (!isTransient || attempt === 3) {
        throw error;
      }

      console.warn(
        `Retrying database request after connection reset (${attempt}/3)`,
      );
    } finally {
      await client.end().catch(() => {});
    }
  }

  throw new Error("Database request failed.");
}

async function getRows(connectionString, table) {
  return withClient(connectionString, async (client) => {
    const result = await client.query(
      `SELECT * FROM ${quoteIdentifier(table)} ORDER BY 1`,
    );
    return result.rows;
  });
}

async function getRemoteIds(connectionString, table) {
  return withClient(connectionString, async (client) => {
    const result = await client.query(
      `SELECT "id" FROM ${quoteIdentifier(table)}`,
    );

    return new Set(result.rows.map((row) => String(row.id)));
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

async function insertRows(connectionString, table, rows) {
  if (rows.length === 0) return 0;

  const columns = Object.keys(rows[0]);
  const batchSize = INSERT_BATCH_SIZE_BY_TABLE[table] || DEFAULT_INSERT_BATCH_SIZE;
  let inserted = 0;

  for (let start = 0; start < rows.length; start += batchSize) {
    const chunk = rows.slice(start, start + batchSize);
    const { sql, values } = buildInsert(table, columns, chunk);

    inserted += await withClient(connectionString, async (client) => {
      const result = await client.query(sql, values);
      return result.rowCount;
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
  const env = readEnv();
  const localUrl = env.DATABASE_URL_DEV;
  const remoteUrl = buildRemoteUrl(env);

  if (!localUrl) throw new Error("DATABASE_URL_DEV must exist in .env");

  await ensureRemoteSchemaIsCurrent(remoteUrl);

  for (const table of TABLES) {
    const rows = await getRows(localUrl, table);
    const remoteIds = await getRemoteIds(remoteUrl, table);
    const missingRows = rows.filter((row) => !remoteIds.has(String(row.id)));

    if (!shouldApply) {
      console.log(`${table}: would insert ${missingRows.length}`);
    } else {
      const inserted = await insertRows(remoteUrl, table, missingRows);
      console.log(`${table}: inserted ${inserted}, kept remote conflicts`);
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
