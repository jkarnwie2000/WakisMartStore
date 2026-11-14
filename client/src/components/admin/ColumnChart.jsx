import { useId, useMemo, useState } from 'react';

/**
 * Single-series column chart (e.g. revenue per day). One hue, rounded data-ends anchored to the
 * baseline, 2px gaps, recessive grid, one y-axis, hover/focus tooltip, and a table view toggle.
 * @param {{ data: {label:string, value:number, sub?:string}[], format: (n:number)=>string, title: string, height?: number }} props
 */
export default function ColumnChart({ data, format, title, height = 240 }) {
  const id = useId();
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const W = 720;
  const H = height;
  const pad = { top: 16, right: 8, bottom: 34, left: 64 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const { max, ticks } = useMemo(() => {
    const raw = Math.max(1, ...data.map((d) => d.value));
    const pow = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => raw / s <= 4) || pow * 10;
    const top = Math.ceil(raw / step) * step;
    return { max: top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
  }, [data]);

  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(36, slot - 2)); // ≥2px surface gap between columns
  const labelEvery = Math.ceil(data.length / 10);
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  return (
    <figure className="chart">
      <div className="chart__head">
        <figcaption className="chart__title" id={`${id}-title`}>
          {title}
        </figcaption>
        <button type="button" className="link-btn" onClick={() => setShowTable((s) => !s)} aria-pressed={showTable}>
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {showTable ? (
        <div className="table-wrap">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col" className="num">
                  Value
                </th>
                {data.some((d) => d.sub) && <th scope="col">Detail</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label}>
                  <td>{d.label}</td>
                  <td className="num">{format(d.value)}</td>
                  {data.some((x) => x.sub) && <td>{d.sub}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart__plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-title`} preserveAspectRatio="none">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} className="chart__grid" />
                <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="chart__axis">
                  {format(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = pad.left + i * slot + (slot - barW) / 2;
              const top = y(d.value);
              const h = Math.max(0, pad.top + innerH - top);
              const r = Math.min(4, barW / 2, h);
              // Rounded top corners only; square at the baseline.
              const path = h > 0 ? `M${x},${pad.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.top + innerH} Z` : '';
              return (
                <g key={d.label}>
                  {path && <path d={path} className={`chart__bar ${active === i ? 'is-active' : ''}`} />}
                  {/* Hit target is the whole column slot, larger than the mark */}
                  <rect
                    x={pad.left + i * slot}
                    y={pad.top}
                    width={slot}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${d.label}: ${format(d.value)}${d.sub ? `, ${d.sub}` : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  />
                  {i % labelEvery === 0 && (
                    <text x={pad.left + i * slot + slot / 2} y={H - 12} textAnchor="middle" className="chart__axis">
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={pad.left} x2={W - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} className="chart__baseline" />
          </svg>
          {active != null && data[active] && (
            <div
              className="chart__tip"
              // Clamp so the tooltip never covers the y-axis labels or spills past the right edge.
              style={{ left: `${Math.min(88, Math.max(((pad.left + 60) / W) * 100, ((pad.left + active * slot + slot / 2) / W) * 100))}%` }}
              role="status"
            >
              <strong>{format(data[active].value)}</strong>
              <span>{data[active].label}</span>
              {data[active].sub && <span>{data[active].sub}</span>}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
