import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getPrismaClient } from "./prisma";

const IDEMPOTENCY_KEY_CLEANUP_PROBABILITY = 0.03;
const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type IdempotencyStartResult =
  | { type: "disabled"; key: null }
  | { type: "new"; key: string }
  | {
      type: "replay";
      key: string;
      statusCode: number;
      responseBody: JsonValue;
    }
  | { type: "conflict"; key: string };

function stableJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_, rawValue) => {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
      return rawValue;
    }

    return Object.keys(rawValue as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = (rawValue as Record<string, unknown>)[key];
        return acc;
      }, {});
  });
}

function toSha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

function parseIdempotencyKey(headers: Headers): string | null {
  const rawKey =
    headers.get("idempotency-key") || headers.get("x-idempotency-key");

  if (!rawKey) return null;

  const key = rawKey.trim();
  if (!key) return null;

  if (key.length > 200) {
    return key.slice(0, 200);
  }

  return key;
}

async function cleanupExpiredIdempotencyRows() {
  if (Math.random() > IDEMPOTENCY_KEY_CLEANUP_PROBABILITY) return;

  try {
    const prisma = getPrismaClient();
    await prisma.$executeRaw`
      DELETE FROM "idempotency_requests"
      WHERE "expiresAt" < NOW()
    `;
  } catch (error) {
    console.error("Failed to clean up expired idempotency rows:", error);
  }
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export function hashJsonPayload(payload: unknown): string {
  return toSha256Hex(stableJsonStringify(payload));
}

export async function hashFormDataPayload(formData: FormData): Promise<string> {
  const chunks: string[] = [];

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      chunks.push(`field:${key}:${value}`);
      continue;
    }

    const arrayBuffer = await value.arrayBuffer();
    const bytesHash = toSha256Hex(Buffer.from(arrayBuffer));
    const fileToken = [
      "file",
      key,
      value.name || "",
      value.type || "",
      String(value.size ?? 0),
      String(value.lastModified ?? 0),
      bytesHash,
    ].join(":");
    chunks.push(fileToken);
  }

  return toSha256Hex(chunks.join("|"));
}

export async function beginIdempotentRequest(params: {
  headers: Headers;
  endpoint: string;
  requestHash: string;
}): Promise<IdempotencyStartResult> {
  const key = parseIdempotencyKey(params.headers);
  if (!key) return { type: "disabled", key: null };

  await cleanupExpiredIdempotencyRows();

  const prisma = getPrismaClient();
  const rows = await prisma.$queryRaw<
    Array<{
      requestHash: string;
      statusCode: number;
      responseBody: JsonValue;
      expiresAt: Date;
    }>
  >`
    SELECT "requestHash", "statusCode", "responseBody", "expiresAt"
    FROM "idempotency_requests"
    WHERE "key" = ${key} AND "endpoint" = ${params.endpoint}
    LIMIT 1
  `;
  const existing = rows[0];

  if (!existing) {
    return { type: "new", key };
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    await prisma.$executeRaw`
      DELETE FROM "idempotency_requests"
      WHERE "key" = ${key} AND "endpoint" = ${params.endpoint}
    `;
    return { type: "new", key };
  }

  if (existing.requestHash !== params.requestHash) {
    return { type: "conflict", key };
  }

  return {
    type: "replay",
    key,
    statusCode: existing.statusCode,
    responseBody: existing.responseBody,
  };
}

export async function storeIdempotentResponse(params: {
  key: string | null;
  endpoint: string;
  requestHash: string;
  statusCode: number;
  responseBody: unknown;
  ttlSeconds?: number;
}) {
  if (!params.key) return;
  if (params.statusCode >= 500) return;

  const prisma = getPrismaClient();
  const ttlMs = (params.ttlSeconds ?? DEFAULT_IDEMPOTENCY_TTL_SECONDS) * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);
  const rowId = randomUUID();
  const responseBodyJson = JSON.stringify(toJsonValue(params.responseBody));

  try {
    await prisma.$executeRaw`
      INSERT INTO "idempotency_requests"
      ("id", "key", "endpoint", "requestHash", "statusCode", "responseBody", "expiresAt")
      VALUES
      (
        ${rowId},
        ${params.key},
        ${params.endpoint},
        ${params.requestHash},
        ${params.statusCode},
        ${responseBodyJson}::jsonb,
        ${expiresAt}
      )
      ON CONFLICT ("key", "endpoint") DO NOTHING
    `;
  } catch (error) {
    console.error("Failed to store idempotent response:", error);
  }
}

export function buildIdempotencyConflictResponse() {
  return NextResponse.json(
    {
      error: "Idempotency key conflict",
      message:
        "Этот Idempotency-Key уже использован с другим содержимым запроса.",
    },
    { status: 409 },
  );
}

export function buildIdempotencyReplayResponse(params: {
  statusCode: number;
  responseBody: JsonValue;
}) {
  return NextResponse.json(params.responseBody, {
    status: params.statusCode,
    headers: {
      "x-idempotency-replayed": "1",
    },
  });
}
