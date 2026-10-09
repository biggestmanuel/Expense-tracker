import { useCallback, useMemo, useRef, useState } from "react";
import { CATEGORIES, type Expense, type Filters, type SortKey } from "./types";
import { useLedger } from "./hooks/useLedger";
import { currentMonth, formatLongToday, formatMonth, monthRange } from "./lib/dates";
import { formatMoney } from "./lib/money";
import {
  applyFilters,
  monthlySeries,
  sortExpenses,
  summarize,
  totalsByCategory,
} from "./lib/stats";
import { csvFilename, downloadFile, fromCSV, toCSV } from "./lib/csv";
import { Breakdown } from "./components/Breakdown";
import { BudgetPanel } from "./components/BudgetPanel";
import { ExpenseForm, type ExpenseFormValue } from "./components/ExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { Modal } from "./components/Modal";
import { SpendingChart } from "./components/SpendingChart";
import { Toast, type ToastState } from "./components/Toast";

const CHART_MONTHS = 6;

const EMPTY_FILTERS: Filters = { query: "", categories: [], from: "", to: "" };

export function App() {
  const ledger = useLedger();
  const { expenses, budgets, settings } = ledger;
  const currency = settings.currency;

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; expense: Expense } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const month = currentMonth();

  const summary = useMemo(() => summarize(expenses, month), [expenses, month]);
  const filtered = useMemo(() => applyFilters(expenses, filters), [expenses, filters]);
  const visible = useMemo(() => sortExpenses(filtered, sort), [filtered, sort]);
  const totals = useMemo(() => totalsByCategory(filtered, CATEGORIES), [filtered]);
  const series = useMemo(
    () => monthlySeries(expenses, monthRange(month, CHART_MONTHS)),
    [expenses, month],
  );
  const filteredTotal = useMemo(
    () => filtered.reduce((sum, expense) => sum + expense.amountMinor, 0),
    [filtered],
  );
  const budget = budgets.find((item) => item.month === month);

  const notify = useCallback((message: string, actionLabel?: string, onAction?: () => void) => {
    setToast({
      message,
      nonce: Date.now(),
      ...(actionLabel && onAction ? { actionLabel, onAction } : {}),
    });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  function handleSubmit(value: ExpenseFormValue) {
    if (modal?.mode === "edit") {
      ledger.updateExpense(modal.expense.id, value);
      notify("Expense updated.");
    } else {
      ledger.addExpense(value);
      notify("Expense added.");
    }
    closeModal();
  }

  function handleDelete(expense: Expense) {
    ledger.removeExpense(expense.id);
    notify(
      `Deleted "${expense.description}" (${formatMoney(expense.amountMinor, currency)}).`,
      "Undo",
      () => {
        ledger.restoreExpense(expense);
        notify("Expense restored.");
      },
    );
  }

  function handleExport() {
    if (visible.length === 0) {
      notify("Nothing to export with the current filters.");
      return;
    }
    downloadFile(csvFilename("expenses", visible), toCSV(visible), "text/csv");
    notify(`Exported ${visible.length} ${visible.length === 1 ? "expense" : "expenses"}.`);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const { expenses: parsed, errors } = fromCSV(text);
    if (parsed.length === 0) {
      notify(errors[0] ?? "No rows could be imported.");
      return;
    }
    for (const expense of parsed) ledger.addExpense(expense);
    notify(
      `Imported ${parsed.length} ${parsed.length === 1 ? "expense" : "expenses"}${
        errors.length ? `, skipped ${errors.length} row${errors.length === 1 ? "" : "s"}.` : "."
      }`,
    );
  }

  const delta = summary.deltaPercent;

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            S
          </span>
          Spendly
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="icon"
            onClick={ledger.toggleTheme}
            aria-label={`Switch to ${settings.theme === "dark" ? "light" : "dark"} theme`}
          >
            {settings.theme === "dark" ? "☀" : "☾"}
          </button>
          <label className="sr-only" htmlFor="currency">
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            style={{ width: "auto" }}
            onChange={(event) => ledger.updateSettings({ currency: event.target.value })}
          >
            {["NGN", "USD", "EUR", "GBP", "KES", "ZAR", "GHS", "INR"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <button type="button" className="primary" onClick={() => setModal({ mode: "add" })}>
            + Add expense
          </button>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">PERSONAL FINANCE</p>
            <h1>Know where your money goes.</h1>
            <p className="sub">
              Track spending, spot patterns, and keep your expenses organized without spreadsheets.
              Everything stays in this browser.
            </p>
          </div>
          <div className="date-pill">{formatLongToday()}</div>
        </section>

        <section className="stats">
          <article className="stat featured">
            <span>Total spent</span>
            <strong>{formatMoney(summary.totalMinor, currency)}</strong>
            <small>
              {summary.count} {summary.count === 1 ? "expense" : "expenses"} · largest{" "}
              {formatMoney(summary.largestMinor, currency)}
            </small>
          </article>
          <article className="stat">
            <span>{formatMonth(month)}</span>
            <strong>{formatMoney(summary.monthMinor, currency)}</strong>
            <small className={delta === null ? "meta" : `delta ${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}`}>
              {delta === null
                ? `${summary.monthCount} this month`
                : `${delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} ${Math.abs(delta)}% vs last month`}
            </small>
          </article>
          <article className="stat">
            <span>Average expense</span>
            <strong>{formatMoney(summary.averageMinor, currency)}</strong>
            <small>{formatMoney(summary.monthAverageMinor, currency)} in {formatMonth(month)}</small>
          </article>
        </section>

        <section className="grid">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Expenses</h2>
                <p>Filter, sort and edit your records.</p>
              </div>
              <div className="topbar-actions">
                <button type="button" className="secondary" onClick={handleExport}>
                  Export CSV
                </button>
                <button type="button" className="secondary" onClick={() => importRef.current?.click()}>
                  Import CSV
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImportFile(file);
                    event.target.value = "";
                  }}
                />
              </div>
            </div>

            <ExpenseList
              expenses={visible}
              filters={filters}
              sort={sort}
              currency={currency}
              totalFilteredMinor={filteredTotal}
              onFiltersChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
              onSortChange={setSort}
              onReset={() => setFilters(EMPTY_FILTERS)}
              onEdit={(expense) => setModal({ mode: "edit", expense })}
              onDelete={handleDelete}
              onAdd={() => setModal({ mode: "add" })}
            />
          </section>

          <aside style={{ display: "grid", gap: 18 }}>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>By category</h2>
                  <p>Where the filtered money is going.</p>
                </div>
              </div>
              <Breakdown totals={totals} currency={currency} totalMinor={filteredTotal} />
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Last {CHART_MONTHS} months</h2>
                  <p>Monthly spending trend.</p>
                </div>
              </div>
              <SpendingChart points={series} currency={currency} />
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Budget</h2>
                  <p>Keep this month in check.</p>
                </div>
              </div>
              <BudgetPanel
                month={month}
                limitMinor={budget?.limitMinor}
                spentMinor={summary.monthMinor}
                currency={currency}
                onSave={(limitMinor) => {
                  ledger.setBudget(month, limitMinor);
                  notify(limitMinor ? "Budget saved." : "Budget cleared.");
                }}
              />
            </section>
          </aside>
        </section>

        <footer className="sub" style={{ marginTop: 26, fontSize: "0.8rem" }}>
          <span>
            {expenses.length} {expenses.length === 1 ? "expense" : "expenses"} stored in this browser only.
            Nothing is uploaded anywhere.
          </span>{" "}
          <button
            type="button"
            className="ghost"
            onClick={() => {
              if (window.confirm("Delete all expenses, budgets and settings in this browser?")) {
                ledger.reset();
                setFilters(EMPTY_FILTERS);
                notify("Everything cleared.");
              }
            }}
          >
            Clear all data
          </button>
        </footer>
      </main>

      {modal ? (
        <Modal titleId="modalTitle" onClose={closeModal}>
          <p className="eyebrow">{modal.mode === "edit" ? "EDIT EXPENSE" : "NEW EXPENSE"}</p>
          <h2 id="modalTitle">{modal.mode === "edit" ? "Edit expense" : "Add an expense"}</h2>
          <p className="modal-sub">Your data stays in this browser.</p>
          <ExpenseForm
            initial={modal.mode === "edit" ? modal.expense : null}
            currency={currency}
            onSubmit={handleSubmit}
            onCancel={closeModal}
          />
        </Modal>
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}