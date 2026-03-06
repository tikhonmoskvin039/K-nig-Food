export const SHOWCASE_MAX_ITEMS = 6;

const hasPositiveOrder = (value?: number) =>
  typeof value === "number" && value > 0;

const parseDateOrZero = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isNewArrivalProduct = (product: DTProduct) =>
  Boolean(product.IsNewArrival) || hasPositiveOrder(product.NewArrivalOrder);

export const hasDiscountPrice = (product: DTProduct) => {
  const regularPrice = Number(product.RegularPrice);
  const salePrice = Number(product.SalePrice);

  return (
    Number.isFinite(regularPrice) &&
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    salePrice < regularPrice
  );
};

export const isWeeklyOfferProduct = (product: DTProduct) =>
  Boolean(product.IsWeeklyOffer) || hasPositiveOrder(product.WeeklyOfferOrder);

export const isPromoProduct = (product: DTProduct) =>
  isWeeklyOfferProduct(product) || hasDiscountPrice(product);

export const sortByShowcaseOrder = (
  products: DTProduct[],
  orderKey: "NewArrivalOrder" | "WeeklyOfferOrder",
) =>
  [...products].sort((a, b) => {
    const orderA = hasPositiveOrder(a[orderKey] as number)
      ? (a[orderKey] as number)
      : Number.MAX_SAFE_INTEGER;
    const orderB = hasPositiveOrder(b[orderKey] as number)
      ? (b[orderKey] as number)
      : Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) return orderA - orderB;

    const updatedA = parseDateOrZero(a.UpdatedAt);
    const updatedB = parseDateOrZero(b.UpdatedAt);
    if (updatedA !== updatedB) return updatedB - updatedA;

    return a.Title.localeCompare(b.Title, "ru");
  });
