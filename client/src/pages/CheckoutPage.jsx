import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useStoreConfig } from '../context/StoreContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import FormField from '../components/FormField.jsx';
import { Alert, Spinner } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import { CartIssues } from './CartPage.jsx';
import { formatPrice } from '../utils/format.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(form) {
  const e = {};
  if (form.name.trim().length < 2) e.name = 'Please enter your full name.';
  if (!EMAIL_RE.test(form.email.trim())) e.email = 'Please enter a valid email address.';
  if (form.phone && !/^[0-9+()\-.\s]{7,30}$/.test(form.phone.trim())) e.phone = 'Please enter a valid phone number.';
  if (form.method === 'DELIVERY') {
    if (form.line1.trim().length < 3) e.line1 = 'Street address is required.';
    if (form.city.trim().length < 2) e.city = 'City is required.';
    if (form.state.trim().length < 2) e.state = 'State / region is required.';
    if (form.postalCode.trim().length < 3) e.postalCode = 'Postal code is required.';
  }
  return e;
}

export default function CheckoutPage() {
  useDocumentTitle('Checkout');
  const [params, setParams] = useSearchParams();
  const { items, refresh, issues, setIssues } = useCart();
  const { user } = useAuth();
  const config = useStoreConfig();
  const { delivery, pickup, payments } = config;

  const defaultMethod = pickup.enabled || !delivery.enabled ? 'PICKUP' : 'DELIVERY';
  const [form, setForm] = useState({
    name: '', email: '', phone: '', method: defaultMethod, line1: '', line2: '', city: '', state: '', postalCode: '', notes: '',
  });
  const [errors, setErrors] = useState({});
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [cancelledNotice, setCancelledNotice] = useState(params.get('cancelled') === '1');
  const prefilled = useRef(false);

  // Prefill from the signed-in customer's profile (once).
  useEffect(() => {
    if (!user || prefilled.current) return;
    prefilled.current = true;
    setForm((f) => ({
      ...f,
      name: f.name || user.name || '',
      email: f.email || user.email || '',
      phone: f.phone || user.phone || '',
      line1: f.line1 || user.address?.line1 || '',
      line2: f.line2 || user.address?.line2 || '',
      city: f.city || user.address?.city || '',
      state: f.state || user.address?.state || '',
      postalCode: f.postalCode || user.address?.postalCode || '',
    }));
  }, [user]);

  // Make sure the method stays valid once the store config loads.
  useEffect(() => {
    if (!config.loaded) return;
    setForm((f) => {
      if (f.method === 'DELIVERY' && !delivery.enabled && pickup.enabled) return { ...f, method: 'PICKUP' };
      if (f.method === 'PICKUP' && !pickup.enabled && delivery.enabled) return { ...f, method: 'DELIVERY' };
      return f;
    });
  }, [config.loaded, delivery.enabled, pickup.enabled]);

  // Returning from Stripe via "back": release the abandoned pending order.
  useEffect(() => {
    const orderNumber = params.get('order');
    if (params.get('cancelled') === '1' && orderNumber) {
      api.cancelCheckout(orderNumber).catch(() => {});
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const cartPayload = useMemo(() => items.map(({ productId, portionId, quantity }) => ({ productId, portionId, quantity })), [items]);
  const cartKey = JSON.stringify(cartPayload);

  // Server-side quote: authoritative prices, tax and delivery fee.
  useEffect(() => {
    if (!cartPayload.length) return undefined;
    let cancelled = false;
    setQuoteError(null);
    api
      .quote(cartPayload, form.method)
      .then((q) => !cancelled && setQuote(q))
      .catch((err) => !cancelled && setQuoteError(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, form.method]);

  // Apply any price/stock corrections from the quote to the cart itself.
  useEffect(() => {
    if (quote?.issues?.length) refresh().catch(() => {});
  }, [quote, refresh]);

  if (!items.length && !submitting) return <Navigate to="/cart" replace />;

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const { url } = await api.createCheckoutSession({
        items: cartPayload,
        customer: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
        fulfillment: {
          method: form.method,
          ...(form.method === 'DELIVERY' && {
            address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, postalCode: form.postalCode },
          }),
        },
        notes: form.notes,
      });
      window.location.assign(url); // Redirect to Stripe-hosted Checkout
    } catch (err) {
      setSubmitting(false);
      if (err.status === 409 && err.data?.details?.issues) {
        setIssues(err.data.details.issues);
        await refresh().catch(() => {});
        setSubmitError('Some items in your cart changed (price or stock). Please review the updated summary and try again.');
      } else if (err.status === 400 && err.data?.details) {
        const fieldMap = { 'customer.name': 'name', 'customer.email': 'email', 'customer.phone': 'phone', 'fulfillment.address.line1': 'line1', 'fulfillment.address.city': 'city', 'fulfillment.address.state': 'state', 'fulfillment.address.postalCode': 'postalCode' };
        const fe = {};
        for (const d of err.data.details) if (fieldMap[d.field]) fe[fieldMap[d.field]] = d.message;
        setErrors(fe);
        setSubmitError(err.message);
      } else {
        setSubmitError(err.message);
      }
    }
  };

  const totals = quote?.totals;
  const lines = quote?.lines || [];

  return (
    <div className="page container">
      <Link to="/cart" className="back-link">
        <Icon name="arrowLeft" size={16} /> Back to cart
      </Link>
      <h1 className="page-title">Checkout</h1>

      {cancelledNotice && (
        <Alert type="info" title="Payment cancelled">
          No payment was taken. Your cart has been saved — you can review it and try again whenever you’re ready.{' '}
          <button type="button" className="link-btn" onClick={() => setCancelledNotice(false)}>
            Dismiss
          </button>
        </Alert>
      )}
      {config.loaded && !payments.stripeConfigured && (
        <Alert type="warning" title="Online payments are not configured">
          The store owner needs to add Stripe API keys to the server before orders can be paid online.
        </Alert>
      )}
      <CartIssues issues={issues} />

      <form className="checkout-layout" onSubmit={onSubmit} noValidate>
        <div className="checkout-main">
          <fieldset className="panel">
            <legend className="panel__title">
              <span className="step">1</span> Contact details
            </legend>
            {!user && (
              <p className="panel__hint">
                Checking out as a guest. <Link to="/login?next=/checkout">Sign in</Link> to save this order to your account.
              </p>
            )}
            <div className="form-grid">
              <FormField label="Full name" required value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" className="span-2" />
              <FormField label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" hint="We’ll send your Stripe receipt here." />
              <FormField label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" hint="So we can reach you about your order." />
            </div>
          </fieldset>

          <fieldset className="panel">
            <legend className="panel__title">
              <span className="step">2</span> Delivery or pickup
            </legend>
            <div className="fulfil-options">
              <label className={`fulfil ${form.method === 'PICKUP' ? 'is-active' : ''} ${!pickup.enabled ? 'is-disabled' : ''}`}>
                <input type="radio" name="method" value="PICKUP" checked={form.method === 'PICKUP'} onChange={set('method')} disabled={!pickup.enabled} />
                <Icon name="store" size={26} />
                <span className="fulfil__text">
                  <strong>Store pickup</strong>
                  <span>{pickup.enabled ? 'Free' : 'Currently unavailable'}</span>
                </span>
              </label>
              <label className={`fulfil ${form.method === 'DELIVERY' ? 'is-active' : ''} ${!delivery.enabled ? 'is-disabled' : ''}`}>
                <input type="radio" name="method" value="DELIVERY" checked={form.method === 'DELIVERY'} onChange={set('method')} disabled={!delivery.enabled} />
                <Icon name="truck" size={26} />
                <span className="fulfil__text">
                  <strong>Home delivery</strong>
                  <span>
                    {!delivery.enabled
                      ? 'Currently unavailable'
                      : delivery.freeThresholdCents > 0
                        ? `${formatPrice(delivery.feeCents)} · free over ${formatPrice(delivery.freeThresholdCents)}`
                        : formatPrice(delivery.feeCents)}
                  </span>
                </span>
              </label>
            </div>
            <p className="panel__hint">{form.method === 'PICKUP' ? pickup.instructions : delivery.note}</p>
            {form.method === 'PICKUP' && config.store.address && (
              <p className="panel__hint">
                <Icon name="pin" size={16} /> Pickup location: {config.store.address}
              </p>
            )}

            {form.method === 'DELIVERY' && (
              <div className="form-grid">
                <FormField label="Street address" required value={form.line1} onChange={set('line1')} error={errors.line1} autoComplete="address-line1" className="span-2" />
                <FormField label="Apartment, suite, etc." value={form.line2} onChange={set('line2')} autoComplete="address-line2" className="span-2" />
                <FormField label="City" required value={form.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" />
                <FormField label="State / region" required value={form.state} onChange={set('state')} error={errors.state} autoComplete="address-level1" />
                <FormField label="Postal code" required value={form.postalCode} onChange={set('postalCode')} error={errors.postalCode} autoComplete="postal-code" />
              </div>
            )}
            <FormField label="Order notes (optional)" as="textarea" rows={3} maxLength={500} value={form.notes} onChange={set('notes')} placeholder="Gate code, substitutions, spice level for deli items…" />
          </fieldset>

          <section className="panel">
            <h2 className="panel__title">
              <span className="step">3</span> Billing &amp; payment
            </h2>
            <p className="panel__hint">
              <Icon name="lock" size={16} /> After you continue, you’ll enter your billing address and card (or another payment method enabled by the
              store) on Stripe’s secure checkout page. Wakis Mart never sees or stores your card details.
            </p>
          </section>
        </div>

        <aside className="summary" aria-labelledby="checkout-summary">
          <h2 id="checkout-summary" className="summary__title">
            Order summary
          </h2>
          {!quote && !quoteError && <Spinner inline label="Calculating totals…" />}
          {quoteError && <Alert type="error">{quoteError.message}</Alert>}
          {quote && (
            <>
              <ul className="summary__lines">
                {lines.map((l) => (
                  <li key={l.key}>
                    <img src={l.image} alt="" width="48" height="48" />
                    <span className="summary__line-name">
                      {l.name}
                      {l.portionLabel && <small>{l.portionLabel}</small>}
                      <small>Qty {l.quantity}</small>
                    </span>
                    <span>{formatPrice(l.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="summary__rows">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(totals.subtotal)}</dd>
                </div>
                {totals.taxRate > 0 && (
                  <div>
                    <dt>Tax ({(totals.taxRate * 100).toFixed(2).replace(/\.?0+$/, '')}%)</dt>
                    <dd>{formatPrice(totals.tax)}</dd>
                  </div>
                )}
                <div>
                  <dt>{form.method === 'DELIVERY' ? 'Delivery' : 'Store pickup'}</dt>
                  <dd>{totals.deliveryFee ? formatPrice(totals.deliveryFee) : 'Free'}</dd>
                </div>
                <div className="summary__total">
                  <dt>Total</dt>
                  <dd>{formatPrice(totals.total)}</dd>
                </div>
              </dl>
            </>
          )}
          {submitError && <Alert type="error">{submitError}</Alert>}
          <button type="submit" className="btn btn--accent btn--lg btn--block" disabled={submitting || !quote || !payments.stripeConfigured}>
            {submitting ? <Spinner inline label="Redirecting to Stripe…" /> : <><Icon name="lock" size={18} /> Continue to secure payment</>}
          </button>
          <p className="summary__secure">
            <Icon name="lock" size={14} /> Payments processed securely by Stripe
          </p>
        </aside>
      </form>
    </div>
  );
}
