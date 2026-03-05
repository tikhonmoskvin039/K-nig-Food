import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { Octokit } from "octokit";

const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const LOCAL_UPLOADS_DIR = path.join(
  process.cwd(),
  "public",
  "products",
  "uploads",
);
const PUBLIC_UPLOADS_PREFIX = "/products/uploads";

const repo = process.env.GITHUB_REPO;
const githubRepoParts = repo?.split("/") ?? [];
const owner = githubRepoParts[0];
const repoName = githubRepoParts[1];

const octokit = process.env.GITHUB_PAT
  ? new Octokit({
      auth: process.env.GITHUB_PAT,
    })
  : null;

async function isAuthenticated(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return !!token;
}

function shouldUseGithubUploads() {
  const source = process.env.PRODUCTS_SOURCE?.toLowerCase();

  if (source === "local") return false;
  if (source === "github") return true;

  return Boolean(owner && repoName && octokit);
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

async function uploadImageToGithub(filePath: string, buffer: Buffer) {
  if (!octokit || !owner || !repoName) {
    throw new Error("GitHub upload is not configured");
  }

  const encoded = buffer.toString("base64");

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: repoName,
    path: filePath,
    message: `Upload product image: ${path.basename(filePath)}`,
    content: encoded,
    branch: "main",
  });
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
    const uniqueId = randomUUID().slice(0, 8);
    const fileName = `${slug}-${type}-${Date.now()}-${uniqueId}.${extension}`;
    const relativeFilePath = path.posix.join(
      "public",
      "products",
      "uploads",
      fileName,
    );
    const localPublicUrl = `${PUBLIC_UPLOADS_PREFIX}/${fileName}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let publicUrl = localPublicUrl;

    if (shouldUseGithubUploads()) {
      await uploadImageToGithub(relativeFilePath, buffer);
      publicUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/main/${relativeFilePath}`;
    } else {
      await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
      await writeFile(path.join(LOCAL_UPLOADS_DIR, fileName), buffer);
    }

    return NextResponse.json({ success: true, url: publicUrl });
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
