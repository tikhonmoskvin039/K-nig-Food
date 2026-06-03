import type { Metadata } from "next";
import { notFound } from "next/navigation";
import getProducts, { getProductBySlug } from "../../utils/getProducts";
import { getCurrencySymbol } from "../../utils/getCurrencySymbol";
import ProductLightbox from "../../components/products/ProductLightbox";
import ProductRecommendations from "../../components/products/ProductRecommendations";
import { getLocalization } from "../../utils/getLocalization";
import AddToCartButtonWrapper from "../../components/products/AddToCartButtonWrapper";
import ProductBackButton from "../../components/products/ProductBackButton";
import {
  CalendarDays,
  ClipboardList,
  PackageCheck,
  Thermometer,
  Utensils,
} from "lucide-react";

// Define a type for route params as a Promise
type AsyncParams = Promise<{ slug?: string }>;

// read localization
const localeData = getLocalization();

/**
 * Note: `generateMetadata` must also treat `params` as a Promise.
 * Then "await params" to get the real slug value.
 */
export async function generateMetadata({
  params,
}: {
  params: AsyncParams;
}): Promise<Metadata> {
  const { slug } = await params; // MUST await

  if (!slug) {
    return {
      title: "Product Not Found",
      description: "No product slug provided.",
    };
  }

  // Local file read is now allowed, as we properly awaited the param
  const product = await getProductBySlug(slug);
  if (!product) {
    return {
      title: "Product Not Found",
      description: `Product with slug "${slug}" does not exist.`,
    };
  }

  return {
    title: `${product.Title} - ${localeData.siteName}`,
    description: product.ShortDescription,
  };
}

/**
 * The route itself must also treat `params` as a Promise.
 */
export default async function ProductPage({ params }: { params: AsyncParams }) {
  // First await for the real param
  const { slug } = await params;
  if (!slug) {
    return notFound();
  }

  const products = await getProducts();
  const product = products.find((item) => item.Slug === slug);
  if (!product) {
    return notFound();
  }

  const productsById = new Map(products.map((item) => [item.ID, item]));
  const recommendedProducts = (product.RecommendedProductIds || [])
    .map((id) => productsById.get(id))
    .filter(
      (item): item is DTProduct => (item ? item.ID !== product.ID : false),
    );

  const regularPrice = Number(product.RegularPrice);
  const salePrice = Number(product.SalePrice);
  const hasSalePrice =
    Number.isFinite(regularPrice) &&
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    salePrice < regularPrice;
  const currencySymbol = getCurrencySymbol(product.Currency);
  const formatManufactureDate = (value?: string) => {
    if (!value) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const [year, month, day] = value.split("-");
    return `${day}.${month}.${year}`;
  };
  const productAttributes = [
    {
      label: "Состав",
      value: product.Composition,
      icon: ClipboardList,
    },
    {
      label: "Условие хранения",
      value: product.StorageCondition,
      icon: Thermometer,
    },
    {
      label: "Срок хранения",
      value: product.StorageTerm,
      icon: PackageCheck,
    },
    {
      label: "Дата изготовления",
      value: formatManufactureDate(product.ManufactureDate),
      icon: CalendarDays,
    },
    {
      label: "Способ употребления",
      value: product.UsageMethod,
      icon: Utensils,
    },
  ].filter((attribute) => attribute.value?.trim());

  // Build SSR UI
  const priceBlock = hasSalePrice ? (
    <p className="text-xl font-bold text-red-600">
      {salePrice}
      {currencySymbol}
      <span className="ml-2 text-gray-500 line-through">
        {regularPrice}
        {currencySymbol}
      </span>
    </p>
  ) : (
    <p className="text-xl font-bold text-gray-900">
      {product.RegularPrice}
      {currencySymbol}
    </p>
  );

  return (
    <section className="section-wrap min-h-[calc(100vh-var(--header-height))]">
      <div className="app-shell">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3 md:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_minmax(7rem,auto)]">
          <ProductBackButton />
          <h1 className="page-title min-w-0 text-center">{product.Title}</h1>
          <div className="h-11 w-11 md:min-w-28" aria-hidden="true" />
        </div>

        <div className="surface-card mt-6 grid grid-cols-1 items-stretch gap-6 p-5 md:grid-cols-2 md:p-6">
          {/* LEFT COLUMN: IMAGES */}
          <ProductLightbox
            images={[product.FeatureImageURL, ...product.ProductImageGallery]}
          />

          {/* RIGHT COLUMN: DETAILS */}
          <div className="flex self-stretch flex-col">
            <p className="text-lg text-slate-700">{product.ShortDescription}</p>

            {/* PORTION INFO */}
            {product.PortionWeight && product.PortionUnit && (
              <p className="mt-2 text-sm text-gray-500">
                Выход: {product.PortionWeight} {product.PortionUnit}
              </p>
            )}

            {productAttributes.length > 0 && (
              <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
                {productAttributes.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="grid grid-cols-[minmax(0,44%)_minmax(0,1fr)] items-center gap-3 py-3 text-sm text-slate-700"
                  >
                    <dt className="inline-flex min-w-0 items-center gap-3">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 font-semibold text-slate-900">
                        {label}
                      </span>
                    </dt>
                    <dd className="min-w-0 justify-self-end text-right leading-6">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-auto pt-6">
              <div>{priceBlock}</div>
              <div className="mt-4">
                <AddToCartButtonWrapper product={product} />
              </div>
            </div>
          </div>
        </div>

        {/* LONG DESCRIPTION */}
        <div className="mt-8 surface-card p-5 md:p-6">
          <h2 className="section-title">
            {localeData.labels.productDetails || "Информация о товаре"}
          </h2>
          <p className="text-slate-700 mt-4 leading-relaxed">
            {product.LongDescription}
          </p>
        </div>

        {recommendedProducts.length > 0 && (
          <ProductRecommendations
            products={recommendedProducts}
            title={
              localeData.labels.recommendedProducts ||
              "Вместе с этим товаром покупают"
            }
          />
        )}
      </div>
    </section>
  );
}
