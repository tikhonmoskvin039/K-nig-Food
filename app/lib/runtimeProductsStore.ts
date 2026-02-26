import productsData from "../../configs/products.json";

let runtimeProducts: DTProduct[] = productsData as DTProduct[];

export function getRuntimeProducts(): DTProduct[] {
  return runtimeProducts;
}

export function setRuntimeProducts(products: DTProduct[]) {
  runtimeProducts = products;
}
