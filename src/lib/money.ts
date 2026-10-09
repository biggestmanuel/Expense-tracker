const FORMATTERS = new Map<string, Intl.NumberFormat>();

/** Locales that render the currency as a familiar symbol rather than a code. */
const PREFERRED_LOCALES: Record<string, string> = {
  NGN: "en-NG",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  KES: "en-KE",
  ZAR: "en-ZA",
  GHS: "en-GH",
  INR: "en-IN",
};

export function formatMoney(minor: number, currency = "NGN"): string {
  const key = currency;
  let fmt = FORMATTERS.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(PREFERRED_LOCALES[currency], {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    FORMATTERS.set(key, fmt);
  }
  return fmt.format(minor / 100);
}

/**
 * Parses free-form user input into minor units. Returns `null` when the input
 * is not a usable positive amount, so callers never have to guard NaN.
 */
export function parseAmountToMinor(input: string): number | null {
  const cleaned = input.trim().replace(/[,\s  ]/g, "");
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

/**
 * Parses an optional amount bound. Blank, zero and unparseable input all mean
 * "no bound" (`undefined`) so clearing a filter field actually removes the
 * filter rather than pinning it to zero.
 */
export function parseOptionalMinor(input: string): number | undefined {
  const trimmed = input.trim();
  if (trimmed === "") return undefined;
  const parsed = parseAmountToMinor(trimmed);
  return parsed === null || parsed <= 0 ? undefined : parsed;
}

export function formatMinorInput(minor: number): string {
  return (minor / 100).toFixed(2);
}

const SYMBOLS = new Map<string, string>();

/**
 * The short symbol for a currency (`$`, `₦`, `€`). Falls back to the code when a
 * locale offers no symbol, so the UI never shows an empty prefix.
 */
export function currencySymbol(currency: string): string {
  const cached = SYMBOLS.get(currency);
  if (cached) return cached;
  let symbol = currency;
  try {
    const parts = new Intl.NumberFormat(PREFERRED_LOCALES[currency] ?? "en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    symbol = parts.find((part) => part.type === "currency")?.value ?? currency;
  } catch {
    symbol = currency;
  }
  SYMBOLS.set(currency, symbol);
  return symbol;
}

