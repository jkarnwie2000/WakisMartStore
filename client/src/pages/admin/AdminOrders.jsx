import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import OrderDetails, { StatusPill } from '../../components/OrderDetails.jsx';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import { formatDate, formatPrice, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../../utils/format.js';

export function AdminOrders() {
  useDocumentTitle('Orders');
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  const status = params.get('status') || '';
  const paymentStatus = params.get('paymentStatus') || '';
  useEffect(() => {
    setPage(1);
  }, [q, status, paymentStatus]);

  const { data, error, loading, reload } = useAsync((signal) => api.admin.orders({ status, paymentStatus, search: q, page }, signal), [status, paymentStatus, q, page]);
  const setFilter = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div className="admin-page">
      <div className="admin-head">
        <h1>Orders</h1>
        <button type="button" className="btn btn--outline" onClick={reload}>
          Refresh
        </button>
      </div>
      <div className="admin-filters">
        <label className="admin-filters__search">
          <Icon name="search" size={16} />
          <span className="visually-hidden">Search orders</span>
          <input type="search" placeholder="Order number, name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          <span className="visually-hidden">Order status</span>
          <select value={status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All order statuses</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="visually-hidden">Payment status</span>
          <select value={paymentStatus} onChange={(e) => setFilter('paymentStatus', e.target.value)}>
            <option value="">All payment statuses</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : data.orders.length === 0 ? (
        <EmptyState icon="receipt" title="No orders found" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Date</th>
                  <th scope="col">Fulfilment</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/admin/orders/${o.id}`} className="strong-link">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td>
                      {o.customerName}
                      <small className="block muted">{o.customerEmail}</small>
                    </td>
                    <td>{formatDate(o.createdAt, true)}</td>
                    <td>{o.fulfillmentMethod === 'DELIVERY' ? 'Delivery' : 'Pickup'}</td>
                    <td>
                      <StatusPill status={o.paymentStatus} kind="payment" />
                    </td>
                    <td>
                      <StatusPill status={o.status} />
                    </td>
                    <td className="num">{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <nav className="pagination" aria-label="Order pages">
              <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span>
                Page {data.page} of {data.pages}
              </span>
              <button type="button" className="btn btn--outline btn--sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

/** Stripe refund form: full or partial amount, optional restock (full refunds only). */
function RefundPanel({ order, refundable, onDone }) {
  const { notify } = useToast();
  const [mode, setMode] = useState('full');
  const [amount, setAmount] = useState('');
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const cents = mode === 'full' ? refundable : Math.round(Number(amount) * 100);
    if (!cents || cents < 1 || cents > refundable) {
      notify(`Enter an amount between $0.01 and ${formatPrice(refundable)}.`, { type: 'error' });
      return;
    }
    const msg = `Refund ${formatPrice(cents)} to ${order.customerName}'s original payment method${mode === 'full' ? ' and cancel the order' : ''}? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const r = await api.admin.refundOrder(order.id, {
        ...(mode === 'partial' && { amount: cents / 100 }),
        restock: mode === 'full' && restock,
        reason,
      });
      onDone(r.order);
      notify(r.message);
      setAmount('');
      setReason('');
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="order-block refund" onSubmit={submit}>
      <h3>Refund</h3>
      <p className="muted">Up to {formatPrice(refundable)} can be refunded through Stripe.</p>
      <div className="refund__modes" role="radiogroup" aria-label="Refund amount">
        <label className="check">
          <input type="radio" name="refund-mode" checked={mode === 'full'} onChange={() => setMode('full')} /> <span>Full refund ({formatPrice(refundable)})</span>
        </label>
        <label className="check">
          <input type="radio" name="refund-mode" checked={mode === 'partial'} onChange={() => setMode('partial')} /> <span>Partial refund</span>
        </label>
      </div>
      {mode === 'partial' && (
        <label className="refund__amount">
          <span>Amount ($)</span>
          <input type="number" min="0.01" step="0.01" max={(refundable / 100).toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
      )}
      {mode === 'full' && (
        <label className="check">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> <span>Put the items back in stock</span>
        </label>
      )}
      <label className="refund__amount">
        <span>Reason (for the activity log)</span>
        <input type="text" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. item out of stock" />
      </label>
      <button type="submit" className="btn btn--outline btn--sm refund__btn" disabled={busy}>
        {busy ? 'Refunding…' : 'Issue refund'}
      </button>
    </form>
  );
}

const NEXT_STATUSES = {
  PICKUP: ['PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'],
  DELIVERY: ['PAID', 'PROCESSING', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
};

export function AdminOrderDetail() {
  const { id } = useParams();
  const { notify } = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api.admin.order(id), [id]);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  useDocumentTitle(data ? `Order ${data.order.orderNumber}` : 'Order');

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const order = data.order;
  const options = order.paymentStatus === 'PAID' ? NEXT_STATUSES[order.fulfillmentMethod] : ['PENDING', 'CANCELLED'];

  const update = async (status) => {
    if (status === 'CANCELLED' && order.paymentStatus === 'PAID' && !window.confirm('Cancel this paid order? Remember to issue any refund from your Stripe dashboard.')) return;
    setSaving(true);
    try {
      const r = await api.admin.updateOrderStatus(order.id, status);
      setData({ order: { ...order, ...r.order } });
      notify(`Order marked ${ORDER_STATUS_LABELS[status]}.`);
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const r = await api.admin.resendConfirmation(order.id);
      setData({ order: { ...order, ...r.order } });
      notify(r.message);
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setResending(false);
    }
  };

  const billing = order.billingAddress;
  const refundable = order.paymentStatus === 'PAID' && order.stripePaymentIntentId ? order.total - (order.refundedAmount || 0) : 0;
  return (
    <div className="admin-page">
      <Link to="/admin/orders" className="back-link">
        <Icon name="arrowLeft" size={16} /> All orders
      </Link>
      <div className="admin-head">
        <h1>Order {order.orderNumber}</h1>
        <Link to={`/admin/orders/${order.id}/slip`} className="btn btn--outline btn--sm">
          <Icon name="receipt" size={14} /> Packing slip
        </Link>
        <label className="status-select">
          <span>Update status</span>
          <select value={order.status} disabled={saving} onChange={(e) => update(e.target.value)}>
            {[...new Set([order.status, ...options])].map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {order.refundedAmount > 0 && (
        <Alert type="info" title={order.paymentStatus === 'REFUNDED' ? 'Fully refunded' : 'Partially refunded'}>
          {formatPrice(order.refundedAmount)} refunded{order.refundedAt ? ` on ${formatDate(order.refundedAt, true)}` : ''}.
        </Alert>
      )}
      {order.inventoryShortfall && (
        <Alert type="warning" title="Stock shortfall">
          One or more items ran out of stock between checkout and payment. Contact the customer about a substitution or refund.
        </Alert>
      )}
      {order.paymentStatus !== 'PAID' && (
        <Alert type="info">This order has not been paid. Orders are marked paid automatically when Stripe confirms payment.</Alert>
      )}
      <OrderDetails order={order} />
      <div className="order-blocks">
        <div className="order-block">
          <h3>Billing (from Stripe)</h3>
          {billing ? (
            <p>
              {order.billingName}
              <br />
              {billing.line1}
              {billing.line2 && `, ${billing.line2}`}
              <br />
              {billing.city} {billing.state} {billing.postal_code} {billing.country}
            </p>
          ) : (
            <p className="muted">Available once payment completes.</p>
          )}
        </div>
        {refundable > 0 && (
          <RefundPanel order={order} refundable={refundable} onDone={(o) => setData({ order: { ...order, ...o } })} />
        )}
        <div className="order-block">
          <h3>Confirmation email</h3>
          <p>{order.confirmationEmailSentAt ? `Sent ${formatDate(order.confirmationEmailSentAt, true)}` : 'Not sent'}</p>
          {order.paymentStatus === 'PAID' && (
            <button type="button" className="btn btn--outline btn--sm" style={{ marginTop: 10 }} onClick={resend} disabled={resending}>
              <Icon name="mail" size={14} /> {resending ? 'Sending…' : order.confirmationEmailSentAt ? 'Resend email' : 'Send email'}
            </button>
          )}
        </div>
        <div className="order-block">
          <h3>Stripe references</h3>
          <p className="mono">
            Session: {order.stripeSessionId || '—'}
            <br />
            Payment intent: {order.stripePaymentIntentId || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
