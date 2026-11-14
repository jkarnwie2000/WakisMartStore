import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import SearchBar from './SearchBar.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { DEPARTMENTS } from '../utils/departments.js';
import { useStoreConfig } from '../context/StoreContext.jsx';

export function AnnouncementBar() {
  const { announcement } = useStoreConfig();
  if (announcement) {
    return (
      <div className="announcement">
        <p>
          <Icon name="flame" size={15} /> {announcement}
        </p>
      </div>
    );
  }
  return (
    <div className="announcement">
      <p>
        <Icon name="flame" size={15} /> Fresh from our deli: jollof, jerk chicken &amp; curry goat cooked daily ·{' '}
        <Link to="/shop?onSale=true">Shop this week’s specials</Link>
      </p>
    </div>
  );
}

export default function Header() {
  const { count } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    document.body.classList.toggle('no-scroll', menuOpen);
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="container header-main">
        <button type="button" className="icon-btn header-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="mobile-nav">
          <Icon name="menu" size={24} />
        </button>
        <Logo />
        <div className="header-search">
          <SearchBar />
        </div>
        <div className="header-actions">
          {isAdmin && (
            <Link to="/admin" className="header-action header-action--admin">
              <Icon name="grid" />
              <span>Admin</span>
            </Link>
          )}
          <Link
            to={user ? '/account' : '/login'}
            className="header-action"
            aria-label={user ? `My account (signed in as ${user.name})` : 'Sign in'}
            title={user ? `Signed in as ${user.name}` : undefined}
          >
            <Icon name="user" />
            <span>{user ? 'My account' : 'Sign in'}</span>
          </Link>
          <Link to="/cart" className="header-action header-cart" aria-label={`Shopping cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
            <Icon name="cart" size={24} />
            <span className="cart-count" aria-hidden="true" data-empty={count === 0 || undefined}>
              {count > 99 ? '99+' : count}
            </span>
            <span className="header-cart-label">Cart</span>
          </Link>
        </div>
      </div>
      <div className="container header-search-mobile">
        <SearchBar />
      </div>

      <nav className="main-nav" aria-label="Departments">
        <ul className="container main-nav__list">
          <li>
            <NavLink to="/shop" end>
              Shop All
            </NavLink>
          </li>
          {DEPARTMENTS.map((d) => (
            <li key={d.slug}>
              <NavLink to={d.path} className={d.slug === 'deli' ? 'nav-deli' : undefined}>
                {d.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={`drawer-backdrop ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <nav id="mobile-nav" className={`drawer ${menuOpen ? 'is-open' : ''}`} aria-label="Mobile menu" aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="drawer__head">
          <Logo compact />
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <Icon name="close" size={24} />
          </button>
        </div>
        <ul className="drawer__list">
          <li>
            <NavLink to="/shop" end>
              Shop All Products
            </NavLink>
          </li>
          {DEPARTMENTS.map((d) => (
            <li key={d.slug}>
              <NavLink to={d.path}>{d.label}</NavLink>
            </li>
          ))}
        </ul>
        <ul className="drawer__list drawer__list--secondary">
          {user ? (
            <>
              <li>
                <NavLink to="/account" end>
                  My account &amp; orders
                </NavLink>
              </li>
              <li>
                <NavLink to="/account/profile">Profile &amp; security</NavLink>
              </li>
            </>
          ) : (
            <li>
              <NavLink to="/login">Sign in / Register</NavLink>
            </li>
          )}
          {isAdmin && (
            <li>
              <NavLink to="/admin">Admin dashboard</NavLink>
            </li>
          )}
          <li>
            <NavLink to="/about">About us</NavLink>
          </li>
          <li>
            <NavLink to="/contact">Contact us</NavLink>
          </li>
          {user && (
            <li>
              <button
                type="button"
                className="drawer__signout"
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  navigate('/');
                }}
              >
                Sign out
              </button>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
