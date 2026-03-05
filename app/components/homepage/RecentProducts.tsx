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
  const markedAsNew = allProducts.filter((product) => Boolean(product.IsNewArrival));
  const source = markedAsNew.length > 0 ? markedAsNew : allProducts;

  const recentProducts = source
    .sort((a, b) => {
      const orderA =
        typeof a.NewArrivalOrder === "number" && a.NewArrivalOrder > 0
          ? a.NewArrivalOrder
          : Number.MAX_SAFE_INTEGER;
      const orderB =
        typeof b.NewArrivalOrder === "number" && b.NewArrivalOrder > 0
          ? b.NewArrivalOrder
          : Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) return orderA - orderB;

      const updatedA = a.UpdatedAt ? Date.parse(a.UpdatedAt) : 0;
      const updatedB = b.UpdatedAt ? Date.parse(b.UpdatedAt) : 0;
      return updatedB - updatedA;
    })
    .slice(0, count);

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
