import ProductGrid from "../components/products/ProductGrid";
import { getLocalization } from "../utils/getLocalization";
import { getProductsListingSettings } from "../utils/getProductsListing";
import type { Metadata } from "next";
import { ReduxProvider } from "../providers";

// Fetch localization data
const localeData = getLocalization();

// Set page metadata
export const metadata: Metadata = {
  title: `${localeData.siteName} - ${localeData.labels.products}`,
  description: localeData.siteTagline,
};

export default function ProductsPage() {
  const productsListingSettings = getProductsListingSettings();

  return (
    <section className="section-wrap">
      <div className="app-shell">
        <h2 className="page-title text-center mb-8">
          {localeData.labels.products || "Меню"}
        </h2>
        <div className="mt-2">
          <ReduxProvider>
            <ProductGrid pageSize={productsListingSettings.pageSize} />
          </ReduxProvider>
        </div>
      </div>
    </section>
  );
}
