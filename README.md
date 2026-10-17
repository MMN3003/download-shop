# Digital downloads marketplace

A general marketplace for any downloadable product (Anki decks, e-books, courses, audio, software…), Persian-first (RTL) with English.
The first product type is **Anki decks**: uploading an `.apkg` fills the card count, sub-decks and media info automatically and builds a live card preview.

Stack: Nuxt 4 (Vue 3), Nuxt UI, PostgreSQL + Prisma, nuxt-auth-utils, @nuxtjs/i18n.

## Run locally

```bash
pnpm install
cp .env.example .env        # set DATABASE_URL and NUXT_SESSION_PASSWORD
docker compose up -d db     # or use your own PostgreSQL
pnpm db:migrate             # create tables
pnpm db:seed                # owner account, product types, sections, 3 demo decks
pnpm dev                    # http://localhost:3000, admin at /admin
```

The seed prints the owner login (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, default `admin@example.com` / `admin1234`; change it).

Production: `pnpm build && pnpm db:deploy && node .output/server/index.mjs`. Uploaded files go to `STORAGE_DIR` (`public/` for images and previews, `private/` for the files being sold); back it up with the database.

## How it is organised

- **Generic core** (`prisma/schema.prisma`): sections (tree), product types, custom attribute definitions per type, products, attribute values, files with versions, previews, settings.
- **Product types** are created in the admin panel (Admin → Product types). Each type has its own fields (text, number, yes/no, single/multiple choice) and chooses which are required, used as filters, or shown as badges.
- **Shared lists** (Admin → Shared lists, `server/utils/option-lists.ts`): choices such as languages, each with a flag or icon, defined once. Choice fields can use a list instead of their own options, and a section can generate its sub-sections from a list (Languages → one section per language). Products land in those sections automatically from the field marked "Show products in the matching sections", so menus, filters and product pages always show the same languages.
- **Plugins** (`server/product-plugins/`) add smart behaviour to a type. A plugin reads the uploaded main file and returns attribute values and previews. `anki.ts` is the first; register new ones in `index.ts` and add a preview component in `app/components/ProductPreviews.vue`.
- **Store settings** (name, logo, currency, default commission…) live in the database, so the same code can run any store.
- Storefront: `app/pages/` (home, `/s/<section>`, `/p/<product>`, `/search`). Admin: `app/pages/admin/`. API: `server/api/`.

## Tests

```bash
pnpm test
```

## Selling (milestone 2)

- **Accounts:** log in with a mobile number (SMS code) or email (code or password). A phone and an email can be linked to one account from "My account". Without `SMS_PROVIDER`/`SMTP_URL`, codes are printed in the server log.
- **Cart and checkout:** the cart lives in a cookie; checkout needs login. Products already owned are skipped; free products go straight to the library.
- **Payment methods** (`server/payment-methods/`), each switched on in Admin → Settings: ZarinPal (online, API v4), card-to-card and IBAN (buyer uploads a receipt, an admin approves or rejects it in Admin → Orders). Every path ends in `markOrderPaid`, which is idempotent and records the store commission per item.
- **Library and downloads:** buyers download from "My library" through short-lived signed links (`/dl/<token>`), with a per-product download limit set in Settings.
- To try ZarinPal locally without the real gateway: `node tests/zarinpal-mock.mjs` and start the app with `ZARINPAL_BASE_URL=http://localhost:4010`.

## Requests and safety

- **Product requests** (`/requests`, Admin → Requests): a buyer picks "from" and "to" values from a shared list (Languages by default, set in Settings), writes a subject and details, and chats with support. Staff can set the status and link the product made for it; the buyer gets an SMS/email on each answer.
- **User text is plain text only:** `shared/utils/plain-text.ts` strips tags, control and bidi-override characters on the server, and pages show it with Vue's escaped `{{ }}` (never `v-html`). The only HTML shown is product descriptions, cleaned with sanitize-html.
- **Uploads are checked by their bytes**, not their name or claimed type (`server/utils/file-type.ts`). Uploaded and preview files are served with `nosniff` and a sandboxing CSP, so even an SVG with a script can't run.

## Roadmap

See the plan: milestone 3 adds the marketplace (sellers, commission agreements, payouts).
