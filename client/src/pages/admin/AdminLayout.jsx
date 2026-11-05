import { Suspense } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo.jsx';
import Icon from '../../components/Icon.jsx';
import { Spinner } from '../../components/Feedback.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/products', label: 'Products', icon: 'box' },
  { to: '/admin/deli', label: 'Deli availability', icon: 'flame' },
  { to: '/admin/orders', label: 'Orders', icon: 'receipt' },
  { to: '/admin/categories', label: 'Categories', icon: 'tag' },
  { to: '/admin/messages', label: 'Messages', icon: 'chat' },
];

const ACCOUNT_NAV = [
  { to: '/account', label: 'My account', icon: 'user', end: true },
  { to: '/account/profile', label: 'Profile & security', icon: 'lock' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="admin">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      <aside className="admin-sidebar">
        <Logo compact to="/admin" />
        <nav aria-label="Admin">
          <ul>
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end}>
                  <Icon name={n.icon} size={18} /> <span>{n.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Your account" className="admin-sidebar__account">
          <p className="admin-sidebar__heading">Your account</p>
          <ul>
            {ACCOUNT_NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end}>
                  <Icon name={n.icon} size={18} /> <span>{n.label}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="admin-sidebar__signout"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
              >
                <Icon name="logout" size={18} /> <span>Sign out</span>
              </button>
            </li>
          </ul>
        </nav>
        <div className="admin-sidebar__foot">
          <p>
            Signed in as <strong>{user.name}</strong>
          </p>
          <Link to="/">
            <Icon name="arrowLeft" size={14} /> Back to store
          </Link>
        </div>
      </aside>
      <main id="admin-main" className="admin-main" tabIndex={-1}>
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
