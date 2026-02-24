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

/*
=========================================
GET — получить список товаров
=========================================
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
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}

/*
=========================================
PUT — обновить каталог товаров
=========================================
*/
export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await req.json();

    const encoded = Buffer.from(
      JSON.stringify(products, null, 2)
    ).toString("base64");

    const sha = await getFileSHA();

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path,
      message: "Update products catalog",
      content: encoded,
      branch: "main",
      sha,
      committer: {
        name: "Admin Bot",
        email: process.env.GITHUB_USER_EMAIL || "admin@bot.local",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update products error:", error);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

/*
=========================================
Получить SHA файла для GitHub API
=========================================
*/
async function getFileSHA(): Promise<string> {
  const res = await octokit.rest.repos.getContent({
    owner,
    repo: repoName,
    path,
  });

  // @ts-ignore
  return res.data.sha;
}