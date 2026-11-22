# sealctl.com: website spec

This repository builds and deploys https://sealctl.com: the product pages, the user docs, the payment page that Paddle's checkout opens on, the legal pages and the status page.

Sources of truth this spec depends on:

- Brand: [`sealctl/.github` → `brand/`](https://github.com/sealctl/.github/tree/main/brand) (`README.md`, `tokens.css`, marks, social preview).
- Relay API, licence, checkout and Paddle webhook: [`sealctl/sealctl` → `docs/protocol.md`](https://github.com/sealctl/sealctl/blob/main/docs/protocol.md#relay-api).
- Security policy: [`sealctl/.github` → `SECURITY.md`](https://github.com/sealctl/.github/blob/main/SECURITY.md).

## Goals and rules

- Explain what sealctl does in one screen, then prove it with real product screens and checkable facts.
- Only true, checkable claims. No user counts, testimonials, customer logos, badges or certifications we don't hold. No "military-grade", no "unbreakable".
- Say what is closed: the relay is closed source; its API is public.
- No analytics, trackers, cookies or third-party requests on any page except `/pay` and `/pay/sandbox`, which load Paddle.js.
- Same words as the product: Locked, Open, Waiting, One tap, Places, Allow.
- Plain, short sentences. English only at launch.

## Stack

**Static HTML built by one Node script, hosted on Cloudflare Pages.**

| Part | Choice |
| --- | --- |
| Build | `build.mjs`, plain Node 24, about 300 lines |
| Runtime dependencies | None. The site ships HTML, one CSS file and a few small scripts |
| Build dependencies | `marked` (Markdown to HTML for docs), pinned to an exact version |
| Test dependencies | `lychee` (links), `html-validate`, `@axe-core/cli` or `pa11y-ci`, `@lhci/cli`, Playwright; CI only |
| Hosting | Cloudflare Pages, deployed from GitHub Actions with `wrangler pages deploy`, production branch `main` |

Why:

- The pages are text, a few product screens and one payment page. A framework would add a toolchain and updates for no gain.
- One script that wraps page bodies in one layout keeps every page's HTML readable in review.
- Docs are Markdown so they can be written alongside CLI changes. `marked` is the only package the build needs.
- Pages gives HTTPS, previews per branch and pull request, `_headers` and `_redirects` without a server.

Rejected: Astro, Eleventy, Hugo (more than we need); a Worker serving the site (no need for code at request time); Cloudflare Web Analytics (no analytics, by rule).

### Repository layout

```text
build.mjs              # the build: layout, Markdown, fingerprinting, sitemap, security.txt
site.config.mjs        # nav, footer links, relay URL, Paddle environment names
src/
  layout.html          # <head>, header, footer; {{title}}, {{description}}, {{body}}
  pages/               # one HTML body fragment per page, with a small front-matter block
    index.html how-it-works.html security.html crypto.html pricing.html install.html
    pay.html privacy.html terms.html refunds.html contact.html status.html p.html 404.html
  docs/                # Markdown, one file per page; nav.json fixes the order
  status/incidents.md  # incident log, newest first
  assets/
    tokens.css         # copy of brand/tokens.css, checked in CI
    site.css           # layout and components, uses tokens only
    js/copy.js js/pay.js js/status.js
    img/               # mark.svg, mark-dark.svg, favicon.svg, apple-touch-icon.png, social-preview.png, screenshots
    files/             # card-a4.pdf, card-letter.pdf
  _headers _redirects robots.txt
  well-known/           # apple-app-site-association, assetlinks.json (copied to /.well-known/)
tests/                 # Playwright specs, Lighthouse budgets, axe config
.github/workflows/check.yml
```

Front matter per page: `title`, `description`, `noindex` (optional), `scripts` (optional list). The build:

1. Renders each page into `layout.html`; docs pages also get the docs sidebar and "Edit on GitHub" link.
2. Fingerprints CSS, JS and images (`site.3f9a1c2b.css`) and rewrites references.
3. Writes `sitemap.xml` (pages without `noindex`), `/.well-known/security.txt` (below) and `404.html`.
4. Renders `pay.html` twice: `/pay` with `PADDLE_CLIENT_TOKEN_LIVE` and the live environment, `/pay/sandbox` with `PADDLE_CLIENT_TOKEN_SANDBOX` and `Paddle.Environment.set("sandbox")`. Both tokens come from GitHub Actions repository variables and are public by design.
5. Fails on: a missing front-matter field, a broken internal link, an image without `alt`, a page title over 60 characters.

`npm run dev` builds and serves `dist/` on `localhost:8788` with `wrangler pages dev` so `_headers` and `_redirects` behave as in production.

## Information architecture

| URL | Page | In nav |
| --- | --- | --- |
| `/` | Home | Logo |
| `/how-it-works` | How it works | Header |
| `/security` | Security | Header |
| `/crypto` | Cryptographic design | Security page, footer, docs Reference |
| `/pricing` | Pricing | Header |
| `/docs` | Docs: one long page | Header |
| `/install` | Install | Hero card, docs |
| `/pay` | Payment page for Paddle checkout (live) | No (noindex) |
| `/pay/sandbox` | The same page for Paddle's sandbox, used by the staging relay | No (noindex) |
| `/p` | Pairing link landing page: "Scan this code with the sealctl app", above the code a warning to scan it only after running `sealctl pair` on this computer; the machine name is shown as the link's claim; draws again when the fragment changes | No (noindex) |
| `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json` | Universal links and App Links for `/p` | No |
| `/status` | Relay status and incidents | Footer |
| `/privacy` | Privacy | Footer |
| `/terms` | Terms | Footer |
| `/refunds` | Refunds | Footer, pricing |
| `/contact` | Contact and seller details | Footer |
| `/.well-known/security.txt` | Security contact (RFC 9116) | No |
| `/card-a4.pdf`, `/card-letter.pdf` | Blank recovery card | Docs, How it works |
| `/404.html` | Not found | No |

Header: mark and `sealctl` wordmark, then How it works, Security, Pricing, Docs; GitHub link on the right. Below 720 px the nav collapses into a `<details>` menu (no JS).

Footer: wordmark, Docs, Security, Cryptography, Status, GitHub, Terms, Privacy, Refunds, Contact; "Payments by Paddle" on the right; "© [year] [legal name]" on the second line.

Redirects (`_redirects`):

| From | To | Code |
| --- | --- | --- |
| `/github` | `https://github.com/sealctl` | 302 |
| `/card` | `/card-a4.pdf` | 302 |
| `/buy` | `/docs#paying` | 302 |
| `/docs/paying`, `/docs/leaving` | `/docs#paying`, `/docs#leaving` | 301 |
| `/docs/*` (any other old docs page) | `/docs` | 301 |

`www.sealctl.com` redirects to `https://sealctl.com` with a Cloudflare redirect rule. The production `*.pages.dev` host redirects to `sealctl.com` with a Bulk Redirect, so only previews stay on `pages.dev`.

## Pages

Copy below is direction, not final text. Headlines marked "copy" are approved wording from the example homepage.

### Home `/`

Follows the approved example: hero text beside a start card, a live product scene, a six-card grid, then trust and price bands.

1. **No status strip.** The site reads as for a released product, in the present tense: no "in development", "coming soon" or "Planned" labels. Features the specs don't design are left out, not labelled. The site never mentions releases before 0.7.0.
2. **Hero.** Eyebrow "Secrets for AI coding agents". H1 (copy): "Your agents run the code. *Your phone holds the keys.*" Lede (copy): "sealctl keeps API keys, SSH keys and backup passwords off your disk. When an agent needs one, your phone asks, you tap **Allow**, and the key goes into that one command. The agent never sees it, and it never lands in a transcript or a `.env` file." Buttons: Get started (to the start card), How it works.
3. **Start card** "Start in two minutes": step 1 `brew install sealctl/tap/sealctl` with a Copy button, and "Other systems" linking to `/install`; step 2 "Get the phone app, then run `sealctl pair` and scan the code" with App Store and Google Play links (`app.appStore`, `app.googlePlay` in `site.config.mjs`). Fine print: "Free, no account."
4. **Scene.** A terminal where an agent runs `sealctl run -- npm test`, shows "Waiting for your phone", then the tests pass; beside it the phone's approval card. The terminal is real CLI output, pasted from a real run. The phone card is a screenshot of the real app as soon as it exists; until then an HTML rendering that matches the app spec's card text exactly.
5. **Six cards** (copy): Agents use the key without seeing it · One tap, or none at your desk · Locked when you leave · 24 words on paper · Volumes and backups too · Nothing goes missing silently.
6. **Trust band.** H2 (copy): "If we disappear, *your keys don't.*" Lede: "Everything sealctl protects opens from your 24 words with the open-source command line tool. And `sealctl unseal --all` hands it all back under passwords of your own whenever you want to leave. No server, account or subscription stands between you and your data." Four proofs: Open source (MIT CLI, AGPL app, public protocol); The relay sees sealed data (what it keeps, link to `/privacy#relay`); Security reports (GitHub private advisories, first answer in three working days); Payments by Paddle. Beside it: the recovery card illustration with three handwritten words.
7. **Price band.** H2 (copy): "Free to use. *$5.99 once* if it earns its place." Bullets: employer can pay with a VAT invoice; teams buy seats and share one code; no subscription, no ads, no trackers. Beside it: the `sealctl buy` terminal.
8. Footer.

Changes from the example, decided here:

- Use the brand mark (Box shield, `mark.svg` / `mark-dark.svg`), not the wax-seal symbol in the example.
- Colours come from `tokens.css`; the example's own values for hover, soft accent and text-on-accent in dark mode differ and are dropped.
- Security contact is the GitHub private advisory link first, `security@sealctl.com` second, as in `SECURITY.md`.
- "By continuing you agree to the Terms and Privacy" is dropped from the start card: downloading free software is not an agreement. Terms are linked in the footer and shown at pairing by the CLI and app.

### How it works `/how-it-works`

One page, top to bottom, each section with a real screen:

1. **The approval.** The agent asks, the phone shows who asks (agent, repository, command, `user@host`, key), you tap, the key goes into one command and stays in memory for the session. Masked output.
2. **Your day.** The "A day" table from the product: one tap at 09:00, meetings keep it open, lunch outside locks it and keeps the credit, back at the desk it reopens by itself, hard stop at 02:00.
3. **States and asking.** Locked, Open, Waiting; Automatic, One tap, In the app. Exact table text from the product docs.
4. **Places.** Learned, not drawn; locations never leave the phone in readable form (only inside the encrypted backup); without the location permission there are no places.
5. **Setup.** Install, pair (QR code), `sealctl scan` moves keys out of `.env`, shell rc files, shell history and `~/.aws`, `sealctl ai install` for your agents.
6. **The 24 words.** Printed blank card, written by hand, checked by picking 3 words; restore from words; changing words is not in the app yet (keep the card safe; after a lost phone, restore and change the secrets that matter). Links to the card PDFs.
7. **What it is not.** Not a password manager, not a team vault, not for regulated bastion work. Passwords stay in 1Password, Bitwarden or the browser.

### Security `/security`

The page for everyone, readable in about two minutes. Plain, concrete, checkable statements: what is stored where, who can see what, what happens when. No metaphors or story framing; a term that can't be avoided is explained in the same sentence. At most two or three short sentences per block; details belong in `/docs` or `/crypto`. Every statement, and every app button it names, matches what the app and CLI do today. Pictures are factual: flat inline SVG or styled HTML in token colours, no characters. "For specialists: Cryptographic design" under the lede.

1. **Where your keys are** (`#where`). One row each: your phone (makes every key; readable only while unlocked), your computer (only after you approve, held in memory, not written to disk by sealctl, until the session ends), the relay (never; sealed messages only), sealctl (us) (never), your paper card (the 24 words).
2. **How your computer gets a key** (`#approve`). The approval card as the app shows it, with Allow for this session, Allow once and Deny; one key per thing, and knowing one key reveals no other key or the words; a work session as four steps: approve, work, the session ends (lock, idle, phone leaves, 02:00), the key is gone.
3. **What happens if…** (`#threats`). Cards, each a pictogram, a title, one sentence of at most 25 words, at most three steps of at most 10 words, and "Details" linking to `/docs`: lose your phone; laptop stolen; an AI agent asks for a key; someone takes your unlocked phone (biometrics, the two-hour wait, `sealctl cancel`); you lose your card; the relay or sealctl disappears (`#disappear`).
4. **What sealctl can't do** (`#limits`). One line each: a program given a key can leak it; malware running as you; while a session is open, the system can copy keys to swap or a hibernation file; agent guards stop mistakes only; someone with your unlocked phone or its passcode; the relay can delay or drop messages; changing words is not in the app yet; lost words have no reset.
5. **How to check this** (`#proof`). Open source (`#closed`: CLI MIT, app AGPL-3.0, the relay closed with a public API); standard cryptography only (`#standard`, links into `/crypto`); the public protocol with test vectors every component checks; what the relay keeps (`#relay`, `/privacy#relay`); what we don't claim (`#claims`: no independent audit or certifications; internal AI-assisted tests are not an audit).
6. **Security log** (`#log`). `{{securityLog}}` from `src/security/log.json`; checks that run all the time (`#checks`, `{{securityChecks}}`); checking a download (`#releases`): `gh attestation verify <file> --repo sealctl/sealctl` for the build attestation (who built it; covers the packages, tarballs, `PKGBUILD` and `SHA256SUMS`), and `SHA256SUMS` for a damaged download only.
7. **Report a problem** (`#report`). GitHub private advisory link; `security@sealctl.com`; first answer within three working days; credit in release notes; the safe-harbour paragraph (`#safe-harbour`, same terms as `SECURITY.md`); `security.txt` (with a comment line giving the answer time) and `SECURITY.md`.

### Cryptography `/crypto`

An engineering page: the whole cryptographic design on one page, as diagrams and tables, with as little prose as possible. Audience: a developer or reviewer deciding whether to trust sealctl. Its header says it is the specialist page and links to `/security` for the plain-words version.

Rules:

- Every fact comes from [`docs/protocol.md`](https://github.com/sealctl/sealctl/blob/main/docs/protocol.md) and links to its section by name: "Derivation and test vectors", "Store format", "Pairing QR code and proof", "Request and reply encryption", "Relay API". The page quotes no byte values, lengths or labels that the protocol doesn't state; where it states them, the page links rather than copies.
- Everything the protocol specifies is described in the present tense, push through APNs and FCM included; nothing carries a "Planned" label.
- Diagrams are hand-drawn inline SVG in the HTML, no images, no JS, no diagram library. Shapes use `fill`/`stroke` from CSS classes bound to the tokens (`--ink`, `--muted`, `--border-strong`, `--surface`, `--accent`), so both themes work without a second drawing. Labels in `--mono`, at least 13 px rendered. Each SVG has `role="img"`, a `<title>` and a `<desc>` that states the same facts as text.
- Readable on a phone: each diagram has a narrow layout (vertical stack) drawn as a second SVG, with a CSS media query showing one of the two; or a single `viewBox` that stays legible at 320 px. Wide tables scroll inside their own container.
- Accent (sealing wax) marks only secret material: keys that open data. Public keys and ciphertext are ink.

Sections:

1. **One-paragraph summary.** "Every key comes from 24 words. The phone holds the root and derives a key per object. A machine gets a key only after the phone approves, sealed so that only that machine's one-time key opens it. The relay carries sealed messages and sees no keys."
2. **(a) Derivation tree.** SVG tree, top to bottom:
   - 24 words → BIP39 seed → root (HKDF-SHA256).
   - From the root, one branch per purpose, each labelled with its purpose string as `derive(root, "<purpose>:<id>")`: phone identity (`phone:identity`, Ed25519), phone box key (`phone:box`, X25519, which machines encrypt requests and status to), store key (`secrets:<store-id>`), own-approval key (`secret:<file id>`), volume key (`volume:<volume id>`), backup key (`backup:<repository id>`), state key (`state`), words fingerprint (`fingerprint`, 4 characters).
   - Under the store key: file key = HKDF(store key, `<file id>`), computed on the machine.
   - Beside the tree, not connected to it: the machine's pairing key, its box key and the per-request one-time key, labelled "random, made on the machine". This shows that machine keys never come from the words.
   - Caption: "The id is generated and read from the object itself; no hostnames, users or labels enter the derivation. An encrypted object plus the 24 words is enough to open it." Link: "Derivation and test vectors".
3. **(b) One approval, as a sequence.** SVG with four lifelines: Machine, Relay, Phone and Push services. Numbered hops:
   1. Machine makes a one-time key; signs the request with its pairing key and seals it with HPKE to the phone's box key; signs the relay call; opens a WebSocket `wait`.
   2. Relay checks the signature and pairing; holds the sealed request in memory; tells the phone over its socket and by push.
   3. Phone opens the request, shows the card, derives the key after the tap.
   4. Phone seals the key with HPKE to the machine's one-time key, signs the reply with its identity key, posts it.
   5. Relay passes the sealed reply to the waiting socket and forgets both.
   6. Machine checks the phone's signature, opens the reply with its one-time key, keeps the key in memory.

   Under each hop, a strip "Relay sees:" with exactly what it sees: public keys, sizes, times, the network address; never the request content or the key. Links: "Request and reply encryption", "Relay API → Requests and replies".
3a. **What the relay sees.** A diagram of what is outside and inside the seal, then the full list the relay holds or passes on (moved from `/security`), that it never logs what was asked and its code stores no IP address (Cloudflare keeps addresses of blocked requests), link to `/privacy#relay`, and the closed relay paragraph: closed source, public API, replies signed by the phone, data opens without it.
4. **(c) Who sees what.** Table. Rows: Machine (while Open), Machine (Locked), Relay, Push services, Phone (unlocked), Phone (locked), Paper card, Attacker with the laptop, Attacker with the relay database, Attacker with the 24 words. Columns: root, store and purpose keys, secret values, request content (which key, which command), metadata (machine names, times, network address), encrypted phone state. Cells say "yes", "no", "in memory while Open", "sealed only", with one footnote per qualified cell.
5. **(d) Key lifetimes.** Table: key, made how, lives where, how long. Root (phone, readable only while unlocked; synced keychain copy); phone identity; pairing key (OS keychain or 0600 file, until unpaired); one-time key (machine memory, one request); store key and file keys (machine memory, the session: idle allowance, hard stop at 02:00 or 14 h); own-approval key (one command); volume key (while mounted); backup key (during a backup); state key (phone). A horizontal bar SVG for one workday shows when the store key exists in machine memory, using the product's "A day" example.
6. **(e) Primitives and libraries.** One line first: standard parts only, no custom cryptography, the phone's own lock for the root. Table: primitive, standard, where used, library per implementation (Rust core, relay on WebCrypto, Swift app, Kotlin app; filled in from each repository's lockfile at build time or by hand per release). Rows: BIP39 (link to the BIP), HKDF-SHA256 (RFC 5869), HPKE (RFC 9180), Ed25519 (RFC 8032), the AEAD named in the protocol, SHA-256 (FIPS 180-4), HMAC-SHA256 for Paddle webhooks (RFC 2104). Link to the test vectors in the public repository and to the cross-implementation tests.
6a. **Threats and answers.** The threat table with three columns: threat, sealctl's answer, **what remains** (moved from `/security`; the "what remains" column is the most credible part). Includes the unlocked phone taken: biometrics, card check, the two-hour delay. Links to `docs/threat-model.md`.
7. **(f) What is deliberately not protected.** List from the threat model's "what remains" column: a process given a key can leak it; malware can use what is open while the session is open; a thief past the screen lock during an open session; a thief with the phone and its passcode; copies an attacker already took before a change of words; the relay operator can see metadata (which machines ask, when, from which network address) and can withhold or delay messages, but cannot forge a phone's reply or read a key. From the threat model also: a compromised machine while Open (the daemon answers any process of the same user), malware posing as the user rather than an agent, loss of the words; then its assumptions. No independent audit yet.
8. **Where to check.** Links: `docs/protocol.md`, test vectors, `SECURITY.md`, the releases' `SHA256SUMS`.

Acceptance: every claim on the page has a link to the protocol section it comes from; a reviewer can check each label in the tree against the protocol's purpose strings; diagrams pass axe and read correctly at 320 px in both themes with JS off.

### Pricing `/pricing`

1. H1 "Free to use. $5.99 once if it earns its place."
2. **What is free:** the app, the command line tool and the relay. Nothing in the app changes when you pay.
3. **When you're asked:** after 30 days with use, one line in your terminal after a command you typed, at most once a week. Never in `sealctl run` output, pipes, CI or anything an agent reads. Never on the phone.
4. **Who can pay:** you (card); your company (Paddle invoice with VAT ID); anyone you send a payment link to. `sealctl buy` asks which.
5. **Teams:** `sealctl buy --seats 10` gives one code; each developer runs `sealctl buy --code XXXX-XXXX`. A claimed seat stays with that person.
6. **One licence, all your machines.** It belongs to your phone's identity and survives a restore from the words.
7. **Taxes and currency:** price in US dollars; VAT or sales tax depends on your country and is shown at checkout.
8. **Refunds:** link to `/refunds`.
9. **Payments by Paddle:** "Paddle is our reseller and merchant of record. They handle checkout, VAT, invoices and refunds. We never see your card."
10. Small FAQ: "Will the app ever ask me to pay?" No. "What if I never pay?" It keeps working. "Does paying change limits?" No; everyone has the same 5,000 requests a day per phone, which normal use never reaches.

### Install `/install`

Sections with anchors, no tabs script: macOS (Homebrew), Debian and Ubuntu (`.deb`), Fedora, RHEL, Rocky and openSUSE (`.rpm`), Arch (`PKGBUILD`), Nix (`nix profile install github:sealctl/sealctl`), any Linux (tarball), from source (`cargo install --locked --git …`). Each has the exact command and a link to the latest GitHub release. Then: verify with `gh attestation verify` (build attestation) and `SHA256SUMS` (damaged downloads only); shell completions; upgrade and uninstall; the phone app links; next step `sealctl pair`.

No `curl | sh` installer. Commands use "latest release" links (`https://github.com/sealctl/sealctl/releases/latest`), so the page needs no edit per release.

### Docs `/docs`

One long page, written in Markdown in this repo (`src/docs/index.md`), in the style of a single-page manual (mockk.io): after the intro, a plain nested contents list built from its h2 and h3 headings; then short sections with anchors, each ending with a link back to the contents, and copyable commands. No sidebar. It marks what is not built yet. Version numbers appear nowhere in the prose; the release itself is the only place that names one. The table below is its order of topics; old per-page URLs redirect to their anchors. Developer docs (protocol, derivation, store format, threat model source) stay in `sealctl/docs/` and are linked, not copied.

| Section | Pages |
| --- | --- |
| Get started | Install · Pair your phone · Scan and seal · Your first `sealctl run` |
| Secrets | Secret store (`secret set`, `list`, `rm`) · `--own-approval` · `.sealctl.toml` · Store backup |
| Agents | `sealctl ai install` · Claude Code · Codex · Cursor · Gemini · Qwen · Copilot · Per-agent answers (`sealctl rules`) |
| Cloud and CI | AWS (`credential_process`) · GCP · GitHub and git credential helper · Remote sessions and CI runners |
| SSH and git | `sealctl seal ssh` (was `ssh import`) · SSH agent · `sealctl git setup` |
| Volumes and backups | Volumes (APFS, LUKS, sparse bundle) · Backups (restic to S3, R2, B2, folder) · Busy volumes |
| Your phone | Approval card · Sessions, states and places · Machines and tags · Usage log · Inventory |
| Your 24 words | Recovery card · Restore a phone · `sealctl recover` without a phone · Change words (not in the app yet: what to do instead) |
| Arriving and leaving | `sealctl seal`: bring your own volumes, backups, SSH keys and secrets · Leaving sealctl (`/docs/leaving`): `sealctl unseal`, `unseal --all`, Leave sealctl on the phone, what stays encrypted, where passwords go, keeping the card |
| Paying | `sealctl buy` · Company invoice · Team seats and codes · Moving a licence |
| Reference | CLI reference (generated) · `.sealctl.toml` reference · Exit codes and errors · Cryptographic design (`/crypto`) · Protocol (link) |
| Help | Troubleshooting · FAQ · Changelog (link to releases) |

- The CLI reference is generated from a Markdown file that each sealctl release attaches (`sealctl-<version>-cli.md`). `npm run sync-cli <version>` downloads it into `src/docs/reference/cli.md` and is committed, so builds never need the network.
- The page ends with "Edit this page on GitHub" and the date of the last commit.
- No search at launch; the contents list and browser find are enough.
- Code blocks get a Copy button (`copy.js`, under 1 KB); no syntax highlighting.

### Pay `/pay`

The page Paddle's checkout opens on. `sealctl buy` asks the relay for a checkout; the relay creates a Paddle transaction with `checkout.url` set to this page; Paddle returns `https://sealctl.com/pay?_ptxn=txn_…`. This page loads Paddle.js, which opens the checkout for that transaction.

The sandbox copy is `/pay/sandbox` on the same site, not a branch alias. Paddle requires a default payment link before it creates transactions and, in live, on an approved domain. One production site with two paths gives each Paddle environment a stable link on `sealctl.com` (live `https://sealctl.com/pay`, sandbox `https://sealctl.com/pay/sandbox`), matching the relay's `PADDLE_CHECKOUT_URL`, with no long-lived branch to keep in step and no preview host name that changes with the Pages project.

Rules:

- The page holds no secrets. The Paddle client-side token is public by design. API keys and the webhook secret live only in the relay.
- The page never decides whether someone paid. The relay grants the licence from Paddle's signed webhook. The page only shows what Paddle.js reports.
- `noindex`, not in the sitemap, not in nav.

Build-time settings (GitHub Actions repository variables, the same in production and previews):

| Variable | Used by |
| --- | --- |
| `PADDLE_CLIENT_TOKEN_LIVE` | `/pay` |
| `PADDLE_CLIENT_TOKEN_SANDBOX` | `/pay/sandbox` |

Behaviour (`pay.js`, plain JS, no framework):

1. Read `_ptxn` from the query. Absent: show **No payment open**.
2. Show **Loading**: "Opening Paddle checkout…".
3. Load `https://cdn.paddle.com/paddle/v2/paddle.js`. If it fails to load or `Paddle` is missing after 10 s: show **Error: checkout didn't load**. If it loads after that, show **Loading** again and go on.
4. `Paddle.Environment.set("sandbox")` on `/pay/sandbox` only. `Paddle.Initialize({ token, eventCallback, checkout: { settings: { displayMode: "overlay", theme: <light or dark from prefers-color-scheme>, locale: "en" } } })`. With `_ptxn` in the URL, Paddle.js opens the checkout for that transaction.
5. Map events (names per Paddle.js v2 docs; confirm at build time):

| Event | State shown |
| --- | --- |
| `checkout.loaded` | Loading text replaced by "Checkout is open." |
| `checkout.completed` | **Success** |
| `checkout.closed` without completion | **Closed**, with "Reopen checkout" calling `Paddle.Checkout.open({ transactionId })` |
| `checkout.error`, or a transaction that is paid, cancelled or expired | **Error: link no longer valid** |

States and copy direction:

| State | Heading | Body |
| --- | --- | --- |
| No payment open | "No payment to open" | "This page opens a checkout started by `sealctl buy`. Run it in your terminal, or ask whoever sent you here for a new link." |
| Loading | "Opening Paddle checkout…" | Spinner that respects reduced motion. "Payments by Paddle. We never see your card." |
| Success, one seat | "Paid. Thank you." | "The licence reaches the phone that asked for it within a minute. `sealctl status` shows `Paid`. Paddle emails your receipt and invoice." |
| Success, several seats | "Paid. Thank you." | "The seat code appears in `sealctl status` on the machine that started the purchase. Share it with your team: `sealctl buy --code XXXX-XXXX`." |
| Success, paid by someone else | same | "The licence goes to the person who sent you this link." (shown on all success states as a second line) |
| Closed | "Checkout closed" | "Nothing was charged." Reopen button. |
| Error: didn't load | "Paddle's checkout didn't load" | "A content blocker or the network may have stopped it. Allow `cdn.paddle.com` and reload, or open this link in another browser." Reload button. |
| Error: link no longer valid | "This payment link can't be used" | "It was already paid, or it expired. Run `sealctl buy` again for a new link." |
| No JavaScript | `<noscript>` | "Paddle's checkout needs JavaScript." |

Seat count for the success text comes from the `checkout.completed` event data (item quantity).

Headers for `/pay` and `/pay/sandbox` only: a CSP that allows Paddle's script, frames and connections as listed in Paddle's CSP documentation (`cdn.paddle.com`, `*.paddle.com` frames for live and sandbox). Verified by a sandbox purchase with no CSP errors in the console. `Referrer-Policy` stays `strict-origin-when-cross-origin`; Paddle checks the page's domain.

Paddle settings this page needs (done in the Paddle dashboard, not here): default payment link `https://sealctl.com/pay` in live and `https://sealctl.com/pay/sandbox` in sandbox; `sealctl.com` approved as a checkout domain in live. The sandbox page carries a visible "Sandbox: test cards only" line.

### Status `/status`

Simple and honest, no third-party status service.

- **Live check**, from the visitor's browser: `status.js` calls `GET https://relay.sealctl.com/v1/health` with a 5 s timeout and shows "Relay answering, checked just now from your browser" or "The relay didn't answer from your browser". Needs `Access-Control-Allow-Origin: https://sealctl.com` on that one endpoint.
- **What an outage means**, always shown: "When the relay is down, open sessions keep working and keys already in memory stay usable. New approvals wait until it is back. `sealctl recover` with your 24 words never needs the relay."
- **Incidents**: built from `src/status/incidents.md`, newest first: date, duration, what users saw, cause, fix. Kept for 12 months. During an incident a commit to `main` updates it; Pages deploys in about a minute.
- No uptime percentages unless measured by a named external monitor and linked.

### Privacy `/privacy`

Short sections, plain words. Placeholders (`seller.*` and `legal.*` in `site.config.mjs`) stay until the seller fills them in; nobody else fills them.

1. **Who we are.** "sealctl is made and sold by `[legal name]`, `[trading name, if any]`, `[address]`, Poland. `[NIP and REGON, if registered]`. Email: `privacy@sealctl.com`." Controller under GDPR.
2. **The short version.** No accounts, no analytics, no trackers, no advertising. The website sets no cookies. The relay stores public keys, machine names and an encrypted backup it cannot open. The relay's code stores and logs no IP address.
3. **The website.** Served by Cloudflare, which processes IP addresses to deliver pages and stop attacks; we get no logs of visitors. No cookies. A chosen light or dark theme is remembered in the browser only, never sent to us. `/pay` loads Paddle.js, which sets the cookies and storage Paddle needs for checkout and fraud checks.
4. **The relay** (`id="relay"`). Table of every item from the protocol, with purpose and retention:

| Item | Why | Kept |
| --- | --- | --- |
| Phone identity public key | Identifies your phone; holds the licence | Until you delete your data |
| Machine pairing public keys; machine name (`user@host`), OS and model; pairing time | Routes requests; shows your machines on your phone | Until unpaired |
| When each machine last called the relay, to the hour | Shows "seen 2 h ago" on your phone | Until unpaired |
| Pairing proof | Lets the machine confirm the pairing | Until unpaired |
| Push token, platform and a random device id per phone app install | Wakes the app when a machine asks | Until replaced, removed, rejected by Apple or Google, or you delete your data |
| Encrypted phone state (pairings, places, answers, inventory) | Restores your phone | Until replaced or deleted; we cannot open it |
| Sealed requests and replies | Carries approvals | Held while waiting, at most 5 minutes; not logged; we cannot open them |
| Delayed approvals: which machine asked, when, and the sealed reply | A sensitive action away from a trusted place waits two hours and can be cancelled | Until the machine fetches it or the wait ends, at most 15 minutes after the two hours; we cannot open the reply |
| Sealed machine status and lock messages | Shows time left and locks machines from your phone | The latest status per machine; messages for an offline machine at most 24 hours; we cannot open them |
| Network address of phone and machine | Says whether the phone is near the machine; flood limits | Used in memory while serving the call, as a keyed hash; the relay's code never stores or logs it |
| Days with use (count), the last week the phone was seen, daily call count | The request to pay; deleting data after 2 years without use; the abuse limit | Count and week kept; daily counter in memory |
| Licence state, seat codes, Paddle transaction ids (last 100) | Your licence | As long as the licence exists, also after you delete your other data, so that restoring from your words keeps it. Ask us to erase it too |

   Location never leaves the phone in readable form: places travel only inside the encrypted backup. The relay never learns which key was used, which command ran or what the agent did. Cloudflare sees network addresses to deliver traffic and keeps those of requests it blocks as attacks in its security log. Operational logs hold no keys, addresses or identifiers (7 days); daily counts with no identifier (3 months). A phone that makes no call for 2 years has its data deleted; a licence record and its usage count stay.
5. **Payments.** Paddle is the merchant of record and a separate controller for payment data (link to Paddle's privacy notice). Paddle shares with us what we need to support you and keep tax records: name, email, country, company name and VAT ID if given, and what was bought. We never see card details. The phone's public identity key goes to Paddle (`custom_data`) to link payment and phone; deleting relay data doesn't delete Paddle's records.
6. **Email.** If you write to us, we keep the conversation to answer you and for `[retention, e.g. 2 years]`.
7. **App stores and push.** Apple and Google distribute the app under their own privacy terms. Push notifications go through Apple Push Notification service and Firebase Cloud Messaging; they carry no request content. On Android, Firebase also creates an installation id that Google uses to deliver notifications.
8. **Processors.** Cloudflare (website, relay hosting, email forwarding), Google Firebase Cloud Messaging and Apple Push Notification service (notifications), `[email provider, if any]` (email). Apple and Google distribute the app as independent controllers; Paddle is a separate controller as merchant of record; GitHub's privacy statement covers issues and advisories. Where data leaves the EEA, under the EU–US Data Privacy Framework or standard contractual clauses.
9. **Legal bases.** Contract (relay service, licence), legal obligation (tax records), legitimate interest (delivering and securing the website and relay, abuse limit, the request to pay and anonymous daily counts, answering email).
10. **Your rights.** Access, correction, deletion, restriction, portability, objection; complaint to the Polish supervisory authority, the President of the Personal Data Protection Office (UODO), or your own. How to delete: in the app, Settings, Delete my relay data, or Leave sealctl (when available), or by email with your phone's identity fingerprint; machines unpair from the phone or the CLI.
11. **Children.** Not meant for people under 16.
12. **Changes.** Dated versions; material changes announced on this page 30 days ahead.

### Terms `/terms`

1. **Who.** Seller block as in Privacy, plus `support@sealctl.com`.
2. **What sealctl is.** Free software (CLI under MIT, app under AGPL-3.0) and a free relay service. The licences on GitHub govern the software; these terms govern the relay and the paid licence.
3. **Using the relay.** No account. Technical requirements: a supported OS, the app on iOS or Android with a device passcode, an internet connection. Fair use: 5,000 calls a day per phone for everyone. Don't attack, overload or misuse it; don't use it for anything unlawful.
4. **The licence.** $5.99 once per person, or per seat. What it gives: it stops the request to pay and keeps sealctl running. Bought through Paddle, our reseller and merchant of record; Paddle's buyer terms apply to the purchase. A licence is tied to a phone identity and moves with a change of words. A licence never stands between you and your keys, restore, the words or `sealctl recover`.
5. **Your data and keys.** You hold the 24 words. We cannot recover them, reset them or open your data. Losing the words and the phone means losing access, by design.
6. **Availability.** Best effort, no uptime guarantee. If the relay is ever shut down: at least 90 days' notice on this site and in the CLI; your data opens without it.
7. **Changes to the service.** We may change limits for unpaid phones, for example how many machines can be paired; a paid licence is never limited this way and machines already paired keep working. `[confirm wording]`
8. **Liability.** Limited as far as the law allows; nothing limits liability for intent, gross negligence or consumer rights that can't be waived. `[Lawyer to word]`
9. **Complaints.** By email to `support@sealctl.com`; answered within 14 days.
10. **Ending.** You can stop any time and ask for deletion. We can block a phone that breaks these terms, with reasons.
11. **Law.** Polish law; consumers keep the protection of their own country's law. Contact point for authorities and users (EU Digital Services Act): `support@sealctl.com`, English or Polish. `[Lawyer to confirm DSA wording]`
12. **Changes to these terms.** Dated versions; 30 days' notice for material changes.

### Refunds `/refunds`

"Ask within `[30]` days of purchase, for any reason, and you get your money back. Write to `support@sealctl.com` with your Paddle order number, or use the link in Paddle's receipt email. Paddle issues the refund to the original payment method." Also: EU consumers' 14-day withdrawal right as stated in Paddle's buyer terms; refunds for team seats can be partial (unclaimed seats). A refunded licence goes back to unpaid: sealctl keeps working and only the weekly request to pay comes back. Claimed team seats stay with their people.

### Contact `/contact`

Support `support@sealctl.com` (licences, invoices, refunds, questions); bugs and feature requests on GitHub issues; security: advisory link and `security@sealctl.com`; privacy requests `privacy@sealctl.com`. Seller block. "We answer within two working days." `[confirm]`

### `/.well-known/security.txt`

Generated at build (RFC 9116), served as `text/plain; charset=utf-8`:

```text
Contact: https://github.com/sealctl/sealctl/security/advisories/new
Contact: mailto:security@sealctl.com
Expires: <build date + 365 days, ISO 8601>
Preferred-Languages: en, pl
Canonical: https://sealctl.com/.well-known/security.txt
Policy: https://github.com/sealctl/.github/blob/main/SECURITY.md
```

The deploy workflow also runs on the 1st of each month and deploys `main` again, so `Expires` never lapses.

### 404

"Nothing here." One line, then links to Home, Docs and Install. Same layout, `noindex`.

## Design

### Tokens

- `src/assets/tokens.css` is a byte-for-byte copy of `brand/tokens.css` from `sealctl/.github`. CI fetches the upstream file and fails if they differ. Change colours there, not here.
- Site-only tokens live at the top of `site.css`, defined for both themes in the same three blocks as `tokens.css`: `--radius-sm` (8px), `--ok`, `--ok-soft`, `--wait`, `--term-bg`, `--term-text`, `--term-dim`, `--term-ok`, `--term-key`, `--card-line`, `--shadow`, `--shadow-lg`, `--focus`. Values from the approved example. Candidates for upstreaming to `brand/tokens.css` once the app uses them too.
- No raw colour values in `site.css` outside those token blocks; CI greps for `#[0-9a-f]{3,8}` and `rgb(` outside them.

### Type and components

- System sans for text, system monospace for code, commands, fingerprints and the wordmark. No web fonts, with one exception: the recovery card illustration uses Caveat (OFL), self-hosted as a subset of Latin letters, under 15 KB, `font-display: swap`, loaded only on pages that show the card. If it breaks the budget, fall back to the system cursive stack.
- Components: header, footer, buttons (primary on accent, ghost), command box with Copy, terminal frame, phone frame, feature card, proof list, recovery card, table, callout (note, warning), docs sidebar, status pill.
- 12 px corners on cards; soft shadows; no gradients.
- Product screens: terminal output as real text in `<pre>` inside a `<figure>` with a `<figcaption>`; phone screens as screenshots with full `alt` text once the app exists.

### Themes

- Light and dark follow `prefers-color-scheme`. No toggle at launch (no storage, no flash-of-theme script). The `data-theme` hooks in `tokens.css` stay for a later toggle.
- Marks: `<picture>` with `mark-dark.svg` for dark. Screenshots: light and dark versions with `<picture>`.
- Every page is checked in both themes (see Testing).

### Accessibility

Target WCAG 2.2 AA on every page.

- Landmarks: `header`, `nav` with labels, `main`, `footer`; one `h1` per page; skip link to `main`.
- Contrast from the tokens passes AA in both themes (see brand README). Terminal colours are checked too.
- Visible focus ring (`--focus`) on every interactive element; nothing removes outlines without a replacement.
- Copy buttons announce "Copied" through an `aria-live="polite"` region.
- `/pay` states are in an `aria-live` region; the overlay is Paddle's and follows Paddle's accessibility.
- Animations stop under `prefers-reduced-motion`.
- Touch targets at least 24×24 px; layout works at 320 px wide with no horizontal scroll, except inside code blocks.
- Language: `lang="en"`.

### Performance budget

| Measure | Budget |
| --- | --- |
| HTML + CSS + JS per page, compressed | 60 KB (`/pay` excludes Paddle.js) |
| Our JS per page | 5 KB, none needed to read any page |
| Images per page | 200 KB; SVG where possible; screenshots as AVIF or WebP with PNG fallback, sized with `width` and `height` |
| Web fonts | Only the Caveat subset, only where the card is shown |
| Third-party requests | 0, except Paddle on `/pay` |
| Lighthouse (mobile) | Performance ≥ 95, Accessibility 100, Best Practices 100, SEO 100; `/pay` Performance not gated |
| LCP / CLS | < 1.5 s / < 0.05 on Lighthouse's mobile profile |

Caching (`_headers`): fingerprinted assets `Cache-Control: public, max-age=31536000, immutable`; HTML `public, max-age=0, must-revalidate`.

### Security headers (`_headers`, all pages)

- `Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self' https://relay.sealctl.com; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` (looser on `/pay` as above).
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (add `preload` after a month without problems).
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`.
- `X-Robots-Tag: noindex` on `/pay`, `/pay/sandbox`, `/p` and `/404.html`.

Cloudflare zone settings that would inject scripts stay off: Web Analytics, Browser Insights, Email Address Obfuscation, Rocket Loader, Zaraz.

### Meta

Each page: `<title>`, `description`, canonical URL, Open Graph title, description and `social-preview.png` (1280×640), `theme-color` per scheme, `favicon.svg` (the mark), `apple-touch-icon.png` (180 px from `app-icon.svg`). App Store smart banner (`apple-itunes-app`) once the app is live.

## Deployment

- Cloudflare Pages project `sealctl-website`, deployed only by GitHub Actions (`.github/workflows/deploy.yml`, previews by `preview.yml`): `npm ci --ignore-scripts`, `npm run build`, `npm run check`, then `wrangler pages deploy dist` with the locked wrangler. No deploys from a laptop and no `wrangler login`.
- The job deploying `main` uses the GitHub environment `production` (deployment branches: `main` only, no required reviewer: merging to `main` is the production deploy). Pull requests build and check without secrets. For same-repo pull requests, `preview.yml` runs on `workflow_run` (definition and tooling from `main`), takes only the built `dist` artifact (without `_worker.js` or `functions/`), refuses `main` and unusual branch names, and deploys in environment `preview` (deployment branches: `main` only). Fork pull requests build and check only. Each environment holds `CLOUDFLARE_API_TOKEN` (Account › Cloudflare Pages › Edit only) and the variable `CLOUDFLARE_ACCOUNT_ID`. Without the token the deploy is skipped with a notice.
- `main` → production at `sealctl.com`. Every other branch and every pull request → a preview at `<hash>.sealctl-website.pages.dev` and `<branch>.sealctl-website.pages.dev`, with `X-Robots-Tag: noindex` (Pages adds it on previews). Sandbox purchases always go through `https://sealctl.com/pay/sandbox`.
- Custom domains: `sealctl.com` (apex) on the Pages project; `www` redirects.
- Monthly rebuild: the deploy workflow's schedule (1st of each month) deploys `main` again.
- Rollback: Pages dashboard → Deployments → "Rollback to this deployment", or revert on `main`.
- The site is public; nothing in this repo is secret. The Paddle client tokens are set as GitHub Actions repository variables only so that they can change without a commit; they are public by design.

## Testing

`.github/workflows/check.yml` on every pull request and push to `main`:

| Check | Tool | Gate |
| --- | --- | --- |
| Build | `npm run build` | Fails on build errors listed above |
| HTML | `html-validate` on `dist/` | No errors |
| Internal links and anchors | `lychee --offline dist` | No broken links |
| External links | `lychee` online | Weekly scheduled run; opens an issue instead of failing PRs |
| Tokens | diff with upstream `brand/tokens.css`; raw-colour grep | No difference; no raw colours |
| Accessibility | axe on every page, light and dark (Playwright `colorScheme`) | No violations |
| Lighthouse | `@lhci/cli` on `/`, `/install`, a docs page, `/pricing` against the Pages preview | Budgets above |
| Pay page | Playwright with a stub `paddle.js` that fires each event, on `/pay` and `/pay/sandbox` | Each state renders its heading; the sandbox page sets the sandbox environment and the live page does not; no console errors |
| App links | Test parses both `.well-known` files | Valid JSON, served as `application/json`, app id `com.sealctl.app`, path `/p` |
| security.txt | Test parses fields | `Expires` within 366 days; `Contact` present |
| Mobile | Playwright at 320 px | No horizontal scroll outside `pre` |

Manual before each milestone: one sandbox purchase end to end (below), read every page in both themes on an iPhone and an Android phone, VoiceOver pass on `/` and `/pay`.

## Milestones

| # | Milestone | Acceptance |
| --- | --- | --- |
| M0 | Scaffold and pipeline | `npm run build` produces `dist/`; Pages project builds `main` and previews; `_headers` live (checked with `curl -I`); `check.yml` green |
| M1 | Pre-launch site on `sealctl.com` | Home, Install, Security, Pricing, Privacy, Terms, Refunds, Contact, security.txt and 404 live; placeholders visible where seller data is missing; Lighthouse and axe gates pass; no third-party requests (checked in DevTools) |
| M2 | Payments in sandbox | `/pay/sandbox` live on `sealctl.com`; `sealctl buy` against the staging relay (`SEALCTL_RELAY=https://relay-staging.sealctl.com`) opens checkout there; a sandbox card pays; the success state shows; the relay's licence turns `paid`; a second seat purchase shows the code text; closed and expired-link states reproduced by hand |
| M3 | Docs, How it works, Cryptography | Every page in the docs table exists for features in the release being shipped; "Leaving sealctl" before launch, checked against a real `unseal --all` run; CLI reference synced from that release; How it works uses real CLI output; `/crypto` matches the protocol at a named revision, Planned items marked, reviewed by someone who did not write it |
| M4 | Status | Live check works from a browser on `sealctl.com`; an incident entry deploys in under 2 minutes; outage text reviewed |
| M5 | Live payments | Seller placeholders filled by the seller; live Paddle token in production variables; `sealctl.com` approved in Paddle; one live purchase and refund done end to end |
| M6 | Launch | `/p` and both `.well-known` files serve the app ids (`com.sealctl.app`) and open the app on a real iPhone and Android phone; store badges link to live listings; app screenshots replace HTML phone renderings; in-development strip removed; How it works and Security reviewed against the shipped release; every claim on Home checked against the product |

## What other repositories must provide

| From | What |
| --- | --- |
| `sealctl/relay` | `Access-Control-Allow-Origin: https://sealctl.com` on `GET /v1/health` (agreed); the WebCrypto primitives it uses (for `/crypto`); the staging relay `relay-staging.sealctl.com` with `PADDLE_CHECKOUT_URL=https://sealctl.com/pay/sandbox`; what it stores, as in the Privacy table above (agreed: no IP address stored or logged); `DELETE /v1/phones/{phone}`, which keeps only a licence record |
| `sealctl/sealctl` | The protocol's Derivation, Store format, Pairing and Request and reply sections, with purpose strings and test vectors (for `/crypto`); the list of crypto libraries and versions used by the Rust core; `sealctl-<version>-cli.md` (CLI reference in Markdown) attached to each release; `SEALCTL_RELAY` to point the CLI at the staging relay for M2; error text that links `https://sealctl.com/status` when the relay doesn't answer; `docs/unseal.md` for the leaving pages |
| `sealctl/app` | The crypto libraries used by the Swift and Kotlin apps; approval-card copy and screenshots (light and dark, iPhone and Android); the blank recovery card as `card-a4.pdf` and `card-letter.pdf`; store listing URLs; the Apple team id and the Play app signing certificate SHA-256 for the `.well-known` files; the Leave sealctl wording |
| `sealctl/.github` | Brand files and `tokens.css`; any new shared tokens |

## Open questions

1. Refund window: 30 days proposed. 14 is the legal floor for EU consumers.
2. Whether Pricing and Terms mention that unpaid phones may later need a licence for a third machine. Proposed: yes, in Terms only, worded as above.
3. Polish-language versions of Privacy and Terms for Polish consumers. Needs legal advice.
4. Contact page answer time: two working days proposed.
5. Theme toggle: left out at launch.
6. Universal links and App Links: settled. The app claims `https://sealctl.com/p` (pairing links), so the site serves `/p`, `/.well-known/apple-app-site-association` (app id `<team id>.com.sealctl.app`, path `/p`) and `/.well-known/assetlinks.json` (package `com.sealctl.app`, the Play app signing certificate), both as `application/json` with no redirect. No other paths are claimed.
7. Whether to self-host Caveat for the card illustration or use the system cursive stack.
