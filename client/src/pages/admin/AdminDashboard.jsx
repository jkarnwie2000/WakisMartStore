import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { ErrorState, Spinner } from '../../components/Feedback.jsx';
import { StatusPill } from '../../components/OrderDetails.jsx';
import { formatPrice, formatDate, ORDER_STATUS_LABELS } from '../../utils/format.js';

function StatTile({ label, value, sub, to }) {
  const body = (
    <>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {sub && <span className="stat__sub">{sub}</span>}
    </>
  );
  return to ? (
    <Link to={to} className="stat stat--link">
      {body}
    </Link>
  ) : (
    <div className="stat">{body}</div>
  );
}

// Single-series magnitude: one hue, labelled rows, value as text (no legend needed).
function StatusBars({ byStatus }) {
  const rows = Object.keys(ORDER_STATUS_LABELS).map((s) => ({ status: s, count: byStatus[s] || 0 }));
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <table className="bars">
      <caption className="visually-hidden">Orders by status</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.status} title={`${ORDER_STATUS_LABELS[r.status]}: ${r.count} orders`}>
            <th scope="row">
              <Link to={`/admin/orders?status=${r.status}`}>{ORDER_STATUS_LABELS[r.status]}</Link>
            </th>
            <td className="bars__track">
              <span className="bars__fill" style={{ width: `${(r.count / max) * 100}%` }} />
            </td>
            <td className="bars__value">{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard');
  const { data, error, loading, reload } = useAsync(() => api.admin.stats(), []);
  const today = useAsync(() => api.admin.overview(), []);
  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="admin-page">
      <div className="admin-head">
        <h1>Dashboard</h1>
        <Link to="/admin/products/new" className="btn btn--primary">
          + Add product
        </Link>
      </div>

      {today.data && (
        <section className="today" aria-label="Today at a glance">
          <h2 className="today__title">Today</h2>
          <div className="today__grid">
            <StatTile label="Revenue today" value={formatPrice(today.data.today.revenue)} sub={`${today.data.today.orders} paid order${today.data.today.orders === 1 ? '' : 's'}`} to="/admin/reports" />
            <StatTile label="To pack" value={today.data.fulfilment.toPack} sub="Paid orders waiting" to="/admin/fulfilment" />
            <StatTile label="Ready / out for delivery" value={`${today.data.fulfilment.readyForPickup} / ${today.data.fulfilment.outForDelivery}`} sub="Awaiting collection / on the road" to="/admin/fulfilment" />
            <StatTile label="Out of stock" value={today.data.inventory.outOfStock} sub={`${today.data.inventory.lowStock} more running low`} to="/admin/inventory" />
            <StatTile label="Specials running" value={today.data.specials.active} sub="Products on sale" to="/admin/specials" />
          </div>
        </section>
      )}
      <h2 className="today__title">All time</h2>
      <section className="stats" aria-label="Key figures">
        <StatTile label="Revenue (paid orders)" value={formatPrice(data.sales.revenue)} sub={`${formatPrice(data.sales.last30Days)} in the last 30 days`} />
        <StatTile label="Paid orders" value={data.orders.paid} sub={`${data.orders.total} checkouts started`} to="/admin/orders?paymentStatus=PAID" />
        <StatTile label="Average order" value={formatPrice(data.sales.averageOrder)} sub={`${data.sales.ordersLast30Days} orders in 30 days`} />
        <StatTile label="Products" value={data.products.total} sub={`${data.products.active} active · ${data.products.deli} deli items`} to="/admin/products" />
        <StatTile label="Customer accounts" value={data.customers} sub={`${data.subscribers} newsletter subscribers`} to="/admin/customers" />
        <StatTile label="Messages" value={data.messages} sub="Contact form enquiries" to="/admin/messages" />
      </section>

      <div className="admin-grid">
        <section className="panel">
          <h2 className="panel__title">Orders by status</h2>
          <StatusBars byStatus={data.orders.byStatus} />
        </section>

        <section className="panel">
          <h2 className="panel__title">Top sellers (by revenue)</h2>
          {data.topSellers.length === 0 ? (
            <p className="muted">No paid orders yet.</p>
          ) : (
            <table className="data-table data-table--compact">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col" className="num">
                    Units
                  </th>
                  <th scope="col" className="num">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topSellers.map((t) => (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td className="num">{t.quantity}</td>
                    <td className="num">{formatPrice(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <h2 className="panel__title">Low stock</h2>
          {data.lowStock.length === 0 ? (
            <p className="muted">Everything is well stocked.</p>
          ) : (
            <ul className="mini-list">
              {data.lowStock.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                  <span className={`stock stock--${p.inventory === 0 ? 'out-of-stock' : 'low-stock'}`}>{p.inventory === 0 ? 'Out of stock' : `${p.inventory} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Recent orders</h2>
            <Link to="/admin/orders" className="link-arrow">
              All orders
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <ul className="mini-list">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`}>
                    {o.orderNumber}
                    <small>
                      {o.customerName} · {formatDate(o.createdAt, true)}
                    </small>
                  </Link>
                  <span className="mini-list__end">
                    <StatusPill status={o.status} /> {formatPrice(o.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
