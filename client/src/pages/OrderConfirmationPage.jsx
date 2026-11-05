import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useStoreConfig } from '../context/StoreContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import OrderDetails from '../components/OrderDetails.jsx';
import { Alert, EmptyState, ErrorState, Spinner } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';

const MAX_POLLS = 15; // ~30 seconds

export default function OrderConfirmationPage() {
  useDocumentTitle('Order Confirmation');
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const { clearCart } = useCart();
  const { user } = useAuth();
  const { pickup, delivery } = useStoreConfig();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [polls, setPolls] = useState(0);
  const cleared = useRef(false);

  useEffect(() => {
    if (!sessionId) return undefined;
    let timer;
    let cancelled = false;
    const load = async (attempt) => {
      try {
        const { order: o } = await api.confirmation(sessionId);
        if (cancelled) return;
        setOrder(o);
        setPolls(attempt);
        // Payment confirmation arrives via Stripe webhook; poll briefly until it lands.
        if (o.paymentStatus !== 'PAID' && o.status === 'PENDING' && attempt < MAX_POLLS) {
          timer = setTimeout(() => load(attempt + 1), 2000);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      }
    };
    load(1);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  useEffect(() => {
    if (order?.paymentStatus === 'PAID' && !cleared.current) {
      cleared.current = true;
      clearCart();
    }
  }, [order, clearCart]);

  if (!sessionId) {
    return (
      <div className="page container">
        <EmptyState icon="receipt" title="No order to show" action={<Link to="/shop" className="btn btn--primary">Continue shopping</Link>}>
          <p>This page shows your order confirmation after checkout.</p>
        </EmptyState>
      </div>
    );
  }
  if (error) return <div className="page container"><ErrorState error={error} title="We couldn’t load your order" /></div>;
  if (!order) return <Spinner label="Loading your order…" />;

  const paid = order.paymentStatus === 'PAID';
  const failed = order.paymentStatus === 'FAILED' || order.status === 'CANCELLED';
  const stillWaiting = !paid && !failed;

  return (
    <div className="page container confirm-page">
      <section className={`confirm-hero ${paid ? 'is-paid' : failed ? 'is-failed' : 'is-pending'}`} aria-live="polite">
        <span className="confirm-hero__icon" aria-hidden="true">
          <Icon name={paid ? 'check' : failed ? 'close' : 'clock'} size={34} strokeWidth={2.4} />
        </span>
        {paid && (
          <>
            <h1 className="page-title">Thank you, {order.customerName.split(' ')[0]}! Your order is confirmed.</h1>
            <p>
              We’ve received your payment. A receipt from Stripe is on its way to <strong>{order.customerEmail}</strong>.
            </p>
          </>
        )}
        {stillWaiting && (
          <>
            <h1 className="page-title">We’re confirming your payment…</h1>
            <p>
              {polls >= MAX_POLLS
                ? 'Your payment is still being processed. This page will show the final status once Stripe confirms it — you can safely refresh in a minute.'
                : 'This usually takes just a few seconds. Please keep this page open.'}
            </p>
            {polls < MAX_POLLS && <Spinner inline label="Waiting for payment confirmation" />}
          </>
        )}
        {failed && (
          <>
            <h1 className="page-title">Payment was not completed</h1>
            <p>Your payment did not go through, so this order was not placed. Your card has not been charged for it.</p>
            <Link to="/cart" className="btn btn--primary">
              Return to cart
            </Link>
          </>
        )}
      </section>

      {paid && (
        <Alert type="info" title={order.fulfillmentMethod === 'PICKUP' ? 'Store pickup' : 'Home delivery'}>
          {order.fulfillmentMethod === 'PICKUP' ? pickup.instructions : delivery.note}
        </Alert>
      )}

      <OrderDetails order={order} />

      <div className="confirm-actions">
        <Link to="/shop" className="btn btn--primary">
          Continue shopping
        </Link>
        {user && (
          <Link to="/account" className="btn btn--outline">
            View order history
          </Link>
        )}
      </div>
    </div>
  );
}
