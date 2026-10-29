# AGENTS.md

Instructions for coding agents working in this repository.

This file is intentionally **not tracked in git** — it lives in `.gitignore` and
must never be committed or pushed. It is agent-facing context only.

## Project-specific content

Spendly is a local-first expense tracker. React 19 + TypeScript on Vite, styled
with plain CSS custom properties, tested with Vitest. There is no backend: all
data lives in the user's browser under `localStorage` keys
`spendly.expenses.v2`, `spendly.budgets.v1` and `spendly.settings.v1`.

### Stack

- React 19, TypeScript (strict: `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`), Vite, Vitest, plain CSS custom properties

### Commands

```bash
npm install
npm run dev        # dev server (vite)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm test           # unit tests (vitest run)
npm run typecheck  # typecheck only (tsc --noEmit)
```

### Conventions

- Amounts are stored and computed as **integer minor units** (`amountMinor`).
  Never do floating-point arithmetic on money. Convert for display only.
- Dates are ISO `YYYY-MM-DD` strings and must be built in **local time**.
  `new Date().toISOString().slice(0, 10)` is wrong here; use `todayISO()` from
  `src/lib/dates.ts`, which avoids the UTC off-by-one-day drift.
- Strict TypeScript is on. Do not weaken it to make an error go away.
- Anything read from `localStorage` or a CSV file is untrusted input. Run it
  through the `sanitize*` functions in `src/lib/storage.ts` before use.
- New behaviour needs a test. `npm test` must stay green.
- Keyboard accessible: focus trap in the modal, `aria-live` toast region.
- Small focused functions, well-named modules. Split files that pass roughly
  300 lines.

## Standing rules

Copied from `agent-rules.md` (attached session file `Downloads/agent-rules.md`)
and required for all work in this repo.

### 1. Git workflow

- Never commit or push to `main`. `main` receives merges only.
- Work on a branch from an up-to-date `main`:
  `git switch -c <short-descriptive-name>`, then `git push -u origin <branch>`.
- Commit and push to your branch after every coherent change. One change, one
  commit, pushed, then move on. Do not batch unrelated work and do not leave
  work uncommitted.
- A commit is one coherent change that leaves the repo consistent, not one file
  and not one keystroke. Never commit a half-finished refactor. Two unrelated
  fixes means two commits. Refactoring beside a bug fix is a separate commit.
- Merging: when you believe the branch is ready, say so, with your reasoning,
  CI status, and a summary of the diff. Open the PR and wait. Merge only after
  the user explicitly confirms. Before asking, confirm CI is green and the diff
  matches your report.
- Reverting is a commit. History is append-only. If a pushed commit was wrong,
  add a commit that undoes it and say in the message what was wrong.

### 2. Gates before every commit

- Run typecheck, lint, and the test suite. A commit that fails them does not
  happen. Fix it, or explain in the commit message why the exception is correct.
  No `--no-verify` without a documented reason.
- If a gate does not exist, say so. Do not invent one or claim it passed.
- If a gate needs a backend or database that is down, say so in the commit
  message instead of implying it passed.
- Investigate the real cause of failures. Never hide, skip, or mute a failing
  test to get green.

### 3. README upkeep

- Update `README.md` at the end of a session, when a PR is opened or merged,
  and whenever setup, commands, env vars, or architecture change.
- It must reflect the latest state: what was added, removed or changed, current
  gate results, commands to run the project, open PRs, blocked items, and
  anything waiting on someone.
- Fold README changes into the relevant commit when source changes. Otherwise
  commit them separately.
- Never put secrets in the README.

### 4. Tech choices

- Use the best tool for the job, not the most familiar one. If React can do it
  but Go, Rust or C++ does it meaningfully better and delivers a better result,
  use the better one, and explain the trade-off in two lines.
- Replace vanilla JS with React and/or TypeScript, or whatever framework fits
  the project best. Use strict types everywhere.
- Prefer the frameworks and libraries the project already uses. Do not rewrite
  what a mature dependency already does well.
