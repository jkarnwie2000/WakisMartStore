import { useState } from 'react';
import { api } from '../services/api.js';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setStatus({ state: 'error', message: 'Please enter a valid email address.' });
      return;
    }
    setStatus({ state: 'loading', message: '' });
    try {
      const r = await api.subscribe(email);
      setStatus({ state: 'success', message: r.message });
      setEmail('');
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <section className="newsletter" aria-labelledby="newsletter-title">
      <div className="container newsletter__inner">
        <div>
          <p className="eyebrow eyebrow--light">Join the Wakis Mart family</p>
          <h2 id="newsletter-title" className="newsletter__title">
            Weekly specials, new arrivals &amp; deli menus
          </h2>
          <p className="newsletter__text">Be first to hear when the sorrel, fresh yams and holiday favourites land. No spam — unsubscribe any time.</p>
        </div>
        <form className="newsletter__form" onSubmit={submit} noValidate>
          <label htmlFor="newsletter-email" className="visually-hidden">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={status.state === 'error' || undefined}
            aria-describedby="newsletter-status"
            autoComplete="email"
          />
          <button type="submit" className="btn btn--accent" disabled={status.state === 'loading'}>
            {status.state === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
          <p id="newsletter-status" className={`newsletter__status newsletter__status--${status.state}`} role="status" aria-live="polite">
            {status.message}
          </p>
        </form>
      </div>
    </section>
  );
}
