import type { ReactNode } from "react";
import { money } from "../lib/format";

export const SERIES = ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--s7", "--s8"];
export const seriesVar = (slot: number) => `var(${SERIES[slot % SERIES.length]})`;

export function Card({
  title,
  sub,
  aside,
  large,
  children,
}: {
  title?: string;
  sub?: string;
  aside?: ReactNode;
  large?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={large ? "card card-lg" : "card"}>
      {(title || aside) && (
        <div className="card-head">
          {title && <h2 className="card-title">{title}</h2>}
          {aside}
        </div>
      )}
      {sub && <p className="card-sub">{sub}</p>}
      {children}
    </section>
  );
}

export function Tile({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "good" | "critical" | "warning";
}) {
  const color =
    tone === "good" ? "var(--good-ink)"
    : tone === "critical" ? "var(--critical-ink)"
    : undefined;
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value" style={color ? { color } : undefined}>
        {value}
      </span>
      {note && <span className="tile-note">{note}</span>}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "warning" | "serious" | "critical";
  children: ReactNode;
}) {
  return <span className={tone === "neutral" ? "badge" : `badge badge-${tone}`}>{children}</span>;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  hint,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  suffix?: string;
}) {
  return (
    <Field label={suffix ? `${label} (${suffix})` : label} hint={hint}>
      <input
        className="input input-num"
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </Field>
  );
}

export function Progress({
  value,
  color,
  track,
}: {
  value: number;
  color: string;
  /** A second, lighter segment drawn after the first — used for "planned but unpaid". */
  track?: { value: number; color?: string };
}) {
  const primary = Math.max(0, Math.min(1, value));
  const secondary = track ? Math.max(0, Math.min(1 - primary, track.value)) : 0;
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${primary * 100}%`, background: color }} />
      {secondary > 0 && track && (
        <div
          className="bar-fill"
          style={{
            width: `${secondary * 100}%`,
            // A translucent step of the same hue: same identity, clearly not yet paid.
            background:
              track.color ?? `color-mix(in srgb, ${color} 30%, var(--surface-sunken))`,
            marginInlineStart: 2,
          }}
        />
      )}
    </div>
  );
}

export function Money({ value, tone }: { value: number; tone?: "good" | "critical" }) {
  const color =
    tone === "good" ? "var(--good-ink)" : tone === "critical" ? "var(--critical-ink)" : undefined;
  return (
    <span className="num" style={color ? { color, fontWeight: 650 } : undefined}>
      {money(value)}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
    check: <path d="m4 12.5 5 5L20 6.5" />,
    alert: (
      <>
        <path d="M12 3 2 20h20z" />
        <path d="M12 9v5" />
        <path d="M12 17.5v.5" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6" />
        <path d="M12 7.5v.5" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M9 7V4h6v3" />
        <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v11" />
        <path d="m7.5 11 4.5 4.5L16.5 11" />
        <path d="M4 20h16" />
      </>
    ),
    upload: (
      <>
        <path d="M12 20V9" />
        <path d="m7.5 13 4.5-4.5L16.5 13" />
        <path d="M4 4h16" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </>
    ),
    moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5" />,
    file: (
      <>
        <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
        <path d="M14 3v4h4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
