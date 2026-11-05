# Wakis Mart — African-Caribbean Deli & Grocery

A full-stack e-commerce application for **Wakis Mart**, an African-Caribbean specialty deli and grocery store. Customers can browse 216 grocery products and a 26-dish deli menu, search and filter the catalog, build a cart, and pay through **Stripe Checkout**. Orders are confirmed by verified Stripe webhooks. Customers get accounts with order history, and staff get a protected admin dashboard for products, inventory, deli availability and orders.

Everything is written in JavaScript (no TypeScript): React + Vite on the front end, Node.js + Express + Prisma on the back end.

![Wakis Mart homepage](docs/screenshots/home.png)

---

## Contents

- [Key features](#key-features)
- [Technology stack](#technology-stack)
- [Screenshots](#screenshots)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup & seeding](#database-setup--seeding)
- [Stripe configuration](#stripe-configuration)
- [Testing Stripe payments](#testing-stripe-payments)
- [Running the app](#running-the-app)
- [Automated tests & linting](#automated-tests--linting)
- [Deploying to Vercel](#deploying-to-vercel)
- [Going live](#going-live)
- [API reference](#api-reference)
- [Known limitations](#known-limitations)

---

## Key features

**Storefront**
- 16 pages wired through React Router: Home, Shop All, African Groceries, Caribbean Groceries, Deli & Prepared Foods, Fresh Produce, Meat & Seafood, Frozen Foods, Snacks & Beverages, Product Details, Cart, Checkout, Order Confirmation, About, Contact, and Account / Order History. There are also Login, Register, an account order-detail page and a 404 page.
- **242 unique products**: 216 groceries across 6 departments and 42 sub-categories, plus 26 deli dishes. Each product has a name, description, image, price, category, brand, SKU, inventory, availability status and featured flag.
- **Deli menu** with its own menu-style layout, chef's recommendations, African / Caribbean / Sides tabs, **selectable portion sizes** (e.g. Small / Large / Party Tray) and "sold out today" handling.
- **Homepage**: announcement bar, hero, department tiles, best sellers, African and Caribbean highlights, deli favourites, weekly specials, promo banners, testimonials, newsletter sign-up and footer.
- **Search & filtering**: live header search with suggestions; relevance-ranked results; filters for department, type, African / Caribbean origin, price range, brand (multi-select), in-stock only, featured and weekly specials; sorting by featured, popularity, price and name; and a **Load more** button.
- **Cart**: add, remove and change quantities, persisted in `localStorage` and synced across tabs. Quantities are capped at live inventory (shared across portion sizes). The cart is **re-priced by the server** each time it is opened.

**Checkout & payments**
- Real **Stripe Checkout Sessions**: there is no simulated payment anywhere. If Stripe keys are missing, checkout is disabled with a clear message.
- The client sends only product IDs, portion IDs and quantities. **Prices, tax, delivery fees and totals are calculated on the server** from the database.
- Choice of **home delivery or store pickup**. Delivery fee, free-delivery threshold, tax rate and pickup instructions are all configurable.
- Billing address and card details are collected on Stripe's hosted page. Any payment method enabled in your Stripe dashboard is offered automatically.
- **Webhook signature verification**. An order is marked paid only after a verified `checkout.session.completed` or `async_payment_succeeded` event, or a server-side session lookup on the confirmation page.
- **Exactly-once fulfilment**: a conditional `UNPAID → PAID` update plus a processed-event table prevent double-processing and double inventory decrements. Expired, failed or abandoned sessions cancel the pending order.
- Inventory is decremented inside a database transaction after payment. If stock ran out between checkout and payment, the order is flagged for staff instead of the inventory going negative.

**Accounts & admin**
- Registration, login and logout, profile and saved address, password change, and order history with detail pages. Passwords are hashed with bcrypt, and sessions use a JWT in an httpOnly, SameSite cookie. Guest checkout is supported.
- **Admin dashboard** (role-based; every `/api/admin/*` route is protected on the server):
  - KPIs: revenue, paid orders, average order value, customers, messages
  - Orders-by-status chart, top sellers, low-stock list and recent orders
  - Product CRUD with image upload, portion editor, compare-at ("special") price, inline inventory edits, and active / featured toggles
  - A dedicated **Deli availability** screen
  - Category management
  - Order list with filters and search, and status updates (Pending → Paid → Processing → Ready for Pickup / Out for Delivery → Completed / Cancelled) with workflow rules
  - Contact messages and newsletter subscribers

**Quality**
- Responsive from 360 px phones to wide desktops: mobile drawer navigation, slide-in filter panel, and stacked cart and checkout layouts.
- Accessibility: semantic HTML and landmarks, skip link, labelled form controls with `aria-invalid` / `aria-describedby`, a keyboard-navigable search combobox, visible focus rings, AA-contrast colour tokens, `prefers-reduced-motion` support, and descriptive alt text.
- Lazy-loaded images, a code-split admin bundle, Helmet security headers with a CSP, rate-limited auth and checkout endpoints, and Zod validation on every input.
- 26 automated API tests and a clean ESLint run on client and server.

## Technology stack

| Layer | Technology |
|---|---|
| Front end | React 19, Vite 6, React Router 7, Context API (cart, auth, store config, toasts), Fetch API, hand-written CSS (custom properties, no UI framework) |
| Back end | Node.js 20+, Express 5, REST API, Zod validation, Helmet, express-rate-limit, Multer (uploads), cookie-parser |
| Database | PostgreSQL (Neon) via Prisma ORM 6 |
| Hosting | Vercel: static React build + Express as a serverless function, Vercel Blob for uploaded images |
| Payments | Stripe Node SDK, Stripe Checkout Sessions, Stripe webhooks |
| Auth | bcryptjs password hashing, JSON Web Tokens in httpOnly cookies, role-based authorization |
| Tooling | npm workspaces, ESLint 9 (flat config), dotenv, `node:test`, concurrently |

## Screenshots

| Home | Caribbean groceries | Deli menu |
|---|---|---|
| ![Home](docs/screenshots/home.png) | ![Shop](docs/screenshots/shop.png) | ![Deli](docs/screenshots/deli.png) |

| Product details | Cart | Checkout |
|---|---|---|
| ![Product](docs/screenshots/product.png) | ![Cart](docs/screenshots/cart.png) | ![Checkout](docs/screenshots/checkout.png) |

| Mobile home | Mobile deli | Admin dashboard | Admin products |
|---|---|---|---|
| ![Mobile home](docs/screenshots/mobile-home.png) | ![Mobile deli](docs/screenshots/mobile-deli.png) | ![Admin](docs/screenshots/admin-dashboard.png) | ![Admin products](docs/screenshots/admin-products.png) |

> The checkout screenshot shows the "payments not configured" notice because it was captured before Stripe keys were added.

## Project structure

```
wakis-mart-store/
├── client/                      # React + Vite front end
│   ├── public/
│   │   ├── favicon.svg
│   │   └── images/
│   │       ├── products/        # one image per product (replaceable)
│   │       └── categories/
│   ├── src/
│   │   ├── components/          # Header, Footer, ProductCard, SearchBar, OrderDetails, FormField, …
│   │   ├── context/             # CartContext, AuthContext, StoreContext, ToastContext
│   │   ├── hooks/               # useAsync, useAddToCart, useDebounce, useDocumentTitle
│   │   ├── pages/               # storefront pages
│   │   │   └── admin/           # admin dashboard (lazy-loaded)
│   │   ├── services/api.js      # REST client
│   │   ├── styles/global.css    # design tokens + all styles
│   │   ├── utils/               # formatting, departments, safe localStorage
│   │   ├── App.jsx              # routes
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js           # dev proxy for /api and /uploads
├── server/                      # Express API
│   ├── config/env.js            # env loading + store settings
│   ├── controllers/             # products, checkout, webhook, orders, auth, admin, store
│   ├── middleware/              # auth (JWT + roles), errors, uploads
│   ├── routes/index.js          # all REST routes
│   ├── services/                # stripe, pricing (server-side totals), orderFulfillment
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   ├── generate-images.js   # regenerates placeholder product images
│   │   └── data/catalog.js      # the full product + deli catalog
│   ├── tests/                   # node:test API tests
│   ├── uploads/                 # admin-uploaded images (git-ignored)
│   ├── utils/
│   ├── app.js                   # Express app (also serves client/dist in production)
│   └── server.js
├── docs/screenshots/
├── .env.example
├── .gitignore
├── package.json                 # npm workspaces + root scripts
└── README.md
```

## Getting started

**Prerequisites:** Node.js **20.19+** (or 22+), npm 10+, a PostgreSQL database (a free [Neon](https://neon.tech) database works, and is what the Vercel deployment uses), and a free [Stripe account](https://dashboard.stripe.com/register) for payments.

```bash
# 1. Clone and enter the project
git clone https://github.com/jkarnwie2000/wakis-mart-store.git
cd wakis-mart-store

# 2. Create your environment file
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
#    Then edit .env: set DATABASE_URL / DATABASE_URL_UNPOOLED (your Postgres connection strings),
#    JWT_SECRET, ADMIN_EMAIL / ADMIN_PASSWORD, and your Stripe test keys

# 3. Install dependencies, create the database and seed the catalog
npm run setup               # = npm install + prisma db push + seed

# 4. Start the API and the React dev server together
npm run dev
```

Open **http://localhost:5173**. Sign in at `/login` with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` to open the admin dashboard at `/admin`.

## Environment variables

All variables live in **one `.env` file at the project root**. The server reads it, and the client never sees it. The only Stripe value exposed to the browser is the publishable key, via `/api/config`.

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | for payments | `sk_test_…` in development, `sk_live_…` in production. **Server only.** |
| `STRIPE_PUBLISHABLE_KEY` | optional | `pk_test_…` / `pk_live_…`. Not needed for hosted Checkout, but exposed for future client-side Stripe use. |
| `STRIPE_WEBHOOK_SECRET` | for payments | `whsec_…` from the Stripe CLI or your dashboard webhook endpoint. **Server only.** |
| `DATABASE_URL` | yes | PostgreSQL connection string used by the app (Neon: the **pooled** URL) |
| `DATABASE_URL_UNPOOLED` | yes | Direct (non-pooled) connection string used by Prisma CLI for `db push`. Use the same URL as above if your host has no pooler. |
| `BLOB_READ_WRITE_TOKEN` | on Vercel | Vercel Blob token for admin image uploads. Leave blank locally to save uploads to `server/uploads/`. |
| `CLIENT_URL` | yes | Public URL of the storefront, used for Stripe success / cancel redirects (`http://localhost:5173` in dev) |
| `SERVER_PORT` | no | API port (default `4000`) |
| `JWT_SECRET` | yes | Long random string used to sign session cookies (32+ characters required in production) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | yes | The admin account created by the seed script |
| `TAX_RATE` | no | Sales-tax rate applied to the subtotal, e.g. `0.07` = 7%. Set it to your local rate, or `0` to disable. |
| `CURRENCY` | no | ISO currency code (default `usd`) |
| `DELIVERY_ENABLED`, `DELIVERY_FEE`, `FREE_DELIVERY_THRESHOLD`, `DELIVERY_NOTE` | no | Home-delivery settings (fee and threshold in dollars; threshold `0` = never free) |
| `PICKUP_ENABLED`, `PICKUP_INSTRUCTIONS` | no | Store-pickup settings |
| `STORE_ADDRESS`, `STORE_PHONE`, `STORE_EMAIL`, `STORE_HOURS` | no | Shown in the footer, contact page and checkout once set. They are left blank on purpose; no address or delivery times are invented. |

## Database setup & seeding

```bash
npm run db:setup                         # create tables + seed (safe to re-run)
npm run db:seed --workspace server       # seed only; existing records are left untouched
npm run db:reset --workspace server      # ⚠ wipes the dev database, then re-seeds
npm run db:studio --workspace server     # browse data in Prisma Studio
npm run images --workspace server        # regenerate placeholder product images
```

- The seed is **idempotent**. Products are matched by slug, so re-running it never overwrites prices or stock you changed in the admin dashboard.
- The schema targets **PostgreSQL**. Any Postgres works locally (e.g. `postgresql://user:pass@localhost:5432/wakis_mart`, or a Neon branch). Status fields are stored as validated strings.
- **Prices in the seed are sample prices.** Review `server/prisma/data/catalog.js` (or use the admin dashboard) before going live.

## Stripe configuration

1. Create or sign in to a Stripe account and switch the dashboard to **Test mode**.
2. Go to **Developers → API keys** and copy the **Secret key** (`sk_test_…`) and **Publishable key** (`pk_test_…`) into `.env`.
3. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and log in:
   ```bash
   stripe login
   ```
4. Forward webhook events to your local API (keep this running while you test). Newer Stripe CLI versions require `--events`; keep the command on one line so it also works in PowerShell:
   ```bash
   stripe listen --forward-to localhost:4000/api/webhooks/stripe --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired
   ```
   The CLI prints a signing secret (`whsec_…`). Copy it into `STRIPE_WEBHOOK_SECRET` in `.env` and restart `npm run dev`.
5. (Optional) In **Settings → Payment methods**, enable any extra methods you want (Apple Pay, Google Pay, Link, Cash App Pay, …). Checkout offers them automatically, with no code changes.

The server prints whether Stripe is in test or live mode when it starts, and warns if a key is missing.

## Testing Stripe payments

With `npm run dev` and `stripe listen` running:

1. Add a few items to the cart (try a deli dish with a portion size) and go to **Checkout**.
2. Enter a name and email, choose **Store pickup** or **Home delivery** (with an address), then click **Continue to secure payment**.
3. On Stripe's page, use a [test card](https://docs.stripe.com/testing):

   | Card number | Result |
   |---|---|
   | `4242 4242 4242 4242` | Payment succeeds |
   | `4000 0025 0000 3155` | Requires 3-D Secure authentication |
   | `4000 0000 0000 9995` | Declined (insufficient funds) |

   Use any future expiry date, any 3-digit CVC and any postal code.
4. After paying you're redirected to **/order-confirmation**. The page waits for the verified webhook, then shows the order number, items, totals and payment status, and clears the cart.
5. Check the results:
   - The `stripe listen` terminal shows `checkout.session.completed` → `200`.
   - **Admin → Orders** shows the order as *Paid*. Inventory for those products has gone down, which you can see in **Admin → Products**.
   - If you were signed in, the order appears under **My account → Order history**.
6. Click **← back** on the Stripe page to test cancellation. You return to checkout with a "Payment cancelled" notice, your cart intact, and the abandoned order cancelled.

You can also replay events with `stripe trigger checkout.session.completed`. Those synthetic events don't match a Wakis Mart order, so the server logs a warning and acknowledges them.

## Running the app

| Command (from the project root) | What it does |
|---|---|
| `npm run dev` | API on :4000 (auto-restarts on changes) **and** Vite on :5173 with hot reload |
| `npm run dev:server` | Back end only |
| `npm run dev:client` | Front end only (expects the API on :4000; override with `VITE_API_PROXY`) |
| `npm run build` | Production build of the React app into `client/dist` |
| `npm start` | Starts Express, which **also serves `client/dist`** on the same origin (http://localhost:4000) |

In development, Vite proxies `/api` and `/uploads` to Express, so the browser talks to a single origin and the httpOnly auth cookie works without CORS.

## Automated tests & linting

```bash
npm test      # 26 API tests (node:test)
npm run lint  # ESLint for client and server
```

The test runner creates a **uniquely named temporary Postgres schema** (e.g. `wm_test_1234_…`) in the database from `DATABASE_URL`, seeds it, runs the suite and then drops only that schema. Your real tables in the `public` schema are never touched. The tests cover:

- Catalog size and uniqueness, categories, deli portions, search ranking, every filter and sort, pagination, product detail and the home endpoint
- Server-side cart re-pricing, inventory clamping, portion validation, and tax and delivery calculation
- Checkout validation, and the 503 response when Stripe is not configured
- Webhook signature rejection, **verified payment → order paid + inventory decremented once**, duplicate and replayed events, delayed payment methods, expired sessions, and stock-shortfall flagging
- Registration and password hashing, login and logout, profile, per-customer order isolation, admin authorization (401/403), product CRUD, deli availability, the order-status workflow, newsletter and contact

Webhook tests use Stripe's own `generateTestHeaderString` to sign events locally, so they need no network or Stripe account. Creating a real Checkout Session needs your Stripe test key; verify that step manually as described [above](#testing-stripe-payments).

## Deploying to Vercel

The repo is set up for Vercel ([`vercel.json`](vercel.json)): the React app is built to static files, and every `/api/*` request is handled by the Express app running as one serverless function ([`api/index.js`](api/index.js)). Pushing to `main` deploys to production automatically once the Vercel GitHub app is connected.

One-time setup:

1. **Project:** `vercel link` (or import the GitHub repo in the Vercel dashboard).
2. **Database:** `vercel integration add neon`, then connect it to the project for all environments. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
3. **Image storage:** `vercel blob create-store wakis-mart-images --access public --yes`. This adds `BLOB_READ_WRITE_TOKEN`.
4. **Environment variables** (Project → Settings → Environment Variables): `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NODEJS_HELPERS=0` (keeps the raw request body intact for Stripe signature checks), plus any store settings (`TAX_RATE`, delivery, pickup, `STORE_*`). `CLIENT_URL` is optional; it defaults to the project's production domain.
5. **Create tables and load the catalog** (run locally against the Neon database):
   ```bash
   vercel env pull .env.vercel          # downloads the Neon connection strings
   # copy DATABASE_URL and DATABASE_URL_UNPOOLED into .env, then:
   npm run db:setup
   ```
6. **Stripe webhook:** in Stripe → Developers → Webhooks, add `https://<your-domain>/api/webhooks/stripe` with the four `checkout.session.*` events, and set its signing secret as `STRIPE_WEBHOOK_SECRET` on Vercel. Redeploy after changing environment variables.

## Going live

1. In Stripe, activate your account and switch the dashboard to **Live mode**.
2. Replace `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` with the `sk_live_` / `pk_live_` keys.
3. In **Developers → Webhooks**, add an endpoint at `https://<your-domain>/api/webhooks/stripe` for the four `checkout.session.*` events listed above. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Set a strong `JWT_SECRET`, `CLIENT_URL=https://<your-domain>`, your real `TAX_RATE`, and your delivery, pickup and store details.
5. Deploy (see [Deploying to Vercel](#deploying-to-vercel)) or run `npm run build` then `npm start` behind HTTPS on any Node host. In production, cookies are sent with `Secure`.
6. Change the admin password, and replace the placeholder product images and sample testimonials.

No code changes are needed to switch from test to live; it is configuration only.

## API reference

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/config` | – | Public store settings (tax, delivery, pickup, whether Stripe is configured) |
| `GET /api/home` | – | All homepage sections |
| `GET /api/categories`, `GET /api/categories/:slug` | – | Departments |
| `GET /api/products` | – | List / search / filter (`search, category, subcategory, origin, brand, minPrice, maxPrice, inStock, featured, onSale, sort, page, limit`) |
| `GET /api/products/:slug` | – | Product + related products |
| `POST /api/cart/validate` | – | Re-price the cart and report stock issues |
| `POST /api/checkout/quote` | – | Server-calculated totals for a fulfilment method |
| `POST /api/checkout/session` | – (guest or customer) | Create a pending order + Stripe Checkout Session; returns `{ url }` |
| `POST /api/checkout/cancel` | – | Cancel an abandoned pending order (expires its session) |
| `POST /api/webhooks/stripe` | Stripe signature | Payment events (raw body) |
| `GET /api/orders/confirmation/:sessionId` | – | Order for the confirmation page |
| `POST /api/auth/register · login · logout`, `GET /api/auth/me`, `PUT /api/auth/profile · password` | customer | Accounts |
| `GET /api/orders/mine`, `GET /api/orders/mine/:orderNumber` | customer | Order history |
| `POST /api/newsletter`, `POST /api/contact` | – | Newsletter sign-up, contact form |
| `/api/admin/*` | **admin** | Stats, products CRUD + PATCH, uploads, categories, orders + status, messages |

## Known limitations

- **Product images are branded placeholders**, not real photography. Each product has its own SVG illustration in `client/public/images/products/`. Replace a file with a photo using the same name, or upload a photo for that product in **Admin → Products → Edit**.
- **Seed prices and testimonials are samples** and should be replaced with real data.
- **Emails:** the app doesn't send its own confirmation emails. Customers see the confirmation page, and Stripe can email receipts (enable *Successful payments* under **Settings → Customer emails** in Stripe; in test mode, receipts are only sent from the dashboard). An email provider (e.g. Resend or SendGrid) could be added in `services/orderFulfillment.js`.
- **Tax** is a single configurable rate, not jurisdiction-aware. Stripe Tax could replace it later.
- **Inventory** is reserved at payment time, not when the cart is created. Oversells between checkout and payment are flagged on the order for staff follow-up.
- `npm audit` reports an advisory in `deepmerge-ts`, used only by the Prisma **CLI** (a dev tool, not shipped at runtime). The fix requires Prisma 7, which is a breaking upgrade.
