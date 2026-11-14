import { useState } from 'react';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { EmptyState, ErrorState, Spinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import { formatDate } from '../../utils/format.js';

/** Lists accounts and lets administrators grant or remove admin access. */
export default function AdminUsers() {
  useDocumentTitle('Users & Admin Access');
  const { user: me } = useAuth();
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [busyId, setBusyId] = useState(null);
  const q = useDebounce(search, 300);
  const { data, error, loading, reload, setData } = useAsync((signal) => api.admin.users({ search: q, role }, signal), [q, role]);

  const changeRole = async (u, nextRole) => {
    const question =
      nextRole === 'ADMIN'
        ? `Give ${u.name} (${u.email}) full admin access? They will be able to manage products, orders and other users.`
        : `Remove admin access from ${u.name} (${u.email})?`;
    if (!window.confirm(question)) return;
    setBusyId(u.id);
    try {
      const r = await api.admin.updateUserRole(u.id, nextRole);
      setData((d) => ({ ...d, users: d.users.map((x) => (x.id === u.id ? { ...x, role: r.user.role } : x)) }));
      notify(r.message);
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Users &amp; admin access</h1>
          <p className="muted">New accounts start as customers. Grant admin access here to staff who created an account from the admin sign-in page.</p>
        </div>
      </div>

      <div className="admin-filters">
        <label className="admin-filters__search">
          <Icon name="search" size={16} />
          <span className="visually-hidden">Search users</span>
          <input type="search" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          <span className="visually-hidden">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All accounts</option>
            <option value="ADMIN">Administrators</option>
            <option value="CUSTOMER">Customers</option>
          </select>
        </label>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : data.users.length === 0 ? (
        <EmptyState icon="user" title="No accounts found" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Joined</th>
                <th scope="col" className="num">
                  Orders
                </th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => {
                const isMe = u.id === me.id;
                return (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      {isMe && <span className="muted"> (you)</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`pill ${u.role === 'ADMIN' ? 'pill--order-completed' : ''}`}>{u.role === 'ADMIN' ? 'Admin' : 'Customer'}</span>
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td className="num">{u.orderCount}</td>
                    <td className="actions">
                      {isMe ? (
                        <span className="muted">—</span>
                      ) : u.role === 'ADMIN' ? (
                        <button type="button" className="btn btn--outline btn--sm" disabled={busyId === u.id} onClick={() => changeRole(u, 'CUSTOMER')}>
                          Remove admin
                        </button>
                      ) : (
                        <button type="button" className="btn btn--primary btn--sm" disabled={busyId === u.id} onClick={() => changeRole(u, 'ADMIN')}>
                          Make admin
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
