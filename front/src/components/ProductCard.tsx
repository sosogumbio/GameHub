import type { ProductDTO } from "@/dto/ProductDTO";
import { formatCurrency } from "@/utils/formatCurrency";

interface ProductCardProps {
  product: ProductDTO;
  onDelete?: (id: number) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
}

export function ProductCard({ product, onDelete, isFavorite = false, onToggleFavorite }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-card__top">
        <span className="category-pill">{product.category}</span>
        <div className="product-card__actions">
          <span className={product.stock < 5 ? "stock stock--low" : "stock"}>
            Estoque: {product.stock}
          </span>
          {onToggleFavorite && (
            <button
              className={isFavorite ? "favorite-button favorite-button--active" : "favorite-button"}
              type="button"
              aria-label={isFavorite ? `Remover ${product.name} dos favoritos` : `Adicionar ${product.name} aos favoritos`}
              aria-pressed={isFavorite}
              onClick={() => onToggleFavorite(product.id)}
            >
              {isFavorite ? "★ Favorito" : "☆ Favoritar"}
            </button>
          )}
        </div>
      </div>
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <div className="product-card__bottom">
        <strong>{formatCurrency(product.price)}</strong>
        {onDelete && (
          <button className="button button--danger" onClick={() => onDelete(product.id)}>
            Excluir
          </button>
        )}
      </div>
    </article>
  );
}
