export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Health"
  | "Education"
  | "Travel"
  | "Other";

export const CATEGORIES: readonly Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Other",
] as const;

export type Expense = {
  id: string;
  /** Stored in minor units (kobo/cents) to keep money arithmetic exact. */
  amountMinor: number;
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string;
  category: Category;
  description: string;
  notes?: string;
  createdAt: number;
};

export type Budget = {
  /** `YYYY-MM` */
  month: string;
  /** Minor units. */
  limitMinor: number;
};

export type Theme = "light" | "dark";

export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export type Filters = {
  query: string;
  categories: Category[];
  /** Inclusive `YYYY-MM-DD`. Empty means no lower bound. */
  from: string;
  /** Inclusive `YYYY-MM-DD`. Empty means no upper bound. */
  to: string;
  /** Explicitly `undefined`-able so clearing the field removes the bound. */
  minMinor?: number | undefined;
  maxMinor?: number | undefined;
};