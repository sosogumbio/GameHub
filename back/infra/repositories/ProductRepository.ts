import { db } from "../database/db";
import type { CreateProductDTO } from "../../src/dto/CreateProductDTO";
import type { Product } from "../../src/model/Product";

export interface ProductFilters {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  ids?: number[];
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description),
    category: String(row.category),
    price: Number(row.price),
    stock: Number(row.stock)
  };
}

export class ProductRepository {
  async findAll(filters: ProductFilters): Promise<ProductPage> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.search) {
      values.push(`%${filters.search.replace(/[\\%_]/g, "\\$&")}%`);
      const parameter = `$${values.length}`;
      conditions.push(`(name ILIKE ${parameter} ESCAPE '\\' OR description ILIKE ${parameter} ESCAPE '\\')`);
    }

    if (filters.category) {
      values.push(filters.category);
      conditions.push(`category = $${values.length}`);
    }

    if (filters.ids) {
      values.push(filters.ids);
      conditions.push(`id = ANY($${values.length}::integer[])`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = filters.sort === "price" ? "price ASC" : "name ASC";
    const requestedPage = filters.page ?? 1;
    const requestedPageSize = filters.pageSize ?? 24;
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 100)
      : 24;
    const offset = (page - 1) * pageSize;
    const valuesForPage = [...values, pageSize, offset];
    const sql = `SELECT id, name, description, category, price, stock, COUNT(*) OVER() AS total
      FROM products ${where}
      ORDER BY ${orderBy}
      LIMIT $${valuesForPage.length - 1} OFFSET $${valuesForPage.length}`;

    const startedAt = performance.now();
    const result = await db.query(sql, valuesForPage);
    console.info(
      `[SQL] produtos: ${result.rowCount ?? 0} itens em ${(performance.now() - startedAt).toFixed(2)} ms`
    );
    return {
      items: result.rows.map(mapProduct),
      total: Number(result.rows[0]?.total ?? 0),
      page,
      pageSize
    };
  }

  async findCategories(): Promise<string[]> {
    const result = await db.query<{ category: string }>(
      "SELECT DISTINCT category FROM products ORDER BY category ASC"
    );
    return result.rows.map((row) => row.category);
  }

  async create(input: CreateProductDTO): Promise<Product> {
    const result = await db.query(
      `INSERT INTO products (name, description, category, price, stock)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, category, price, stock`,
      [input.name, input.description, input.category, input.price, input.stock]
    );
    return mapProduct(result.rows[0]);
  }

  async delete(id: number): Promise<void> {
    await db.query("DELETE FROM products WHERE id = $1", [id]);
  }

  async getDashboard() {
    const dashboardStartedAt = performance.now();
    const result = await db.query<{
      total_products: string;
      low_stock: string;
      inventory_value: string;
      categories: string;
    }>(`SELECT
      COUNT(*) AS total_products,
      COUNT(*) FILTER (WHERE stock <= 5) AS low_stock,
      COALESCE(SUM(price * stock), 0) AS inventory_value,
      COUNT(DISTINCT category) AS categories
    FROM products`);
    console.info(`[SQL] dashboard: 1 consulta em ${(performance.now() - dashboardStartedAt).toFixed(2)} ms`);

    return {
      totalProducts: Number(result.rows[0].total_products),
      lowStock: Number(result.rows[0].low_stock),
      inventoryValue: Number(result.rows[0].inventory_value),
      categories: Number(result.rows[0].categories)
    };
  }
}
