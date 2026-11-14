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

const INVITE_STATE = { ACTIVE: ['Active', 'pill--order-ready-for-pickup'], USED: ['Used', 'pill--order-completed'], EXPIRED: ['Expired', ''], REVOKED: ['Revoked', 'pill--order-cancelled'] };

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this:', value);
    }
  };
  return (
    <div className="copy-field">
      <span className="copy-field__label">{label}</span>
      <code className="copy-field__value">{value}</code>
      <button type="button" className="btn btn--outline btn--sm" onClick={copy}>
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  );
}

/** Create one-time invites that let new staff sign up directly as administrators. */
function InvitePanel() {
  const { notify } = useToast();
  const [form, setForm] = useState({ email: '', note: '', expiresInDays: 7 });
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = useAsync(() => api.admin.invites(), []);

  const create = async (e) => {
    e.preventDefault();
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return notify('Please enter a valid email address, or leave it blank.', { type: 'error' });
    setBusy(true);
    try {
      const r = await api.admin.createInvite({ ...form, expiresInDays: Number(form.expiresInDays) });
      setCreated(r);
      setForm({ email: '', note: '', expiresInDays: 7 });
      list.reload();
      notify(r.emailed ? `Invite created and emailed to ${r.invite.email}.` : 'Invite created — copy the link below and send it to your staff member.');
    } catch (err) {
      notify(err.data?.details?.[0]?.message || err.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (inv) => {
    if (!window.confirm(`Revoke this invite${inv.email ? ` for ${inv.email}` : ''}? The link and code will stop working.`)) return;
    try {
      await api.admin.revokeInvite(inv.id);
      notify('Invite revoked.');
      list.reload();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  const recent = list.data?.invites || [];
  return (
    <section className="panel invite-panel">
      <h2 className="panel__title">
        <Icon name="user" size={20} /> Invite an admin
      </h2>
      <p className="muted">
        Create a one-time invite. Your staff member opens the link (or enters the code at <strong>/admin/register</strong>), sets a password and lands in this dashboard as an
        administrator. Customer sign-up never grants admin access.
      </p>
      <form className="invite-form" onSubmit={create}>
        <label className="field">
          <span className="field__label">Their email (optional)</span>
          <input className="field__control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Lock the invite to this email" />
        </label>
        <label className="field">
          <span className="field__label">Note (optional)</span>
          <input className="field__control" maxLength={200} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Weekend manager" />
        </label>
        <label className="field">
          <span className="field__label">Expires after</span>
          <select className="field__control" value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })}>
            {[1, 3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d} day{d === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create invite'}
        </button>
      </form>

      {created && (
        <div className="invite-created" role="status">
          <p>
            <strong>Invite ready{created.invite.email ? ` for ${created.invite.email}` : ''}.</strong>{' '}
            {created.emailed ? 'We’ve emailed it too. ' : created.invite.email && !created.emailEnabled ? 'Email isn’t switched on, so send the link yourself. ' : ''}
            This is the only time the code is shown. It works once and expires {formatDate(created.invite.expiresAt, true)}.
          </p>
          <CopyField label="Invite link" value={created.link} />
          <CopyField label="Invite code" value={created.code} />
        </div>
      )}

      {recent.length > 0 && (
        <details className="invite-list" open={recent.some((i) => i.state === 'ACTIVE')}>
          <summary>Recent invites ({recent.length})</summary>
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th scope="col">For</th>
                <th scope="col">Created</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.email || <span className="muted">Anyone with the code</span>}
                    {i.note && <small className="block muted">{i.note}</small>}
                  </td>
                  <td>
                    {formatDate(i.createdAt)} <small className="muted">by {i.createdByName}</small>
                  </td>
                  <td>
                    <span className={`pill ${INVITE_STATE[i.state][1]}`}>{INVITE_STATE[i.state][0]}</span>
                    {i.state === 'USED' && <small className="block muted">by {i.usedByEmail}</small>}
                    {i.state === 'ACTIVE' && <small className="block muted">until {formatDate(i.expiresAt)}</small>}
                  </td>
                  <td className="actions">
                    {i.state === 'ACTIVE' && (
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => revoke(i)}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}

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
          <p className="muted">Invite new staff below, or promote an existing account. Customer sign-ups are always customer accounts.</p>
        </div>
      </div>

      <InvitePanel />

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
