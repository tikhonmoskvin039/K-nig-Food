import { Octokit } from "octokit";

const repo = process.env.GITHUB_REPO!;
const [owner, name] = repo.split("/");

const path = "configs/products.json";

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

export async function getProducts() {
  const res = await octokit.rest.repos.getContent({
    owner,
    repo: name,
    path,
  });

  // @ts-ignore
  const content = Buffer.from(res.data.content, "base64").toString();

  return JSON.parse(content);
}