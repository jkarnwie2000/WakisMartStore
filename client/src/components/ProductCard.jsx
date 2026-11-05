import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Price, ProductBadges, AvailabilityBadge } from './ProductBits.jsx';
import { useAddToCart } from '../hooks/useAddToCart.js';

export default function ProductCard({ product }) {
  const addToCart = useAddToCart();
  const hasPortions = product.portions?.length > 0;
  const [portionId, setPortionId] = useState(hasPortions ? product.portions[0].id : null);
  const portion = hasPortions ? product.portions.find((p) => p.id === portionId) : null;
  const soldOut = product.availability === 'OUT_OF_STOCK' || product.availability === 'UNAVAILABLE';
  const href = `/product/${product.slug}`;

  return (
    <article className={`card ${product.isDeli ? 'card--deli' : ''} ${soldOut ? 'card--soldout' : ''}`}>
      <Link to={href} className="card__media" tabIndex={-1} aria-hidden="true">
        <img src={product.image} alt="" loading="lazy" decoding="async" width="600" height="600" />
        <ProductBadges product={product} />
      </Link>
      <div className="card__body">
        <p className="card__brand">{product.brand}</p>
        <h3 className="card__title">
          <Link to={href}>{product.name}</Link>
        </h3>
        <p className="card__unit">{product.unit}</p>

        {hasPortions && (
          <label className="card__portion">
            <span className="visually-hidden">Portion size for {product.name}</span>
            <select value={portionId ?? ''} onChange={(e) => setPortionId(Number(e.target.value))} disabled={soldOut}>
              {product.portions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="card__footer">
          <div>
            <Price price={portion?.price ?? product.price} compareAtPrice={hasPortions ? null : product.compareAtPrice} />
            <AvailabilityBadge availability={product.availability} inventory={product.inventory} isDeli={product.isDeli} />
          </div>
          <button
            type="button"
            className="btn btn--primary btn--icon card__add"
            onClick={() => addToCart(product, { portion })}
            disabled={soldOut}
            aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name}${portion ? `, ${portion.label},` : ''} to cart`}
          >
            <Icon name={soldOut ? 'close' : 'plus'} size={18} />
            <span className="card__add-label">{soldOut ? 'Sold out' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
