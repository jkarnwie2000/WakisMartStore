// Small inline SVG icon set (no icon-font dependency). Decorative by default.
const PATHS = {
  cart: 'M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 20.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm9 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  search: 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.3-2.2L21 21',
  user: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9a8 8 0 0 1 16 0',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  truck: 'M2 6h11v10H2zM13 9h4l3 3v4h-7M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  store: 'M4 10v10h16V10M3 4h18l-1.5 6a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0ZM10 20v-5h4v5',
  leaf: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19c3-4 6-6 10-8',
  check: 'M5 12.5 10 17l9-10',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  filter: 'M3 5h18l-7 8v6l-4-2v-4Z',
  lock: 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9Z',
  phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2',
  flame: 'M12 21c-4 0-7-2.7-7-6.5 0-3.8 3-5.8 4-9.5 2.3 1.5 3.5 3.7 3.5 6 1-.6 1.8-1.8 2-3 2 1.6 3.5 4 3.5 6.5 0 3.8-2.6 6.5-6 6.5Z',
  arrowLeft: 'M19 12H5m6-6-6 6 6 6',
  arrowUp: 'M12 19V5m-6 6 6-6 6 6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4ZM3 7l9 4 9-4M12 11v10',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 8h6M9 12h6',
  tag: 'M3 12V4h8l10 10-8 8Zm4.5-4.5h.01',
  chat: 'M4 5h16v11H8l-4 4Z',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 20h16',
  download: 'M12 4v12m-5-5 5 5 5-5M4 20h16',
  edit: 'M4 20h4L19 9l-4-4L4 16Zm9-13 4 4',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
};

export default function Icon({ name, size = 20, className = '', title, strokeWidth = 1.8 }) {
  const d = PATHS[name];
  if (!d) return null;
  const filled = name === 'star';
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}
