import productsData from "../../configs/products.json";

// Define function to get all products
// Now using direct import for compatibility with Vercel
export default async function getProducts(): Promise<DTProduct[]> {
  try {
    const products: DTProduct[] = productsData as DTProduct[];
    return products.filter((product) => product.CatalogVisible);
  } catch (error) {
    console.error("Error loading products file:", error);
    return [];
  }
}

// Function to get a product by slug
export function getProductBySlug(slug: string): DTProduct | undefined {
  try {
    const products: DTProduct[] = productsData as DTProduct[];
    return products.find((product) => product.Slug === slug);
  } catch (error) {
    console.error(`Error fetching product with slug "${slug}":`, error);
    return undefined;
  }
}

// Function to get all unique categories from products
export function getAllCategories(): string[] {
  try {
    const products: DTProduct[] = productsData as DTProduct[];

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
