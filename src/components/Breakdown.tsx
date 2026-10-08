import { categoryColor } from "../lib/colors";
import { formatMoney } from "../lib/money";
import type { CategoryTotal } from "../lib/stats";

type Props = {
  totals: readonly CategoryTotal[];
  currency: string;
  totalMinor: number;
};

export function Breakdown({ totals, currency, totalMinor }: Props) {
  if (totals.length === 0) {
    return <p className="sub">Your category breakdown appears once you add an expense.</p>;
  }

  return (
    <>
      {totals.map(({ category, totalMinor: value, share, count }) => (
        <div className="break" key={category}>
          <div className="break-top">
            <span>
              <i className="dot" style={{ background: categoryColor(category) }} aria-hidden="true" />
              {category}
              <span className="meta"> ({count})</span>
            </span>
            <span>
              {formatMoney(value, currency)} · {Math.round(share * 100)}%
            </span>
          </div>
          <div
            className="bar"
            role="img"
            aria-label={`${category}: ${formatMoney(value, currency)}, ${Math.round(share * 100)} percent of ${formatMoney(totalMinor, currency)}`}
          >
            <span
              style={{
                width: `${Math.max(2, share * 100)}%`,
                background: categoryColor(category),
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
}