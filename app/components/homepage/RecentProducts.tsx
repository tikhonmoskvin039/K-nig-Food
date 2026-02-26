import ProductCardWithProvider from "../products/ProductCardWithProvider";
import { getLocalization } from "../../utils/getLocalization";
import getProducts from "../../utils/getProducts";

interface RecentProductsProps {
  count?: number;
}

export default async function RecentProducts({ count = 3 }: RecentProductsProps) {
  const localeData = getLocalization();
  const labels = localeData.labels;

  const allProducts = await getProducts();
  const recentProducts = allProducts.slice(0, count);

  if (recentProducts.length === 0) {
    return <p className="text-center text-gray-500">{labels.noProductsFound}</p>;
  }

  return (
    <section className="section-wrap">
      <div className="app-shell">
        <h2 className="section-title text-center mb-8">
          {labels.recentProducts}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 mt-4 md:grid-cols-3 gap-6">
          {recentProducts.map((product: DTProduct) => (
            <ProductCardWithProvider key={product.ID} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
