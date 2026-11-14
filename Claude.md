# Wakis Mart — notes for Claude

Wakis Mart Deli & Grocery e-commerce app. JavaScript only (no TypeScript). See README.md for setup.

## Layout
- `client/` React 19 + Vite 6 + React Router 7. Global state via Context (`src/context/`). All styles in `src/styles/global.css` (design tokens on `:root`).
- `server/` Express 5 + Prisma 6 on PostgreSQL (Neon). Routes in `server/routes/index.js`. Admin dashboard endpoints: `controllers/adminController.js` (products, categories, orders, users) and `controllers/adminSuiteController.js` (reports, exports, fulfilment, refunds, settings, inventory, customers, specials, activity).
- Vercel: `vercel.json` builds `client/dist`; `api/index.js` exports the Express app as the serverless function. Uploads go to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set. `NODEJS_HELPERS=0` is required on Vercel so the Stripe webhook gets the raw body.
- One `.env` at the repo root, loaded by `server/config/env.js` (Prisma CLI scripts use `dotenv -e ../.env`).

## Commands (run from repo root)
- `npm run dev` — API :4000 + Vite :5173 (Vite proxies /api and /uploads)
- `npm test` — server API tests in a temporary Postgres schema `wm_test_*` that is dropped afterwards (never touches `public`)
- `npm run lint`, `npm run build`, `npm start` (Express serves client/dist)

## Invariants — keep these true
- Prices are integer **cents**. The client never supplies prices; `server/services/pricing.js` is the source of truth for line prices, tax, delivery and totals.
- Orders are created PENDING before redirecting to Stripe and only become PAID in `services/orderFulfillment.js#markOrderPaid` (verified webhook or server-side session retrieve). That function must stay idempotent (conditional UNPAID→PAID update guards the inventory decrement).
- The webhook route is mounted with `express.raw` **before** `express.json` in `app.js`.
- Deli items have `PortionOption`s; product.price = cheapest portion. Stock is shared across portions.
- Every `/api/admin/*` route goes through `requireAdmin`; client guards are UX only.
- Customer sign-up (`/api/auth/register`) must never grant ADMIN. Staff become admins only via a one-time invite (`controllers/adminInviteController.js`, hashed codes, claimed atomically) or promotion by an existing admin.
- Store settings: read them with `getStoreSettings()` (services/settings.js) — dashboard values override `.env`. Never read `env.store` directly for tax, delivery, pickup or store details. Pass settings into `computeTotals(lines, method, settings)`.
- Specials: call `expireSpecials()` before reading catalogue prices or pricing a cart, so an ended special is never charged.
- Admin actions that change data should call `logActivity(req, ACTION, summary, { entityType, entityId })` (services/activity.js). It never throws.
- Enum-like fields are validated strings — see `server/utils/constants.js`. Text search must use `mode: 'insensitive'` (Postgres is case-sensitive).
- React effects must use block bodies: `useEffect(() => { … })`. Expression bodies like `useEffect(() => window.scrollTo(0, 0))` return a Promise in current Chromium and crash React on unmount.

## Data
- Catalog source: `server/prisma/data/catalog.js` (216 groceries + 26 deli). Seed is idempotent by slug.
- Product images are generated SVG placeholders (`npm run images --workspace server`) in `client/public/images/products/`.
- Prisma blocks `db push --force-reset` when run by an AI agent; `npm run db:reset` is for the user to run.
