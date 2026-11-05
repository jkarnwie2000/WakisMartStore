import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import ProductGrid from '../components/ProductGrid.jsx';
import { Breadcrumbs } from '../components/Section.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import { DEPARTMENTS } from '../utils/departments.js';
import { pluralize } from '../utils/format.js';

const PAGE_SIZE = 24;
const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A–Z' },
  { value: 'name_desc', label: 'Name: Z–A' },
  { value: 'newest', label: 'Newest' },
];
const FILTER_KEYS = ['q', 'sort', 'origin', 'brand', 'minPrice', 'maxPrice', 'inStock', 'featured', 'onSale', 'subcategory', 'category'];

function PriceFilter({ min, max, onApply }) {
  const [lo, setLo] = useState(min || '');
  const [hi, setHi] = useState(max || '');
  useEffect(() => {
    setLo(min || '');
    setHi(max || '');
  }, [min, max]);
  const apply = (e) => {
    e.preventDefault();
    onApply(lo, hi);
  };
  return (
    <form className="price-filter" onSubmit={apply}>
      <label>
        <span className="visually-hidden">Minimum price</span>
        <span aria-hidden="true">$</span>
        <input type="number" min="0" step="0.5" placeholder="Min" value={lo} onChange={(e) => setLo(e.target.value)} />
      </label>
      <span aria-hidden="true">–</span>
      <label>
        <span className="visually-hidden">Maximum price</span>
        <span aria-hidden="true">$</span>
        <input type="number" min="0" step="0.5" placeholder="Max" value={hi} onChange={(e) => setHi(e.target.value)} />
      </label>
      <button type="submit" className="btn btn--outline btn--sm">
        Go
      </button>
    </form>
  );
}

