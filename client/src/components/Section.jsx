import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export function SectionHeader({ eyebrow, title, description, linkTo, linkLabel = 'View all', id }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {description && <p className="section-desc">{description}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="link-arrow">
          {linkLabel} <Icon name="chevronRight" size={16} />
        </Link>
      )}
    </div>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((item, i) => (
          <li key={item.label}>
            {item.to && i < items.length - 1 ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
