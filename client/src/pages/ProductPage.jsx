import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useAddToCart } from '../hooks/useAddToCart.js';
import { useCart } from '../context/CartContext.jsx';
import { Breadcrumbs, SectionHeader } from '../components/Section.jsx';
import { ErrorState, NotFoundState, Spinner } from '../components/Feedback.jsx';
import { Price, AvailabilityBadge, ProductBadges, PortionPicker, QuantityStepper, OriginTag } from '../components/ProductBits.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import Icon from '../components/Icon.jsx';
import { departmentPath } from '../utils/departments.js';
import { ORIGIN_LABELS } from '../utils/format.js';
import { useStoreConfig } from '../context/StoreContext.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const { data, error, loading, reload } = useAsync((signal) => api.product(slug, signal), [slug]);
  const product = data?.product;
  useDocumentTitle(product?.name || 'Product');
  const addToCart = useAddToCart();
  const { quantityInCart } = useCart();
  const { delivery, pickup } = useStoreConfig();
  const [portionId, setPortionId] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setPortionId(product?.portions?.[0]?.id ?? null);
    setQty(1);
  }, [product]);

  if (loading) return <Spinner label="Loading product…" />;
  if (error?.status === 404) return <div className="container page"><NotFoundState title="Product not found" message="This product may have been removed or is no longer available." /></div>;
  if (error) return <div className="container page"><ErrorState error={error} onRetry={reload} /></div>;

  const portion = product.portions?.find((p) => p.id === portionId) || null;
  const soldOut = product.availability === 'OUT_OF_STOCK' || product.availability === 'UNAVAILABLE';
  const inCart = quantityInCart(product.id);
  const maxQty = Math.max(0, product.inventory - inCart);
  const catPath = departmentPath(product.category.slug);

  return (
    <div className="page container">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: product.category.name, to: catPath },
          ...(product.subcategory
            ? [{ label: product.subcategory, to: `${product.isDeli ? '/deli/all' : catPath}?subcategory=${encodeURIComponent(product.subcategory)}` }]
            : []),
          { label: product.name },
        ]}
      />
      <div className="pdp">
        <div className="pdp__media">
          <img src={product.image} alt={product.name} width="600" height="600" />
          <ProductBadges product={product} />
        </div>
        <div className="pdp__info">
          <p className="pdp__brand">{product.brand}</p>
          <h1 className="pdp__title">{product.name}</h1>
          <div className="pdp__meta">
            <OriginTag origin={product.origin} />
            <AvailabilityBadge availability={product.availability} inventory={product.inventory} isDeli={product.isDeli} />
            {product.unit && <span className="pdp__unit">{product.unit}</span>}
          </div>
          <div className="pdp__price">
            <Price price={portion?.price ?? product.price} compareAtPrice={portion ? null : product.compareAtPrice} size="lg" />
          </div>
          <p className="pdp__desc">{product.description}</p>

          {product.portions?.length > 0 && <PortionPicker portions={product.portions} value={portionId} onChange={setPortionId} name="pdp-portion" />}

          <div className="pdp__buy">
            {!soldOut && maxQty > 0 && <QuantityStepper value={Math.min(qty, maxQty)} onChange={setQty} max={maxQty} label={`Quantity of ${product.name}`} />}
            <button
              type="button"
              className="btn btn--accent btn--lg"
              disabled={soldOut || maxQty === 0}
              onClick={() => addToCart(product, { portion, quantity: Math.min(qty, maxQty) })}
            >
              <Icon name="cart" size={18} /> {soldOut ? (product.isDeli ? 'Sold out today' : 'Out of stock') : maxQty === 0 ? 'All stock in cart' : 'Add to cart'}
            </button>
          </div>
          {inCart > 0 && (
            <p className="pdp__incart">
              <Icon name="check" size={16} /> {inCart} in your cart · <Link to="/cart">View cart</Link>
            </p>
          )}

          <ul className="pdp__assurances">
            {delivery.enabled && (
              <li>
                <Icon name="truck" size={18} /> Home delivery available at checkout
              </li>
            )}
            {pickup.enabled && (
              <li>
                <Icon name="store" size={18} /> Free store pickup
              </li>
            )}
            <li>
              <Icon name="lock" size={18} /> Secure payment with Stripe
            </li>
          </ul>

          <dl className="pdp__specs">
            <div>
              <dt>Department</dt>
              <dd>
                <Link to={catPath}>{product.category.name}</Link>
              </dd>
            </div>
            {product.subcategory && (
              <div>
                <dt>Type</dt>
                <dd>{product.subcategory}</dd>
              </div>
            )}
            <div>
              <dt>Brand</dt>
              <dd>{product.brand}</dd>
            </div>
            <div>
              <dt>Origin</dt>
              <dd>{ORIGIN_LABELS[product.origin]}</dd>
            </div>
            <div>
              <dt>SKU</dt>
              <dd>{product.sku}</dd>
            </div>
          </dl>
        </div>
      </div>

      {data.related.length > 0 && (
        <section className="section" aria-labelledby="related-title">
          <SectionHeader title="You may also like" id="related-title" linkTo={catPath} linkLabel={`More ${product.category.name}`} />
          <ProductGrid products={data.related} />
        </section>
      )}
    </div>
  );
}
