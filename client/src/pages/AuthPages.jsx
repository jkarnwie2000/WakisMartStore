import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import FormField from '../components/FormField.jsx';
import { Alert, Spinner } from '../components/Feedback.jsx';
import { LogoMark } from '../components/Logo.jsx';

// Only allow internal redirects (prevents open-redirects via ?next=https://evil.example).
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/account');

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="page container auth-page">
      <div className="auth-card">
        <div className="auth-card__head">
          <LogoMark size={52} />
          <h1 className="page-title">{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
        <p className="auth-card__footer">{footer}</p>
      </div>
    </div>
  );
}

export function LoginPage() {
  useDocumentTitle('Sign In');
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner />;
  if (user && !submitting) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) v.email = 'Please enter a valid email address.';
    if (!form.password) v.password = 'Please enter your password.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true);
    setError(null);
    try {
      const u = await login(form);
      navigate(u.role === 'ADMIN' && next === '/account' ? '/admin' : next, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to track orders and check out faster."
      footer={
        <>
          New to Wakis Mart? <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="auth-form">
        {error && <Alert type="error">{error}</Alert>}
        <FormField label="Email" type="email" autoComplete="email" required value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <FormField label="Password" type="password" autoComplete="current-password" required value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <p className="auth-form__forgot">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth-form__guest">
          Just shopping? <Link to="/checkout">Continue as a guest</Link> — no account needed.
        </p>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  useDocumentTitle('Create Account');
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner />;
  if (user && !submitting) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.name.trim().length < 2) v.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) v.email = 'Please enter a valid email address.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) v.password = 'Use at least 8 characters, including a letter and a number.';
    if (form.confirm !== form.password) v.confirm = 'Passwords do not match.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true);
    setError(null);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <AuthShell
      title="Create your account"
      subtitle="Save your details and view your order history."
      footer={
        <>
          Already have an account? <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in</Link>
          <span className="auth-card__note">
            Wakis Mart staff? <Link to="/admin/register">Create an admin account</Link> with your invite code.
          </span>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="auth-form">
        {error && <Alert type="error">{error}</Alert>}
        <FormField label="Full name" autoComplete="name" required value={form.name} error={errors.name} onChange={set('name')} />
        <FormField label="Email" type="email" autoComplete="email" required value={form.email} error={errors.email} onChange={set('email')} />
        <FormField label="Password" type="password" autoComplete="new-password" required value={form.password} error={errors.password} onChange={set('password')} hint="At least 8 characters, with a letter and a number." />
        <FormField label="Confirm password" type="password" autoComplete="new-password" required value={form.confirm} error={errors.confirm} onChange={set('confirm')} />
        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
