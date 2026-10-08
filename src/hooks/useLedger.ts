import { useCallback, useEffect, useMemo, useState } from "react";
import type { Budget, Expense } from "../types";
import {
  DEFAULT_SETTINGS,
  loadBudgets,
  loadExpenses,
  loadSettings,
  newId,
  saveBudgets,
  saveExpenses,
  saveSettings,
  type Settings,
} from "../lib/storage";

export type ExpenseDraft = Omit<Expense, "id" | "createdAt"> & { id?: string };

export function useLedger() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [budgets, setBudgets] = useState<Budget[]>(() => loadBudgets());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  useEffect(() => saveExpenses(expenses), [expenses]);
  useEffect(() => saveBudgets(budgets), [budgets]);
  useEffect(() => saveSettings(settings), [settings]);

  useEffect(() => {
    document.body.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  const addExpense = useCallback((draft: ExpenseDraft): Expense => {
    const expense: Expense = {
      ...draft,
      id: draft.id ?? newId(),
      createdAt: Date.now(),
    };
    setExpenses((prev) => [expense, ...prev]);
    return expense;
  }, []);

  const updateExpense = useCallback((id: string, patch: Partial<ExpenseDraft>) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id
          ? { ...expense, ...patch, id: expense.id, createdAt: expense.createdAt }
          : expense,
      ),
    );
  }, []);

  const removeExpense = useCallback((id: string): Expense | null => {
    let removed: Expense | null = null;
    setExpenses((prev) => {
      removed = prev.find((expense) => expense.id === id) ?? null;
      return removed ? prev.filter((expense) => expense.id !== id) : prev;
    });
    return removed;
  }, []);

  const restoreExpense = useCallback((expense: Expense) => {
    setExpenses((prev) => (prev.some((e) => e.id === expense.id) ? prev : [expense, ...prev]));
  }, []);

  const setBudget = useCallback((month: string, limitMinor: number) => {
    setBudgets((prev) => {
      const rest = prev.filter((budget) => budget.month !== month);
      return limitMinor > 0 ? [...rest, { month, limitMinor }] : rest;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((prev) => ({ ...prev, theme: prev.theme === "dark" ? "light" : "dark" }));
  }, []);

  const reset = useCallback(() => {
    setExpenses([]);
    setBudgets([]);
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return useMemo(
    () => ({
      expenses,
      budgets,
      settings,
      addExpense,
      updateExpense,
      removeExpense,
      restoreExpense,
      setBudget,
      updateSettings,
      toggleTheme,
      reset,
    }),
    [
      expenses,
      budgets,
      settings,
      addExpense,
      updateExpense,
      removeExpense,
      restoreExpense,
      setBudget,
      updateSettings,
      toggleTheme,
      reset,
    ],
  );
}

export type Ledger = ReturnType<typeof useLedger>;