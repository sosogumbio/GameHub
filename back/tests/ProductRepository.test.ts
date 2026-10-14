import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { db } from "../infra/database/db";
import { ProductRepository } from "../infra/repositories/ProductRepository";
import { sortProducts } from "../../front/src/utils/sortProducts";

const originalQueryDescriptor = Object.getOwnPropertyDescriptor(db, "query");

afterEach(() => {
  if (originalQueryDescriptor) {
    Object.defineProperty(db, "query", originalQueryDescriptor);
  } else {
    Reflect.deleteProperty(db, "query");
  }
});

test("filtro de categoria consulta a coluna category", async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  Object.defineProperty(db, "query", {
    configurable: true,
    value: async (sql: string, values: unknown[] = []) => {
      queries.push({ sql, values });
      return { rows: [], rowCount: 0 };
    }
  });

  await new ProductRepository().findAll({ category: "Jogos", page: 2, pageSize: 24 });

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /WHERE category = \$1/);
  assert.match(queries[0].sql, /LIMIT \$2 OFFSET \$3/);
  assert.deepEqual(queries[0].values, ["Jogos", 24, 24]);
});

test("ordenação por preço é numérica", () => {
  const products = [
    { id: 1, name: "Mais caro", description: "", category: "Jogos", price: 100, stock: 1 },
    { id: 2, name: "Mais barato", description: "", category: "Jogos", price: 9.9, stock: 1 },
    { id: 3, name: "Intermediário", description: "", category: "Jogos", price: 20, stock: 1 }
  ];

  assert.deepEqual(sortProducts(products, "price").map((product) => product.price), [9.9, 20, 100]);
});

test("dashboard busca todos os indicadores em uma consulta agregada", async () => {
  let queryCount = 0;
  let executedSql = "";
  Object.defineProperty(db, "query", {
    configurable: true,
    value: async (sql: string) => {
      queryCount += 1;
      executedSql = sql;
      return {
        rows: [{
          total_products: "60000",
          low_stock: "125",
          inventory_value: "123456.78",
          categories: "5"
        }],
        rowCount: 1
      };
    }
  });

  const dashboard = await new ProductRepository().getDashboard();

  assert.equal(queryCount, 1);
  assert.match(executedSql, /COUNT\(\*\) FILTER \(WHERE stock <= 5\)/);
  assert.equal(dashboard.totalProducts, 60000);
  assert.equal(dashboard.lowStock, 125);
  assert.equal(dashboard.inventoryValue, 123456.78);
  assert.equal(dashboard.categories, 5);
});

test("filtro de favoritos pagina apenas os IDs selecionados", async () => {
  let executedSql = "";
  let queryValues: unknown[] = [];
  Object.defineProperty(db, "query", {
    configurable: true,
    value: async (sql: string, values: unknown[] = []) => {
      executedSql = sql;
      queryValues = values;
      return { rows: [], rowCount: 0 };
    }
  });

  await new ProductRepository().findAll({ ids: [10, 20], page: 1, pageSize: 24 });

  assert.match(executedSql, /id = ANY\(\$1::integer\[\]\)/);
  assert.deepEqual(queryValues, [[10, 20], 24, 0]);
});
