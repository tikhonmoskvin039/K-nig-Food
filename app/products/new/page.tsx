import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReduxProvider } from "../../providers";
import ProductGridSpecial from "../../components/products/ProductGridSpecial";
import { getLocalization } from "../../utils/getLocalization";
import { getProductsListingSettings } from "../../utils/getProductsListing";
import { getHomepageVisibilityState } from "../../lib/homepageSettingsRepository";

const localeData = getLocalization();

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${localeData.labels.recentProducts || "Новинки"} - ${localeData.siteName}`,
  description: localeData.siteTagline,
};

export default async function NewProductsPage() {
  const homepageVisibility = await getHomepageVisibilityState();
  if (!homepageVisibility.recentProductsEnabled) {
    notFound();
  }

  const productsListingSettings = getProductsListingSettings();

  return (
    <section className="section-wrap">
      <div className="app-shell">
        <h2 className="page-title text-center mb-8">
          {localeData.labels.recentProducts || "Новинки"}
        </h2>
        <div className="mt-2">
          <ReduxProvider>
            <ProductGridSpecial
              filter="new"
              pageSize={productsListingSettings.pageSize}
            />
          </ReduxProvider>
        </div>
      </div>
    </section>
  );
}
