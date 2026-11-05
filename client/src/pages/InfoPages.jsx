import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useStoreConfig } from '../context/StoreContext.jsx';
import FormField from '../components/FormField.jsx';
import { Alert, NotFoundState } from '../components/Feedback.jsx';
import { Breadcrumbs } from '../components/Section.jsx';
import Icon from '../components/Icon.jsx';

export function AboutPage() {
  useDocumentTitle('About Us');
  return (
    <div className="page">
      <section className="page-hero page-hero--about">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'About us' }]} />
          <h1 className="page-title">About Wakis Mart</h1>
          <p className="page-lead">A specialty deli and grocery for the African and Caribbean community — and everyone who loves its food.</p>
        </div>
      </section>
      <div className="container prose-layout">
        <article className="prose">
          <h2>Bringing home a little closer</h2>
          <p>
            Wakis Mart was created for anyone who has searched three different stores for the right garri, the good palm oil, a decent bunch of
            plantain and a jar of real jerk seasoning. We bring those ingredients together on one shelf — alongside a deli counter cooking the
            dishes that taste like Sunday at home.
          </p>
          <h2>What you’ll find</h2>
          <ul>
            <li>
              <strong>African groceries</strong> — rice, garri, fufu and swallow flours, egusi, ogbono, crayfish, palm oil and spices from West, East
              and Southern Africa.
            </li>
            <li>
              <strong>Caribbean groceries</strong> — ackee, callaloo, jerk seasonings, pepper sauces, coconut milk, baking essentials and island
              drinks.
            </li>
            <li>
              <strong>Fresh produce, meat &amp; seafood</strong> — plantains, yams, scotch bonnets, goat, oxtail, saltfish, stockfish and more.
            </li>
            <li>
              <strong>Our deli</strong> — jollof, egusi, pepper soup, jerk chicken, curry goat, oxtail, patties and sides, cooked fresh.
            </li>
          </ul>
          <h2>Our promise</h2>
          <p>
            Authentic brands, carefully stored stock and friendly service from people who cook this food themselves. If we don’t carry something
            you love, <Link to="/contact">tell us</Link> — many of our products are on the shelf because a customer asked.
          </p>
        </article>
        <aside className="about-values">
          {[
            ['leaf', 'Authentic first', 'The brands and ingredients you grew up with — not substitutes.'],
            ['flame', 'Cooked fresh', 'Deli dishes prepared in small batches throughout the day.'],
            ['store', 'Community rooted', 'A neighbourhood store serving the African and Caribbean diaspora.'],
          ].map(([icon, title, text]) => (
            <div key={title} className="value-card">
              <Icon name={icon} size={28} />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

export function ContactPage() {
  useDocumentTitle('Contact Us');
  const { store } = useStoreConfig();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.name.trim().length < 2) v.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) v.email = 'Please enter a valid email address.';
    if (form.subject.trim().length < 2) v.subject = 'Please add a subject.';
    if (form.message.trim().length < 10) v.message = 'Your message should be at least 10 characters.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setSending(true);
    try {
      const r = await api.contact(form);
      setStatus({ type: 'success', text: r.message });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Contact us' }]} />
          <h1 className="page-title">Contact us</h1>
          <p className="page-lead">Questions about an order, a product request or deli catering? We’d love to hear from you.</p>
        </div>
      </section>
      <div className="container contact-layout">
        <form className="panel" onSubmit={submit} noValidate>
          <h2 className="panel__title">Send a message</h2>
          {status && <Alert type={status.type}>{status.text}</Alert>}
          <div className="form-grid">
            <FormField label="Your name" required value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
            <FormField label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
            <FormField label="Subject" required value={form.subject} onChange={set('subject')} error={errors.subject} className="span-2" />
            <FormField label="Message" as="textarea" rows={6} required value={form.message} onChange={set('message')} error={errors.message} className="span-2" maxLength={3000} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </form>
        <aside className="contact-info">
          <div className="value-card">
            <Icon name="pin" size={24} />
            <h3>Visit the store</h3>
            <p>{store.address || 'Our store address will be published here soon.'}</p>
          </div>
          {store.hours && (
            <div className="value-card">
              <Icon name="clock" size={24} />
              <h3>Opening hours</h3>
              <p>{store.hours}</p>
            </div>
          )}
          {(store.phone || store.email) && (
            <div className="value-card">
              <Icon name="phone" size={24} />
              <h3>Call or email</h3>
              <p>
                {store.phone && <a href={`tel:${store.phone.replace(/[^\d+]/g, '')}`}>{store.phone}</a>}
                {store.phone && store.email && <br />}
                {store.email && <a href={`mailto:${store.email}`}>{store.email}</a>}
              </p>
            </div>
          )}
          <div className="value-card">
            <Icon name="receipt" size={24} />
            <h3>About an order?</h3>
            <p>Include your order number (it starts with “WM-”) so we can help you faster.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  useDocumentTitle('Page Not Found');
  return (
    <div className="page container">
      <NotFoundState />
    </div>
  );
}
