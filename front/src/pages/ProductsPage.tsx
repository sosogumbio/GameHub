"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type { ProductDTO } from "@/dto/ProductDTO";
import { createProduct, deleteProduct, getProductCategories, getProducts } from "@/fetch/productRequests";
import { measurePerformance } from "@/utils/measurePerformance";
import { sortProducts } from "@/utils/sortProducts";

const PAGE_SIZE = 24;
const DEFAULT_CATEGORIES = ["Acessórios", "Consoles", "Hardware", "Jogos", "Periféricos"];

function isProductIdList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(
    (id: unknown) => Number.isSafeInteger(id) && Number(id) > 0
  );
}

export function ProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [categoriesError, setCategoriesError] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoritesError, setFavoritesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    try {
      const savedFavorites = window.localStorage.getItem("gamehub-favorites");
      const parsed: unknown = savedFavorites ? JSON.parse(savedFavorites) : [];
      if (!isProductIdList(parsed)) {
        throw new Error("A lista salva de favoritos está inválida.");
      }
      setFavoriteIds([...new Set(parsed)]);
    } catch (storageError) {
      setFavoritesError(storageError instanceof Error
        ? storageError.message
        : "Não foi possível ler os favoritos salvos.");
    } finally {
      setFavoritesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!favoritesLoaded) return;
    try {
      window.localStorage.setItem("gamehub-favorites", JSON.stringify(favoriteIds));
    } catch (storageError) {
      setFavoritesError(storageError instanceof Error
        ? storageError.message
        : "Não foi possível salvar os favoritos.");
    }
  }, [favoriteIds, favoritesLoaded]);

  useEffect(() => {
    const token = window.localStorage.getItem("gamehub-token");
    if (!token) return;
    try {
      const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(window.atob(encoded));
      setIsAdmin(payload.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getProductCategories()
      .then((result) => {
        if (active) setCategories(result);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setCategoriesError(requestError instanceof Error
            ? requestError.message
            : "Não foi possível carregar as categorias.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setCreating(true);
    setCreateMessage("");
    setError("");
    try {
      await createProduct({
        name: String(data.get("name") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
        category: String(data.get("category") ?? "Jogos") as ProductDTO["category"],
        price: Number(data.get("price")),
        stock: Number(data.get("stock"))
      });
      setCreateMessage("Produto cadastrado. Catálogo atualizado.");
      form.reset();
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível cadastrar o produto.");
    } finally {
      setCreating(false);
    }
  }


  const loadProducts = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (favoritesOnly && favoriteIds.length === 0) {
      setProducts([]);
      setTotalProducts(0);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const result = await measurePerformance(
        "carregamento paginado de produtos",
        () => getProducts({
          search,
          category,
          sort,
          page,
          pageSize: PAGE_SIZE,
          ...(favoritesOnly ? { ids: favoriteIds } : {})
        })
      );
      if (currentRequestId === requestId.current) {
        setProducts(result.items);
        setTotalProducts(result.total);
      }
    } catch (requestError) {
      if (currentRequestId === requestId.current) {
        setError(requestError instanceof Error ? requestError.message : "Erro inesperado.");
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [search, category, sort, page, favoritesOnly, favoriteIds]);

  useEffect(() => {
    if (favoritesLoaded) void loadProducts();
  }, [favoritesLoaded, loadProducts]);

  async function handleDelete(id: number) {
    if (!window.confirm("Deseja excluir este produto?")) return;

    try {
      await deleteProduct(id);
      setFavoriteIds((current) => current.filter((favoriteId) => favoriteId !== id));
      if (products.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await loadProducts();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível excluir.");
    }
  }

  function toggleFavorite(id: number) {
    setFavoriteIds((current) => current.includes(id)
      ? current.filter((favoriteId) => favoriteId !== id)
      : [...current, id]);
  }

  const visibleProducts = sortProducts(products, sort);
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const firstVisibleProduct = totalProducts === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastVisibleProduct = Math.min(page * PAGE_SIZE, totalProducts);

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CATÁLOGO</span>
          <h1>Produtos</h1>
          <p>Pesquise e consulte o estoque da loja.</p>
        </div>
        <span className="result-count">
          {firstVisibleProduct}–{lastVisibleProduct} de {totalProducts} produtos
        </span>
      </div>

      {isAdmin && (
        <form className="product-create-form" onSubmit={handleCreate}>
          <h2>Cadastrar produto</h2>
          <div className="product-create-form__grid">
            <label>Nome<input name="name" required minLength={2} maxLength={100} placeholder="Nome do produto" /></label>
            <label>Descrição<input name="description" required minLength={3} maxLength={500} placeholder="Descrição curta" /></label>
            <label>Categoria<select name="category" defaultValue="Jogos">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Preço<input name="price" type="number" min="0.01" step="0.01" required defaultValue="199.90" /></label>
            <label>Estoque<input name="stock" type="number" min="0" step="1" required defaultValue="10" /></label>
            <button className="button" disabled={creating}>{creating ? "Cadastrando..." : "Cadastrar produto"}</button>
          </div>
          {createMessage && <p className="form-success" role="status">{createMessage}</p>}
        </form>
      )}

      <div className="filters">
        <label>
          Buscar
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nome ou descrição do produto..." />
        </label>
        <label>
          Categoria
          <select value={category} onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}>
            <option value="">Todas</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Ordenar
          <select value={sort} onChange={(event) => {
            setSort(event.target.value);
            setPage(1);
          }}>
            <option value="name">Nome</option>
            <option value="price">Preço</option>
          </select>
        </label>
        <label>
          Exibir
          <select value={favoritesOnly ? "favorites" : "all"} onChange={(event) => {
            setFavoritesOnly(event.target.value === "favorites");
            setPage(1);
          }}>
            <option value="all">Todos os produtos</option>
            <option value="favorites">Favoritos ({favoriteIds.length})</option>
          </select>
        </label>
      </div>
      {categoriesError && <p className="form-error" role="alert">{categoriesError}</p>}
      {favoritesError && <p className="form-error" role="alert">{favoritesError}</p>}

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={loadProducts} /> : (
        <>
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onDelete={handleDelete}
                isFavorite={favoriteIds.includes(product.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
            {visibleProducts.length === 0 && <p>Nenhum produto encontrado.</p>}
          </div>
          {totalProducts > 0 && (
            <nav className="pagination" aria-label="Paginação do catálogo">
              <button className="button button--secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button className="button button--secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
