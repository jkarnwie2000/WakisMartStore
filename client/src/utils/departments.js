// Storefront departments. Each maps a top-level route to a backend category slug.
export const DEPARTMENTS = [
  { path: '/african-groceries', slug: 'african-groceries', label: 'African Groceries', short: 'African' },
  { path: '/caribbean-groceries', slug: 'caribbean-groceries', label: 'Caribbean Groceries', short: 'Caribbean' },
  { path: '/deli', slug: 'deli', label: 'Deli & Prepared Foods', short: 'Deli' },
  { path: '/fresh-produce', slug: 'fresh-produce', label: 'Fresh Produce', short: 'Produce' },
  { path: '/meat-seafood', slug: 'meat-seafood', label: 'Meat & Seafood', short: 'Meat & Seafood' },
  { path: '/frozen-foods', slug: 'frozen-foods', label: 'Frozen Foods', short: 'Frozen' },
  { path: '/snacks-beverages', slug: 'snacks-beverages', label: 'Snacks & Beverages', short: 'Snacks & Drinks' },
];

export const departmentPath = (slug) => DEPARTMENTS.find((d) => d.slug === slug)?.path || `/shop?category=${slug}`;
