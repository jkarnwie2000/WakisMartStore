import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export function Spinner({ label = 'Loading…', inline = false }) {
  return (
    <div className={inline ? 'spinner-inline' : 'spinner-wrap'} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className={inline ? '' : 'visually-hidden'}>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="state state--error" role="alert">
      <h2 className="state__title">{title}</h2>
      <p>{error?.message || String(error || 'Please try again.')}</p>
      {onRetry && (
        <button type="button" className="btn btn--outline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'box', title, children, action }) {
  return (
    <div className="state">
      <span className="state__icon" aria-hidden="true">
        <Icon name={icon} size={36} />
      </span>
      <h2 className="state__title">{title}</h2>
      {children && <div className="state__body">{children}</div>}
      {action}
    </div>
  );
}

export function Alert({ type = 'info', children, title }) {
  return (
    <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {title && <strong className="alert__title">{title}</strong>}
      <div>{children}</div>
    </div>
  );
}

export function NotFoundState({ title = 'Page not found', message = 'The page you’re looking for doesn’t exist or has moved.' }) {
  return (
    <EmptyState icon="search" title={title} action={<Link to="/shop" className="btn btn--primary">Browse the shop</Link>}>
      <p>{message}</p>
    </EmptyState>
  );
}
