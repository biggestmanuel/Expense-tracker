import type { Category, Expense, Filters, SortKey } from "../types";
import { monthOf } from "./dates";

export type CategoryTotal = {
  category: Category;
  totalMinor: number;
  share: number;
  count: number;
};

export type Summary = {
  totalMinor: number;
  count: number;
  averageMinor: number;
  largestMinor: number;
  monthMinor: number;
  monthCount: number;
  monthAverageMinor: number;
  previousMonthMinor: number;
  deltaPercent: number | null;
};

export type MonthlyPoint = {
  month: string;
  totalMinor: number;
  count: number;
};

export function sumMinor(expenses: readonly Expense[]): number {
  return expenses.reduce((total, expense) => total + expense.amountMinor, 0);
}

export function summarize(expenses: readonly Expense[], month: string): Summary {
  const totalMinor = sumMinor(expenses);
  const count = expenses.length;
  const inMonth = expenses.filter((expense) => monthOf(expense.date) === month);
  const monthMinor = sumMinor(inMonth);
  const previous = month === "" ? "" : shiftMonth(month, -1);
  const previousMonthMinor = previous
    ? sumMinor(expenses.filter((expense) => monthOf(expense.date) === previous))
    : 0;

  return {
    totalMinor,
    count,
    averageMinor: count ? Math.round(totalMinor / count) : 0,
    largestMinor: expenses.reduce((max, e) => Math.max(max, e.amountMinor), 0),
    monthMinor,
    monthCount: inMonth.length,
    monthAverageMinor: inMonth.length ? Math.round(monthMinor / inMonth.length) : 0,
    previousMonthMinor,
    deltaPercent:
      previousMonthMinor > 0
        ? Math.round(((monthMinor - previousMonthMinor) / previousMonthMinor) * 1000) / 10
        : null,
  };
}

export function totalsByCategory(
  expenses: readonly Expense[],
  categories: readonly Category[],
): CategoryTotal[] {
  const sums = new Map<Category, { totalMinor: number; count: number }>();
  for (const category of categories) sums.set(category, { totalMinor: 0, count: 0 });
  for (const expense of expenses) {
    const bucket = sums.get(expense.category) ?? { totalMinor: 0, count: 0 };
    bucket.totalMinor += expense.amountMinor;
    bucket.count += 1;
    sums.set(expense.category, bucket);
  }

  const total = sumMinor(expenses);
  return [...sums.entries()]
    .filter(([, value]) => value.count > 0)
    .map(([category, value]) => ({
      category,
      totalMinor: value.totalMinor,
      count: value.count,
      share: total > 0 ? value.totalMinor / total : 0,
    }))
    .sort((a, b) => b.totalMinor - a.totalMinor || a.category.localeCompare(b.category));
}

export function monthlySeries(expenses: readonly Expense[], months: readonly string[]): MonthlyPoint[] {
  const index = new Map<string, { totalMinor: number; count: number }>();
  for (const month of months) index.set(month, { totalMinor: 0, count: 0 });
  for (const expense of expenses) {
    const month = monthOf(expense.date);
    const bucket = index.get(month);
    if (!bucket) continue;
    bucket.totalMinor += expense.amountMinor;
    bucket.count += 1;
  }
  return months.map((month) => ({ month, ...(index.get(month) as { totalMinor: number; count: number }) }));
}

export function applyFilters(expenses: readonly Expense[], filters: Filters): Expense[] {
  const query = filters.query.trim().toLowerCase();
  const categories = new Set(filters.categories);

  return expenses.filter((expense) => {
    if (categories.size > 0 && !categories.has(expense.category)) return false;
    if (filters.from && expense.date < filters.from) return false;
    if (filters.to && expense.date > filters.to) return false;
    if (filters.minMinor !== undefined && expense.amountMinor < filters.minMinor) return false;
    if (filters.maxMinor !== undefined && expense.amountMinor > filters.maxMinor) return false;
    if (query) {
      const haystack = `${expense.description} ${expense.notes ?? ""} ${expense.category}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortExpenses(expenses: readonly Expense[], sort: SortKey): Expense[] {
  const byDateDesc = (a: Expense, b: Expense): number =>
    b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
  const byDateAsc = (a: Expense, b: Expense): number =>
    a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
  const byAmountDesc = (a: Expense, b: Expense): number =>
    b.amountMinor - a.amountMinor || byDateDesc(a, b);
  const byAmountAsc = (a: Expense, b: Expense): number =>
    a.amountMinor - b.amountMinor || byDateDesc(a, b);

  switch (sort) {
    case "date-asc":
      return [...expenses].sort(byDateAsc);
    case "amount-desc":
      return [...expenses].sort(byAmountDesc);
    case "amount-asc":
      return [...expenses].sort(byAmountAsc);
    case "date-desc":
    default:
      return [...expenses].sort(byDateDesc);
  }
}

export function groupByDay(expenses: readonly Expense[]): { date: string; items: Expense[] }[] {
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const bucket = groups.get(expense.date);
    if (bucket) bucket.push(expense);
    else groups.set(expense.date, [expense]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}



function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const shifted = new Date(year, monthIndex - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}