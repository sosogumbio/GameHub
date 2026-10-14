import type { ProductDTO } from "@/dto/ProductDTO";
import { apiRequest } from "@/fetch/api";

export interface ProductFilters {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  ids?: number[];
}

export interface ProductPage {
  items: ProductDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export function getProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.ids) params.set("ids", filters.ids.join(","));

  return apiRequest<ProductPage>(`/products?${params.toString()}`);
}

export function getProductCategories() {
  return apiRequest<string[]>("/products/categories");
}

export function createProduct(product: Omit<ProductDTO, "id">) {
  return apiRequest<ProductDTO>("/products", {
    method: "POST",
    body: JSON.stringify(product)
  });
}

export function deleteProduct(id: number) {
  return apiRequest<{ message: string }>(`/products/${id}`, {
    method: "DELETE"
  });
}
