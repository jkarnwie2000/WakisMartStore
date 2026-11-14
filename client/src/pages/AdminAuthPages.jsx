import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import FormField from '../components/FormField.jsx';
import { Alert, Spinner } from '../components/Feedback.jsx';
import { AuthShell } from './AuthPages.jsx';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const strongEnough = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
// Only allow redirects back into the admin area (no open redirects, no loop to the login page itself).
const safeAdminNext = (next) => (next && next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin');

export function AdminLoginPage() {
  useDocumentTitle('Admin Sign In');
  const { login, logout, user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeAdminNext(params.get('next'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner />;
  if (user && isAdmin && !submitting) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!EMAIL_RE.test(form.email)) v.email = 'Please enter a valid email address.';
    if (!form.password) v.password = 'Please enter your password.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true);
    setError(null);
    try {
      const u = await login(form);
      if (u.role !== 'ADMIN') {
        await logout();
        setError('This account doesn’t have admin access. Ask an administrator for an invite, then use “Create an admin account” with this same email and password to upgrade it.');
        setSubmitting(false);
        return;
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Admin sign in"
      subtitle="Sign in to manage products, orders and the deli menu."
      footer={
        <>
          New staff member? <Link to="/admin/register">Create an admin account</Link>
          <span className="auth-card__note">You’ll need an invite code or link from an existing administrator. Shopping with us? Use the <Link to="/login">customer sign-in</Link>.</span>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="auth-form">
        {user && !isAdmin && (
          <Alert type="info">You’re signed in as {user.email}, which doesn’t have admin access. Sign in with an administrator account below.</Alert>
        )}
        {error && <Alert type="error">{error}</Alert>}
        <FormField label="Email" type="email" autoComplete="username" required value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <FormField label="Password" type="password" autoComplete="current-password" required value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <p className="auth-form__forgot">
          <Link to="/forgot-password?from=admin">Forgot password?</Link>
        </p>
        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in to admin'}
        </button>
        <p className="auth-form__guest">
          <Link to="/">← Back to the store</Link>
        </p>
      </form>
    </AuthShell>
  );
}

const formatCode = (v) => {
  const c = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return c.match(/.{1,4}/g)?.join('-') || '';
};

/** Staff sign-up: requires an invite code from an existing administrator. */
export function AdminRegisterPage() {
  useDocumentTitle('Create Admin Account');
  const { registerAdmin, user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ code: formatCode(params.get('code') || ''), name: '', email: '', password: '', confirm: '' });
  const [invite, setInvite] = useState(null); // { valid, email, invitedBy, expiresAt, message }
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const codeComplete = form.code.replace(/-/g, '').length === 12;

  // Check the code as soon as it's complete (from the link or typed), and pre-fill a locked email.
  useEffect(() => {
    if (!codeComplete) {
      setInvite(null);
      return;
    }
    let cancelled = false;
    api
      .checkAdminInvite(form.code)
      .then((r) => {
        if (cancelled) return;
        setInvite(r);
        if (r.valid && r.email) setForm((f) => ({ ...f, email: r.email }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [form.code, codeComplete]);

  if (loading) return <Spinner />;
  if (user && isAdmin && !submitting) return <Navigate to="/admin" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: k === 'code' ? formatCode(e.target.value) : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!codeComplete) v.code = 'Enter the 12-character invite code (e.g. ABCD-EFGH-JKLM).';
    if (form.name.trim().length < 2) v.name = 'Please enter your name.';
    if (!EMAIL_RE.test(form.email)) v.email = 'Please enter a valid email address.';
    if (!strongEnough(form.password)) v.password = 'Use at least 8 characters, including a letter and a number.';
    if (form.confirm !== form.password) v.confirm = 'Passwords do not match.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true);
    setError(null);
    try {
      await registerAdmin({ code: form.code, name: form.name, email: form.email, password: form.password });
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.data?.details?.[0]?.message || err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create an admin account"
      subtitle="For Wakis Mart staff. You’ll go straight to the admin dashboard."
      footer={
        <>
          Already have an admin account? <Link to="/admin/login">Admin sign in</Link>
          <span className="auth-card__note">
            Shopping with us? <Link to="/register">Create a customer account</Link> instead.
          </span>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="auth-form">
        {user && !isAdmin && (
          <Alert type="info">You’re signed in as {user.email}. To make this account an admin, enter your invite code with this email and its current password.</Alert>
        )}
        {error && <Alert type="error">{error}</Alert>}
        <FormField
          label="Invite code"
          required
          value={form.code}
          onChange={set('code')}
          error={errors.code || (invite && !invite.valid ? invite.message : undefined)}
          hint={invite?.valid ? `Valid invite from ${invite.invitedBy}` : 'From the invite link or email an administrator sent you.'}
          autoComplete="off"
          spellCheck={false}
          className="invite-code-field"
        />
        <FormField label="Full name" autoComplete="name" required value={form.name} error={errors.name} onChange={set('name')} />
        <FormField
          label="Work email"
          type="email"
          autoComplete="username"
          required
          value={form.email}
          error={errors.email}
          onChange={set('email')}
          readOnly={Boolean(invite?.valid && invite.email)}
          hint={invite?.valid && invite.email ? 'This invite is for this email address.' : 'If you already have a customer account, use its email and password to upgrade it.'}
        />
        <FormField label="Password" type="password" autoComplete="new-password" required value={form.password} error={errors.password} onChange={set('password')} hint="At least 8 characters, with a letter and a number." />
        <FormField label="Confirm password" type="password" autoComplete="new-password" required value={form.confirm} error={errors.confirm} onChange={set('confirm')} />
        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting || (invite && !invite.valid)}>
          {submitting ? 'Creating account…' : 'Create admin account'}
        </button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  useDocumentTitle('Forgot Password');
  const [params] = useSearchParams();
  const signInPath = params.get('from') === 'admin' ? '/admin/login' : '/login';
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setResult(await api.forgotPassword(email));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your account email and we’ll send you a link to choose a new password."
      footer={
        <>
          Remembered it? <Link to={signInPath}>Back to sign in</Link>
        </>
      }
    >
      {result ? (
        <div className="auth-form">
          <Alert type="success" title="Check your email">
            {result.message}
          </Alert>
          {!result.emailEnabled && (
            <Alert type="warning">Email sending isn’t switched on for this store yet, so no message could be sent. Please contact the store owner.</Alert>
          )}
          <p className="auth-form__guest">The link expires in 60 minutes and can only be used once.</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="auth-form">
          <FormField label="Email" type="email" autoComplete="email" required value={email} error={error} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  useDocumentTitle('Reset Password');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!strongEnough(form.password)) v.password = 'Use at least 8 characters, including a letter and a number.';
    if (form.confirm !== form.password) v.confirm = 'Passwords do not match.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.resetPassword(token, form.password);
      setDone(r.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" subtitle="For your security, this also signs you out on other devices." footer={<Link to="/login">Back to sign in</Link>}>
      {!validToken ? (
        <div className="auth-form">
          <Alert type="error">This reset link is invalid or incomplete. Please request a new one.</Alert>
          <Link to="/forgot-password" className="btn btn--primary btn--block">
            Request a new link
          </Link>
        </div>
      ) : done ? (
        <div className="auth-form">
          <Alert type="success" title="Password updated">
            {done}
          </Alert>
          <div className="auth-form__actions">
            <Link to="/login" className="btn btn--primary">
              Customer sign in
            </Link>
            <Link to="/admin/login" className="btn btn--outline">
              Admin sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="auth-form">
          {error && (
            <Alert type="error">
              {error} <Link to="/forgot-password">Request a new link</Link>
            </Alert>
          )}
          <FormField
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            error={errors.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="At least 8 characters, with a letter and a number."
          />
          <FormField label="Confirm new password" type="password" autoComplete="new-password" required value={form.confirm} error={errors.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
            {submitting ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
