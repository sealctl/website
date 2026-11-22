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

Node 24. The only build dependency is `marked`. `qrcode-generator` is copied into `dist/` as the QR encoder for `/p`. `html-validate` and `linkinator` (`npm run check`) and `wrangler` (`npm run dev`, CI deploys) are dev dependencies, so they come from the lockfile too, never from a fresh `npx` download.

## Dependencies

- Every version in `package.json` is exact and `package-lock.json` is committed. Install with `npm ci`, which installs the lockfile as it is.
- `.npmrc` turns off dependency install scripts (`ignore-scripts=true`), and `allowScripts` in `package.json` denies the three that exist: `esbuild` and `workerd` only check their native binary, fetch it if the platform package is missing, and relink it; npm already installs the platform package, and `fsevents` ships a prebuilt binary. Everything here, `wrangler pages dev` included, works without them. A new package with an install script shows up in `npm install-scripts ls`; deny it unless it is needed.
- `npm install` and `npm update` only take versions published at least 7 days ago (`min-release-age=7` in `.npmrc`). Dependabot waits the same 7 days (14 for a major version) and groups its updates; GitHub Actions are pinned to commit SHAs.
- CI (`deploy.yml`, job `build`, on every pull request and push) runs `npm ci --ignore-scripts`, `npm audit signatures`, the build and `npm run check`. One run per pull request: a new push cancels the old run; runs on `main` are never cancelled, and production deploys run one at a time. Every job has a timeout.
- `/assets/js/qrcode.<hash>.js` is `node_modules/qrcode-generator/qrcode.js` byte for byte, so its file hash is the published 1.4.4 file. Check: `shasum -a 256 dist/assets/js/qrcode.*.js node_modules/qrcode-generator/qrcode.js`.

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

Deploys happen only in GitHub Actions (`.github/workflows/deploy.yml` and `preview.yml`), never from a laptop: no local `wrangler login`, no local `wrangler pages deploy`.

| Trigger | What happens | GitHub environment |
| --- | --- | --- |
| Push to `main` (merged pull request), the 1st of each month, or a manual run on `main` | Build, check, deploy `dist/` to Cloudflare Pages project `sealctl-website`, branch `main` → sealctl.com | `production` (deployment branches: `main` only; merging to `main` is the production deploy) |
| Pull request from a branch of this repo | `deploy.yml` builds and checks without secrets and uploads `dist`. When that run succeeds, `preview.yml` (a `workflow_run` workflow, so its definition always comes from `main`) installs wrangler from `main`'s lockfile, downloads only that run's `dist` (minus `_worker.js` and `functions/`), deploys it with `--branch <head branch>` and comments the preview URL on the pull request | `preview` (deployment branches: `main` only, which is where `workflow_run` runs; branch names are checked and `main` is refused) |
| Pull request from a fork | Build and check only; no secrets, no deploy | none |

No job that holds the token runs code from a pull request: the pull request's `package.json`, lockfile, `.npmrc` and workflow files are never used by a deploy. The build job has no secrets. The deploy jobs install from the lockfile again (`npm ci --ignore-scripts && npm audit signatures`) and run the locked `wrangler`, never `npx wrangler@latest`. If `CLOUDFLARE_API_TOKEN` is not set in the job's environment, the deploy prints "CLOUDFLARE_API_TOKEN not set — deploy skipped" and the run stays green (Dependabot pull requests get no secrets, so they always skip). The monthly run rebuilds `/.well-known/security.txt` so its `Expires` never lapses.

Settings, made once by the owner:

```sh
# Cloudflare API token: Account › Cloudflare Pages › Edit, this account only, nothing else.
# gh reads the value from the terminal; it is never echoed or stored in a file.
gh secret set CLOUDFLARE_API_TOKEN -R sealctl/website --env production
gh secret set CLOUDFLARE_API_TOKEN -R sealctl/website --env preview   # leave unset to turn previews off

# Not secret; already set on both environments
gh variable set CLOUDFLARE_ACCOUNT_ID -R sealctl/website --env production --body <account id>
gh variable set CLOUDFLARE_ACCOUNT_ID -R sealctl/website --env preview --body <account id>

# Public Paddle client tokens, read at build time; unset → /pay says checkout isn't set up
gh variable set PADDLE_CLIENT_TOKEN_LIVE -R sealctl/website --body <live client token>
gh variable set PADDLE_CLIENT_TOKEN_SANDBOX -R sealctl/website --body <sandbox client token>
```

Check a deploy: the run's `production` job shows the deployment, the repository's Deployments page links sealctl.com, and the Pages dashboard lists the deployment with the commit. Rollback: Pages dashboard → Deployments → "Rollback to this deployment", or revert on `main` (which deploys again).
