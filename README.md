# Digital downloads marketplace

A general marketplace for any downloadable product (Anki decks, e-books, courses, audio, software…), Persian-first (RTL) with English.
The first product type is **Anki decks**: uploading an `.apkg` fills the card count, sub-decks and media info automatically and builds a live card preview.

Stack: Nuxt 4 (Vue 3), Nuxt UI, PostgreSQL + Prisma, nuxt-auth-utils, @nuxtjs/i18n.

## Run locally

```bash
pnpm install
cp .env.development.example .env.development   # works as is with the docker database
docker compose up -d db     # or use your own PostgreSQL (then change DATABASE_URL)
pnpm db:migrate             # create tables
pnpm db:seed                # owner account, product types, sections, 3 demo decks
pnpm dev                    # http://localhost:3000, admin at /admin
```

The seed prints the owner login (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, default `admin@example.com` / `admin1234`; change it).

### Environment files

`pnpm dev`, `db:migrate` and `db:seed` read `.env.development`; `pnpm build`, `start`, `db:deploy` and `db:seed:prod` read `.env.production`. Each starts from its `.example` file (git ignores the real ones). An old `.env` still works: it fills in anything the mode file leaves out, and variables set in the shell or by the host always win.

- **Development:** login codes are printed in the server log as `[otp] SMS code for 0912…: 123456` (turn off with `LOG_OTP_CODES="false"`). Without an SMS provider or `SMTP_URL`, messages are printed instead of sent.
- **Production:** codes are never logged, and logging in fails with a clear error until `SMS_PROVIDER` and `SMTP_URL` are set, so nobody waits for a code that was never sent.
- `NUXT_SESSION_PASSWORD` must be at least 32 characters (`openssl rand -base64 32`). With a shorter one the server prints an error in development and refuses to start in production.

Production: `pnpm build && pnpm db:deploy && pnpm start`. Uploaded files go to `STORAGE_DIR` (`public/` for images and previews, `private/` for the files being sold); back it up with the database.

## How it is organised

- **Generic core** (`prisma/schema.prisma`): sections (tree), product types, custom attribute definitions per type, products, attribute values, files with versions, previews, settings.
- **Product types** are created in the admin panel (Admin → Product types). Each type has its own fields (text, number, yes/no, single/multiple choice) and chooses which are required, used as filters, or shown as badges.
- **Shared lists** (Admin → Shared lists, `server/utils/option-lists.ts`): choices such as languages, each with a flag or icon, defined once. Choice fields can use a list instead of their own options, and a section can generate its sub-sections from a list (Languages → one section per language). Products land in those sections automatically from the field marked "Show products in the matching sections", so menus, filters and product pages always show the same languages.
- **Plugins** (`server/product-plugins/`) add smart behaviour to a type. A plugin reads the uploaded main file and returns attribute values and previews. `anki.ts` is the first; register new ones in `index.ts` and add a preview component in `app/components/ProductPreviews.vue`.
- **Store settings** (name, logo, currency, default commission…) live in the database, so the same code can run any store.
- Storefront: `app/pages/` (home, `/s/<section>`, `/p/<product>`, `/search`). Admin: `app/pages/admin/`. API: `server/api/`.

## Tests

```bash
pnpm test        # unit tests
pnpm test:e2e    # flow tests against a real server and database
```

The flow tests (`tests/e2e/`) start the ZarinPal mock and `nuxt dev` on port 3100 themselves, then go through sign up and login (phone and email codes, password, linking, logout), browsing, cart, coupons, bundles, ZarinPal and card-to-card payments with admin approval, downloads, reviews, the wishlist, product requests, the seller flow (application, commission, review queue, payouts), reports, the blog, the home page builder and admin pages, sending script payloads into the inputs along the way. They need the database migrated and seeded and add their own test users and products to it, so point them at a separate database with `.env.test` (same variables, read before `.env.development`) if you want to keep your dev data clean. To test a server you already run, set `E2E_BASE_URL` and `E2E_SERVER_LOG` (the file its output goes to).

Server error messages stay in English in the API; the app shows them in the visitor's language through `shared/utils/server-errors.ts` and the `serverErrors` keys in `i18n/locales/`. `tests/server-errors.test.ts` fails when a new server message has no translation.

## Selling (milestone 2)

