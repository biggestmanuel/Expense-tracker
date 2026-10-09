import { describe, expect, it } from "vitest";
import { currencySymbol, formatMoney, parseAmountToMinor, parseOptionalMinor } from "./money";
import { addMonths, daysInMonth, monthEnd, monthRange, monthStart, todayISO } from "./dates";
import {
  applyFilters,
  groupByDay,
  monthlySeries,
  sortExpenses,
  summarize,
  totalsByCategory,
} from "./stats";
import { CATEGORIES, type Expense } from "../types";
import { fromCSV, toCSV } from "./csv";
import { DEFAULT_SETTINGS, sanitizeExpenses, sanitizeSettings, type Settings } from "./storage";

function expense(partial: Partial<Expense> & { amountMinor: number; date: string }): Expense {
  return {
    id: partial.id ?? `id-${partial.date}-${partial.amountMinor}`,
    category: partial.category ?? "Food",
    description: partial.description ?? "Test expense",
    createdAt: partial.createdAt ?? 0,
    ...partial,
  } as Expense;
}

describe("money", () => {
  it("parses plain and decimal input into minor units", () => {
    expect(parseAmountToMinor("12")).toBe(1200);
    expect(parseAmountToMinor("12.5")).toBe(1250);
    expect(parseAmountToMinor(" 1,250.99 ")).toBe(125099);
    expect(parseAmountToMinor("0.01")).toBe(1);
  });

  it("rejects unusable input", () => {
    for (const bad of ["", " ", ".", "abc", "-5", "0", "1.2.3", "1e5"]) {
      expect(parseAmountToMinor(bad), bad).toBeNull();
    }
  });

  it("formats minor units as currency", () => {
    expect(formatMoney(125050, "NGN")).toMatch(/1,250\.50/);
    expect(formatMoney(125050, "USD")).toMatch(/\$1,250\.50/);
    expect(formatMoney(-5000, "NGN")).toMatch(/-/);
  });

  it("falls back gracefully for an unknown currency code", () => {
    expect(formatMoney(100, "ZZZ")).toContain("1.00");
  });

  it("treats blank, zero and junk amounts as no bound", () => {
    expect(parseOptionalMinor("")).toBeUndefined();
    expect(parseOptionalMinor("   ")).toBeUndefined();
    expect(parseOptionalMinor("0")).toBeUndefined();
    expect(parseOptionalMinor("0.00")).toBeUndefined();
    expect(parseOptionalMinor("abc")).toBeUndefined();
    expect(parseOptionalMinor("-5")).toBeUndefined();
    expect(parseOptionalMinor("25")).toBe(2500);
    expect(parseOptionalMinor("25.50")).toBe(2550);
  });

  it("resolves currency symbols, falling back to the code", () => {
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("NGN")).toBe("₦");
    expect(currencySymbol("EUR")).toBeTruthy();
    expect(currencySymbol("ZZZ")).toBe("ZZZ");
  });
});

