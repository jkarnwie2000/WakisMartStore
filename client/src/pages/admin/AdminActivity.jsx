import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { EmptyState, ErrorState, Spinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import { formatDate } from '../../utils/format.js';

const TYPES = [
  ['', 'All activity'],
  ['ORDER', 'Orders & refunds'],
  ['PRODUCT', 'Products & prices'],
  ['INVENTORY', 'Inventory'],
  ['SPECIAL', 'Specials'],
  ['SETTINGS', 'Store settings'],
  ['USER', 'Admin access'],
  ['CATEGORY', 'Categories'],
];
const ICONS = { ORDER: 'receipt', PRODUCT: 'box', INVENTORY: 'box', SPECIAL: 'tag', SETTINGS: 'store', USER: 'lock', CATEGORY: 'tag' };
const linkFor = (e) =>
  e.entityType === 'ORDER' && e.entityId ? `/admin/orders/${e.entityId}` : e.entityType === 'PRODUCT' && e.entityId && e.action !== 'PRODUCT_DELETED' ? `/admin/products/${e.entityId}` : null;

export default function AdminActivity() {
  useDocumentTitle('Activity Log');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  useEffect(() => {
    setPage(1);
  }, [type, q]);
  const { data, error, loading, reload } = useAsync((signal) => api.admin.activity({ type, search: q, page }, signal), [type, q, page]);

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Activity log</h1>
          <p className="muted">Who changed prices, stock, orders, refunds, specials, settings or admin access — newest first.</p>
        </div>
        <button type="button" className="btn btn--outline btn--sm" onClick={reload}>
          Refresh
        </button>
      </div>
      <div className="admin-filters">
        <label className="admin-filters__search">
          <Icon name="search" size={16} />
          <span className="visually-hidden">Search activity</span>
          <input type="search" placeholder="Search by staff name, product, order number…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          <span className="visually-hidden">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map(([v, l]) => (
              <option key={v || 'all'} value={v}>
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
      ) : data.entries.length === 0 ? (
        <EmptyState icon="clock" title="No activity yet">
          <p>Changes made in the dashboard will appear here.</p>
        </EmptyState>
      ) : (
        <>
          <ol className="activity">
            {data.entries.map((e) => {
              const to = linkFor(e);
              return (
                <li key={e.id} className="activity__item">
                  <span className="activity__icon" aria-hidden="true">
                    <Icon name={ICONS[e.entityType] || 'clock'} size={16} />
                  </span>
                  <div className="activity__body">
                    <p className="activity__summary">{to ? <Link to={to}>{e.summary}</Link> : e.summary}</p>
                    <p className="activity__meta">
                      <strong>{e.userName}</strong>
                      {e.userEmail !== 'system' && <span> · {e.userEmail}</span>} · <time dateTime={e.createdAt}>{formatDate(e.createdAt, true)}</time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {data.pages > 1 && (
            <nav className="pagination" aria-label="Activity pages">
              <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Newer
              </button>
              <span>
                Page {data.page} of {data.pages}
              </span>
              <button type="button" className="btn btn--outline btn--sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                Older
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
