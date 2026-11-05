import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useStoreConfig } from '../context/StoreContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { QuantityStepper } from '../components/ProductBits.jsx';
import { Alert, EmptyState } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import { formatPrice, pluralize } from '../utils/format.js';

export function CartIssues({ issues }) {
  if (!issues?.length) return null;
  return (
    <Alert type="warning" title="Your cart was updated">
      <ul className="issue-list">
        {issues.map((i) => (
          <li key={`${i.key}-${i.type}`}>{i.message}</li>
        ))}
      </ul>
    </Alert>
  );
}

export default function CartPage() {
  useDocumentTitle('Shopping Cart');
  const navigate = useNavigate();
  const { items, count, subtotal, issues, refresh, refreshing, updateQuantity, removeItem, quantityInCart } = useCart();
  const { taxRate, delivery } = useStoreConfig();

  // Re-price the cart from the server whenever the cart page opens.
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  if (items.length === 0) {
    return (
      <div className="page container">
        <h1 className="page-title">Shopping cart</h1>
        <CartIssues issues={issues} />
        <EmptyState icon="cart" title="Your cart is empty" action={<Link to="/shop" className="btn btn--primary btn--lg">Start shopping</Link>}>
          <p>Browse 200+ African and Caribbean groceries, or pick something fresh from the deli.</p>
        </EmptyState>
      </div>
    );
  }

  const estTax = Math.round(subtotal * taxRate);
  const freeDeliveryGap = delivery.enabled && delivery.freeThresholdCents > 0 ? delivery.freeThresholdCents - subtotal : 0;

  return (
    <div className="page container">
      <h1 className="page-title">
        Shopping cart <span className="page-title__count">({pluralize(count, 'item')})</span>
      </h1>
      <CartIssues issues={issues} />

      <div className="cart-layout">
        <section aria-label="Cart items">
          <ul className="cart-lines">
            {items.map((item) => {
              const max = Math.max(1, Math.min(99, (item.inventory ?? 99) - quantityInCart(item.productId, item.key)));
              return (
                <li key={item.key} className="cart-line">
                  <Link to={`/product/${item.slug}`} className="cart-line__img">
                    <img src={item.image} alt="" width="96" height="96" loading="lazy" />
                  </Link>
                  <div className="cart-line__info">
                    <Link to={`/product/${item.slug}`} className="cart-line__name">
                      {item.name}
                    </Link>
                    {item.portionLabel && <p className="cart-line__portion">Portion: {item.portionLabel}</p>}
                    <p className="cart-line__unit">{formatPrice(item.unitPrice)} each</p>
                    {item.quantity >= max && <p className="cart-line__limit">Maximum available quantity</p>}
                  </div>
                  <div className="cart-line__qty">
                    <QuantityStepper value={item.quantity} onChange={(q) => updateQuantity(item.key, q)} max={max} size="sm" label={`Quantity of ${item.name}`} />
                    <button type="button" className="link-btn link-btn--danger" onClick={() => removeItem(item.key)} aria-label={`Remove ${item.name} from cart`}>
                      <Icon name="trash" size={16} /> Remove
                    </button>
                  </div>
                  <p className="cart-line__total">{formatPrice(item.unitPrice * item.quantity)}</p>
                </li>
              );
            })}
          </ul>
          <Link to="/shop" className="btn btn--outline">
            <Icon name="arrowLeft" size={16} /> Continue shopping
          </Link>
        </section>

        <aside className="summary" aria-labelledby="summary-title">
          <h2 id="summary-title" className="summary__title">
            Order summary
          </h2>
          <dl className="summary__rows">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            {taxRate > 0 && (
              <div>
                <dt>Estimated tax ({(taxRate * 100).toFixed(2).replace(/\.?0+$/, '')}%)</dt>
                <dd>{formatPrice(estTax)}</dd>
              </div>
            )}
            <div>
              <dt>Delivery</dt>
              <dd className="summary__muted">Calculated at checkout</dd>
            </div>
            <div className="summary__total">
              <dt>Estimated total</dt>
              <dd>{formatPrice(subtotal + estTax)}</dd>
            </div>
          </dl>
          {freeDeliveryGap > 0 && <p className="summary__note">Add {formatPrice(freeDeliveryGap)} more for free home delivery.</p>}
          <button type="button" className="btn btn--accent btn--lg btn--block" onClick={() => navigate('/checkout')} disabled={refreshing}>
            <Icon name="lock" size={18} /> Proceed to checkout
          </button>
          <p className="summary__secure">Prices and stock are confirmed by our server at checkout.</p>
        </aside>
      </div>
    </div>
  );
}
