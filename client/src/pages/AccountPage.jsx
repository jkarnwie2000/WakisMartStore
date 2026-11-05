import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import FormField from '../components/FormField.jsx';
import OrderDetails, { StatusPill } from '../components/OrderDetails.jsx';
import { Alert, EmptyState, ErrorState, NotFoundState, Spinner } from '../components/Feedback.jsx';
import { Breadcrumbs } from '../components/Section.jsx';
import Icon from '../components/Icon.jsx';
import { formatDate, formatPrice, pluralize } from '../utils/format.js';

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    line1: user.address?.line1 || '',
    line2: user.address?.line2 || '',
    city: user.address?.city || '',
    state: user.address?.state || '',
    postalCode: user.address?.postalCode || '',
  });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setStatus({ type: 'error', text: 'Please enter your name.' });
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        phone: form.phone,
        address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, postalCode: form.postalCode },
      });
      setStatus({ type: 'success', text: 'Your profile has been saved.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2 className="panel__title">Profile</h2>
      {status && <Alert type={status.type}>{status.text}</Alert>}
      <div className="form-grid">
        <FormField label="Full name" required value={form.name} onChange={set('name')} autoComplete="name" />
        <FormField label="Email" value={user.email} disabled hint="Contact us to change your email." />
        <FormField label="Phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
        <span />
        <FormField label="Street address" value={form.line1} onChange={set('line1')} autoComplete="address-line1" className="span-2" />
        <FormField label="Apartment, suite, etc." value={form.line2} onChange={set('line2')} autoComplete="address-line2" className="span-2" />
        <FormField label="City" value={form.city} onChange={set('city')} autoComplete="address-level2" />
        <FormField label="State / region" value={form.state} onChange={set('state')} autoComplete="address-level1" />
        <FormField label="Postal code" value={form.postalCode} onChange={set('postalCode')} autoComplete="postal-code" />
      </div>
      <p className="panel__hint">Your saved address pre-fills checkout for home delivery.</p>
      <button type="submit" className="btn btn--primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [status, setStatus] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setStatus({ type: 'error', text: 'New passwords do not match.' });
    try {
      await api.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setStatus({ type: 'success', text: 'Password updated.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2 className="panel__title">Change password</h2>
      {status && <Alert type={status.type}>{status.text}</Alert>}
      <FormField label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} required />
      <FormField label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} required hint="At least 8 characters, with a letter and a number." />
      <FormField label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
      <button type="submit" className="btn btn--outline">
        Update password
      </button>
    </form>
  );
}

function OrderHistory() {
  const { data, error, loading, reload } = useAsync(() => api.myOrders(), []);
  if (loading) return <Spinner label="Loading your orders…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.orders.length) {
    return (
      <EmptyState icon="receipt" title="No orders yet" action={<Link to="/shop" className="btn btn--primary">Start shopping</Link>}>
        <p>Orders you place while signed in will appear here.</p>
      </EmptyState>
    );
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="visually-hidden">Your orders</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Date</th>
            <th scope="col">Items</th>
            <th scope="col">Status</th>
            <th scope="col" className="num">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.orders.map((o) => (
            <tr key={o.id}>
              <td>
                <Link to={`/account/orders/${o.orderNumber}`} className="strong-link">
                  {o.orderNumber}
                </Link>
              </td>
              <td>{formatDate(o.createdAt)}</td>
              <td>{pluralize(o.items.reduce((n, i) => n + i.quantity, 0), 'item')}</td>
              <td>
                <StatusPill status={o.status} />
              </td>
              <td className="num">{formatPrice(o.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ACCOUNT_TABS = [
  { id: 'orders', label: 'Order history', to: '/account' },
  { id: 'profile', label: 'Profile & security', to: '/account/profile' },
];

export default function AccountPage() {
  const { pathname } = useLocation();
  // The tab comes from the URL so /account/profile can be linked and bookmarked directly.
  const tab = pathname.startsWith('/account/profile') ? 'profile' : 'orders';
  useDocumentTitle(tab === 'profile' ? 'Profile & Security' : 'My Account');
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="page container">
      <div className="account-head">
        <div>
          <h1 className="page-title">Hello, {user.name.split(' ')[0]}</h1>
          <p className="page-lead">Manage your profile and view your Wakis Mart orders.</p>
        </div>
        <div className="account-head__actions">
          {isAdmin && (
            <Link to="/admin" className="btn btn--outline">
              <Icon name="grid" size={16} /> Admin dashboard
            </Link>
          )}
          <button
            type="button"
            className="btn btn--outline"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      </div>

      <nav className="tabs" aria-label="Account sections">
        {ACCOUNT_TABS.map((t) => (
          <Link key={t.id} to={t.to} className={`tab ${tab === t.id ? 'is-active' : ''}`} aria-current={tab === t.id ? 'page' : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="account-panel">
        {tab === 'orders' ? (
          <OrderHistory />
        ) : (
          <div className="account-grid">
            <ProfileForm />
            <PasswordForm />
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountOrderPage() {
  const { orderNumber } = useParams();
  useDocumentTitle(`Order ${orderNumber}`);
  const { data, error, loading, reload } = useAsync(() => api.myOrder(orderNumber), [orderNumber]);
  if (loading) return <Spinner label="Loading order…" />;
  if (error?.status === 404) return <div className="page container"><NotFoundState title="Order not found" message="We couldn’t find that order on your account." /></div>;
  if (error) return <div className="page container"><ErrorState error={error} onRetry={reload} /></div>;
  return (
    <div className="page container">
      <Breadcrumbs items={[{ label: 'My account', to: '/account' }, { label: `Order ${orderNumber}` }]} />
      <h1 className="page-title">Order details</h1>
      <OrderDetails order={data.order} />
    </div>
  );
}
