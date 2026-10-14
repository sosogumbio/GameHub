"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ProductCard } from "@/components/ProductCard";
import type { ProductDTO } from "@/dto/ProductDTO";
import { getProducts } from "@/fetch/productRequests";

const PAGE_SIZE = 24;

function isProductIdList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(
    (id: unknown) => Number.isSafeInteger(id) && Number(id) > 0
  );
}

export function FavoritesPage() {
  const [favoriteIds, setFavoriteIds] = useState<number[] | null>(null);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("gamehub-favorites");
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (!isProductIdList(parsed)) {
        throw new Error("A lista salva de favoritos está inválida.");
      }
      setFavoriteIds([...new Set(parsed)]);
    } catch (loadError) {
      setStorageError(loadError instanceof Error
        ? loadError.message
        : "Não foi possível carregar os favoritos salvos.");
      setFavoriteIds([]);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    if (favoriteIds === null) return;
    const currentRequestId = ++requestId.current;

    if (favoriteIds.length === 0) {
      setProducts([]);
      setTotalProducts(0);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await getProducts({
        ids: favoriteIds,
        sort,
        page,
        pageSize: PAGE_SIZE
      });
      if (currentRequestId === requestId.current) {
        setProducts(result.items);
        setTotalProducts(result.total);
      }
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        setError(loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os favoritos.");
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [favoriteIds, page, sort]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  function removeFavorite(id: number) {
    if (favoriteIds === null) return;
    const updatedFavorites = favoriteIds.filter((favoriteId) => favoriteId !== id);
    setFavoriteIds(updatedFavorites);
    try {
      window.localStorage.setItem("gamehub-favorites", JSON.stringify(updatedFavorites));
      setStorageError("");
    } catch (saveError) {
      setStorageError(saveError instanceof Error
        ? saveError.message
        : "Não foi possível atualizar os favoritos salvos.");
    }
    if (products.length === 1 && page > 1) {
      setPage((currentPage) => currentPage - 1);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const firstVisibleProduct = totalProducts === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastVisibleProduct = Math.min(page * PAGE_SIZE, totalProducts);

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SUA COLEÇÃO</span>
          <h1>Favoritos</h1>
          <p>Reúna aqui os produtos que você quer acompanhar.</p>
        </div>
        <span className="result-count">
          {firstVisibleProduct}–{lastVisibleProduct} de {totalProducts} produtos
        </span>
      </div>

      {storageError && <p className="form-error" role="alert">{storageError}</p>}
      <div className="favorites-toolbar">
        <p>{favoriteIds?.length ?? 0} produtos salvos</p>
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
      </div>

      {favoriteIds === null || loading ? <LoadingState /> : error ? (
        <ErrorState message={error} onRetry={loadFavorites} />
      ) : products.length === 0 ? (
        <div className="favorites-empty state-message">
          <p>Você ainda não tem produtos favoritos.</p>
          <Link className="button" href="/products">Explorar produtos</Link>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite
                onToggleFavorite={removeFavorite}
              />
            ))}
          </div>
          {totalProducts > 0 && (
            <nav className="pagination" aria-label="Paginação dos favoritos">
              <button
                className="button button--secondary"
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
              >
                Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button
                className="button button--secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
