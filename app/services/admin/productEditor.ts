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
  };
}
