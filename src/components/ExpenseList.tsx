import { CATEGORIES, type Category, type Expense, type Filters, type SortKey } from "../types";
import { categoryColor } from "../lib/colors";
import { formatMoney } from "../lib/money";
import { formatDate } from "../lib/dates";
import { groupByDay, sumMinor } from "../lib/stats";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Largest first" },
  { value: "amount-asc", label: "Smallest first" },
];

type Props = {
  expenses: readonly Expense[];
  filters: Filters;
  sort: SortKey;
  currency: string;
  totalFilteredMinor: number;
  onFiltersChange: (patch: Partial<Filters>) => void;
  onSortChange: (sort: SortKey) => void;
  onReset: () => void;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
};

export function ExpenseList({
  expenses,
  filters,
  sort,
  currency,
  totalFilteredMinor,
  onFiltersChange,
  onSortChange,
  onReset,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const activeCategories = new Set(filters.categories);
  const filtersActive =
    filters.query.trim() !== "" ||
    filters.categories.length > 0 ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.minMinor !== undefined ||
    filters.maxMinor !== undefined;

  function toggleCategory(category: Category) {
    const next = activeCategories.has(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];
    onFiltersChange({ categories: next });
  }

  return (
    <>
      <div className="toolbar">
        <label className="field grow">
          <span>Search</span>
          <input
            value={filters.query}
            placeholder="Search description or notes"
            onChange={(event) => onFiltersChange({ query: event.target.value })}
          />
        </label>
        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => onFiltersChange({ from: event.target.value })}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => onFiltersChange({ to: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={sort} onChange={(event) => onSortChange(event.target.value as SortKey)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {filtersActive ? (
          <button type="button" className="ghost" onClick={onReset}>
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="chips" style={{ marginBottom: 18 }}>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className="chip"
            aria-pressed={activeCategories.has(category)}
            onClick={() => toggleCategory(category)}
          >
            <i className="dot" style={{ background: categoryColor(category) }} aria-hidden="true" />
            {category}
          </button>
        ))}
      </div>

      {expenses.length === 0 ? (
        <div className="empty">
          <div className="empty-icon" aria-hidden="true">
            ₦
          </div>
          <h3>{filtersActive ? "No matching expenses" : "No expenses yet"}</h3>
          <p>
            {filtersActive
              ? "Try widening your filters or clearing the category selection."
              : "Add your first expense to start tracking your spending."}
          </p>
          {filtersActive ? (
            <button type="button" className="secondary" onClick={onReset}>
              Clear filters
            </button>
          ) : (
            <button type="button" className="secondary" onClick={onAdd}>
              Add first expense
            </button>
          )}
        </div>
      ) : (
        <div aria-live="polite">
          <p className="meta" style={{ margin: "0 0 12px" }}>
            {expenses.length} {expenses.length === 1 ? "expense" : "expenses"} totalling{" "}
            {formatMoney(totalFilteredMinor, currency)}
          </p>
          {groupByDay(expenses).map((group) => (
            <section className="day-group" key={group.date}>
              <header className="day-head">
                <h3>{formatDate(group.date)}</h3>
                <span>{formatMoney(sumMinor(group.items), currency)}</span>
              </header>
              {group.items.map((expense) => (
                <article className="expense" key={expense.id}>
                  <div
                    className="cat"
                    style={{ background: categoryColor(expense.category) }}
                    aria-hidden="true"
                  >
                    {expense.category[0]}
                  </div>
                  <div>
                    <p className="desc">{expense.description}</p>
                    <p className="meta">
                      {expense.category}
                      {expense.notes ? ` · ${expense.notes}` : ""}
                    </p>
                  </div>
                  <div className="amount">{formatMoney(expense.amountMinor, currency)}</div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${expense.description}`}
                      onClick={() => onEdit(expense)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${expense.description}`}
                      onClick={() => onDelete(expense)}
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}