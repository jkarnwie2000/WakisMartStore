import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [portionId, setPortionId] = useState(null);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(null); // { label, quantity } after a successful add
  const addedRef = useRef(null);

  // After adding, bring the Continue shopping / View cart / Checkout box into view if it isn't fully visible.
  useEffect(() => {
    if (!justAdded || !addedRef.current) return;
    const r = addedRef.current.getBoundingClientRect();
    const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
    const fullyVisible = r.top >= header + 8 && r.bottom <= window.innerHeight - 8;
    if (!fullyVisible) {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      addedRef.current.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }, [justAdded]);

  useEffect(() => {
    setPortionId(product?.portions?.[0]?.id ?? null);
    setQty(1);
    setJustAdded(null);
  }, [product]);

  if (loading) return <Spinner label="Loading product…" />;
  if (error?.status === 404) return <div className="container page"><NotFoundState title="Product not found" message="This product may have been removed or is no longer available." /></div>;
  if (error) return <div className="container page"><ErrorState error={error} onRetry={reload} /></div>;

  const portion = product.portions?.find((p) => p.id === portionId) || null;
  const soldOut = product.availability === 'OUT_OF_STOCK' || product.availability === 'UNAVAILABLE';
  const inCart = quantityInCart(product.id);
  const maxQty = Math.max(0, product.inventory - inCart);
  const catPath = departmentPath(product.category.slug);
  // Return to the page the shopper came from (listing, search, deli…); if they landed here
  // directly (no in-app history), go to the product's department instead.
  const continueShopping = () => (location.key !== 'default' ? navigate(-1) : navigate(catPath));
  const add = () => {
    const quantity = Math.min(qty, maxQty);
    if (addToCart(product, { portion, quantity })) {
      setJustAdded({ label: portion ? `${product.name} (${portion.label})` : product.name, quantity });
    }
  };

  return (
    <div className="page container">
      <button type="button" className="back-link pdp__back" onClick={continueShopping}>
        <Icon name="arrowLeft" size={16} /> Continue shopping
      </button>
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
              onClick={add}
            >
              <Icon name="cart" size={18} /> {soldOut ? (product.isDeli ? 'Sold out today' : 'Out of stock') : maxQty === 0 ? 'All stock in cart' : 'Add to cart'}
            </button>
          </div>
          {justAdded ? (
            <div className="added-panel" role="status" ref={addedRef} key={`${justAdded.label}-${inCart}`}>
              <p className="added-panel__msg">
                <Icon name="check" size={18} strokeWidth={2.4} /> Added {justAdded.quantity > 1 ? `${justAdded.quantity} × ` : ''}
                {justAdded.label} to your cart
                <span className="added-panel__count">{inCart} of this item now in your cart</span>
              </p>
              <div className="added-panel__actions">
                <button type="button" className="btn btn--outline" onClick={continueShopping}>
                  <Icon name="arrowLeft" size={16} /> Continue shopping
                </button>
                <Link to="/cart" className="btn btn--outline">
                  <Icon name="cart" size={16} /> View cart
                </Link>
                <Link to="/checkout" className="btn btn--primary">
                  <Icon name="lock" size={16} /> Checkout
                </Link>
              </div>
            </div>
          ) : (
            inCart > 0 && (
              <p className="pdp__incart">
                <Icon name="check" size={16} /> {inCart} in your cart · <Link to="/cart">View cart</Link> · <Link to="/checkout">Checkout</Link>
              </p>
            )
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