- Add a dependency only when it is genuinely necessary. Never add one for
  convenience.
- Auth is built in-house. No third-party auth providers. Use vetted libraries
  for cryptographic primitives and never invent your own crypto.
- If a better approach than the one requested exists, flag it with trade-offs
  instead of silently changing direction.
- Keep code small and modular: small focused functions, well-named modules,
  split files that pass roughly 300 lines. Before pasting a large generated
  block, ask whether it can be smaller, split, or handled by a library.
- Automate everything that can be automated: tests, lint, builds, audits,
  scans, migration checks, and repeated manual steps; run them and report
  results. Never automate irreversible or outward-facing actions without
  confirmation — merging, deploying, deleting data, force-pushing, spending
  money, sending messages. Those require explicit approval before they run.

### 5. UI and UX

- No taglines, filler helper text, or secondary labels. If a screen needs words
  to make sense, fix the layout instead.
- Make the decision that improves UX, developer experience, and agent
  experience together, without breaking anything.
- Handle loading, empty, error, and success states on every screen.
- Responsive by default. Must work on a cheap Android phone.
- Accessibility basics: contrast, focus states, labels for inputs, alt text on
  images.
- Keep functional text (error messages, field labels, accessibility labels).
  The cut is for decoration, not for clarity.

### 6. Security model (top tier, always on)

- Enforce authentication and authorization on the server for every route,
  resource, and object. Never trust the UI. Check ownership on every ID lookup.
- Validate and sanitize every input on the server, with strict schemas. Reject,
  do not coerce.
- Hash passwords with argon2id (or bcrypt if argon2id is unavailable).
  Short-lived sessions or tokens, httpOnly secure cookies, rotation on
  privilege change, real logout and revocation.
- Rate limit login, signup, OTP, password reset, and every expensive or
  sensitive endpoint. Lock out or slow down abusive patterns.
- Set security headers (CSP, HSTS, X-Content-Type-Options, frame protections),
  a strict CORS allowlist, and CSRF protection where cookies are used.
- Parameterized queries only. Least-privilege database users. Row-level rules so
  users only see their own data.
- Secrets live in environment variables or a secrets manager, never in the
  frontend or git. Keep `.env.example` with names only. Never log, copy, print,
  or send any key, token, phrase, or secret.
- Errors never leak stack traces, SQL, or internals. Log details server-side
  with a correlation ID, return a generic message.
- Use correct HTTP status codes. Never return `200 OK` with `{ "success":
  false, "error": "Unauthorized" }`. Use 400, 401, 403, 404, 409, 422, 429,
  500 as appropriate, with a consistent error body.
- Lock dependency versions, run dependency audits and secret scans, and avoid
  abandoned packages.
- Treat uploads as hostile: limit size and type, verify content, store outside
  the web root, never execute them.

### 7. Engineering depth checklist

Check the ones the work touches and report what you verified: database
transactions / ACID / isolation levels; caching invalidation; resilience
(retries with backoff, circuit breakers); scale and infra; async and events;
observability; usernames (Bloom filter in front of DB lookup).

### 8. Testing standard

- Tests are not just "N/N passed". Test how a real person will use the product.
  Run UI and UX tests (end to end, browser automation) whenever possible.
- Write adversarial tests that try to break the work, not tests that confirm the
  happy path.
- Every bug fix needs a test, and the fix must be revert-verified: show that
  reverting the fix makes that test fail. This applies to fixes with testable
  logic. CSS, copy, and config changes are exempt.
- Report scenarios that prove nothing instead of hiding them. Report pass and
  fail counts.
- Only when you claim the work is 100% done, run the adversarial pass: actively
  try to break every assumption you made.

### 9. Money rules (any project that touches money)

- Never use floating point for money. Use integer minor units or a proper
  decimal type.
- Use a proper ledger (append-only entries) for every movement of money. A
  single mutable balance field is never the source of truth.
- Every money-moving request is idempotent.
- Handle concurrency so two simultaneous withdrawals cannot spend the same
  money twice (row locks, serializable transactions, or equivalent).
