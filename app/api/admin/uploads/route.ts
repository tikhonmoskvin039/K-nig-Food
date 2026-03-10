import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPrismaClient } from "../../../lib/prisma";

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
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const slugValue = String(formData.get("slug") || "product");
    const typeValue = String(formData.get("type") || "image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Upload failed", message: "Файл не передан" },
        { status: 400 },
      );
    }

    if (!file.type.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { error: "Upload failed", message: "Можно загружать только изображения" },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Upload failed", message: "Файл больше 5 МБ" },
        { status: 400 },
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
      return NextResponse.json(
        {
          error: "Upload failed",
          message:
            "DATABASE_URL не настроен. Для загрузки изображений в БД подключите PostgreSQL.",
        },
        { status: 500 },
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

    return NextResponse.json({ success: true, url: localPublicUrl });
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
