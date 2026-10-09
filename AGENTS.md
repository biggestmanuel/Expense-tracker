# AGENTS.md

Instructions for coding agents working in this repository.

## Mandatory workflow

**After every file change, commit and push.**

No exceptions. Do not batch changes across multiple turns or leave work sitting
uncommitted in the working tree. When a file is created, edited, moved or
deleted, the change must be committed and pushed to `origin` before the task is
considered done.

The concrete loop for any change:

1. Make the edit.
2. Verify it: `npm run build` (typecheck + production bundle) and `npm test`.
   Both must pass before committing. Do not commit code that fails either.
3. `git add -A`
4. `git commit` with a message describing what changed and why.
5. `git push origin main`
6. Confirm with `git status --porcelain` that the tree is clean.

### Pre-commit review

Before every commit and push, review the diff for problems, including
**hardcoded secrets**. Check for:

- API keys, tokens, passwords, credentials, private keys, connection strings
- Cloud provider key formats (`AKIA...`, `ghp_...`, `github_pat_...`, `sk-...`,
  `xox*`, `AIza...`, `SG.`, `glpat-`)
- Long base64 or hex blobs that are not obviously part of a lockfile or hash
- Real hostnames, IPs, emails or production endpoints that should be examples
- Credentials committed by accident in earlier revisions

`dist/` and `node_modules/` are gitignored and must never be committed. Verify
with `git status --porcelain --ignored` that only those two paths are ignored.

### Commit messages

Describe intent, not a file list. Explain what changed and why it was needed.
Keep the subject line under 72 characters.

## Project

Spendly is a local-first expense tracker. React 19 + TypeScript on Vite, styled
with plain CSS custom properties, tested with Vitest. There is no backend: all
data lives in the user's browser under `localStorage` keys
`spendly.expenses.v2`, `spendly.budgets.v1` and `spendly.settings.v1`.

## Commands

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm test           # unit tests
npm run typecheck  # typecheck only
```

## Conventions

- Amounts are stored and computed as **integer minor units** (`amountMinor`).
  Never do floating-point arithmetic on money. Convert for display only.
- Dates are ISO `YYYY-MM-DD` strings and must be built in **local time**.
  `new Date().toISOString().slice(0, 10)` is wrong here; use `todayISO()` from
  `src/lib/dates.ts`, which avoids the UTC off-by-one-day drift.
- Strict TypeScript is on, including `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. Do not weaken these to make an error go away.
- Anything read from `localStorage` or a CSV file is untrusted input. Run it
  through the `sanitize*` functions in `src/lib/storage.ts` before use.
- New behaviour needs a test. `npm test` must stay green.
- The app is keyboard accessible with a focus trap in the modal and an
  `aria-live` toast region. Preserve both when adding UI.