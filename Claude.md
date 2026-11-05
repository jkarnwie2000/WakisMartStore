# Wakis Mart — notes for Claude

African-Caribbean deli & grocery e-commerce app. JavaScript only (no TypeScript). See README.md for setup.

## Layout
- `client/` React 19 + Vite 6 + React Router 7. Global state via Context (`src/context/`). All styles in `src/styles/global.css` (design tokens on `:root`).
- `server/` Express 5 + Prisma 6 (SQLite dev DB at `server/prisma/dev.db`). Routes in `server/routes/index.js`.
- One `.env` at the repo root, loaded by `server/config/env.js` (Prisma CLI scripts use `dotenv -e ../.env`).

## Commands (run from repo root)
- `npm run dev` — API :4000 + Vite :5173 (Vite proxies /api and /uploads)
- `npm test` — server API tests in a throwaway temp SQLite DB (never touches dev.db)
- `npm run lint`, `npm run build`, `npm start` (Express serves client/dist)

## Invariants — keep these true
- Prices are integer **cents**. The client never supplies prices; `server/services/pricing.js` is the source of truth for line prices, tax, delivery and totals.
- Orders are created PENDING before redirecting to Stripe and only become PAID in `services/orderFulfillment.js#markOrderPaid` (verified webhook or server-side session retrieve). That function must stay idempotent (conditional UNPAID→PAID update guards the inventory decrement).
- The webhook route is mounted with `express.raw` **before** `express.json` in `app.js`.
- Deli items have `PortionOption`s; product.price = cheapest portion. Stock is shared across portions.
- Every `/api/admin/*` route goes through `requireAdmin`; client guards are UX only.
- Enum-like fields are validated strings (SQLite/Postgres portable) — see `server/utils/constants.js`.
- React effects must use block bodies: `useEffect(() => { … })`. Expression bodies like `useEffect(() => window.scrollTo(0, 0))` return a Promise in current Chromium and crash React on unmount.

## Data
- Catalog source: `server/prisma/data/catalog.js` (216 groceries + 26 deli). Seed is idempotent by slug.
- Product images are generated SVG placeholders (`npm run images --workspace server`) in `client/public/images/products/`.
- Prisma blocks `db push --force-reset` when run by an AI agent; `npm run db:reset` is for the user to run.
