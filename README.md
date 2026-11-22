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
| `site.config.mjs` | Nav, footer, protocol revision, app store links, seller and legal placeholders, `prelaunch` |
| `src/layout.html` | The one layout |
| `src/pages/*.html` | Page bodies with front matter (`title`, `description`, optional `noindex`, `scripts`) |
| `src/docs/index.md` | The docs: one long page at `/docs`. Its contents list is built from the h2 and h3 headings and placed at `<!-- contents -->`, after the intro; each section ends with "↑ Contents". `## Title {#id}` sets an anchor |
| `src/status/incidents.md` | Incident log for `/status` |
| `src/assets/tokens.css` | Byte copy of `sealctl/.github` `brand/tokens.css`; `npm run check` compares it with upstream |
| `src/assets/site.css` | Layout and components; colours only from tokens |
| `src/_headers`, `src/_redirects` | Security headers, caching, redirects |
| `scripts/check-tokens.mjs` | Upstream token diff, raw-colour grep, WCAG AA contrast of every text pair in both themes |

The build fails on a redirect to a missing page or anchor, a missing front-matter field, a title over 60 characters, an image without `alt`, a broken internal link or anchor, a duplicate id, an inline style or inline script (both blocked by the CSP), and an unknown `{{variable}}`.

## Before launch: placeholders and noindex

The site is written as for a released product, in the present tense. Everything that still has to be filled in lives in `site.config.mjs`; the pages show it as highlighted brackets until then:

| Key | Where it shows | Who fills it |
| --- | --- | --- |
| `app.appStore`, `app.googlePlay` | Store links on Home, Install and Docs (now `#`) | Once the app is published |
| `seller.legalName`, `tradingName`, `address`, `registration` | Privacy, Terms, Contact, footer | The seller |
| `legal.privacyVersion`, `legal.termsVersion` | Version dates of Privacy and Terms | The seller |
| `legal.emailRetention`, `legal.emailProvider` | Privacy | The seller |
| `legal.refundDays` | Refunds | The seller |
| `legal.answerTime` | Contact | The seller |
| `legal.termsChangesNote`, `termsLiabilityNote`, `termsDsaNote` | Terms: service changes, liability, DSA contact point; replace the note with the final wording, or with `""` | The seller, with a lawyer |

While `prelaunch: true`, **every page carries `<meta name="robots" content="noindex">` and every response `X-Robots-Tag: noindex`**. It changes no visible text. Set it to `false` once the placeholders are filled in.

Other things to update when they become true:

- `protocol.rev` and `protocol.sha` when `/crypto` is checked against a newer `docs/protocol.md`; the diagrams in `src/pages/crypto.html` are hand-laid-out inline SVG.
- App screenshots, `/card-a4.pdf` and `/card-letter.pdf`, the `.well-known` app-link files (Play app signing certificate, Apple team id).

## Deploy

Cloudflare Pages project `sealctl-website`, output `dist`, build command `npm ci && npm run build`, `NODE_VERSION=24`. `PADDLE_CLIENT_TOKEN_LIVE` and `PADDLE_CLIENT_TOKEN_SANDBOX` (public client tokens) are read at build time; without them `/pay` says checkout isn't set up.

Manual preview deploy:

```sh
npm run build
npx wrangler pages deploy dist --project-name sealctl-website --branch preview
```
