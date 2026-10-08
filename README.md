# Spendly — Expense Tracker

A local-first, responsive expense tracker built with React, TypeScript and Vite. No backend, no accounts, no tracking: everything you enter stays in your browser.

## Features

- Add, edit and delete expenses (delete is undoable from the toast)
- Total, month-to-date with vs-last-month delta, average and largest expense
- Category breakdown with share-of-spend bars
- Six-month spending trend chart
- Monthly budget per month with under/near/over status
- Filter by text search, category, date range and amount bounds
- Sort by date or amount, ascending or descending
- CSV import and export (RFC 4180 quoted fields)
- Currency selector (NGN, USD, EUR, GBP, KES, ZAR, GHS, INR)
- Light/dark theme applied before first paint
- Money stored as integer minor units, so totals never drift
- Responsive down to small phones; keyboard and screen-reader accessible

## Stack

- React 19 + TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Vite for dev server and production build
- Vitest for unit tests
- Plain CSS with custom properties for theming

## Commands

```bash
npm install
npm run dev        # start the dev server
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
npm test           # run the unit tests
npm run typecheck  # typecheck only
```

## Project layout

```
src/
  App.tsx                 page composition, top-level state wiring
  types.ts                shared types and the category list
  hooks/useLedger.ts      expenses, budgets and settings with persistence
  lib/
    money.ts              minor-unit arithmetic and currency formatting
    dates.ts              local-time ISO date and month helpers
    stats.ts              summaries, category totals, filtering, sorting
    csv.ts                import/export with row-level error reporting
    storage.ts            load/save plus sanitisation of untrusted data
    colors.ts             per-category accent colours
  components/             Modal, Toast, ExpenseForm, ExpenseList, Breakdown,
                          SpendingChart, BudgetPanel
  styles.css              all styling and theme tokens
```

## Privacy

Expenses are stored only in your browser via `localStorage` under the keys `spendly.expenses.v2`, `spendly.budgets.v1` and `spendly.settings.v1`. Nothing is sent anywhere. Clearing site data, or using the "Clear all data" button, erases everything. Use the CSV export if you want a backup.

## Deploy

`npm run build` emits a static `dist/`. Upload it to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Asset paths are relative, so it works from a subpath.

## Scope

This is a client-side utility, not a financial service. There is no cloud backup, sync, multi-device support, authentication or encryption at rest, and no handling of bank data.