import ProductCard from "../products/ProductCard";
import { ReduxProvider } from "../../providers";
import { getLocalization } from "../../utils/getLocalization";
import getProducts from "../../utils/getProducts";
import {
  hasDiscountPrice,
  isWeeklyOfferProduct,
  SHOWCASE_MAX_ITEMS,
  sortByShowcaseOrder,
} from "../../utils/productShowcase";

interface WeeklyOffersProps {
  count?: number;
}

const sortDiscountedProducts = (products: DTProduct[]) =>
  [...products].sort((a, b) => {
    const discountA = Number(a.RegularPrice) - Number(a.SalePrice);
    const discountB = Number(b.RegularPrice) - Number(b.SalePrice);
    if (discountA !== discountB) return discountB - discountA;

    const updatedA = a.UpdatedAt ? Date.parse(a.UpdatedAt) : 0;
    const updatedB = b.UpdatedAt ? Date.parse(b.UpdatedAt) : 0;
    return updatedB - updatedA;
  });

export default async function WeeklyOffers({ count = 6 }: WeeklyOffersProps) {
  const localeData = getLocalization();
  const labels = localeData.labels;
  const maxItems = Math.min(Math.max(count, 1), SHOWCASE_MAX_ITEMS);

  const allProducts = await getProducts();
  const curatedOffers = sortByShowcaseOrder(
    allProducts.filter(isWeeklyOfferProduct),
    "WeeklyOfferOrder",
  ).slice(0, maxItems);

  const weeklyOffers =
    curatedOffers.length > 0
      ? curatedOffers
      : sortDiscountedProducts(allProducts.filter(hasDiscountPrice)).slice(
          0,
          maxItems,
        );

  if (weeklyOffers.length === 0) {
    return (
      <section id="weekly-offers" className="section-wrap">
        <div className="app-shell text-center">
          <h2 className="section-title">{labels.weeklyOffers || "Акции"}</h2>
          <p className="mt-4 text-slate-600">
            {labels.noProductsHint ||
              "Скоро здесь появятся новые позиции и специальные предложения."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="weekly-offers" className="section-wrap">
      <div className="app-shell">
        <h2 className="section-title text-center mb-8">
          {labels.weeklyOffers || "Предложения недели"}
        </h2>

        <ReduxProvider>
          <div className="mt-4 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,320px))] justify-center">
            {weeklyOffers.map((product: DTProduct) => (
              <ProductCard key={product.ID} product={product} />
            ))}
          </div>
        </ReduxProvider>
      </div>
    </section>
  );
}
