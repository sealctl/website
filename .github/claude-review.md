# How Claude reviews pull requests here

The automated review (`.github/workflows/claude-code-review.yml`) and "@claude review this"
both follow this file, together with `CLAUDE.md`. The review is advice: it never approves,
blocks, pushes or merges.

## What to report

Report only real, specific problems you can point to in this pull request's diff, in this
order of priority (skip the areas the change does not touch):

1. **Correctness.** Wrong results, missed cases the code claims to handle, broken error paths,
   off-by-one, wrong units, state left half-changed after a failure, resume or retry that
   repeats a step that already took effect.
2. **Security.** Secrets or key material reaching logs, errors, arguments, the environment of
   other processes, files or the network; checks done after use instead of before; signatures,
   proofs, sizes or times not checked; anything weakening the approval model.
3. **Privacy.** Personal names, emails, home addresses, phone numbers, Cloudflare Workers
   development hostnames (the "workers dot dev" domain) or the staging relay's hostname in code,
   docs, tests, fixtures or commit text; locations, IP addresses or request contents leaving
   where the SPEC keeps them.
4. **Protocol and SPEC consistency.** Behaviour that differs from `SPEC.md` or
   `docs/protocol.md` without changing them in the same pull request; any change to the test
   vectors (a protocol break); words the product does not use (Locked, Open, Waiting, One tap,
   Places, words, phone, machine).
5. **Concurrency and timing.** Locks or guards held across an `await`; races between a timer
   and a request; wall clock where a monotonic clock is needed (or the reverse: sleep and clock
   changes); retry or reconnect loops without a pause, backoff or `429` handling.
6. **Test quality.** A fix without a test that fails without it; tests that sleep to order
   events instead of using a fake clock, a gate or an explicit signal; tests that talk to a
   live relay; assertions that cannot fail.
7. **Supply chain and CI shape.** Actions not pinned to a full commit SHA; broader
   `permissions` than the job needs; secrets on `pull_request` jobs; `pull_request_target`;
   jobs without `timeout-minutes`; required checks behind a workflow-level `paths:` filter;
   new dependencies without a reason; `cargo vet` exemptions without the note "reviewed by an
   AI agent, not a human audit"; npm installs that run scripts.

Do not report:

- style, naming, formatting, comment wording or "could be cleaner" (formatters and linters run
  in CI);
- "consider adding tests" or "consider handling errors" without naming the concrete case that
  is not covered and what goes wrong;
- problems that were there before this pull request, unless the change makes them worse;
- guesses. Read the code around a change before you claim a bug, check `SPEC.md` when
  behaviour changes, and when you cannot settle a point, say "I could not verify X" in the
  summary instead of filing it as a finding.

## Generated files

Do not review `package-lock.json` line by line: review `package.json` (exact versions, why the
package is needed, whether it has install scripts, `allowScripts`). Do not review `dist/` (not
committed).

## Checklist for this repository

- **Claims are true and checkable.** No counts, badges, quotes, testimonials, invented users,
  certifications or audits; no "military-grade" or "unbreakable". Approval is per work session
  or on every use: "one tap per use" is wrong. When summarising sealctl, encrypted volumes and
  backups are named alongside API and SSH keys. Level 3 waits two hours away from a trusted
  place; a trusted place, learned or added by hand, lifts the two-hour wait two hours after it
  is trusted, and trusting it is announced to every paired computer and can be cancelled. Where
  a page states a fact from another repository (CLI flags, protocol steps, relay data kept),
  check it against that repository's public docs (`sealctl/sealctl` README, SPEC.md,
  `docs/protocol.md`) and say "I could not verify" when you cannot.
- **Current product only.** No Ledger, OpenPGP-on-Ledger, 0.5 or 0.6 history. The site reads
  as a shipping product: no "in development", "coming soon", status strips or "planned" pills;
  the only placeholders are in `site.config.mjs`. No version numbers in prose (the protocol
  revision in `site.config.mjs` and the security log dates are data, not prose).
- **Brand palette.** Colours only from tokens: `src/assets/tokens.css` is a byte copy of the
  brand kit's `tokens.css` (white and cool grey neutrals, navy text, crimson `#b4232c`, dark mode
  `#ff5c63`); site-only tokens sit in the token blocks at the top of `site.css`; no raw colours
  elsewhere; nothing that reads as warm cream or clay orange.
- **Security log** (`src/security/log.json`, shown at `/security#log`): one entry per event with
  `date`, `kind`, `title`, `result` (the key matter in one sentence) and `status`. Until a
  finding is fixed and released, the entry gives severities only, no details. It says who
  tested ("Internal, AI-assisted (Claude)" or the named independent firm) and never presents
  internal testing as an independent audit.
- **Pages and structure.** `/security` is for non-specialists (plain pictures), `/crypto` for
  specialists; the docs are one page (`/docs`) with the contents list at the top and no
  sidebar. The costs page shows the running costs of the public version only.
- **Build rules and headers.** No inline styles or scripts (the CSP blocks them); every image
  has `alt`; front matter complete; no third-party requests except Paddle on `/pay`; `_headers`
  keeps the CSP and security headers; no analytics or cookies.
- **Deploy safety.** A merge to `main` is a production deploy. `deploy.yml` and `preview.yml`
  never run pull request code with the token; names and refs go through env vars, never
  `${{ }}` inside `run:`.

## How to write each comment

- One inline comment per distinct problem, on the line that causes it. At most about 8 inline
  comments; if there are more, keep the most severe and list the rest in one line each in the
  summary.
- Start with the severity in bold: **blocker** (wrong behaviour, security or privacy problem,
  protocol break: must not merge as is), **should fix** (a real problem with limited impact, or
  a missing test for a concrete case), **nit** (small but real, such as a misleading error
  message; at most 2 per review, and never for style).
- Then: what is wrong, why it matters here (the input or sequence that triggers it), and a
  concrete fix. Use a suggestion block only when committing it fixes the problem entirely.
- Quote the rule when the finding is a `CLAUDE.md` or `SPEC.md` rule, with its section.

## The summary comment

One comment, rewritten on every push, in this shape:

```markdown
### Claude review: <verdict>

<one or two sentences: what the change does, as you understood it>

**Checked:** <the areas you actually checked, e.g. correctness of the resume path, SPEC 18.6,
the new test, workflow permissions>
**Findings:** <n> blocker, <n> should fix, <n> nit (inline). <one line per finding that did not
fit inline>
**Could not verify:** <what you could not settle and why, or "nothing">
```

Verdicts: **no issues found**, **minor issues** (nits or should-fix only), **changes
suggested** (at least one should-fix that matters), **blocking issues** (at least one blocker).
Saying "no issues found" is a good outcome; do not invent findings to fill the review.
