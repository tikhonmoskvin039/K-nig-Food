export function createEmptyProduct(): DTProduct {
  return {
    ID: crypto.randomUUID(),
    Title: "",
    Slug: "",
    Enabled: true,
    CatalogVisible: true,
    PortionWeight: 0,
    PortionUnit: "г",
    Composition: "",
    StorageCondition: "",
    StorageTerm: "",
    ManufactureDate: "",
    UsageMethod: "",
    ProductCategories: [],
    RecommendedProductIds: [],
    FeatureImageURL: "",
    ProductImageGallery: [],
    IsNewArrival: false,
    NewArrivalOrder: 0,
    IsWeeklyOffer: false,
    WeeklyOfferOrder: 0,
    ShortDescription: "",
    LongDescription: "",
    RegularPrice: "",
    SalePrice: "",
    Currency: "RUR",
    CreatedAt: "",
    UpdatedAt: "",
  };
}

export function cloneProduct(product: DTProduct): DTProduct {
  return {
    ...product,
    Currency: "RUR",
    CreatedAt: product.CreatedAt || "",
    UpdatedAt: product.UpdatedAt || "",
    Composition: product.Composition || "",
    StorageCondition: product.StorageCondition || "",
    StorageTerm: product.StorageTerm || "",
    ManufactureDate: product.ManufactureDate || "",
    UsageMethod: product.UsageMethod || "",
    ProductCategories: [...(product.ProductCategories || [])],
    RecommendedProductIds: [...(product.RecommendedProductIds || [])],
    ProductImageGallery: [...(product.ProductImageGallery || [])],
    IsNewArrival:
      Boolean(product.IsNewArrival) ||
      (typeof product.NewArrivalOrder === "number" && product.NewArrivalOrder > 0),
    NewArrivalOrder:
      typeof product.NewArrivalOrder === "number" ? product.NewArrivalOrder : 0,
    IsWeeklyOffer:
      Boolean(product.IsWeeklyOffer) ||
      (typeof product.WeeklyOfferOrder === "number" &&
        product.WeeklyOfferOrder > 0),
    WeeklyOfferOrder:
      typeof product.WeeklyOfferOrder === "number" ? product.WeeklyOfferOrder : 0,
  };
}

export function normalizeProductRecommendations(
  products: DTProduct[],
): DTProduct[] {
  const validProductIds = new Set(
    products.map((product) => product.ID).filter(Boolean),
  );

  return products.map((product) => {
    const recommendedProductIds = Array.from(
      new Set(product.RecommendedProductIds || []),
    ).filter(
      (recommendedId) =>
        recommendedId !== product.ID && validProductIds.has(recommendedId),
    );

    return {
      ...product,
      RecommendedProductIds: recommendedProductIds,
    };
  });
}