- **Accounts:** log in with a mobile number (SMS code) or email (code or password). A phone and an email can be linked to one account from "My account". In development, codes are printed in the server log (see Environment files).
- **Cart and checkout:** the cart lives in a cookie; checkout needs login. Products already owned are skipped; free products go straight to the library.
- **Payment methods** (`server/payment-methods/`), each switched on in Admin → Settings: ZarinPal (online, API v4), card-to-card and IBAN (buyer uploads a receipt, an admin approves or rejects it in Admin → Orders). Every path ends in `markOrderPaid`, which is idempotent and records the store commission per item.
- **Library and downloads:** buyers download from "My library" through short-lived signed links (`/dl/<token>`), with a per-product download limit set in Settings.
- **ZarinPal** always uses its sandbox in development (no merchant ID needed); production uses the merchant ID and the sandbox switch from Settings.
- **Torob Pay** (installments, `server/payment-methods/torobpay.ts`): switch it on in Settings and put the login from the Torob Pay panel in `TOROBPAY_CLIENT_ID`, `TOROBPAY_CLIENT_SECRET`, `TOROBPAY_USERNAME`, `TOROBPAY_PASSWORD`. It takes orders of 20,000 Toman (200,000 Rial) or more from buyers with a mobile number; payments are verified and settled on return, and a refund in Admin → Orders cancels the purchase at Torob, which returns the money.
- To try the gateways without the real ones: `node tests/payment-mock.mjs` and start the app with `ZARINPAL_BASE_URL` and/or `TOROBPAY_BASE_URL` set to `http://localhost:4010` (any `TOROBPAY_*` login values).

## Requests and safety

- **Product requests** (`/requests`, Admin → Requests): a buyer picks "from" and "to" values from a shared list (Languages by default, set in Settings), writes a subject and details, and chats with support. Staff can set the status and link the product made for it; the buyer gets an SMS/email on each answer.
- **User text is plain text only:** `shared/utils/plain-text.ts` strips tags, control and bidi-override characters on the server, and pages show it with Vue's escaped `{{ }}` (never `v-html`). The only HTML shown is product descriptions, cleaned with sanitize-html.
- **Uploads are checked by their bytes**, not their name or claimed type (`server/utils/file-type.ts`). Uploaded and preview files are served with `nosniff` and a sandboxing CSP, so even an SVG with a script can't run.

## Marketplace (milestone 3)

- **Becoming a seller:** anyone with an account applies at `/sell` (shop name, address, terms, optional commission proposal). The owner approves in Admin → Sellers, which turns the account into a seller; rejecting or suspending turns it back (suspending also hides the shop's products). Sign-up can be closed in Settings → Marketplace.
- **Seller panel:** sellers use the same `/admin` with their own menu: dashboard, their products only, earnings, commission and shop profile. `server/utils/marketplace.ts` (`catalogAccess`, `productForAccess`) keeps them to their own products; roles are read from the database on every admin request, so a change applies without logging in again.
- **Review queue:** a seller's "publish" (and any later edit or new file on a live product) goes to *In review*; editors publish it or send it back with a note the seller sees. "Trusted" sellers skip the queue. Featuring stays with staff. Products with orders can only be hidden, not deleted.
- **Commission:** the default is in Settings. Agreements can cover the whole shop, one section or one product, with start and end dates; the most specific one in force wins (`commissionPercent`). Sellers propose, the owner accepts, rejects, counter-offers or sets a rate directly. The rate at sale time is frozen on each order line.
- **Payouts:** earnings become withdrawable after the holding period (Settings, default 14 days). Sellers request a payout to their Sheba account (above the minimum); the owner transfers it and records the bank reference in Admin → Payouts. Requests are serialised per seller, so the same balance can't be requested twice.
- **Reports:** "Report this product" on every product page (guests leave a contact). Staff resolve, dismiss or hide the product in Admin → Reports.
- **Public shop page:** `/seller/<address>`, linked from each product.

## Growth (milestone 4)

- **Reviews:** only people who own a product can rate it (1–5) and write a review; one per buyer, editable. Settings → Reviews turns them off or makes new reviews wait for a check. Staff publish or hide them in Admin → Reviews; the product's seller (or staff) can reply, and the buyer is told. The product's rating counts published reviews only.
- **Discount codes:** Admin → Discount codes. Percent or fixed amount, for all products, one section or one product, with a minimum cart, total and per-buyer limits and dates. Codes apply to products bought on their own, not to bundles. The discount lowers the price the seller's share is worked out from. A code is counted as used when the order is paid.
- **Bundles:** Admin → Bundles sells two or more products for less than their total (`/b/<address>`, `/bundles`). The bundle price is split over its products by price (`splitByWeight`), so each seller gets their share. A buyer who already owns part of a bundle pays only for the rest, at the same discount.
- **Wishlist:** the heart on products; saved items are under My library → Wishlist.
- **Blog:** Admin → Blog, with drafts, tags, cover, SEO fields and related products (`/blog`). The body is HTML cleaned on save like product descriptions.
- **Home page builder:** Admin → Home page chooses the blocks (section tiles, featured, newest, best sellers, free, one section, bundles, blog, banners, how it works), their order, titles and how many items. Banner links must be a store path or an `https://` address.
- **Sales report:** Admin → Sales report (owner only): totals, a chart by day or month, best sellers, codes used and what each seller earned and was paid per month, plus a CSV of every paid line (formula cells neutralised for spreadsheets).

## Roadmap

All four planned milestones are built. Next ideas are in the plan.
