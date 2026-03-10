import ProductCard from "../products/ProductCard";
import { ReduxProvider } from "../../providers";
import { getLocalization } from "../../utils/getLocalization";
import getProducts from "../../utils/getProducts";
import {
  isNewArrivalProduct,
  SHOWCASE_MAX_ITEMS,
  sortByShowcaseOrder,
} from "../../utils/productShowcase";

interface RecentProductsProps {
  count?: number;
}

export default async function RecentProducts({ count = 3 }: RecentProductsProps) {
  const localeData = getLocalization();
  const labels = localeData.labels;
  const maxItems = Math.min(Math.max(count, 1), SHOWCASE_MAX_ITEMS);

  const allProducts = await getProducts();
  const recentProducts = sortByShowcaseOrder(
    allProducts.filter(isNewArrivalProduct),
    "NewArrivalOrder",
  ).slice(0, maxItems);

  if (recentProducts.length === 0) {
    return (
      <section id="recent-products" className="section-wrap">
        <div className="app-shell text-center">
          <h2 className="section-title">{labels.recentProducts}</h2>
          <p className="mt-4 text-slate-600">
            {labels.noProductsHint ||
              "Скоро здесь появятся новые позиции и специальные предложения."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="recent-products" className="section-wrap">
      <div className="app-shell">
        <h2 className="section-title text-center mb-8">
          {labels.recentProducts}
        </h2>

        <ReduxProvider>
          <div className="mt-4 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,320px))] justify-center">
            {recentProducts.map((product: DTProduct) => (
              <ProductCard key={product.ID} product={product} />
            ))}
          </div>
        </ReduxProvider>
      </div>
    </section>
  );
}
