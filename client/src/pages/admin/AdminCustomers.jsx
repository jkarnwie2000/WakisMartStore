import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { EmptyState, ErrorState, NotFoundState, Spinner } from '../../components/Feedback.jsx';
import { StatusPill } from '../../components/OrderDetails.jsx';
import Icon from '../../components/Icon.jsx';
import { formatDate, formatPrice } from '../../utils/format.js';

export function AdminCustomers() {
  useDocumentTitle('Customers');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('spent');
  const [type, setType] = useState('all');
  const q = useDebounce(search, 300);
  const { data, error, loading, reload } = useAsync((signal) => api.admin.customers({ search: q, sort, type }, signal), [q, sort, type]);

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Customers</h1>
          <p className="muted">Everyone who has an account or has placed a paid order (including guest checkouts). Totals are net of refunds.</p>
        </div>
        <a className="btn btn--outline btn--sm" href={api.admin.exportUrl('customers')} download>
          <Icon name="download" size={14} /> Customers CSV
        </a>
      </div>

      {data && (
        <section className="stats" aria-label="Customer totals">
          {[
            ['Customers', data.totals.customers],
            ['With an account', data.totals.registered],
            ['Repeat customers', data.totals.repeat],
          ].map(([label, value]) => (
            <div key={label} className="stat">
              <span className="stat__label">{label}</span>
              <span className="stat__value">{value}</span>
            </div>
          ))}
        </section>
      )}

      <div className="admin-filters">
        <label className="admin-filters__search">
          <Icon name="search" size={16} />
          <span className="visually-hidden">Search customers</span>
          <input type="search" placeholder="Name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          <span className="visually-hidden">Customer type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All customers</option>
            <option value="registered">With an account</option>
            <option value="guest">Guest checkouts</option>
          </select>
        </label>
        <label>
          <span className="visually-hidden">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="spent">Highest spend</option>
            <option value="recent">Most recent order</option>
            <option value="orders">Most orders</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : data.customers.length === 0 ? (
        <EmptyState icon="user" title="No customers found" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Type</th>
                <th scope="col" className="num">
                  Orders
                </th>
                <th scope="col" className="num">
                  Total spent
                </th>
                <th scope="col">Last order</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c) => (
                <tr key={c.email}>
                  <td>
                    <Link to={`/admin/customers/view?email=${encodeURIComponent(c.email)}`} className="strong-link">
                      {c.name}
                    </Link>
                    <small className="block muted">{c.email}</small>
                  </td>
                  <td>
                    <span className="pill">{c.hasAccount ? (c.role === 'ADMIN' ? 'Staff account' : 'Account') : 'Guest'}</span>
                  </td>
                  <td className="num">{c.orders}</td>
                  <td className="num">{formatPrice(c.totalSpent)}</td>
                  <td>{c.lastOrderAt ? formatDate(c.lastOrderAt) : <span className="muted">No orders yet</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminCustomerDetail() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const { data, error, loading, reload } = useAsync(() => api.admin.customer(email), [email]);
  useDocumentTitle(data ? data.customer.name : 'Customer');
  if (loading) return <Spinner />;
  if (error?.status === 404 || error?.status === 400) return <NotFoundState title="Customer not found" message="No customer has that email address." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { customer: c, orders } = data;
  return (
    <div className="admin-page">
      <Link to="/admin/customers" className="back-link">
        <Icon name="arrowLeft" size={16} /> All customers
      </Link>
      <div className="admin-head">
        <div>
          <h1>{c.name}</h1>
          <p className="muted">
            {c.email}
            {c.phone && ` · ${c.phone}`} · {c.hasAccount ? `Account since ${formatDate(c.joinedAt)}` : 'Guest checkout'}
          </p>
        </div>
        <a className="btn btn--outline btn--sm" href={`mailto:${c.email}`}>
          <Icon name="mail" size={14} /> Email customer
        </a>
      </div>
      <section className="stats">
        {[
          ['Paid orders', c.orders],
          ['Total spent', formatPrice(c.totalSpent)],
          ['Average order', formatPrice(c.averageOrder)],
        ].map(([label, value]) => (
          <div key={label} className="stat">
            <span className="stat__label">{label}</span>
            <span className="stat__value">{value}</span>
          </div>
        ))}
      </section>
      {c.address && (
        <p className="muted">
          <Icon name="pin" size={14} /> Saved address: {c.address}
        </p>
      )}
      <section className="panel">
        <h2 className="panel__title">Order history</h2>
        {orders.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table data-table--compact">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Date</th>
                  <th scope="col">Items</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/admin/orders/${o.id}`} className="strong-link">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td>{formatDate(o.createdAt, true)}</td>
                    <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
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
        )}
      </section>
    </div>
  );
}
