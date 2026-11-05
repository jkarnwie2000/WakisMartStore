import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useAddToCart } from '../hooks/useAddToCart.js';
import { Breadcrumbs } from '../components/Section.jsx';
import { ErrorState, Spinner } from '../components/Feedback.jsx';
import { PortionPicker, QuantityStepper, AvailabilityBadge, OriginTag } from '../components/ProductBits.jsx';
import Icon from '../components/Icon.jsx';
import { formatPrice } from '../utils/format.js';
import { useCart } from '../context/CartContext.jsx';

const TABS = [
  { id: 'all', label: 'Full menu' },
  { id: 'AFRICAN', label: 'African kitchen' },
  { id: 'CARIBBEAN', label: 'Caribbean kitchen' },
  { id: 'sides', label: 'Sides & swallows' },
];

function DeliMenuItem({ item, featured = false }) {
  const addToCart = useAddToCart();
  const { quantityInCart } = useCart();
  const [portionId, setPortionId] = useState(item.portions?.[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const portion = item.portions?.find((p) => p.id === portionId) || null;
  const soldOut = item.availability === 'OUT_OF_STOCK' || item.availability === 'UNAVAILABLE';
  const maxQty = Math.max(1, item.inventory - quantityInCart(item.id));

  return (
    <article className={`deli-item ${featured ? 'deli-item--featured' : ''} ${soldOut ? 'deli-item--soldout' : ''}`}>
      <Link to={`/product/${item.slug}`} className="deli-item__media">
        <img src={item.image} alt={item.name} loading="lazy" width="600" height="600" />
      </Link>
      <div className="deli-item__body">
        <div className="deli-item__head">
          <h3 className="deli-item__name">
            <Link to={`/product/${item.slug}`}>{item.name}</Link>
          </h3>
          <span className="deli-item__price">{formatPrice(portion?.price ?? item.price)}</span>
        </div>
        <div className="deli-item__meta">
          <OriginTag origin={item.origin} />
          <AvailabilityBadge availability={item.availability} inventory={item.inventory} isDeli />
        </div>
        <p className="deli-item__desc">{item.description}</p>
        <PortionPicker portions={item.portions} value={portionId} onChange={setPortionId} name={`portion-${item.id}`} compact />
        <div className="deli-item__actions">
          <QuantityStepper value={Math.min(qty, maxQty)} onChange={setQty} max={maxQty} size="sm" label={`Quantity of ${item.name}`} />
          <button type="button" className="btn btn--accent" disabled={soldOut} onClick={() => addToCart(item, { portion, quantity: Math.min(qty, maxQty) })}>
            {soldOut ? 'Sold out today' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function DeliPage() {
  useDocumentTitle('Deli & Prepared Foods');
  const [tab, setTab] = useState('all');
  const { data, error, loading, reload } = useAsync((signal) => api.products({ category: 'deli', limit: 100, sort: 'featured' }, signal), []);

  const items = useMemo(() => data?.products || [], [data]);
  const chefsPicks = items.filter((i) => i.featured && i.availability !== 'OUT_OF_STOCK').slice(0, 3);
  const filtered = items.filter((i) => {
    if (tab === 'all') return true;
    if (tab === 'sides') return i.subcategory === 'Sides' || i.subcategory === 'Swallows';
    return i.origin === tab && i.subcategory !== 'Sides' && i.subcategory !== 'Swallows';
  });

  return (
    <div className="page deli-page">
      <section className="deli-hero">
        <div className="container deli-hero__inner">
          <div>
            <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Deli & Prepared Foods' }]} />
            <p className="eyebrow eyebrow--light">
              <Icon name="flame" size={16} /> Wakis Mart Deli Counter
            </p>
            <h1 className="deli-hero__title">Cooked fresh, the way home does it.</h1>
            <p className="deli-hero__text">
              Party jollof, egusi and pepper soup from West Africa; jerk chicken, curry goat and oxtail from the islands. Choose your portion, add
              sides and swallows, and collect or have it delivered with your groceries.
            </p>
          </div>
          <ul className="deli-hero__facts">
            <li>
              <strong>{items.length || '25+'}</strong> dishes on the menu
            </li>
            <li>
              <strong>Daily</strong> portions — when they’re gone, they’re gone
            </li>
          </ul>
        </div>
      </section>

      {loading && <Spinner label="Loading the deli menu…" />}
      {error && (
        <div className="container section">
          <ErrorState error={error} onRetry={reload} />
        </div>
      )}

      {!loading && !error && (
        <>
          {chefsPicks.length > 0 && (
            <section className="container section" aria-labelledby="picks-title">
              <h2 id="picks-title" className="section-title">
                <Icon name="star" size={20} /> Chef’s recommendations
              </h2>
              <div className="deli-picks">
                {chefsPicks.map((i) => (
                  <DeliMenuItem key={i.id} item={i} featured />
                ))}
              </div>
            </section>
          )}

          <section className="container section deli-menu" aria-labelledby="menu-title">
            <div className="deli-menu__head">
              <h2 id="menu-title" className="section-title">
                The menu
              </h2>
              <div className="tabs" role="tablist" aria-label="Deli menu sections">
                {TABS.map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="deli-list" role="tabpanel" aria-label={TABS.find((t) => t.id === tab).label}>
              {filtered.map((i) => (
                <DeliMenuItem key={i.id} item={i} />
              ))}
            </div>
            <p className="deli-note">
              Allergen information: our deli kitchen handles peanuts, shellfish, fish, wheat, egg and dairy. Please ask our team before ordering if
              you have an allergy.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