describe("dates", () => {
  it("computes month boundaries", () => {
    expect(monthStart("2026-02")).toBe("2026-02-01");
    expect(monthEnd("2026-02")).toBe("2026-02-28");
    expect(daysInMonth("2024-02")).toBe(29);
    expect(monthEnd("2024-12")).toBe("2024-12-31");
  });

  it("shifts months across year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });

  it("returns an ascending window ending at the given month", () => {
    expect(monthRange("2026-03", 3)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("formats today as ISO in local time", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("summarize", () => {
  const expenses = [
    expense({ amountMinor: 1000, date: "2026-03-02" }),
    expense({ amountMinor: 3000, date: "2026-03-05" }),
    expense({ amountMinor: 500, date: "2026-02-20" }),
  ];

  it("totals, averages and deltas", () => {
    const summary = summarize(expenses, "2026-03");
    expect(summary.totalMinor).toBe(4500);
    expect(summary.count).toBe(3);
    expect(summary.averageMinor).toBe(1500);
    expect(summary.largestMinor).toBe(3000);
    expect(summary.monthMinor).toBe(4000);
    expect(summary.monthCount).toBe(2);
    expect(summary.monthAverageMinor).toBe(2000);
    expect(summary.previousMonthMinor).toBe(500);
    expect(summary.deltaPercent).toBe(700);
  });

  it("returns zeros for an empty ledger", () => {
    const summary = summarize([], "2026-03");
    expect(summary.totalMinor).toBe(0);
    expect(summary.averageMinor).toBe(0);
    expect(summary.deltaPercent).toBeNull();
  });

  it("returns a null delta when there is no previous spending", () => {
    expect(summarize([expense({ amountMinor: 100, date: "2026-03-01" })], "2026-03").deltaPercent).toBeNull();
  });
});

describe("totalsByCategory", () => {
  it("ranks categories by spend and computes shares", () => {
    const totals = totalsByCategory(
      [
        expense({ amountMinor: 1000, date: "2026-03-01", category: "Food" }),
        expense({ amountMinor: 3000, date: "2026-03-02", category: "Transport" }),
        expense({ amountMinor: 1000, date: "2026-03-03", category: "Food" }),
      ],
      CATEGORIES,
    );
    expect(totals[0]?.category).toBe("Transport");
    expect(totals[0]?.share).toBeCloseTo(0.6);
    expect(totals[1]?.category).toBe("Food");
    expect(totals[1]?.share).toBeCloseTo(0.4);
    expect(totals[1]?.count).toBe(2);
  });

  it("omits categories with no expenses", () => {
    expect(totalsByCategory([], CATEGORIES)).toEqual([]);
  });
});

describe("monthlySeries", () => {
  it("buckets expenses into the requested months, oldest first", () => {
    const points = monthlySeries(
      [expense({ amountMinor: 500, date: "2026-01-05" }), expense({ amountMinor: 700, date: "2026-03-05" })],
      ["2026-01", "2026-02", "2026-03"],
    );
    expect(points.map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(points.map((p) => p.totalMinor)).toEqual([500, 0, 700]);
    expect(points[0]?.count).toBe(1);
  });

  it("ignores expenses outside the window", () => {
    const points = monthlySeries([expense({ amountMinor: 500, date: "2025-12-01" })], ["2026-01"]);
    expect(points[0]?.totalMinor).toBe(0);
  });
});

describe("applyFilters", () => {
  const expenses = [
    expense({ amountMinor: 1000, date: "2026-03-01", category: "Food", description: "Lunch" }),
    expense({ amountMinor: 5000, date: "2026-03-20", category: "Travel", description: "Flight tickets" }),
    expense({ amountMinor: 200, date: "2026-01-05", category: "Food", description: "Snack" }),
  ];

  const base = { query: "", categories: [], from: "", to: "" };

  it("returns everything with no filters", () => {
    expect(applyFilters(expenses, base)).toHaveLength(3);
  });

  it("filters by category", () => {
    expect(applyFilters(expenses, { ...base, categories: ["Food"] })).toHaveLength(2);
  });

  it("filters by inclusive date range", () => {
    expect(applyFilters(expenses, { ...base, from: "2026-03-01", to: "2026-03-01" })).toHaveLength(1);
  });

  it("filters by amount bounds", () => {
    expect(applyFilters(expenses, { ...base, minMinor: 1000 })).toHaveLength(2);
    expect(applyFilters(expenses, { ...base, maxMinor: 1000 })).toHaveLength(2);
  });

  it("searches description, notes and category, case-insensitively", () => {
    expect(applyFilters(expenses, { ...base, query: "lunch" })).toHaveLength(1);
    expect(applyFilters(expenses, { ...base, query: "TRAVEL" })).toHaveLength(1);
  });
});

describe("sortExpenses", () => {
  const expenses = [
    expense({ amountMinor: 300, date: "2026-03-01", createdAt: 1 }),
    expense({ amountMinor: 100, date: "2026-03-03", createdAt: 2 }),
    expense({ amountMinor: 200, date: "2026-03-02", createdAt: 3 }),
  ];

  it("sorts by date descending by default", () => {
    expect(sortExpenses(expenses, "date-desc").map((e) => e.date)).toEqual([
      "2026-03-03",
      "2026-03-02",
      "2026-03-01",
    ]);
  });

  it("sorts ascending and by amount", () => {
    expect(sortExpenses(expenses, "date-asc")[0]?.date).toBe("2026-03-01");
    expect(sortExpenses(expenses, "amount-desc")[0]?.amountMinor).toBe(300);
    expect(sortExpenses(expenses, "amount-asc")[0]?.amountMinor).toBe(100);
  });

  it("does not mutate the input", () => {
    const copy = [...expenses];
    sortExpenses(expenses, "amount-asc");
    expect(expenses).toEqual(copy);
  });
});

describe("groupByDay", () => {
  it("groups and orders days newest first with day subtotals available", () => {
    const groups = groupByDay([
      expense({ amountMinor: 100, date: "2026-03-01" }),
      expense({ amountMinor: 200, date: "2026-03-02" }),
      expense({ amountMinor: 300, date: "2026-03-01" }),
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-03-02", "2026-03-01"]);
    expect(groups[1]?.items).toHaveLength(2);
  });
});

describe("csv", () => {
  const expenses = [
    expense({ amountMinor: 125050, date: "2026-03-02", description: 'Lunch, "team"', category: "Food", notes: "split" }),
  ];

  it("round-trips through CSV", () => {
    const csv = toCSV(expenses);
    const { expenses: parsed, errors } = fromCSV(csv);
    expect(errors).toEqual([]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.amountMinor).toBe(125050);
    expect(parsed[0]?.description).toBe('Lunch, "team"');
    expect(parsed[0]?.notes).toBe("split");
    expect(parsed[0]?.category).toBe("Food");
  });

  it("quotes fields containing commas and newlines", () => {
    expect(toCSV([expense({ amountMinor: 100, date: "2026-01-01", description: "a,b" })])).toContain('"a,b"');
  });

  it("reports row-level errors and keeps valid rows", () => {
    const csv = "date,description,category,amount\n2026-03-01,Good,Food,10.50\nnope,Bad,Food,5\n2026-03-03,Zero,Food,0";
    const { expenses: parsed, errors } = fromCSV(csv);
    expect(parsed).toHaveLength(1);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("invalid date");
    expect(errors[1]).toContain("invalid amount");
  });

  it("rejects a file with no recognisable columns", () => {
    expect(fromCSV("foo,bar\n1,2").errors[0]).toContain("must have");
  });

  it("falls back to Other for unknown categories", () => {
    const { expenses: parsed } = fromCSV("date,description,category,amount\n2026-03-01,X,Aliens,10");
    expect(parsed[0]?.category).toBe("Other");
  });

  it("handles a headerless file", () => {
    const { expenses: parsed } = fromCSV("2026-03-01,Breakfast,Food,250");
    expect(parsed[0]?.description).toBe("Breakfast");
    expect(parsed[0]?.amountMinor).toBe(25000);
  });
});

describe("sanitizeExpenses", () => {
  it("drops invalid records and repairs partial ones", () => {
    const result = sanitizeExpenses([
      { amountMinor: 500, date: "2026-03-01", description: "Ok", category: "Food" },
      { amount: 12.5, date: "2026-03-02", description: "Legacy amount", category: "Nope" },
      { amountMinor: -5, date: "2026-03-03", description: "Negative" },
      { amountMinor: 100, date: "bad-date", description: "Bad date" },
      { amountMinor: 100, date: "2026-03-04", description: "  " },
      "garbage",
      null,
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.amountMinor).toBe(500);
    expect(result[1]?.amountMinor).toBe(1250);
    expect(result[1]?.category).toBe("Other");
  });

  it("de-duplicates ids", () => {
    const result = sanitizeExpenses([
      { id: "same", amountMinor: 100, date: "2026-03-01", description: "A" },
      { id: "same", amountMinor: 100, date: "2026-03-02", description: "B" },
    ]);
    expect(new Set(result.map((e) => e.id)).size).toBe(2);
  });

  it("returns an empty list for non-array input", () => {
    expect(sanitizeExpenses({} as unknown)).toEqual([]);
    expect(sanitizeExpenses(null)).toEqual([]);
  });
});

describe("sanitizeSettings", () => {
  it("falls back to defaults for invalid values", () => {
    expect(sanitizeSettings({ currency: "nope", theme: "neon" })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid values", () => {
    expect(sanitizeSettings({ currency: "USD", theme: "dark" })).toEqual<Settings>({
      currency: "USD",
      theme: "dark",
    });
  });
});