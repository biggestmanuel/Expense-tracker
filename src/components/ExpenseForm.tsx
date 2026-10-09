import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type Category, type Expense } from "../types";
import { currencySymbol, formatMinorInput, parseAmountToMinor } from "../lib/money";
import { todayISO } from "../lib/dates";

export type ExpenseFormValue = {
  amountMinor: number;
  date: string;
  category: Category;
  description: string;
  notes?: string;
};

type Props = {
  initial?: Expense | null;
  currency: string;
  onSubmit: (value: ExpenseFormValue) => void;
  onCancel: () => void;
};

type Errors = Partial<Record<"amount" | "date" | "category" | "description", string>>;

export function ExpenseForm({ initial, currency, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(() =>
    initial ? formatMinorInput(initial.amountMinor) : "",
  );
  const [date, setDate] = useState(() => initial?.date ?? todayISO());
  const [category, setCategory] = useState<Category | "">(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  function validate(): ExpenseFormValue | null {
    const next: Errors = {};
    const amountMinor = parseAmountToMinor(amount);
    const trimmedDescription = description.trim();
    const trimmedNotes = notes.trim();

    if (amountMinor === null) next.amount = "Enter an amount greater than zero.";
    if (!category) next.category = "Choose a category.";
    if (!trimmedDescription) next.description = "Add a description.";
    if (!date) next.date = "Choose a date.";
    else if (date > todayISO()) next.date = "Date cannot be in the future.";

    setErrors(next);
    if (Object.keys(next).length > 0 || amountMinor === null) return null;

    return {
      amountMinor,
      date,
      category: category as Category,
      description: trimmedDescription,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = validate();
    if (value) onSubmit(value);
  }

  return (
    <form className="grid-form" onSubmit={handleSubmit} noValidate>
      <div className="two">
        <label className="field">
          <span>Amount</span>
          <div className="money-input">
            <span aria-hidden="true">{currencySymbol(currency)}</span>
            <input
              ref={amountRef}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby="amountErr"
            />
          </div>
          <small className="err" id="amountErr">
            {errors.amount}
          </small>
        </label>

        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(errors.date)}
            aria-describedby="dateErr"
          />
          <small className="err" id="dateErr">
            {errors.date}
          </small>
        </label>
      </div>

      <label className="field">
        <span>Category</span>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as Category | "")}
          aria-invalid={Boolean(errors.category)}
          aria-describedby="categoryErr"
        >
          <option value="">Choose a category</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <small className="err" id="categoryErr">
          {errors.category}
        </small>
      </label>

      <label className="field">
        <span>Description</span>
        <input
          value={description}
          maxLength={120}
          placeholder="e.g. Lunch with friends"
          onChange={(event) => setDescription(event.target.value)}
          aria-invalid={Boolean(errors.description)}
          aria-describedby="descriptionErr"
        />
        <small className="err" id="descriptionErr">
          {errors.description}
        </small>
      </label>

      <label className="field">
        <span>Notes (optional)</span>
        <textarea
          value={notes}
          maxLength={500}
          placeholder="Anything worth remembering about this expense"
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary">
          {initial ? "Save changes" : "Save expense"}
        </button>
      </div>
    </form>
  );
}