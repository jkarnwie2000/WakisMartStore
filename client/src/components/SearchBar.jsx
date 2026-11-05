import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { api } from '../services/api.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { formatPrice } from '../utils/format.js';

/** Header search with live suggestions (combobox pattern). Enter goes to full results. */
export default function SearchBar({ onNavigate, autoFocus = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounce(query.trim(), 250);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    api
      .products({ search: debounced, limit: 6 }, controller.signal)
      .then((r) => {
        setResults(r.products);
        setActive(-1);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [debounced]);

  // Close suggestions on route change / outside click.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    const onDown = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (path) => {
    setOpen(false);
    onNavigate?.();
    navigate(path);
  };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && results[active]) return go(`/product/${results[active].slug}`);
    const q = query.trim();
    go(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && debounced.length >= 2;

  return (
    <div className="search" ref={wrapRef}>
      <form role="search" onSubmit={submit} className="search__form">
        <label htmlFor={`${listId}-input`} className="visually-hidden">
          Search products
        </label>
        <input
          id={`${listId}-input`}
          className="search__input"
          type="search"
          placeholder="Search jollof, ackee, egusi, plantain…"
          autoComplete="off"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
        />
        <button type="submit" className="search__btn" aria-label="Search">
          <Icon name="search" size={18} />
        </button>
      </form>
      {showList && (
        <ul id={listId} className="search__results" role="listbox" aria-label="Search suggestions">
          {results.length === 0 && <li className="search__empty">No matches for “{debounced}”</li>}
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`search__result ${i === active ? 'is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                go(`/product/${p.slug}`);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <img src={p.image} alt="" width="40" height="40" loading="lazy" />
              <span className="search__result-name">
                {p.name}
                <small>{p.category?.name}</small>
              </span>
              <span className="search__result-price">{formatPrice(p.price)}</span>
            </li>
          ))}
          {results.length > 0 && (
            <li
              role="option"
              aria-selected={false}
              className="search__all"
              onMouseDown={(e) => {
                e.preventDefault();
                go(`/shop?q=${encodeURIComponent(debounced)}`);
              }}
            >
              See all results for “{debounced}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
