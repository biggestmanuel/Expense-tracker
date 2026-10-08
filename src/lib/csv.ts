import type { Category, Expense } from "../types";
import { isCategory, newId } from "./storage";
import { monthOf } from "./dates";

const COLUMNS = ["date", "description", "category", "amount", "notes"] as const;

export type ImportResult = {
  expenses: Expense[];
  errors: string[];
};

/** RFC 4180 quoting: escape quotes, wrap fields containing delimiters. */
function escapeField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCSV(expenses: readonly Expense[]): string {
  const rows = [COLUMNS.join(",")];
  for (const expense of expenses) {
    rows.push(
      [
        expense.date,
        escapeField(expense.description),
        escapeField(expense.category),
        (expense.amountMinor / 100).toFixed(2),
        escapeField(expense.notes ?? ""),
      ].join(","),
    );
  }
  return rows.join("\r\n");
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const text$ = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text$.length; i += 1) {
    const char = text$[i] as string;
    if (inQuotes) {
      if (char === '"') {
        if (text$[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/**
 * Amounts in CSV are always in **major units** (`1250.50` means 1250.50), which
 * matches what `toCSV` writes. Minor units are an internal storage detail and
 * must never appear in a spreadsheet.
 */
function parseAmount(cell: string): number | null {
  const cleaned = cell.trim().replace(/[,\s]/g, "");
  if (!/^\d*\.?\d+$/.test(cleaned) || cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function fromCSV(text: string): ImportResult {
  const rows = parseRows(text);
  const errors: string[] = [];
  if (rows.length === 0) return { expenses: [], errors: ["File is empty."] };

  const first = rows[0] as string[];
  const header = first.map((cell) => cell.trim().toLowerCase());
  const hasHeader = header.includes("amount") && header.includes("date");
  // A headerless file is positional: date, description, category, amount, notes.
  // Require the first row to actually look like data before dropping the header,
  // so a file with unrelated columns is reported instead of silently misread.
  const looksLikeDataRow =
    /^\d{4}-\d{2}-\d{2}$/.test((first[0] ?? "").trim()) && parseAmount(first[3] ?? "") !== null;

  if (!hasHeader && !looksLikeDataRow) {
    return { expenses: [], errors: ["CSV must have `date` and `amount` columns."] };
  }

  const index = (name: string): number => (hasHeader ? header.indexOf(name) : -1);
  const dateIdx = hasHeader ? index("date") : 0;
  const descIdx = hasHeader ? index("description") : 1;
  const catIdx = hasHeader ? index("category") : 2;
  const amountIdx = hasHeader ? index("amount") : 3;
  const notesIdx = hasHeader ? index("notes") : 4;

  if (amountIdx === -1 || dateIdx === -1) {
    return { expenses: [], errors: ["CSV must have `date` and `amount` columns."] };
  }

  const body = hasHeader ? rows.slice(1) : rows;
  const expenses: Expense[] = [];
  const now = Date.now();

  body.forEach((cells, index) => {
    const lineNumber = (hasHeader ? index + 2 : index + 1);
    const date = (cells[dateIdx] ?? "").trim();
    const description = (cells[descIdx] ?? "").trim();
    const amountMinor = parseAmount(cells[amountIdx] ?? "");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Row ${lineNumber}: invalid date "${date || "(blank)"}".`);
      return;
    }
    if (amountMinor === null) {
      errors.push(`Row ${lineNumber}: invalid amount.`);
      return;
    }
    if (!description) {
      errors.push(`Row ${lineNumber}: missing description.`);
      return;
    }

    const rawCategory = (cells[catIdx] ?? "").trim();
    const category: Category = isCategory(rawCategory) ? rawCategory : "Other";
    const notes = (cells[notesIdx] ?? "").trim();

    expenses.push({
      id: newId(),
      amountMinor,
      date,
      category,
      description: description.slice(0, 120),
      ...(notes ? { notes } : {}),
      createdAt: now + index,
    });
  });

  return { expenses, errors };
}

export function downloadFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function csvFilename(prefix: string, expenses: readonly Expense[]): string {
  const stamp = expenses.length ? monthOf(expenses.reduce((min, e) => (e.date < min ? e.date : min), expenses[0]!.date)) : "export";
  return `${prefix}-${stamp}.csv`;
}