import { getAllProductsFromDatabase } from "../lib/productsRepository";

async function getAllProductsFromSource(): Promise<DTProduct[]> {
  try {
    return await getAllProductsFromDatabase();
  } catch (error) {
    console.error("Failed to read products source. Falling back to empty list:", error);
    return [];
  }
}

// Define function to get all visible products
export default async function getProducts(): Promise<DTProduct[]> {
  const products = await getAllProductsFromSource();
  return products.filter(
    (product) => product.Enabled && product.CatalogVisible,
  );
}

// Function to get a product by slug
export async function getProductBySlug(
  slug: string,
): Promise<DTProduct | undefined> {
  try {
    const products = await getProducts();
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
      .filter((product) => product.Enabled && product.CatalogVisible)
      .flatMap((product) => product.ProductCategories || []);

    // Return unique categories
    return Array.from(new Set(allCategories));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}