function Filters({ params, setParam, facets, categorySlug, onClear, activeCount }) {
  const [showAllBrands, setShowAllBrands] = useState(false);
  const selectedBrands = params.get('brand')?.split(',').filter(Boolean) || [];
  const brands = facets?.brands || [];
  const visibleBrands = showAllBrands ? brands : brands.slice(0, 10);
  const toggleBrand = (b) => {
    const next = selectedBrands.includes(b) ? selectedBrands.filter((x) => x !== b) : [...selectedBrands, b];
    setParam('brand', next.join(','));
  };

  return (
    <div className="filters">
      <div className="filters__head">
        <h2 className="filters__title">Filters</h2>
        {activeCount > 0 && (
          <button type="button" className="link-btn" onClick={onClear}>
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {!categorySlug && (
        <fieldset className="filter-group">
          <legend>Department</legend>
          <ul className="filter-links">
            {DEPARTMENTS.map((d) => (
              <li key={d.slug}>
                <Link to={d.path}>{d.label}</Link>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {facets?.subcategories?.length > 1 && (
        <fieldset className="filter-group">
          <legend>Type</legend>
          <label className="check">
            <input type="radio" name="subcategory" checked={!params.get('subcategory')} onChange={() => setParam('subcategory', '')} />
            <span>All types</span>
          </label>
          {facets.subcategories.map((s) => (
            <label key={s.value} className="check">
              <input type="radio" name="subcategory" checked={params.get('subcategory') === s.value} onChange={() => setParam('subcategory', s.value)} />
              <span>
                {s.value} <small>({s.count})</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <fieldset className="filter-group">
        <legend>Origin</legend>
        {[
          ['', 'All origins'],
          ['AFRICAN', 'African'],
          ['CARIBBEAN', 'Caribbean'],
        ].map(([v, label]) => (
          <label key={v || 'all'} className="check">
            <input type="radio" name="origin" checked={(params.get('origin') || '') === v} onChange={() => setParam('origin', v)} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="filter-group">
        <legend>Price</legend>
        <PriceFilter
          min={params.get('minPrice')}
          max={params.get('maxPrice')}
          onApply={(lo, hi) => setParam({ minPrice: lo, maxPrice: hi })}
        />
      </fieldset>

      <fieldset className="filter-group">
        <legend>Show</legend>
        {[
          ['inStock', 'In stock only'],
          ['featured', 'Featured products'],
          ['onSale', 'Weekly specials'],
        ].map(([key, label]) => (
          <label key={key} className="check">
            <input type="checkbox" checked={params.get(key) === 'true'} onChange={(e) => setParam(key, e.target.checked ? 'true' : '')} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      {brands.length > 0 && (
        <fieldset className="filter-group">
          <legend>Brand</legend>
          {visibleBrands.map((b) => (
            <label key={b.value} className="check">
              <input type="checkbox" checked={selectedBrands.includes(b.value)} onChange={() => toggleBrand(b.value)} />
              <span>
                {b.value} <small>({b.count})</small>
              </span>
            </label>
          ))}
          {brands.length > 10 && (
            <button type="button" className="link-btn" onClick={() => setShowAllBrands((s) => !s)}>
              {showAllBrands ? 'Show fewer brands' : `Show all ${brands.length} brands`}
            </button>
          )}
        </fieldset>
      )}
    </div>
  );
}

export default function ShopPage({ categorySlug }) {
  const [params, setParams] = useSearchParams();
  const department = DEPARTMENTS.find((d) => d.slug === (categorySlug || params.get('category')));
  const [category, setCategory] = useState(null);
  const [state, setState] = useState({ products: [], total: 0, page: 0, pages: 1, facets: null, loading: true, loadingMore: false, error: null });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState(params.get('q') || '');
  const debouncedSearch = useDebounce(searchText, 350);
  const requestRef = useRef(0);

  useDocumentTitle(params.get('q') ? `Search: ${params.get('q')}` : department?.label || 'Shop All Products');

  const setParam = useCallback(
    (keyOrObj, value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const entries = typeof keyOrObj === 'object' ? Object.entries(keyOrObj) : [[keyOrObj, value]];
          for (const [k, v] of entries) {
            if (v === '' || v == null) next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Live search: typing updates the URL (debounced), which refetches results.
  useEffect(() => {
    if ((params.get('q') || '') !== debouncedSearch.trim()) setParam('q', debouncedSearch.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  // Keep the input in sync when the URL changes elsewhere (e.g. header search).
  const urlQ = params.get('q') || '';
  useEffect(() => {
    setSearchText((s) => (s.trim() === urlQ ? s : urlQ));
  }, [urlQ]);

  useEffect(() => {
    if (!categorySlug) {
      setCategory(null);
      return;
    }
    api.category(categorySlug).then((r) => setCategory(r.category)).catch(() => setCategory(null));
  }, [categorySlug]);

  const query = useMemo(() => {
    const q = {};
    for (const key of FILTER_KEYS) if (params.get(key)) q[key === 'q' ? 'search' : key] = params.get(key);
    if (categorySlug) q.category = categorySlug;
    return q;
  }, [params, categorySlug]);
  const queryKey = JSON.stringify(query);

  const fetchPage = useCallback(
    async (page, append) => {
      const id = ++requestRef.current;
      setState((s) => ({ ...s, loading: !append, loadingMore: append, error: null }));
      try {
        const r = await api.products({ ...query, page, limit: PAGE_SIZE });
        if (id !== requestRef.current) return;
        setState((s) => ({
          products: append ? [...s.products, ...r.products] : r.products,
          total: r.total,
          page: r.page,
          pages: r.pages,
          facets: r.facets,
          loading: false,
          loadingMore: false,
          error: null,
        }));
      } catch (error) {
        if (id === requestRef.current) setState((s) => ({ ...s, loading: false, loadingMore: false, error }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey],
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const activeCount = FILTER_KEYS.filter((k) => k !== 'sort' && k !== 'q' && k !== 'category' && params.get(k)).length;
  const clearFilters = () => {
    const next = new URLSearchParams();
    if (params.get('q')) next.set('q', params.get('q'));
    if (params.get('sort')) next.set('sort', params.get('sort'));
    setParams(next, { replace: true });
  };

  const title = department?.label || 'Shop All Products';
  const description = category?.description || (department ? '' : 'Browse our full range of African and Caribbean groceries, fresh produce, meat, frozen foods, snacks, drinks and deli dishes.');

  return (
    <div className="page">
      <section className={`page-hero ${categorySlug ? `page-hero--${categorySlug}` : ''}`}>
        <div className="container page-hero__inner">
          <div>
            <Breadcrumbs items={[{ label: 'Home', to: '/' }, ...(department ? [{ label: 'Shop', to: '/shop' }] : []), { label: title }]} />
            <h1 className="page-title">{title}</h1>
            {description && <p className="page-lead">{description}</p>}
          </div>
          {category?.image && <img className="page-hero__img" src={category.image} alt="" width="160" height="160" />}
        </div>
      </section>

      <div className="container shop-layout">
        <aside className={`shop-filters ${filtersOpen ? 'is-open' : ''}`} aria-label="Product filters">
          <div className="shop-filters__mobile-head">
            <strong>Filter products</strong>
            <button type="button" className="icon-btn" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
              <Icon name="close" size={22} />
            </button>
          </div>
          <Filters params={params} setParam={setParam} facets={state.facets} categorySlug={categorySlug} onClear={clearFilters} activeCount={activeCount} />
          <button type="button" className="btn btn--primary btn--block shop-filters__done" onClick={() => setFiltersOpen(false)}>
            Show {pluralize(state.total, 'result')}
          </button>
        </aside>
        {filtersOpen && <div className="drawer-backdrop is-open shop-filters__backdrop" onClick={() => setFiltersOpen(false)} aria-hidden="true" />}

        <section className="shop-results" aria-labelledby="results-heading">
          <div className="toolbar">
            <div className="toolbar__search">
              <Icon name="search" size={18} />
              <label htmlFor="shop-search" className="visually-hidden">
                Search {department ? department.label : 'all products'}
              </label>
              <input
                id="shop-search"
                type="search"
                placeholder={department ? `Search ${department.label.toLowerCase()}…` : 'Search products, brands, categories…'}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn--outline toolbar__filters-btn" onClick={() => setFiltersOpen(true)}>
              <Icon name="filter" size={16} /> Filters{activeCount ? ` (${activeCount})` : ''}
            </button>
            <label className="toolbar__sort">
              <span>Sort by</span>
              <select value={params.get('sort') || ''} onChange={(e) => setParam('sort', e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h2 id="results-heading" className="results-count" aria-live="polite">
            {state.loading ? 'Loading products…' : `${pluralize(state.total, 'product')}${params.get('q') ? ` for “${params.get('q')}”` : ''}`}
          </h2>

          {state.error ? (
            <ErrorState error={state.error} onRetry={() => fetchPage(1, false)} />
          ) : !state.loading && state.products.length === 0 ? (
            <EmptyState
              icon="search"
              title="No products match your search"
              action={
                <button type="button" className="btn btn--primary" onClick={() => { setSearchText(''); setParams(new URLSearchParams(), { replace: true }); }}>
                  Clear search &amp; filters
                </button>
              }
            >
              <p>Try a different spelling, a broader term (e.g. “rice” or “pepper”), or remove some filters.</p>
            </EmptyState>
          ) : (
            <>
              <ProductGrid products={state.loading ? [] : state.products} loading={state.loading} skeletons={12} />
              {!state.loading && state.page < state.pages && (
                <div className="load-more">
                  <p>
                    Showing {state.products.length} of {state.total}
                  </p>
                  <button type="button" className="btn btn--outline btn--lg" onClick={() => fetchPage(state.page + 1, true)} disabled={state.loadingMore}>
                    {state.loadingMore ? <Spinner inline label="Loading more…" /> : 'Load more products'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
