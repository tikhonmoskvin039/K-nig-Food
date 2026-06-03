import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "../../../lib/adminAuth";
import { getPrismaClient, resolveDatabaseUrl } from "../../../lib/prisma";
import {
  beginIdempotentRequest,
  buildIdempotencyConflictResponse,
  buildIdempotencyReplayResponse,
  hashFormDataPayload,
  storeIdempotentResponse,
} from "../../../lib/idempotency";
import { withProductMediaKind } from "../../../utils/productMedia";

const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 15;
const IMAGE_SUPPORTED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
  "svg",
]);
const VIDEO_SUPPORTED_EXTENSIONS = new Set([
  "mp4",
  "m4v",
  "mov",
  "webm",
  "ogv",
  "ogg",
]);
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
};

function isAuthenticated(req: NextRequest) {
  return Boolean(getAdminSessionFromRequest(req));
}

function sanitizeFilePart(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "product"
  );
}

function getFileExtension(fileName: string, mimeType: string) {
  const nameMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (nameMatch?.[1]) {
    return nameMatch[1];
  }

  const mimeSubtype = (mimeType || "").toLowerCase().split("/")[1] || "jpg";
  return mimeSubtype.split("+")[0];
}

function getMediaKind(fileName: string, mimeType: string) {
  const extension = getFileExtension(fileName, mimeType);
  const normalizedMimeType = mimeType.toLowerCase();

  if (
    normalizedMimeType.startsWith("image/") ||
    IMAGE_SUPPORTED_EXTENSIONS.has(extension)
  ) {
    return "image" as const;
  }

  if (
    normalizedMimeType.startsWith("video/") ||
    VIDEO_SUPPORTED_EXTENSIONS.has(extension)
  ) {
    return "video" as const;
  }

  return null;
}

function getStoredMimeType(fileName: string, mimeType: string) {
  if (mimeType) return mimeType;
  const extension = getFileExtension(fileName, mimeType);
  return MIME_BY_EXTENSION[extension] || "application/octet-stream";
}

export async function POST(req: NextRequest) {
  const endpoint = "/api/admin/uploads";

  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const requestHash = await hashFormDataPayload(formData);
    const idempotency = await beginIdempotentRequest({
      headers: req.headers,
      endpoint,
      requestHash,
    });

    if (idempotency.type === "conflict") {
      return buildIdempotencyConflictResponse();
    }

    if (idempotency.type === "replay") {
      return buildIdempotencyReplayResponse({
        statusCode: idempotency.statusCode,
        responseBody: idempotency.responseBody,
      });
    }

    const file = formData.get("file");
    const slugValue = String(formData.get("slug") || "product");
    const typeValue = String(formData.get("type") || "image");

    if (!(file instanceof File)) {
      const responseBody = {
        error: "Upload failed",
        message: "Файл не передан",
      };
      const statusCode = 400;
      await storeIdempotentResponse({
        key: idempotency.key,
        endpoint,
        requestHash,
        statusCode,
        responseBody,
      });
      return NextResponse.json(
        responseBody,
        { status: statusCode },
      );
    }

    const mediaKind = getMediaKind(file.name, file.type);

    if (!mediaKind) {
      const responseBody = {
        error: "Upload failed",
        message: "Можно загружать только изображения или видео",
      };
      const statusCode = 400;
      await storeIdempotentResponse({
        key: idempotency.key,
        endpoint,
        requestHash,
        statusCode,
        responseBody,
      });
      return NextResponse.json(
        responseBody,
        { status: statusCode },
      );
    }

    const maxFileSize =
      mediaKind === "video" ? MAX_VIDEO_FILE_SIZE_BYTES : MAX_IMAGE_FILE_SIZE_BYTES;

    if (file.size > maxFileSize) {
      const responseBody = {
        error: "Upload failed",
        message:
          mediaKind === "video" ? "Видео больше 100 МБ" : "Файл больше 5 МБ",
      };
      const statusCode = 400;
      await storeIdempotentResponse({
        key: idempotency.key,
        endpoint,
        requestHash,
        statusCode,
        responseBody,
      });
      return NextResponse.json(
        responseBody,
        { status: statusCode },
      );
    }

    if (mediaKind === "video") {
      const durationSeconds = Number(formData.get("durationSeconds"));
      if (
        !Number.isFinite(durationSeconds) ||
        durationSeconds <= 0 ||
        durationSeconds > MAX_VIDEO_DURATION_SECONDS
      ) {
        const responseBody = {
          error: "Upload failed",
          message: `Видео должно быть не длиннее ${MAX_VIDEO_DURATION_SECONDS} секунд`,
        };
        const statusCode = 400;
        await storeIdempotentResponse({
          key: idempotency.key,
          endpoint,
          requestHash,
          statusCode,
          responseBody,
        });
        return NextResponse.json(responseBody, { status: statusCode });
      }
    }

    const slug = sanitizeFilePart(slugValue);
    const type = sanitizeFilePart(typeValue);
    const extension = getFileExtension(file.name, file.type);
    const storedMimeType = getStoredMimeType(file.name, file.type);
    const mediaId = randomUUID();
    const fileName = `${slug}-${type}-${Date.now()}.${extension}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!resolveDatabaseUrl()) {
      const responseBody = {
        error: "Upload failed",
        message:
          "DATABASE_URL не настроен. Для загрузки медиа в БД подключите PostgreSQL.",
      };
      const statusCode = 500;
      return NextResponse.json(
        responseBody,
        { status: statusCode },
      );
    }

    const prisma = getPrismaClient();
    await prisma.uploadedImage.create({
      data: {
        id: mediaId,
        originalName: fileName,
        mimeType: storedMimeType,
        size: file.size,
        bytes: buffer,
      },
    });

    const localPublicUrl = withProductMediaKind(
      `/api/media/${encodeURIComponent(mediaId)}`,
      mediaKind,
    );
    const responseBody = { success: true, url: localPublicUrl };
    const statusCode = 200;

    await storeIdempotentResponse({
      key: idempotency.key,
      endpoint,
      requestHash,
      statusCode,
      responseBody,
    });

    return NextResponse.json(responseBody, { status: statusCode });
  } catch (error: unknown) {
    console.error("UPLOAD MEDIA ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Не удалось сохранить медиа";

    return NextResponse.json(
      { error: "Upload failed", message },
      { status: 500 },
    );
  }
}
