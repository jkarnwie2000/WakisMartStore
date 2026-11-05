import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import { ErrorState, Spinner, EmptyState } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import { formatPrice } from '../../utils/format.js';

function InventoryCell({ product, onSave }) {
  const [value, setValue] = useState(product.inventory);
  useEffect(() => {
    setValue(product.inventory);
  }, [product.inventory]);
  const dirty = Number(value) !== product.inventory;
  return (
    <form
      className="inline-edit"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) onSave({ inventory: Number(value) });
      }}
    >
      <label className="visually-hidden" htmlFor={`inv-${product.id}`}>
        Inventory for {product.name}
      </label>
      <input id={`inv-${product.id}`} type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
      {dirty && (
        <button type="submit" className="btn btn--primary btn--sm">
          Save
        </button>
      )}
    </form>
  );
}

/** Product management table. `deliMode` turns it into the deli availability manager. */
export default function AdminProducts({ deliMode = false }) {
  useDocumentTitle(deliMode ? 'Deli Availability' : 'Manage Products');
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(deliMode ? 'deli' : '');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  const cats = useAsync(() => api.categories(), []);

  useEffect(() => {
    setPage(1);
  }, [q, category, status]);

  const { data, error, loading, reload, setData } = useAsync(
    (signal) => api.admin.products({ search: q, category: deliMode ? 'deli' : category, status, page, limit: deliMode ? 100 : 25, sort: 'name_asc' }, signal),
    [q, category, status, page, deliMode],
  );

  const patch = async (product, changes, message) => {
    try {
      const { product: updated } = await api.admin.patchProduct(product.id, changes);
      setData((d) => ({ ...d, products: d.products.map((p) => (p.id === updated.id ? updated : p)) }));
      notify(message || `${product.name} updated.`);
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone. Past orders keep their copy of the item.`)) return;
    try {
      await api.admin.deleteProduct(product.id);
      notify(`${product.name} deleted.`);
      reload();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>{deliMode ? 'Deli availability' : 'Products'}</h1>
          {deliMode && <p className="muted">Set today’s portion counts and switch dishes on or off the menu.</p>}
        </div>
        <Link to="/admin/products/new" className="btn btn--primary">
          + Add {deliMode ? 'deli item' : 'product'}
        </Link>
      </div>

      <div className="admin-filters">
        <label className="admin-filters__search">
          <Icon name="search" size={16} />
          <span className="visually-hidden">Search products</span>
          <input type="search" placeholder="Search name, brand or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        {!deliMode && (
          <label>
            <span className="visually-hidden">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {cats.data?.categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="visually-hidden">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Hidden / unavailable</option>
          </select>
        </label>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : data.products.length === 0 ? (
        <EmptyState icon="box" title="No products found" />
      ) : (
        <>
          <p className="muted">{data.total} products</p>
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  {!deliMode && <th scope="col">Category</th>}
                  <th scope="col" className="num">
                    Price
                  </th>
                  <th scope="col">{deliMode ? 'Portions today' : 'Inventory'}</th>
                  <th scope="col">{deliMode ? 'On menu' : 'Active'}</th>
                  <th scope="col">Featured</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => (
                  <tr key={p.id} className={!p.isActive ? 'is-muted' : ''}>
                    <td>
                      <div className="admin-product">
                        <img src={p.image} alt="" width="40" height="40" loading="lazy" />
                        <span>
                          <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                          <small>
                            {p.sku} · {p.brand}
                          </small>
                        </span>
                      </div>
                    </td>
                    {!deliMode && <td>{p.category?.name}</td>}
                    <td className="num">
                      {p.portions?.length ? `from ${formatPrice(p.price)}` : formatPrice(p.price)}
                      {p.compareAtPrice && <small className="muted"> was {formatPrice(p.compareAtPrice)}</small>}
                    </td>
                    <td>
                      <InventoryCell product={p} onSave={(c) => patch(p, c, `Stock for ${p.name} set to ${c.inventory}.`)} />
                    </td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={p.isActive} onChange={(e) => patch(p, { isActive: e.target.checked })} />
                        <span className="switch__ui" aria-hidden="true" />
                        <span className="visually-hidden">{p.name} is {p.isActive ? 'active' : 'hidden'}</span>
                      </label>
                    </td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={p.featured} onChange={(e) => patch(p, { featured: e.target.checked })} />
                        <span className="switch__ui" aria-hidden="true" />
                        <span className="visually-hidden">Feature {p.name}</span>
                      </label>
                    </td>
                    <td className="actions">
                      <Link to={`/admin/products/${p.id}`} className="icon-btn" aria-label={`Edit ${p.name}`}>
                        <Icon name="edit" size={18} />
                      </Link>
                      <Link to={`/product/${p.slug}`} className="icon-btn" aria-label={`View ${p.name} in store`}>
                        <Icon name="eye" size={18} />
                      </Link>
                      <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}>
                        <Icon name="trash" size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <nav className="pagination" aria-label="Product pages">
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
