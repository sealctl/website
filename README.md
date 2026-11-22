# sealctl.com

The website for [sealctl](https://github.com/sealctl/sealctl): product pages, docs, the Paddle payment page, legal pages and the status page. What it must contain is in [SPEC.md](SPEC.md).

Static HTML built by one Node script (`build.mjs`), hosted on Cloudflare Pages. No framework, no runtime dependencies, no analytics, no cookies.

## Build and preview

```sh
npm ci
npm run build        # dist/
npm run dev          # build, then wrangler pages dev on localhost:8788
npm run check        # tokens and contrast, html-validate, internal links
```

Node 24. The only build dependency is `marked`, pinned.

## Layout

| Path | What |
| --- | --- |
| `build.mjs` | Layout, Markdown, fingerprinting, sitemap, `security.txt`, build checks |
| `site.config.mjs` | Nav, footer, release numbers, protocol revision, seller placeholders, `prelaunch` |
| `src/layout.html` | The one layout |
| `src/pages/*.html` | Page bodies with front matter (`title`, `description`, optional `noindex`, `scripts`, `strip`) |
| `src/docs/index.md` | The docs: one long page at `/docs`. Its contents list (sticky sidebar, a bar on phones) is built from the h2 and h3 headings; `## Title {#id}` sets an anchor. `assets/js/docs.js` marks the section being read |
| `src/status/incidents.md` | Incident log for `/status` |
| `src/assets/tokens.css` | Byte copy of `sealctl/.github` `brand/tokens.css`; `npm run check` compares it with upstream |
| `src/assets/site.css` | Layout and components; colours only from tokens |
| `src/_headers`, `src/_redirects` | Security headers, caching, redirects |
| `scripts/check-tokens.mjs` | Upstream token diff, raw-colour grep, WCAG AA contrast of every text pair in both themes |

The build fails on a redirect to a missing page or anchor, a missing front-matter field, a title over 60 characters, an image without `alt`, a broken internal link or anchor, a duplicate id, an inline style or inline script (both blocked by the CSP), and an unknown `{{variable}}`.

## Before launch: placeholders and noindex

While `prelaunch: true` in `site.config.mjs`, **every page carries `<meta name="robots" content="noindex">` and every response `X-Robots-Tag: noindex`**. That stays until the seller placeholders are filled in.

Placeholders are shown on the pages in highlighted brackets. Only the seller fills them in:

- `seller.*` in `site.config.mjs`: legal name, trading name, address, NIP and REGON (Privacy, Terms, Contact, footer).
- Version dates of Privacy and Terms; email retention period and email provider (Privacy).
- Terms: "[confirm wording]" (service changes), "[Lawyer to word]" (liability), "[Lawyer to confirm DSA wording]".
- Refund window (Refunds); answer time (Contact).

Then set `prelaunch: false`.

Other things to update when they become true:

- `release.unsealReleased: true` once 0.6.0 is published (changes the status strip).
- `protocol.rev` and `protocol.sha` when `/crypto` is checked against a newer `docs/protocol.md`; the diagrams in `src/pages/crypto.html` are hand-laid-out inline SVG.
- Store badges, app screenshots, `/card-a4.pdf` and `/card-letter.pdf`, the `.well-known` app-link files: they need the app.

## Deploy

Cloudflare Pages project `sealctl-website`, output `dist`, build command `npm ci && npm run build`, `NODE_VERSION=24`. `PADDLE_CLIENT_TOKEN_LIVE` and `PADDLE_CLIENT_TOKEN_SANDBOX` (public client tokens) are read at build time; without them `/pay` says checkout isn't set up.

Manual preview deploy:

```sh
npm run build
npx wrangler pages deploy dist --project-name sealctl-website --branch preview
```
