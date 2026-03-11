import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPrismaClient } from "../../../lib/prisma";
import {
  beginIdempotentRequest,
  buildIdempotencyConflictResponse,
  buildIdempotencyReplayResponse,
  hashFormDataPayload,
  storeIdempotentResponse,
} from "../../../lib/idempotency";

const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

async function isAuthenticated(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return !!token;
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

function getImageExtension(fileName: string, mimeType: string) {
  const nameMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (nameMatch?.[1]) {
    return nameMatch[1];
  }

  const mimeSubtype = (mimeType || "").toLowerCase().split("/")[1] || "jpg";
  return mimeSubtype.split("+")[0];
}

export async function POST(req: NextRequest) {
  const endpoint = "/api/admin/uploads";

  if (!(await isAuthenticated(req))) {
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

    if (!file.type.toLowerCase().startsWith("image/")) {
      const responseBody = {
        error: "Upload failed",
        message: "Можно загружать только изображения",
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

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      const responseBody = {
        error: "Upload failed",
        message: "Файл больше 5 МБ",
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

    const slug = sanitizeFilePart(slugValue);
    const type = sanitizeFilePart(typeValue);
    const extension = getImageExtension(file.name, file.type);
    const imageId = randomUUID();
    const fileName = `${slug}-${type}-${Date.now()}.${extension}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!process.env.DATABASE_URL?.trim()) {
      const responseBody = {
        error: "Upload failed",
        message:
          "DATABASE_URL не настроен. Для загрузки изображений в БД подключите PostgreSQL.",
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
        id: imageId,
        originalName: fileName,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        bytes: buffer,
      },
    });

    const localPublicUrl = `/api/media/${encodeURIComponent(imageId)}`;
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
    console.error("UPLOAD IMAGE ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Не удалось сохранить изображение";

    return NextResponse.json(
      { error: "Upload failed", message },
      { status: 500 },
    );
  }
}
