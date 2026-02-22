import productsListingData from "../../configs/products-listing.json";

// Products Listing Settings Interface
export interface ProductsListingSettings {
  pageSize: number;
}

/**
 * Get products listing settings from configs/products-listing.json
 * Returns settings like page size for product listings
 * Now using direct import for compatibility with Vercel
 */
export const getProductsListingSettings = (): ProductsListingSettings => {
  return productsListingData as ProductsListingSettings;
};
