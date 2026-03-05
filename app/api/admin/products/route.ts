import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";
import { getToken } from "next-auth/jwt";
import { invalidateProductsCache } from "../../../lib/githubStorage";
import { setRuntimeProducts } from "../../../lib/runtimeProductsStore";
import { VERCEL_FUNCTION_BODY_LIMIT_BYTES } from "../../../lib/payloadSize";

const repo = process.env.GITHUB_REPO!;
const [owner, repoName] = repo.split("/");
const path = "configs/products.json";

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

type GithubProductsFileContent = {
  sha?: string;
  content?: string;
  download_url?: string;
};

function hasBase64Images(products: DTProduct[]) {
  return products.some((product) => {
    const featureImage = product.FeatureImageURL || "";
    if (featureImage.startsWith("data:image/")) {
      return true;
    }

    return (product.ProductImageGallery || []).some((url) =>
      String(url || "").startsWith("data:image/"),
    );
  });
}

async function isAuthenticated(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return !!token;
}

async function getSHA() {
  const res = await octokit.rest.repos.getContent({
    owner,
    repo: repoName,
    path,
    ref: "main",
  });

  const fileData = res.data as GithubProductsFileContent;
  if (!fileData.sha) {
    throw new Error("Products file SHA is missing");
  }

  return fileData.sha;
}

/*
========================
GET — list products
========================
*/
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path,
      ref: "main",
    });

    const fileData = res.data as GithubProductsFileContent;
    const content = fileData.content;
    const downloadUrl = fileData.download_url;

    const rawJson = content
      ? Buffer.from(content, "base64").toString()
      : downloadUrl
        ? await fetch(downloadUrl).then((response) => response.text())
        : "";

    if (!rawJson) {
      return NextResponse.json(
        { error: "Update failed", message: "Empty products file" },
        { status: 500 },
      );
    }

    return NextResponse.json(JSON.parse(rawJson));
  } catch (error: unknown) {
    console.error("GITHUB GET ERROR:", error);

    let message = "Getting products failed";
    let status = undefined;

    if (error instanceof Error) {
      message = error.message;
    }

    if (typeof error === "object" && error !== null && "status" in error) {
      status = (error as { status?: number }).status;
    }

    return NextResponse.json(
      {
        error: "Update failed",
        message,
        status,
      },
      { status: 500 },
    );
  }
}

/*
========================
POST / PUT — rewrite catalog
========================
*/

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bodyText = await req.text();
    const bodyBytes = Buffer.byteLength(bodyText, "utf8");

    if (!bodyText.trim()) {
      return NextResponse.json(
        { error: "Update failed", message: "Empty request body" },
        { status: 400 },
      );
    }

    if (bodyBytes > VERCEL_FUNCTION_BODY_LIMIT_BYTES) {
      return NextResponse.json(
        {
          error: "Payload too large",
          message: `Request body is too large for Vercel Functions limit (${Math.round(VERCEL_FUNCTION_BODY_LIMIT_BYTES / 1024 / 1024 * 10) / 10} MB).`,
        },
        { status: 413 },
      );
    }

    const products = JSON.parse(bodyText);
    if (!Array.isArray(products)) {
      return NextResponse.json(
        { error: "Update failed", message: "Products payload must be an array" },
        { status: 400 },
      );
    }

    if (hasBase64Images(products as DTProduct[])) {
      return NextResponse.json(
        {
          error: "Update failed",
          message:
            "Обнаружены изображения в формате base64. Сначала загрузите изображения как файлы.",
        },
        { status: 400 },
      );
    }

    const encoded = Buffer.from(JSON.stringify(products, null, 2)).toString(
      "base64",
    );

    const sha = await getSHA();

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path,
      message: "Update products catalog",
      content: encoded,
      branch: "main",
      sha,
    });

    invalidateProductsCache();
    setRuntimeProducts(products as DTProduct[]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("GITHUB UPDATE ERROR:", error);

    let message = "Update failed";
    let status = undefined;

    if (error instanceof Error) {
      message = error.message;
    }

    if (typeof error === "object" && error !== null && "status" in error) {
      status = (error as { status?: number }).status;
    }

    return NextResponse.json(
      {
        error: "Update failed",
        message,
        status,
      },
      { status: 500 },
    );
  }
}
