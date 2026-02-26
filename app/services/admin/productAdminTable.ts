export type EnabledFilter = "all" | "enabled" | "disabled";
export type VisibleFilter = "all" | "visible" | "hidden";
export type SortBy =
  | "updated_desc"
  | "updated_asc"
  | "created_desc"
  | "created_asc"
  | "title_asc"
  | "title_desc"
  | "price_asc"
  | "price_desc";

export type TableState = {
  search: string;
  category: string;
  currency: string;
  portionUnit: string;
  enabled: EnabledFilter;
  visible: VisibleFilter;
  minPrice: string;
  maxPrice: string;
  sortBy: SortBy;
  currentPage: number;
  selectedProductIds: string[];
};

export const TABLE_STATE_STORAGE_KEY = "admin_products_table_state_v1";
export const PAGE_SIZE = 10;

export const DEFAULT_TABLE_STATE: TableState = {
  search: "",
  category: "all",
  currency: "all",
  portionUnit: "all",
  enabled: "all",
  visible: "all",
  minPrice: "",
  maxPrice: "",
  sortBy: "updated_desc",
  currentPage: 1,
  selectedProductIds: [],
};

export const readTableState = (): TableState => {
  if (typeof window === "undefined") {
    return DEFAULT_TABLE_STATE;
  }

  try {
    const raw = localStorage.getItem(TABLE_STATE_STORAGE_KEY);
    if (!raw) return DEFAULT_TABLE_STATE;

    const parsed = JSON.parse(raw) as Partial<TableState>;
    return {
      ...DEFAULT_TABLE_STATE,
      ...parsed,
      currentPage:
        typeof parsed.currentPage === "number" && parsed.currentPage > 0
          ? Math.floor(parsed.currentPage)
          : DEFAULT_TABLE_STATE.currentPage,
      selectedProductIds: Array.isArray(parsed.selectedProductIds)
        ? parsed.selectedProductIds
        : [],
    };
  } catch {
    return DEFAULT_TABLE_STATE;
  }
};

export const getCategoryOptions = (products: DTProduct[]) =>
  Array.from(
    new Set(products.flatMap((product) => product.ProductCategories || [])),
  ).sort();

export const getCurrencyOptions = (products: DTProduct[]) =>
  Array.from(
    new Set(
      products
        .map((product) => product.Currency)
        .filter((currency) => currency && currency.trim()),
    ),
  ).sort();

export const getPortionUnitOptions = (products: DTProduct[]) =>
  Array.from(
    new Set(
      products
        .map((product) => product.PortionUnit)
        .filter((unit) => unit && unit.trim()),
    ),
  ).sort();

export const filterAndSortProducts = (
  products: DTProduct[],
  tableState: TableState,
) => {
  const normalizedSearch = tableState.search.trim().toLowerCase();
  const minPrice = tableState.minPrice ? Number(tableState.minPrice) : null;
  const maxPrice = tableState.maxPrice ? Number(tableState.maxPrice) : null;

  let result = [...products];

  if (normalizedSearch) {
    result = result.filter((product) =>
      [
        product.Title,
        product.Slug,
        product.ShortDescription,
        product.LongDescription,
        (product.ProductCategories || []).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }

  if (tableState.category !== "all") {
    result = result.filter((product) =>
      product.ProductCategories.includes(tableState.category),
    );
  }

  if (tableState.currency !== "all") {
    result = result.filter((product) => product.Currency === tableState.currency);
  }

  if (tableState.portionUnit !== "all") {
    result = result.filter(
      (product) => product.PortionUnit === tableState.portionUnit,
    );
  }

  if (tableState.enabled === "enabled") {
    result = result.filter((product) => product.Enabled);
  }
  if (tableState.enabled === "disabled") {
    result = result.filter((product) => !product.Enabled);
  }

  if (tableState.visible === "visible") {
    result = result.filter((product) => product.CatalogVisible);
  }
  if (tableState.visible === "hidden") {
    result = result.filter((product) => !product.CatalogVisible);
  }

  if (minPrice !== null && Number.isFinite(minPrice)) {
    result = result.filter((product) => Number(product.RegularPrice) >= minPrice);
  }

  if (maxPrice !== null && Number.isFinite(maxPrice)) {
    result = result.filter((product) => Number(product.RegularPrice) <= maxPrice);
  }

  const getCreated = (product: DTProduct) =>
    product.CreatedAt ? Date.parse(product.CreatedAt) : 0;
  const getUpdated = (product: DTProduct) =>
    product.UpdatedAt ? Date.parse(product.UpdatedAt) : 0;
  const getPrice = (product: DTProduct) => Number(product.RegularPrice) || 0;

  switch (tableState.sortBy) {
    case "updated_asc":
      result.sort((a, b) => getUpdated(a) - getUpdated(b));
      break;
    case "created_desc":
      result.sort((a, b) => getCreated(b) - getCreated(a));
      break;
    case "created_asc":
      result.sort((a, b) => getCreated(a) - getCreated(b));
      break;
    case "title_asc":
      result.sort((a, b) => a.Title.localeCompare(b.Title));
      break;
    case "title_desc":
      result.sort((a, b) => b.Title.localeCompare(a.Title));
      break;
    case "price_asc":
      result.sort((a, b) => getPrice(a) - getPrice(b));
      break;
    case "price_desc":
      result.sort((a, b) => getPrice(b) - getPrice(a));
      break;
    case "updated_desc":
    default:
      result.sort((a, b) => getUpdated(b) - getUpdated(a));
      break;
  }

  return result;
};

export const hasActiveProductFilters = (tableState: TableState) =>
  tableState.search !== DEFAULT_TABLE_STATE.search ||
  tableState.category !== DEFAULT_TABLE_STATE.category ||
  tableState.currency !== DEFAULT_TABLE_STATE.currency ||
  tableState.portionUnit !== DEFAULT_TABLE_STATE.portionUnit ||
  tableState.enabled !== DEFAULT_TABLE_STATE.enabled ||
  tableState.visible !== DEFAULT_TABLE_STATE.visible ||
  tableState.minPrice !== DEFAULT_TABLE_STATE.minPrice ||
  tableState.maxPrice !== DEFAULT_TABLE_STATE.maxPrice ||
  tableState.sortBy !== DEFAULT_TABLE_STATE.sortBy;

export const formatProductDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
