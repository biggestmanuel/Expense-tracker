import { formatMonth } from "../lib/dates";
import { formatMoney } from "../lib/money";
import type { MonthlyPoint } from "../lib/stats";

type Props = {
  points: readonly MonthlyPoint[];
  currency: string;
};

const WIDTH = 320;
const HEIGHT = 168;
const PADDING = { top: 12, right: 8, bottom: 24, left: 8 };

export function SpendingChart({ points, currency }: Props) {
  const peak = points.reduce((max, point) => Math.max(max, point.totalMinor), 0);
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const slot = points.length > 0 ? innerWidth / points.length : innerWidth;
  const barWidth = Math.min(30, slot * 0.6);

  return (
    <div>
      <svg
        className="chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Monthly spending for the last ${points.length} months. Peak ${formatMoney(peak, currency)}.`}
      >
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            className="grid-line"
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={PADDING.top + innerHeight * ratio}
            y2={PADDING.top + innerHeight * ratio}
          />
        ))}
        {points.map((point, index) => {
          const ratio = peak > 0 ? point.totalMinor / peak : 0;
          const height = ratio * innerHeight;
          const x = PADDING.left + slot * index + (slot - barWidth) / 2;
          const y = PADDING.top + innerHeight - height;
          return (
            <rect
              key={point.month}
              className={point.totalMinor === peak && peak > 0 ? "bar-fill peak" : "bar-fill"}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(height, point.totalMinor > 0 ? 2 : 0)}
              rx={4}
            />
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: -14 }}>
        {points.map((point, index) => (
          <span
            key={point.month}
            className="chart-label"
            style={{
              flex: 1,
              textAlign: index === 0 ? "left" : index === points.length - 1 ? "right" : "center",
              fontVariantNumeric: "tabular-nums",
            }}
            title={`${formatMonth(point.month)}: ${formatMoney(point.totalMinor, currency)}`}
          >
            {formatMonth(point.month).replace(/ \d{4}$/, "")}
          </span>
        ))}
      </div>
    </div>
  );
}