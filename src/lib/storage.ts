import { CATEGORIES, type Budget, type Category, type Expense, type Theme } from "../types";

const EXPENSES_KEY = "spendly.expenses.v2";
const BUDGETS_KEY = "spendly.budgets.v1";
const SETTINGS_KEY = "spendly.settings.v1";

export type Settings = {
  currency: string;
  theme: Theme;
};

export const DEFAULT_SETTINGS: Settings = { currency: "NGN", theme: "light" };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStorage(storage?: StorageLike): StorageLike | null {
  const target = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!target) return null;
  try {
    const probe = "__spendly_probe__";
    target.setItem(probe, "1");
    target.removeItem(probe);
    return target;
  } catch {
    return null;
  }
}

function read<T>(key: string, storage: StorageLike, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown, storage: StorageLike): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private-mode failure: keep the app usable in memory.
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

/**
 * Normalises one untrusted expense record into a valid `Expense`. Amounts in
 * minor units are rounded to integers; anything non-positive is rejected.
 */
export function sanitizeExpense(input: unknown, fallbackId: string): Expense | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;

  const rawAmount = record["amountMinor"] ?? (typeof record["amount"] === "number" ? Math.round((record["amount"] as number) * 100) : null);
  const amountMinor = typeof rawAmount === "number" && Number.isFinite(rawAmount) ? Math.round(rawAmount) : NaN;
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) return null;

  const date = typeof record["date"] === "string" ? record["date"] : "";
  if (!ISO_DATE.test(date)) return null;

  const description = typeof record["description"] === "string" ? record["description"].trim() : "";
  if (!description) return null;

  const notes = typeof record["notes"] === "string" ? record["notes"].trim().slice(0, 500) : "";
  const createdAt = typeof record["createdAt"] === "number" && Number.isFinite(record["createdAt"])
    ? record["createdAt"]
    : Date.now();

  return {
    id: typeof record["id"] === "string" && record["id"] ? record["id"] : fallbackId,
    amountMinor,
    date,
    category: isCategory(record["category"]) ? record["category"] : "Other",
    description: description.slice(0, 120),
    ...(notes ? { notes } : {}),
    createdAt,
  };
}

export function sanitizeExpenses(input: unknown): Expense[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: Expense[] = [];
  for (const entry of input) {
    const expense = sanitizeExpense(entry, newId());
    if (!expense) continue;
    while (seen.has(expense.id)) expense.id = newId();
    seen.add(expense.id);
    out.push(expense);
  }
  return out;
}

export function sanitizeBudgets(input: unknown): Budget[] {
  if (!Array.isArray(input)) return [];
  const out: Budget[] = [];
  for (const entry of input) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const month = typeof record["month"] === "string" ? record["month"] : "";
    const limitMinor = typeof record["limitMinor"] === "number" ? Math.round(record["limitMinor"]) : NaN;
    if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(limitMinor) || limitMinor <= 0) continue;
    out.push({ month, limitMinor });
  }
  return out;
}

export function sanitizeSettings(input: unknown): Settings {
  if (typeof input !== "object" || input === null) return { ...DEFAULT_SETTINGS };
  const record = input as Record<string, unknown>;
  const currency = typeof record["currency"] === "string" && /^[A-Z]{3}$/.test(record["currency"])
    ? record["currency"]
    : DEFAULT_SETTINGS.currency;
  const theme = record["theme"] === "dark" || record["theme"] === "light" ? record["theme"] : DEFAULT_SETTINGS.theme;
  return { currency, theme };
}

export function loadExpenses(storage?: StorageLike): Expense[] {
  const store = safeStorage(storage);
  return store ? sanitizeExpenses(read(EXPENSES_KEY, store, [])) : [];
}

export function saveExpenses(expenses: readonly Expense[], storage?: StorageLike): void {
  const store = safeStorage(storage);
  if (store) write(EXPENSES_KEY, expenses, store);
}

export function loadBudgets(storage?: StorageLike): Budget[] {
  const store = safeStorage(storage);
  return store ? sanitizeBudgets(read(BUDGETS_KEY, store, [])) : [];
}

export function saveBudgets(budgets: readonly Budget[], storage?: StorageLike): void {
  const store = safeStorage(storage);
  if (store) write(BUDGETS_KEY, budgets, store);
}

export function loadSettings(storage?: StorageLike): Settings {
  const store = safeStorage(storage);
  return store ? sanitizeSettings(read(SETTINGS_KEY, store, DEFAULT_SETTINGS)) : { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Settings, storage?: StorageLike): void {
  const store = safeStorage(storage);
  if (store) write(SETTINGS_KEY, settings, store);
}

export function newId(): string {
  const cryptoRef = typeof crypto === "undefined" ? null : crypto;
  if (cryptoRef && "randomUUID" in cryptoRef) return cryptoRef.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}