import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useStoreConfig } from '../../context/StoreContext.jsx';
import { ErrorState, Spinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import { formatDate, formatPrice } from '../../utils/format.js';

const minutesAgo = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};

function OrderCard({ order, actions, busy, onAction }) {
  const units = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <li className="fcard">
      <div className="fcard__head">
        <Link to={`/admin/orders/${order.id}`} className="strong-link">
          {order.orderNumber}
        </Link>
        <span className="muted">{minutesAgo(order.paidAt || order.createdAt)}</span>
      </div>
      <p className="fcard__customer">
        {order.customerName}
        {order.customerPhone && <span className="muted"> · {order.customerPhone}</span>}
      </p>
      <p className="fcard__meta">
        <Icon name={order.fulfillmentMethod === 'DELIVERY' ? 'truck' : 'store'} size={14} /> {order.fulfillmentMethod === 'DELIVERY' ? 'Delivery' : 'Pickup'} ·{' '}
        {units} item{units === 1 ? '' : 's'} · {formatPrice(order.total)}
      </p>
      {order.shippingAddress && (
        <p className="fcard__addr">
          {order.shippingAddress.line1}, {order.shippingAddress.city}
        </p>
      )}
      {order.notes && <p className="fcard__notes">“{order.notes}”</p>}
      <ul className="fcard__items">
        {order.items.slice(0, 4).map((i) => (
          <li key={i.id}>
            {i.quantity}× {i.productName}
            {i.portionLabel && <span className="muted"> ({i.portionLabel})</span>}
          </li>
        ))}
        {order.items.length > 4 && <li className="muted">+{order.items.length - 4} more</li>}
      </ul>
      <div className="fcard__actions">
        {actions.map(([status, label, primary]) => (
          <button key={status} type="button" className={`btn btn--sm ${primary ? 'btn--primary' : 'btn--outline'}`} disabled={busy} onClick={() => onAction(order, status, label)}>
            {label}
          </button>
        ))}
        <Link to={`/admin/orders/${order.id}/slip`} className="btn btn--sm btn--outline" aria-label={`Print packing slip for ${order.orderNumber}`}>
          <Icon name="receipt" size={14} /> Slip
        </Link>
      </div>
    </li>
  );
}

