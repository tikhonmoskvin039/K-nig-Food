export function createEmptyProduct(): DTProduct {
  return {
    ID: crypto.randomUUID(),
    Title: "",
    Slug: "",
    Enabled: true,
    CatalogVisible: true,
    PortionWeight: 0,
    PortionUnit: "г",
    ProductCategories: [],
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
    ProductCategories: [...(product.ProductCategories || [])],
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
