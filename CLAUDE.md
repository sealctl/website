# sealctl.com: rules for AI agents

This file is read by Claude Code, including the GitHub review and "@claude" workflows. It holds
the rules for working in this repository; `SPEC.md` is the website spec. When a rule here and
the SPEC disagree, say so and fix one of them in the pull request; don't silently pick.

## What this is

- The website for sealctl: product pages, the one-page docs (`/docs`), the payment page, legal
  pages, the status page and the security log. Static HTML built by `build.mjs` (Node 24),
  hosted on Cloudflare Pages.
- **A merge to `main` is a production deploy** (`deploy.yml`). Pull requests build and check
  without secrets; same-repository pull requests get a preview through `preview.yml`.
- Specs: `SPEC.md`; the product facts come from the public `sealctl/sealctl` repository
  (README, SPEC.md, `docs/protocol.md`) and the brand kit in `sealctl/.github` (`brand/`).

## Claims and wording

- Only true, checkable claims: no counts, badges, quotes, testimonials, invented users,
  certifications or audits; no "military-grade" or "unbreakable".
- Describe the current product only (0.7 and later): no Ledger, OpenPGP-on-Ledger, 0.5 or 0.6
  history.
- The site reads as a shipping product: no "in development", "coming soon", status strips or
  "planned" pills. The only placeholders are in `site.config.mjs` (store links, seller and
  legal details). No version numbers in prose.
- Approval is per work session or on every use: "one tap per use" is wrong. When summarising
  sealctl, name encrypted volumes and backups alongside API and SSH keys.
- Level 3 (unseal everything, show the words, delete relay data) waits two hours away from a
  trusted place; a place added by hand lifts that wait only after 24 hours.
- Same words as the product: Locked, Open, Waiting, One tap, Places, Allow.
- `/security` is written for non-specialists (plain pictures); `/crypto` is for specialists.
  The docs are one page (`/docs`) with the contents list at the top, no sidebar.
- The costs page shows the running costs of the public version only.

## Brand

Palette B: white and cool grey neutrals, navy text, crimson `#b4232c` (dark mode `#ff5c63`).
`src/assets/tokens.css` is a byte copy of `brand/tokens.css` in `sealctl/.github`; change
colours there, not here (`npm run check` compares them). Site-only tokens live in the token
blocks at the top of `site.css`; no raw colours anywhere else. Avoid anything that reads as
warm cream or clay orange.

## Security log

`src/security/log.json` (shown at `/security#log`) gets one brief entry for every security
event: tests, fixes, reviews, audits, verifications, security-program applications. Fields:
`date`, `kind`, `title`, `result` (the key matter in one sentence), `status`.

- Until a finding is fixed and released, its entry gives severities only, no details.
- Say who tested: "Internal, AI-assisted (Claude)" or the named independent firm. Never present
  internal testing as an independent audit.

## Security wording

Until a fix is released, commit messages, pull request titles and descriptions and page text
describe a security fix neutrally (what changed, not how to exploit the old behaviour), with no
severity or attack details beyond the log's severities.

## Protocol facts

`docs/protocol.md` and its test vectors in `sealctl/sealctl` are the contract between the CLI,
the apps and the relay. `/crypto` describes the revision named in `site.config.mjs`
(`protocol.rev`, `protocol.sha`); when the page changes to a newer protocol.md, update both.
The site never states protocol details that protocol.md does not.

## Tests and checks

- `npm ci --ignore-scripts`, `npm run build`, `npm run check` (tokens and contrast,
  html-validate, internal links). The build fails on inline styles or scripts (the CSP blocks
  them), images without `alt`, broken links or anchors, missing front matter and unknown
  `{{variables}}`.
- A bug fix comes with a check or test that fails without it. Flaky checks are fixed, not
  retried. Nothing in CI or a test calls the staging or production relay.

## CI shape and supply chain

- One run per pull request, cancelled by a newer push; runs on `main`, schedules and manual
  runs get a concurrency group of their own and are never cancelled; deploys queue in their own
  group. Every job has `timeout-minutes`. Required checks never sit behind a workflow-level
  `paths:` filter.
- Workflows that hold secrets never run pull request code: no secrets on `pull_request` jobs
  (the Claude workflows' `CLAUDE_CODE_OAUTH_TOKEN` is the one documented exception), no
  `pull_request_target`; pull request output reaches the preview deploy only as a data artifact
  through `workflow_run`, with names and refs passed through `env:`, never `${{ }}` inside
  `run:`.
- GitHub Actions pinned to full commit SHAs, least-privilege `permissions`,
  `persist-credentials: false`.
- npm: `.npmrc` keeps `ignore-scripts=true`, `min-release-age=7`, `save-exact=true`; CI uses
  `npm ci --ignore-scripts` and `npm audit signatures`; tools come from the lockfile, never
  `npx <tool>@latest`. A new package needs a reason in the pull request (who maintains it, how
  widely used, install scripts) and an `allowScripts` decision.
- Deploys happen only in GitHub Actions: no local `wrangler login` or `wrangler pages deploy`.

## Privacy

- Never add personal names, personal email addresses, home addresses, phone numbers or any
  Cloudflare Workers development hostname (the "workers dot dev" domain) to pages, docs, code,
  commits or pull requests. The staging relay's hostname is private. Public contact is
  `support@sealctl.com`; a public postal address, when one is required, is the business address
  in `site.config.mjs`, never a home address.
- No analytics, trackers, cookies or third-party requests on any page except Paddle on `/pay`.

## Commits and pull requests (also for @claude)

- Work on a branch and open a pull request; `main` is protected. Squash merges only, done by a
  maintainer after CI is green and review comments are answered; the merge deploys.
- Keep commits focused; stage files by path; describe what was checked (both themes, 320 px).
- An agent never merges, approves, force-pushes, pushes to `main`, creates tags, deploys,
  changes workflows, rulesets, repository settings or secrets. When asked to, it explains that
  a maintainer has to.

## Reviewing

Reviews follow `.github/claude-review.md`: report only real, specific problems with a severity,
the reason and a concrete fix, and one summary of what was checked.
