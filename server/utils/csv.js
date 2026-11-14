// Minimal RFC 4180 CSV helpers (no dependency).

// Values starting with these characters can be executed as formulas by spreadsheet apps.
const FORMULA_START = /^[=+\-@\t\r]/;
const BOM = String.fromCharCode(0xfeff); // lets Excel detect UTF-8

function cell(value) {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === 'string' && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** @param {object[]} rows  @param {[header:string, key:string|((row)=>any)][]} columns */
export function toCsv(rows, columns) {
  const header = columns.map(([h]) => cell(h)).join(',');
  const body = rows.map((r) => columns.map(([, k]) => cell(typeof k === 'function' ? k(r) : r[k])).join(','));
  return `${BOM}${[header, ...body].join('\r\n')}\r\n`;
}

export function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(csv);
}

/** Parses CSV text into an array of objects keyed by (lower-cased, trimmed) header names. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = String(text).startsWith(BOM) ? String(text).slice(1) : String(text);
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ''));
  if (!nonEmpty.length) return { headers: [], records: [] };
  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase());
  const records = nonEmpty.slice(1).map((r, idx) => ({ line: idx + 2, values: Object.fromEntries(headers.map((h, j) => [h, (r[j] ?? '').trim()])) }));
  return { headers, records };
}
