import productsData from "../../configs/products.json";
import { getProducts as getGithubProducts } from "../lib/githubStorage";
import { getRuntimeProducts } from "../lib/runtimeProductsStore";

function shouldUseGithubSource() {
  const source = process.env.PRODUCTS_SOURCE?.toLowerCase();

  if (source === "local") return false;
  if (source === "github") return true;

  return Boolean(process.env.GITHUB_REPO && process.env.GITHUB_PAT);
}

async function getAllProductsFromSource(): Promise<DTProduct[]> {
  if (!shouldUseGithubSource()) {
    const runtime = getRuntimeProducts();
    if (Array.isArray(runtime) && runtime.length > 0) {
      return runtime;
    }
    return productsData as DTProduct[];
  }

  try {
    const githubProducts = await getGithubProducts();
    if (Array.isArray(githubProducts) && githubProducts.length > 0) {
      return githubProducts as DTProduct[];
    }
    return productsData as DTProduct[];
  } catch (error) {
    console.error("Error loading products from GitHub:", error);
    return productsData as DTProduct[];
  }
}

// Define function to get all visible products
export default async function getProducts(): Promise<DTProduct[]> {
  const products = await getAllProductsFromSource();
  return products.filter((product) => product.CatalogVisible);
}

// Function to get a product by slug
export async function getProductBySlug(
  slug: string,
): Promise<DTProduct | undefined> {
  try {
    const products = await getAllProductsFromSource();
    return products.find((product) => product.Slug === slug);
  } catch (error) {
    console.error(`Error fetching product with slug "${slug}":`, error);
    return undefined;
  }
}

// Function to get all unique categories from products
export async function getAllCategories(): Promise<string[]> {
  try {
    const products = await getAllProductsFromSource();

    // Extract all categories from all products
    const allCategories = products
      .filter((product) => product.CatalogVisible)
      .flatMap((product) => product.ProductCategories || []);

    // Return unique categories
    return Array.from(new Set(allCategories));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}
