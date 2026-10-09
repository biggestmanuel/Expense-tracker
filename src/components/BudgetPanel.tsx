import { useEffect, useState } from "react";
import { formatMoney, parseAmountToMinor } from "../lib/money";
import { formatMonth } from "../lib/dates";

type Props = {
  month: string;
  limitMinor: number | undefined;
  spentMinor: number;
  currency: string;
  onSave: (limitMinor: number) => void;
};

export function BudgetPanel({ month, limitMinor, spentMinor, currency, onSave }: Props) {
  const [value, setValue] = useState(() => (limitMinor ? (limitMinor / 100).toFixed(2) : ""));
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(limitMinor ? (limitMinor / 100).toFixed(2) : "");
    setError("");
  }, [limitMinor, month]);

  const ratio = limitMinor && limitMinor > 0 ? spentMinor / limitMinor : null;
  const state = ratio === null ? "" : ratio > 1 ? "over" : ratio >= 0.8 ? "warn" : "";
  const remaining = limitMinor ? limitMinor - spentMinor : 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed === "") {
      setError("");
      onSave(0);
      return;
    }
    const parsed = parseAmountToMinor(trimmed);
    if (parsed === null) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setError("");
    onSave(parsed);
  }

  return (
    <div>
      <div className="budget-head">
        <strong>{limitMinor ? `${formatMoney(spentMinor, currency)} of ${formatMoney(limitMinor, currency)}` : "No budget set"}</strong>
        <span className="meta">{formatMonth(month)}</span>
      </div>
      <div className="budget-track">
        <div
          className={`budget-fill ${state}`}
          style={{ width: `${ratio === null ? 0 : Math.min(100, Math.max(ratio * 100, ratio > 0 ? 2 : 0))}%` }}
        />
      </div>
      <p className="budget-note">
        {limitMinor
          ? remaining >= 0
            ? `${formatMoney(remaining, currency)} left.`
            : `${formatMoney(Math.abs(remaining), currency)} over budget.`
          : "Set a monthly limit to track how far you are spending."}
      </p>

      <form className="budget-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Monthly limit</span>
          <input
            value={value}
            inputMode="decimal"
            placeholder="e.g. 150000"
            aria-invalid={Boolean(error)}
            aria-describedby="budgetErr"
            onChange={(event) => setValue(event.target.value)}
          />
          <small className="err" id="budgetErr">
            {error}
          </small>
        </label>
        <button type="submit" className="secondary">
          Save
        </button>
      </form>
    </div>
  );
}