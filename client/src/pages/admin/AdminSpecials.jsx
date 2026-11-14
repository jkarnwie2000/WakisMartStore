import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import { formatDate, formatPrice } from '../../utils/format.js';

function CurrentSpecials({ data, onEnded }) {
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const end = async (ids, label) => {
    if (!window.confirm(`End the special on ${label} and restore regular prices?`)) return;
    setBusy(true);
    try {
      const r = await api.admin.endSpecials(ids);
      notify(r.message);
      onEnded();
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };
  if (!data.specials.length) return <EmptyState icon="tag" title="No products are on special" />;
  return (
    <>
      <div className="panel__head">
        <p className="muted">{data.specials.length} product{data.specials.length === 1 ? '' : 's'} on special. Customers see the regular price struck through.</p>
        <button type="button" className="btn btn--outline btn--sm" disabled={busy} onClick={() => end(data.specials.map((s) => s.id), `all ${data.specials.length} products`)}>
          End all specials
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table data-table--compact">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col" className="num">
                Regular
              </th>
              <th scope="col" className="num">
                Sale
              </th>
              <th scope="col" className="num">
                Off
              </th>
              <th scope="col">Ends</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.specials.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link to={`/admin/products/${s.id}`}>{s.name}</Link>
                  <small className="block muted">{s.category?.name}</small>
                </td>
                <td className="num">
                  <s>{formatPrice(s.compareAtPrice)}</s>
                </td>
                <td className="num">
                  <strong>{formatPrice(s.price)}</strong>
                </td>
                <td className="num">{s.percentOff}%</td>
                <td>{s.specialEndsAt ? formatDate(s.specialEndsAt, true) : <span className="muted">Until ended</span>}</td>
                <td className="actions">
                  <button type="button" className="btn btn--outline btn--sm" disabled={busy} onClick={() => end([s.id], s.name)}>
                    End
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CreateSpecial({ categories, onCreated }) {
  const { notify } = useToast();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [percent, setPercent] = useState(15);
  const [endsAt, setEndsAt] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = useDebounce(search, 300);
  const { data, loading } = useAsync((signal) => api.admin.products({ category, search: q, status: 'active', deli: 'false', limit: 100, sort: 'name_asc' }, signal), [category, q]);
  const products = data?.products || [];
  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!selected.size) return notify('Choose at least one product.', { type: 'error' });
    const pct = Number(percent);
    if (!(pct >= 1 && pct <= 90)) return notify('Discount must be between 1% and 90%.', { type: 'error' });
    setBusy(true);
    try {
      const r = await api.admin.createSpecial({ productIds: [...selected], percentOff: pct, endsAt: endsAt ? new Date(endsAt).toISOString() : null });
      setResult(r);
      notify(r.message);
      setSelected(new Set());
      onCreated();
    } catch (err) {
      notify(err.data?.details?.[0]?.message || err.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const minDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <form className="panel" onSubmit={submit}>
      <h2 className="panel__title">Create a special</h2>
      <p className="muted">Pick products, choose a discount and an optional end date. Prices return to normal automatically when it ends. (Deli dishes use portion prices, so edit those in the product editor.)</p>
      <div className="special-form">
        <label className="field">
          <span className="field__label">Discount (% off)</span>
          <input className="field__control" type="number" min="1" max="90" value={percent} onChange={(e) => setPercent(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Ends (optional)</span>
          <input className="field__control" type="datetime-local" min={minDate} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Department</span>
          <select className="field__control" value={category} onChange={(e) => { setCategory(e.target.value); setSelected(new Set()); }}>
            <option value="">All departments</option>
            {categories.filter((c) => c.slug !== 'deli').map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Search</span>
          <input className="field__control" type="search" value={search} placeholder="Name, brand…" onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <div className="special-pick">
        {loading && !data ? (
          <Spinner inline />
        ) : (
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th scope="col" className="tick-col">
                  <input type="checkbox" aria-label="Select all listed products" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)))} />
                </th>
                <th scope="col">Product</th>
                <th scope="col" className="num">
                  Now
                </th>
                <th scope="col" className="num">
                  After {Number(percent) || 0}% off
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const regular = p.compareAtPrice ?? p.price;
                return (
                  <tr key={p.id}>
                    <td className="tick-col">
                      <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                    </td>
                    <td>
                      {p.name}
                      {p.compareAtPrice && <small className="muted"> · already on special</small>}
                    </td>
                    <td className="num">{formatPrice(p.price)}</td>
                    <td className="num">{formatPrice(Math.max(1, Math.round((regular * (100 - (Number(percent) || 0))) / 100)))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="admin-form__actions">
        <button type="submit" className="btn btn--primary" disabled={busy || !selected.size}>
          {busy ? 'Applying…' : `Put ${selected.size || ''} product${selected.size === 1 ? '' : 's'} on special`}
        </button>
      </div>
      {result?.skipped?.length > 0 && (
        <Alert type="info" title="Some products were skipped">
          {result.skipped.map((s) => `${s.name} (${s.reason})`).join(', ')}
        </Alert>
      )}
    </form>
  );
}

export default function AdminSpecials() {
  useDocumentTitle('Specials');
  const specials = useAsync(() => api.admin.specials(), []);
  const cats = useAsync(() => api.categories(), []);
  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Specials</h1>
          <p className="muted">Discounts shown as “Special” in the store, in Weekly Specials on the homepage, and under the “Weekly specials” filter.</p>
        </div>
        <Link to="/shop?onSale=true" className="btn btn--outline btn--sm">
          <Icon name="eye" size={14} /> View in store
        </Link>
      </div>
      <section className="panel">
        <h2 className="panel__title">Current specials</h2>
        {specials.error ? <ErrorState error={specials.error} onRetry={specials.reload} /> : specials.loading && !specials.data ? <Spinner /> : <CurrentSpecials data={specials.data} onEnded={specials.reload} />}
      </section>
      {cats.data && <CreateSpecial categories={cats.data.categories} onCreated={specials.reload} />}
    </div>
  );
}