- Never trust the frontend to say a payment succeeded. Verify server-side with
  the payment provider.
- Enforce authorization server-side on every account, transaction, and resource.
- Keep an audit trail of important financial actions, without logging passwords,
  tokens, or sensitive payment data.
- Set sensible transaction limits and rate limits on login, OTP, transfers, and
  withdrawals.
- Add reconciliation so the ledger can be compared against the provider or bank.

Automated tests for money: send the same transfer 10 times; send 20 simultaneous
withdrawals against the same balance; send the same webhook repeatedly with a
fake signature and out of order; kill a worker halfway; simulate the provider
timing out after taking the money; simulate the DB failing mid-transaction; log
in as User A and try User B's transactions; try 0, negative, absurdly large,
and malformed amounts; retry after timeouts; restart the app mid-transaction;
reconcile the ledger against the provider.

### 10. Pre-launch checklist

Work through each item and report done / not applicable / needs the user:
secrets and access (no keys in frontend/git, HTTPS, auth on every route,
DB rules, server-side validation, rate limiting, no leaked errors); reliability
(error tracking, DB backup/restore tested, rollback plan, E2E signup/payment/password
reset, authenticated emails); performance and quality (<3s load, cheap Android
phone works, custom 404/500, form validation, contrast and alt text); launch
surface (meta tags, OG image, favicon, sitemap and robots.txt, privacy policy
and terms, cookie consent, analytics, single clear CTA, contact method).

### 11. Terrible user reminder

The app is not really tested until someone has been a terrible user. Remind the
user to manually try: double-clicking buttons, refreshing during checkout,
submitting the same request twice, changing IDs in URLs, uploading ridiculous
files, turning the internet off halfway through, opening the same account on
two devices.

### 12. End-of-task review

Before reporting, re-read your own diff like a senior engineer who did not write
it and check: does the diff do exactly what was asked? Type errors, runtime
errors, broken imports, dead code, leftover debug logs. Security: auth on every
touched route, input validation, no secrets, no leaked errors. Edge cases:
empty, null, huge, malformed, concurrent, offline. Regressions: run existing
tests. Duplication: did you reuse existing components and utilities?
Responsiveness and loading, empty, error, and success states on every touched
screen. Were claims verified by running something, not assumed? Fix what you
find, then report what you found and fixed.

### 13. Reporting standard

- Report every file changed with a one-line summary.
- Report gate results with pass and fail counts.
- Be honest about what was not verified. Push back on the user's reasoning when
  it is wrong; verify claims instead of trusting them.
- If a change depends on an answer only the owner can give (provider choice,
  whether a screen ships, a route's contract), stop and ask one question.
- Do not claim "done" until gates pass, adversarial tests have run, and the
  README is current.

### Conflict resolution note

This repo's earlier `AGENTS.md` said to commit and push after every file change
directly to `main`. That conflicts with standing rule 1 ("Never commit or push
to `main`; `main` receives merges only"). Standing rules win: from now on all
work happens on branches, and `main` is updated only by merge after explicit
user confirmation.

### New-rule overrides (root `C:\Users\USER\Documents\Code\AGENTS.md`)

The root standing rules now include this exception to standing rule 6:

> Routes that are intentionally public (no accounts by design) must be
> documented as such in the README and protected with rate limits, input limits,
> and spending caps instead of auth; never add auth to them without asking.

`Spendly` **is** intentionally public: it is a client-only static app with no
server, no routes, no accounts, and all data in `localStorage`. Standing rule 6
("auth on every route") therefore does not apply — there are no routes to
authenticate — and no auth will be added unless the user asks.

Per the new rule:
- README documents that Spendly is intentionally public with no accounts.
- Protections in place instead of auth: form validation, positive-amount and
  future-date guards, maxLength on description/notes, category allowlist,
  `exactOptionalPropertyTypes`-strict parsing, and CSV row-level validation.
  There is no server, so server-side rate limiting/spending caps are not
  possible; the monthly budget panel is the client-side spending-cap analogue
  and is documented as such in README.