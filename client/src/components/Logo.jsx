import { Link } from 'react-router-dom';

// Wakis Mart wordmark: a market basket with a palm-leaf sprig, plus serif wordmark.
export function LogoMark({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" fill="#1E2A5A" />
      <path d="M33 13c5-6 13-5 13-5s0 8-8 10c-2.4.6-4.2-.8-5-5Z" fill="#D4A63A" />
      <path d="M33 13c-4-4-10-3-10-3s.5 6 6 7" fill="#ECD08A" />
      <path d="M21 27l6-10M43 27l-6-10" stroke="#FFF4E0" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 27h40l-4.5 21a4 4 0 0 1-4 3.2H20.5a4 4 0 0 1-4-3.2Z" fill="#E07A1F" />
      <path d="M12 27h40" stroke="#B4540C" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 34v11M32 34v11M40 34v11" stroke="#FFF4E0" strokeWidth="3" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

export default function Logo({ to = '/', compact = false, light = false }) {
  return (
    <Link to={to} className={`logo ${light ? 'logo--light' : ''}`} aria-label="Wakis Mart home">
      <LogoMark size={compact ? 36 : 44} />
      <span className="logo__text">
        <span className="logo__name">
          Wakis <span className="logo__accent">Mart</span>
        </span>
        {!compact && <span className="logo__tag">Specialty Deli &amp; Grocery</span>}
      </span>
    </Link>
  );
}
