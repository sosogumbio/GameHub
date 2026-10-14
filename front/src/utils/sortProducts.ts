import type { ProductDTO } from "@/dto/ProductDTO";

export function sortProducts(products: ProductDTO[], sort: string): ProductDTO[] {
  return [...products].sort((a, b) => sort === "price"
    ? a.price - b.price
    : a.name.localeCompare(b.name));
}