export function AdminFulfilment() {
  useDocumentTitle('Fulfilment');
  const { notify } = useToast();
  const { data, error, loading, reload } = useAsync(() => api.admin.fulfilment(), []);
  const [busyId, setBusyId] = useState(null);

  const advance = async (order, status, label) => {
    setBusyId(order.id);
    try {
      await api.admin.updateOrderStatus(order.id, status);
      notify(`${order.orderNumber}: ${label}`);
      reload();
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const toPackActions = (o) =>
    o.status === 'PAID'
      ? [['PROCESSING', 'Start packing', true]]
      : [[o.fulfillmentMethod === 'PICKUP' ? 'READY_FOR_PICKUP' : 'OUT_FOR_DELIVERY', o.fulfillmentMethod === 'PICKUP' ? 'Ready for pickup' : 'Out for delivery', true]];

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Fulfilment</h1>
          <p className="muted">Paid orders waiting to be packed, collected or delivered. Oldest first.</p>
        </div>
        <div className="admin-head__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={reload}>
            Refresh
          </button>
          <Link to="/admin/fulfilment/pick-list" className="btn btn--primary btn--sm">
            <Icon name="receipt" size={14} /> Print pick list
          </Link>
        </div>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : (
        <>
          <p className="muted">{data.completedToday} order{data.completedToday === 1 ? '' : 's'} completed today.</p>
          <div className="board">
            {[
              ['To pack', data.toPack, toPackActions],
              ['Ready for pickup', data.readyForPickup, () => [['COMPLETED', 'Collected', true]]],
              ['Out for delivery', data.outForDelivery, () => [['COMPLETED', 'Delivered', true]]],
            ].map(([title, list, actionsFor]) => (
              <section key={title} className="board__col" aria-label={title}>
                <h2 className="board__title">
                  {title} <span className="board__count">{list.length}</span>
                </h2>
                {list.length === 0 ? (
                  <p className="board__empty">Nothing here right now.</p>
                ) : (
                  <ul className="board__list">
                    {list.map((o) => (
                      <OrderCard key={o.id} order={o} actions={actionsFor(o)} busy={busyId === o.id} onAction={advance} />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AdminPickList() {
  useDocumentTitle('Pick List');
  const { data, error, loading, reload } = useAsync(() => api.admin.pickList(), []);
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div className="admin-page print-page">
      <div className="admin-head no-print">
        <Link to="/admin/fulfilment" className="back-link">
          <Icon name="arrowLeft" size={16} /> Fulfilment
        </Link>
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          <Icon name="receipt" size={16} /> Print
        </button>
      </div>
      <h1>Pick list</h1>
      <p className="muted">
        {data.orderCount} order{data.orderCount === 1 ? '' : 's'} to pack · generated {formatDate(data.generatedAt, true)}
      </p>
      {data.lines.length === 0 ? (
        <p>No orders are waiting to be packed.</p>
      ) : (
        <table className="data-table print-table">
          <thead>
            <tr>
              <th scope="col" className="tick-col">
                ✓
              </th>
              <th scope="col">Department</th>
              <th scope="col">Item</th>
              <th scope="col">SKU</th>
              <th scope="col" className="num">
                Qty
              </th>
              <th scope="col">Orders</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l) => (
              <tr key={`${l.name}-${l.portion}`}>
                <td className="tick-col">
                  <span className="tick-box" aria-hidden="true" />
                </td>
                <td>{l.department}</td>
                <td>
                  <strong>{l.name}</strong>
                  {l.portion && <small className="block muted">{l.portion}</small>}
                </td>
                <td className="mono">{l.sku || '—'}</td>
                <td className="num">
                  <strong>{l.quantity}</strong>
                </td>
                <td className="small">{l.orders.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AdminPackingSlip() {
  const { id } = useParams();
  const { data, error, loading, reload } = useAsync(() => api.admin.order(id), [id]);
  const { store, pickup, delivery } = useStoreConfig();
  useDocumentTitle(data ? `Packing slip ${data.order.orderNumber}` : 'Packing slip');
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const o = data.order;
  return (
    <div className="admin-page print-page slip">
      <div className="admin-head no-print">
        <Link to={`/admin/orders/${o.id}`} className="back-link">
          <Icon name="arrowLeft" size={16} /> Order {o.orderNumber}
        </Link>
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          <Icon name="receipt" size={16} /> Print slip
        </button>
      </div>
      <header className="slip__head">
        <div>
          <h1>Wakis Mart Deli &amp; Grocery</h1>
          {store.address && <p>{store.address}</p>}
          {store.phone && <p>{store.phone}</p>}
        </div>
        <div className="slip__order">
          <p className="slip__label">Packing slip</p>
          <p className="slip__number">{o.orderNumber}</p>
          <p>{formatDate(o.createdAt, true)}</p>
        </div>
      </header>
      <div className="slip__parties">
        <div>
          <p className="slip__label">Customer</p>
          <p>
            <strong>{o.customerName}</strong>
            <br />
            {o.customerPhone || o.customerEmail}
          </p>
        </div>
        <div>
          <p className="slip__label">{o.fulfillmentMethod === 'DELIVERY' ? 'Deliver to' : 'Store pickup'}</p>
          {o.shippingAddress ? (
            <p>
              {o.shippingAddress.line1}
              {o.shippingAddress.line2 && <>, {o.shippingAddress.line2}</>}
              <br />
              {o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.postalCode}
            </p>
          ) : (
            <p>{pickup.instructions}</p>
          )}
        </div>
      </div>
      {o.notes && (
        <p className="slip__notes">
          <strong>Customer note:</strong> {o.notes}
        </p>
      )}
      <table className="data-table print-table">
        <thead>
          <tr>
            <th scope="col" className="tick-col">
              ✓
            </th>
            <th scope="col">Item</th>
            <th scope="col">SKU</th>
            <th scope="col" className="num">
              Qty
            </th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id}>
              <td className="tick-col">
                <span className="tick-box" aria-hidden="true" />
              </td>
              <td>
                {i.productName}
                {i.portionLabel && <small className="block muted">{i.portionLabel}</small>}
              </td>
              <td className="mono">{i.sku || '—'}</td>
              <td className="num">
                <strong>{i.quantity}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="slip__foot">
        {o.items.reduce((n, i) => n + i.quantity, 0)} items · Paid {formatPrice(o.total)} ·{' '}
        {o.fulfillmentMethod === 'DELIVERY' ? delivery.note : 'Thank you for shopping with Wakis Mart!'}
      </p>
    </div>
  );
}
