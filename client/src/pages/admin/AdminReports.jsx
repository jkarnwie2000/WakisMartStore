import { useState } from 'react';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { ErrorState, Spinner } from '../../components/Feedback.jsx';
import ColumnChart from '../../components/admin/ColumnChart.jsx';
import Icon from '../../components/Icon.jsx';
import { formatPrice } from '../../utils/format.js';

const RANGES = [
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['90d', 'Last 90 days'],
  ['12m', 'Last 12 months'],
];
const shortMoney = (cents) => (cents >= 100000 ? `$${(cents / 100000).toFixed(1)}k` : formatPrice(cents).replace(/\.00$/, ''));

function periodLabel(period, group) {
  if (group === 'month') {
    const [yy, mm] = period.split('-');
    return new Date(Date.UTC(+yy, +mm - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  const d = new Date(`${period}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function HBars({ rows, valueKey, format, labelKey, subKey }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  return (
    <table className="bars">
      <tbody>
        {rows.map((r) => (
          <tr key={r[labelKey]} title={`${r[labelKey]}: ${format(r[valueKey])}`}>
            <th scope="row">{r[labelKey]}</th>
            <td className="bars__track">
              <span className="bars__fill" style={{ width: `${(r[valueKey] / max) * 100}%` }} />
            </td>
            <td className="bars__value bars__value--wide">
              {format(r[valueKey])}
              {subKey && <small className="block muted">{r[subKey]}</small>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminReports() {
  useDocumentTitle('Sales Reports');
  const [range, setRange] = useState('30d');
  const { data, error, loading, reload } = useAsync((signal) => api.admin.salesReport(range, signal), [range]);

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Sales reports</h1>
          <p className="muted">Paid orders, net of refunds. Times are UTC.</p>
        </div>
        <div className="admin-head__actions">
          <label className="status-select">
            <span className="visually-hidden">Date range</span>
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <a className="btn btn--outline btn--sm" href={api.admin.exportUrl('sales', range)} download>
            <Icon name="download" size={14} /> Sales CSV
          </a>
          <a className="btn btn--outline btn--sm" href={api.admin.exportUrl('orders', range)} download>
            <Icon name="download" size={14} /> Orders CSV
          </a>
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner label="Building report…" />
      ) : (
        <>
          <section className="stats" aria-label="Totals for the selected range">
            {[
              ['Net revenue', formatPrice(data.totals.revenue), data.totals.refunds ? `${formatPrice(data.totals.refunds)} refunded` : 'No refunds'],
              ['Orders', data.totals.orders, `${data.totals.items} items sold`],
              ['Average order', formatPrice(data.totals.averageOrder), 'Per paid order'],
              ['Tax collected', formatPrice(data.totals.tax), `${formatPrice(data.totals.deliveryFees)} delivery fees`],
            ].map(([label, value, sub]) => (
              <div key={label} className="stat">
                <span className="stat__label">{label}</span>
                <span className="stat__value">{value}</span>
                <span className="stat__sub">{sub}</span>
              </div>
            ))}
          </section>

          <section className="panel">
            <ColumnChart
              title={`Net revenue per ${data.group}`}
              format={shortMoney}
              data={data.series.map((s) => ({ label: periodLabel(s.period, data.group), value: s.revenue, sub: `${s.orders} order${s.orders === 1 ? '' : 's'}` }))}
            />
          </section>

          <div className="admin-grid">
            <section className="panel">
              <h2 className="panel__title">Sales by department</h2>
              {data.departments.length ? (
                <HBars rows={data.departments.map((d) => ({ ...d, unitsLabel: `${d.units} unit${d.units === 1 ? '' : 's'}` }))} labelKey="department" valueKey="revenue" format={formatPrice} subKey="unitsLabel" />
              ) : (
                <p className="muted">No sales in this period.</p>
              )}
            </section>

            <section className="panel">
              <h2 className="panel__title">Pickup vs delivery</h2>
              <div className="split-stats">
                {[
                  ['PICKUP', 'Store pickup', 'store'],
                  ['DELIVERY', 'Home delivery', 'truck'],
                ].map(([k, label, icon]) => {
                  const share = data.totals.orders ? Math.round((data.fulfilment[k].orders / data.totals.orders) * 100) : 0;
                  return (
                    <div key={k} className="split-stat">
                      <Icon name={icon} size={22} />
                      <div>
                        <strong>{label}</strong>
                        <span>
                          {data.fulfilment[k].orders} order{data.fulfilment[k].orders === 1 ? '' : 's'} · {share}% · {formatPrice(data.fulfilment[k].revenue)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel">
              <h2 className="panel__title">Best sellers</h2>
              {data.bestSellers.length ? (
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
                    {data.bestSellers.map((p) => (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td className="num">{p.units}</td>
                        <td className="num">{formatPrice(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No sales in this period.</p>
              )}
            </section>

            <section className="panel">
              <h2 className="panel__title">Slow movers</h2>
              <p className="muted">Active grocery items with no sales in this period (first 10), then the lowest sellers.</p>
              <ul className="mini-list">
                {data.unsold.map((u) => (
                  <li key={u.name}>
                    <span>
                      {u.name}
                      <small className="block muted">{u.department}</small>
                    </span>
                    <span className="mini-list__end">0 sold · {u.inventory} in stock</span>
                  </li>
                ))}
                {data.slowSellers.map((p) => (
                  <li key={p.name}>
                    <span>{p.name}</span>
                    <span className="mini-list__end">
                      {p.units} sold · {formatPrice(p.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
