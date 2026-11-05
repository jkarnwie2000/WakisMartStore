import { formatPrice, AVAILABILITY_LABELS, ORIGIN_LABELS } from '../utils/format.js';
import Icon from './Icon.jsx';

export function Price({ price, compareAtPrice, from = false, size = 'md' }) {
  const onSale = compareAtPrice && compareAtPrice > price;
  return (
    <span className={`price price--${size}`}>
      {from && <span className="price__from">from </span>}
      <span className={`price__now ${onSale ? 'price__now--sale' : ''}`}>{formatPrice(price)}</span>
      {onSale && (
        <>
          <span className="visually-hidden">, was </span>
          <s className="price__was">{formatPrice(compareAtPrice)}</s>
        </>
      )}
    </span>
  );
}

export function AvailabilityBadge({ availability, inventory, isDeli }) {
  const label =
    availability === 'LOW_STOCK'
      ? `Only ${inventory} left`
      : availability === 'OUT_OF_STOCK' && isDeli
        ? 'Sold out today'
        : AVAILABILITY_LABELS[availability];
  return <span className={`stock stock--${availability.toLowerCase().replace(/_/g, '-')}`}>{label}</span>;
}

export function ProductBadges({ product }) {
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  return (
    <div className="badges">
      {product.isDeli && (
        <span className="badge badge--deli">
          <Icon name="flame" size={13} /> Fresh deli
        </span>
      )}
      {onSale && <span className="badge badge--sale">Special</span>}
      {product.featured && !product.isDeli && !onSale && <span className="badge badge--featured">Featured</span>}
    </div>
  );
}

export function OriginTag({ origin }) {
  if (!origin) return null;
  return <span className={`origin origin--${origin.toLowerCase()}`}>{ORIGIN_LABELS[origin]}</span>;
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, label = 'Quantity', size = 'md' }) {
  const clamp = (n) => Math.max(min, Math.min(max, n));
  return (
    <div className={`stepper stepper--${size}`} role="group" aria-label={label}>
      <button type="button" className="stepper__btn" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label="Decrease quantity">
        <Icon name="minus" size={16} />
      </button>
      <input
        className="stepper__input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(clamp(n));
        }}
      />
      <button type="button" className="stepper__btn" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="Increase quantity">
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

export function PortionPicker({ portions, value, onChange, name, compact = false }) {
  if (!portions?.length) return null;
  return (
    <fieldset className={`portions ${compact ? 'portions--compact' : ''}`}>
      <legend className="portions__legend">Portion size</legend>
      <div className="portions__options">
        {portions.map((p) => (
          <label key={p.id} className={`portion ${value === p.id ? 'portion--active' : ''}`}>
            <input type="radio" name={name} value={p.id} checked={value === p.id} onChange={() => onChange(p.id)} className="visually-hidden" />
            <span className="portion__label">{p.label}</span>
            <span className="portion__price">{formatPrice(p.price)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
