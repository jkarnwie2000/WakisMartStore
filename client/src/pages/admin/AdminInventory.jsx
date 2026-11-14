import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import { formatPrice } from '../../utils/format.js';

const VIEWS = [
  ['low', 'Low stock'],
  ['out', 'Out of stock'],
  ['all', 'All products'],
];

function Summary({ data }) {
  return (
    <>
      <section className="stats" aria-label="Inventory totals">
        {[
          ['Products', data.totals.products, `${data.totals.units.toLocaleString()} units on hand`],
          ['Stock value (retail)', formatPrice(data.totals.value), 'Units × current selling price'],
          ['Out of stock', data.totals.outOfStock, 'Active products with 0 units'],
          ['Low stock', data.totals.lowStock, `1–${data.lowStockThreshold} units left`],
        ].map(([label, value, sub]) => (
          <div key={label} className="stat">
            <span className="stat__label">{label}</span>
            <span className="stat__value">{value}</span>
            <span className="stat__sub">{sub}</span>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2 className="panel__title">Stock by department</h2>
        <div className="table-wrap">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th scope="col">Department</th>
                <th scope="col" className="num">
                  Products
                </th>
                <th scope="col" className="num">
                  Units
                </th>
                <th scope="col" className="num">
                  Retail value
                </th>
                <th scope="col" className="num">
                  Out
                </th>
                <th scope="col" className="num">
                  Low
                </th>
              </tr>
            </thead>
            <tbody>
              {data.departments.map((d) => (
                <tr key={d.slug}>
                  <td>{d.department}</td>
                  <td className="num">{d.products}</td>
                  <td className="num">{d.units.toLocaleString()}</td>
                  <td className="num">{formatPrice(d.value)}</td>
                  <td className="num">{d.outOfStock ? <span className="stock stock--out-of-stock">{d.outOfStock}</span> : 0}</td>
                  <td className="num">{d.lowStock ? <span className="stock stock--low-stock">{d.lowStock}</span> : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function CsvImport({ onApplied }) {
  const { notify } = useToast();
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const readFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((t) => {
      setCsv(t);
      setPreview(null);
    });
    e.target.value = '';
  };

  const run = async (apply) => {
    setBusy(true);
    try {
      const r = await api.admin.importInventory(csv, apply);
      setPreview(r);
      if (apply) {
        notify(r.applied ? `Updated ${r.changes.length} product${r.changes.length === 1 ? '' : 's'}.` : 'Nothing to change.');
        onApplied();
      }
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <h2 className="panel__title">Import stock &amp; prices from CSV</h2>
      <p className="muted">
        Columns: <code>sku</code> plus <code>inventory</code> and/or <code>price</code>. Tip: download the product list, edit it in Excel or Google Sheets, then
        upload it here. Nothing changes until you confirm the preview.
      </p>
      <div className="import-row">
        <label className="btn btn--outline btn--sm">
          <Icon name="upload" size={14} /> Choose CSV file
          <input type="file" accept=".csv,text/csv" className="visually-hidden" onChange={readFile} />
        </label>
        <a className="btn btn--outline btn--sm" href={api.admin.exportUrl('products')} download>
          <Icon name="download" size={14} /> Download product list
        </a>
      </div>
      <label className="field">
        <span className="field__label">…or paste CSV</span>
        <textarea className="field__control mono" rows={5} value={csv} onChange={(e) => { setCsv(e.target.value); setPreview(null); }} placeholder={'sku,inventory,price\nAFR-0001,60,32.99'} />
      </label>
      <button type="button" className="btn btn--primary btn--sm" disabled={!csv.trim() || busy} onClick={() => run(false)}>
        Preview changes
      </button>

      {preview && (
        <div className="import-preview">
          {preview.errors.length > 0 && (
            <Alert type="warning" title={`${preview.errors.length} row${preview.errors.length === 1 ? '' : 's'} will be skipped`}>
              <ul className="issue-list">
                {preview.errors.slice(0, 15).map((e) => (
                  <li key={`${e.line}-${e.message}`}>
                    Line {e.line}
                    {e.sku ? ` (${e.sku})` : ''}: {e.message}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
          {preview.applied ? (
            <Alert type="success">Import applied: {preview.changes.length} product{preview.changes.length === 1 ? '' : 's'} updated.</Alert>
          ) : preview.changes.length ? (
            <>
              <p>
                <strong>{preview.changes.length}</strong> product{preview.changes.length === 1 ? '' : 's'} will change:
              </p>
              <ul className="mini-list import-list">
                {preview.changes.slice(0, 50).map((c) => (
                  <li key={c.sku}>
                    <span>
                      {c.name} <small className="muted">{c.sku}</small>
                    </span>
                    <span className="mini-list__end">{c.change}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn--primary" disabled={busy} onClick={() => run(true)}>
                Apply {preview.changes.length} change{preview.changes.length === 1 ? '' : 's'}
              </button>
            </>
          ) : (
            <p className="muted">No changes found in this file.</p>
          )}
        </div>
      )}
    </section>
  );
}

export default function AdminInventory() {
  useDocumentTitle('Inventory');
  const { notify } = useToast();
  const [view, setView] = useState('low');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [qty, setQty] = useState(24);
  const q = useDebounce(search, 300);
  const summary = useAsync(() => api.admin.inventorySummary(), []);
  const list = useAsync((signal) => api.admin.inventory({ view, search: q }, signal), [view, q]);

  const refresh = () => {
    list.reload();
    summary.reload();
    setSelected(new Set());
  };
  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const bulk = async (mode, ids = [...selected], quantity = Number(qty)) => {
    try {
      const r = await api.admin.bulkInventory({ productIds: ids, mode, quantity });
      notify(r.message);
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  const products = list.data?.products || [];
  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Inventory</h1>
          <p className="muted">Restock quickly, spot gaps, and update stock in bulk.</p>
        </div>
      </div>

      {summary.error ? <ErrorState error={summary.error} onRetry={summary.reload} /> : summary.data ? <Summary data={summary.data} /> : <Spinner />}

      <section className="panel">
        <div className="panel__head">
          <div className="tabs" role="tablist" aria-label="Stock views">
            {VIEWS.map(([v, label]) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={`tab ${view === v ? 'is-active' : ''}`} onClick={() => { setView(v); setSelected(new Set()); }}>
                {label}
              </button>
            ))}
          </div>
          <label className="admin-filters__search inv-search">
            <Icon name="search" size={16} />
            <span className="visually-hidden">Search inventory</span>
            <input type="search" placeholder="Name, SKU or brand…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        <div className={`bulk-bar ${selected.size ? 'is-active' : ''}`} aria-live="polite">
          <span>{selected.size ? `${selected.size} selected` : 'Select products to restock several at once'}</span>
          <label className="bulk-bar__qty">
            <span className="visually-hidden">Quantity</span>
            <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <button type="button" className="btn btn--primary btn--sm" disabled={!selected.size} onClick={() => bulk('add')}>
            + Add to each
          </button>
          <button type="button" className="btn btn--outline btn--sm" disabled={!selected.size} onClick={() => bulk('set')}>
            Set each to
          </button>
        </div>

        {list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <Spinner />
        ) : products.length === 0 ? (
          <EmptyState icon="box" title={view === 'out' ? 'Nothing is out of stock' : view === 'low' ? 'No low-stock products' : 'No products found'} />
        ) : (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th scope="col" className="tick-col">
                    <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)))} />
                  </th>
                  <th scope="col">Product</th>
                  <th scope="col">Department</th>
                  <th scope="col" className="num">
                    In stock
                  </th>
                  <th scope="col" className="num">
                    Value
                  </th>
                  <th scope="col">Quick restock</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={!p.isActive ? 'is-muted' : ''}>
                    <td className="tick-col">
                      <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                    </td>
                    <td>
                      <div className="admin-product">
                        <img src={p.image} alt="" width="36" height="36" loading="lazy" />
                        <span>
                          <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                          <small>
                            {p.sku} · {p.brand}
                            {p.isDeli ? ' · portions today' : ''}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>{p.category?.name}</td>
                    <td className="num">
                      <span className={`stock stock--${p.availability.toLowerCase().replace(/_/g, '-')}`}>{p.inventory}</span>
                    </td>
                    <td className="num">{formatPrice(p.stockValue)}</td>
                    <td className="actions">
                      {[12, 24, 48].map((n) => (
                        <button key={n} type="button" className="btn btn--outline btn--sm" onClick={() => bulk('add', [p.id], n)} aria-label={`Add ${n} to ${p.name}`}>
                          +{n}
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CsvImport onApplied={refresh} />
    </div>
  );
}
