import type { ReactNode } from "react";
import { compact, money, percent } from "../lib/format";

/**
 * Shared chart chrome. Recharts is fed CSS custom properties so light/dark swap
 * in one place, and every chart carries a hover tooltip plus a legend whenever
 * two or more series are on screen.
 */
export const axisStyle = {
  fontSize: 12,
  fill: "var(--ink-muted)",
  fontFamily: "var(--font)",
};

export const gridProps = {
  stroke: "var(--line)",
  strokeDasharray: "0",
  vertical: false,
};

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export function ChartTooltip({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: TooltipRow[];
  footer?: string;
}) {
  return (
    <div className="tooltip">
      <div className="tooltip-title">{title}</div>
      {rows.map((r) => (
        <div className="tooltip-row" key={r.label}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            {r.color && <span className="swatch" style={{ background: r.color }} />}
            {r.label}
          </span>
          <strong>{r.value}</strong>
        </div>
      ))}
      {footer && (
        <div style={{ marginTop: 6, color: "var(--ink-muted)", fontSize: 12 }}>{footer}</div>
      )}
    </div>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; color: string; note?: string }[];
}) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span className="legend-item" key={i.label}>
          <span className="swatch" style={{ background: i.color }} />
          {i.label}
          {i.note && <span style={{ color: "var(--ink-muted)" }}>· {i.note}</span>}
        </span>
      ))}
    </div>
  );
}

export const moneyTick = (v: number) => `₪${compact(v)}`;
export const pctTick = (v: number) => percent(v);

export function TableFallback({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: ReactNode[][];
}) {
  return (
    <details style={{ marginTop: 14 }}>
      <summary
        style={{
          cursor: "pointer",
          fontSize: 13,
          color: "var(--ink-2)",
          fontWeight: 650,
        }}
      >
        הצגת הנתונים כטבלה
      </summary>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={j === 0 ? undefined : "num"}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export const fmtMoney = money;
