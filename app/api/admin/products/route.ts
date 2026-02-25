import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";
import { getToken } from "next-auth/jwt";

const repo = process.env.GITHUB_REPO!;
const [owner, repoName] = repo.split("/");
const path = "configs/products.json";

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

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

  // @ts-ignore
  return res.data.sha;
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

    // @ts-ignore
    const content = Buffer.from(res.data.content, "base64").toString();

    return NextResponse.json(JSON.parse(content));
  } catch (error: unknown) {
    console.error("GITHUB GET ERROR:", error);

    let message = "Getting products failed";
    let status = undefined;

    if (error instanceof Error) {
      message = error.message;
    }

    if (typeof error === "object" && error !== null && "status" in error) {
      // @ts-ignore — потому что GitHub SDK ошибки плохо типизированы
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
    const products = await req.json();

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

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("GITHUB UPDATE ERROR:", error);

    let message = "Update failed";
    let status = undefined;

    if (error instanceof Error) {
      message = error.message;
    }

    if (typeof error === "object" && error !== null && "status" in error) {
      // @ts-ignore — потому что GitHub SDK ошибки плохо типизированы
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
