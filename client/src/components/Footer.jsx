import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { DEPARTMENTS } from '../utils/departments.js';
import { useStoreConfig } from '../context/StoreContext.jsx';

export default function Footer() {
  const { store } = useStoreConfig();
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="kente-strip" aria-hidden="true" />
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo light />
          <p>
            Your specialty deli and grocery — authentic pantry staples, fresh produce, quality meats and home-style cooking,
            all under one roof.
          </p>
        </div>
        <nav aria-label="Shop departments">
          <h2 className="footer-title">Shop</h2>
          <ul>
            <li>
              <Link to="/shop">All products</Link>
            </li>
            {DEPARTMENTS.map((d) => (
              <li key={d.slug}>
                <Link to={d.path}>{d.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Customer service">
          <h2 className="footer-title">Customer care</h2>
          <ul>
            <li>
              <Link to="/account">My account</Link>
            </li>
            <li>
              <Link to="/account">Order history</Link>
            </li>
            <li>
              <Link to="/cart">Shopping cart</Link>
            </li>
            <li>
              <Link to="/about">About Wakis Mart</Link>
            </li>
            <li>
              <Link to="/contact">Contact us</Link>
            </li>
            <li>
              <Link to="/admin/login" className="footer-admin-link">
                <Icon name="lock" size={14} /> Admin
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="footer-title">Visit &amp; contact</h2>
          <ul className="footer-contact">
            {store.address ? (
              <li>
                <Icon name="pin" size={16} /> {store.address}
              </li>
            ) : (
              <li>
                <Icon name="pin" size={16} /> Store address coming soon
              </li>
            )}
            {store.hours && (
              <li>
                <Icon name="clock" size={16} /> {store.hours}
              </li>
            )}
            {store.phone && (
              <li>
                <Icon name="phone" size={16} /> <a href={`tel:${store.phone.replace(/[^\d+]/g, '')}`}>{store.phone}</a>
              </li>
            )}
            {store.email && (
              <li>
                <Icon name="mail" size={16} /> <a href={`mailto:${store.email}`}>{store.email}</a>
              </li>
            )}
            <li>
              <Icon name="chat" size={16} /> <Link to="/contact">Send us a message</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>© {year} Wakis Mart. All rights reserved.</p>
        <p className="footer-secure">
          <Icon name="lock" size={14} /> Secure checkout powered by Stripe
        </p>
      </div>
    </footer>
  );
}
