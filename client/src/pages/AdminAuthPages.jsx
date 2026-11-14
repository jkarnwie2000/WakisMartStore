import { useState } from 'react';
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
        setError('This account doesn’t have admin access. An existing administrator can grant access from Admin → Users.');
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
          Need staff access? <Link to="/register">Create an account</Link>
          <span className="auth-card__note">
            New accounts start as customer accounts. An existing administrator grants admin access from Admin → Users.
          </span>
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
