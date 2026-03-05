import { Octokit } from "octokit";

const repo = process.env.GITHUB_REPO!;
const [owner, name] = repo.split("/");

const path = "configs/products.json";
const CACHE_TTL_MS = 60_000;

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

type GithubProductsFileContent = {
  content?: string;
  download_url?: string;
};

let cachedProducts: DTProduct[] | null = null;
let cacheExpiresAt = 0;
let pendingRequest: Promise<DTProduct[]> | null = null;

async function fetchProductsFromGithub(): Promise<DTProduct[]> {
  const res = await octokit.rest.repos.getContent({
    owner,
    repo: name,
    path,
  });

  const fileData = res.data as GithubProductsFileContent;
  const content = fileData.content;
  const downloadUrl = fileData.download_url;

  const rawJson = content
    ? Buffer.from(content, "base64").toString()
    : downloadUrl
      ? await fetch(downloadUrl).then((response) => response.text())
      : "";

  if (!rawJson.trim()) return [];

  const parsed = JSON.parse(rawJson);
  return Array.isArray(parsed) ? (parsed as DTProduct[]) : [];
}

export function invalidateProductsCache() {
  cachedProducts = null;
  cacheExpiresAt = 0;
  pendingRequest = null;
}

export async function getProducts(options?: { forceRefresh?: boolean }) {
  const now = Date.now();

  if (!options?.forceRefresh && cachedProducts && now < cacheExpiresAt) {
    return cachedProducts;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = fetchProductsFromGithub()
    .then((products) => {
      cachedProducts = products;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return products;
    })
    .catch((error) => {
      if (cachedProducts) {
        return cachedProducts;
      }
      throw error;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}
