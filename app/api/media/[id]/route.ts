import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient, resolveDatabaseUrl } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

type Params = Promise<{
  id: string;
}>;

export async function GET(
  _request: NextRequest,
  context: { params: Params },
) {
  if (!resolveDatabaseUrl()) {
    return NextResponse.json({ error: "Media storage is unavailable" }, { status: 503 });
  }

  const { id } = await context.params;

  if (!id || id.length > 128) {
    return NextResponse.json({ error: "Invalid media id" }, { status: 400 });
  }

  try {
    const prisma = getPrismaClient();
    const image = await prisma.uploadedImage.findUnique({
      where: { id },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(image.bytes), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType || "application/octet-stream",
        "Content-Length": String(image.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${image.originalName}"`,
      },
    });
  } catch (error) {
    console.error("MEDIA GET ERROR:", error);
    return NextResponse.json({ error: "Media read failed" }, { status: 500 });
  }
}
